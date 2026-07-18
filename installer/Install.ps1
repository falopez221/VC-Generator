[CmdletBinding()]
param(
  [string]$InstallRoot,
  [switch]$SkipShortcuts,
  [switch]$SkipRegistry,
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $packageRoot "config.psd1"
$payloadPath = Join-Path $packageRoot "payload.zip"

if (!(Test-Path -LiteralPath $configPath) -or !(Test-Path -LiteralPath $payloadPath)) {
  throw "The installer package is incomplete. config.psd1 or payload.zip is missing."
}

$config = Import-PowerShellDataFile -LiteralPath $configPath
if (!$InstallRoot) { $InstallRoot = Join-Path $env:LOCALAPPDATA $config.InstallFolderName }

function Resolve-SafeInstallRoot([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path).TrimEnd('\')
  $allowedRoots = @(
    ([IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\') + '\')
    ([IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\')
    ([IO.Path]::GetFullPath((Join-Path $packageRoot "build")).TrimEnd('\') + '\')
  )
  if (!($allowedRoots | Where-Object { $resolved.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) })) {
    throw "InstallRoot must be inside LOCALAPPDATA, TEMP or the installer build directory."
  }
  return $resolved
}

$InstallRoot = Resolve-SafeInstallRoot $InstallRoot
$expectedNode = [IO.Path]::GetFullPath((Join-Path $InstallRoot "runtime\node.exe"))

function Stop-InstalledProcess([string]$PidPath) {
  if (!(Test-Path -LiteralPath $PidPath)) { return }
  $savedPid = 0
  [void][int]::TryParse((Get-Content -Raw -LiteralPath $PidPath), [ref]$savedPid)
  if ($savedPid -le 0) { return }
  $process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
  if ($process -and $process.Path -and ([IO.Path]::GetFullPath($process.Path) -eq $expectedNode)) {
    & "$env:WINDIR\System32\taskkill.exe" /PID $savedPid /T /F | Out-Null
    $process.WaitForExit(5000) | Out-Null
  }
}

# Stop both the loopback proxy and its Next.js child. The second PID is needed
# when a previous partial update left the parent or child without its process tree.
Stop-InstalledProcess (Join-Path $InstallRoot "server.pid")
Stop-InstalledProcess (Join-Path $InstallRoot "next-server.pid")

# PID files can be stale or missing after a crash. Only stop Node processes that
# use the runtime bundled inside this exact installation directory.
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.Path -and ([IO.Path]::GetFullPath($_.Path) -eq $expectedNode)) {
    & "$env:WINDIR\System32\taskkill.exe" /PID $_.Id /T /F | Out-Null
    $_.WaitForExit(5000) | Out-Null
  }
}

function Remove-InstallDirectory([string]$Target) {
  for ($attempt = 1; $attempt -le 12; $attempt++) {
    if (!(Test-Path -LiteralPath $Target)) { return }
    try {
      Remove-Item -LiteralPath $Target -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($attempt -eq 12) { throw }
      Start-Sleep -Milliseconds 250
    }
  }
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
foreach ($name in @("app", "runtime")) {
  $target = [IO.Path]::GetFullPath((Join-Path $InstallRoot $name))
  if (!$target.StartsWith($InstallRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe package target." }
  Remove-InstallDirectory $target
}

Expand-Archive -LiteralPath $payloadPath -DestinationPath $InstallRoot -Force
Copy-Item -LiteralPath $configPath -Destination (Join-Path $InstallRoot "installer-config.psd1") -Force

$wscript = Join-Path $env:WINDIR "System32\wscript.exe"
$launchScript = Join-Path $InstallRoot "Launch.vbs"
$shortcutName = "$($config.ProductName).lnk"
$shortcutPaths = @()

if (!$SkipShortcuts) {
  if ($config.CreateDesktopShortcut) { $shortcutPaths += Join-Path ([Environment]::GetFolderPath("Desktop")) $shortcutName }
  if ($config.CreateStartMenuShortcut) {
    $startMenuFolder = Join-Path ([Environment]::GetFolderPath("Programs")) $config.Publisher
    New-Item -ItemType Directory -Force -Path $startMenuFolder | Out-Null
    $shortcutPaths += Join-Path $startMenuFolder $shortcutName
  }
  $shell = New-Object -ComObject WScript.Shell
  foreach ($shortcutPath in $shortcutPaths) {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $wscript
    $shortcut.Arguments = "`"$launchScript`""
    $shortcut.WorkingDirectory = $InstallRoot
    $shortcut.Description = "Open $($config.ProductName)"
    $shortcut.IconLocation = "$(Join-Path $InstallRoot 'app-icon.ico'),0"
    $shortcut.Save()
  }
}

if (!$SkipRegistry) {
  $uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$($config.AppId)"
  New-Item -Path $uninstallKey -Force | Out-Null
  $uninstallCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallRoot 'Uninstall.ps1')`""
  $estimatedSize = [int]((Get-ChildItem -LiteralPath $InstallRoot -Recurse -File | Measure-Object Length -Sum).Sum / 1KB)
  New-ItemProperty -Path $uninstallKey -Name DisplayName -Value $config.ProductName -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name DisplayVersion -Value $config.ProductVersion -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name Publisher -Value $config.Publisher -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name InstallLocation -Value $InstallRoot -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name DisplayIcon -Value (Join-Path $InstallRoot "app-icon.ico") -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name UninstallString -Value $uninstallCommand -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name QuietUninstallString -Value "$uninstallCommand -Quiet" -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name EstimatedSize -Value $estimatedSize -PropertyType DWord -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name NoModify -Value 1 -PropertyType DWord -Force | Out-Null
  New-ItemProperty -Path $uninstallKey -Name NoRepair -Value 1 -PropertyType DWord -Force | Out-Null
}

Write-Output "$($config.ProductName) $($config.ProductVersion) installed in $InstallRoot"
if ($config.LaunchAfterInstall -and !$NoLaunch) { & $wscript $launchScript }
