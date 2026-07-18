[CmdletBinding()]
param(
  [string]$InstallRoot,
  [string]$EncodedInstallRoot,
  [switch]$SkipShortcuts,
  [switch]$SkipRegistry,
  [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $packageRoot "config.psd1"
$payloadPath = Join-Path $packageRoot "payload.zip"
$markerName = ".venture-governance-install.json"
$windowsDirectory = [Environment]::GetFolderPath([Environment+SpecialFolder]::Windows)
if ([string]::IsNullOrWhiteSpace($windowsDirectory)) { throw "The trusted Windows directory could not be resolved." }
$taskkillPath = Join-Path $windowsDirectory "System32\taskkill.exe"

if (!(Test-Path -LiteralPath $configPath -PathType Leaf) -or !(Test-Path -LiteralPath $payloadPath -PathType Leaf)) {
  throw "The installer package is incomplete. config.psd1 or payload.zip is missing."
}
if ($InstallRoot -and $EncodedInstallRoot) { throw "Specify only one install-root argument." }
if ($EncodedInstallRoot) {
  try {
    $InstallRoot = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($EncodedInstallRoot))
  } catch {
    throw "The encoded install root is invalid."
  }
}

$config = Import-PowerShellDataFile -LiteralPath $configPath

function Assert-PlainConfigName([string]$Value, [string]$FieldName) {
  if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Length -gt 120 -or
      $Value -in @(".", "..") -or $Value.EndsWith(".") -or $Value.EndsWith(" ") -or
      $Value.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0 -or $Value -match '[\x00-\x1F\x7F]') {
    throw "$FieldName must be a bounded plain Windows path component."
  }
}

Assert-PlainConfigName ([string]$config.InstallFolderName) "InstallFolderName"
Assert-PlainConfigName ([string]$config.ProductName) "ProductName"
Assert-PlainConfigName ([string]$config.Publisher) "Publisher"
Assert-PlainConfigName ([string]$config.AppId) "AppId"
if (!$InstallRoot) { $InstallRoot = Join-Path $env:LOCALAPPDATA $config.InstallFolderName }

function ConvertTo-NormalizedLocalPath([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -match '[\x00-\x1F\x7F]') { throw "A local path is required." }
  $resolved = [IO.Path]::GetFullPath($Path).Replace('/', '\').TrimEnd('\')
  if ([IO.Path]::GetPathRoot($resolved) -notmatch '^[A-Za-z]:\\$') {
    throw "Only local drive paths are supported."
  }
  foreach ($component in $resolved.Substring(3).Split(@('\'), [StringSplitOptions]::RemoveEmptyEntries)) {
    if ($component -in @(".", "..") -or $component.EndsWith(".") -or $component.EndsWith(" ") -or
        $component.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0) {
      throw "The path contains an unsafe Windows path component."
    }
  }
  return $resolved
}

function Assert-NoReparsePoints([string]$Path) {
  $resolved = ConvertTo-NormalizedLocalPath $Path
  $pathRoot = [IO.Path]::GetPathRoot($resolved)
  $current = $pathRoot
  foreach ($component in $resolved.Substring($pathRoot.Length).Split(@('\'), [StringSplitOptions]::RemoveEmptyEntries)) {
    $current = [IO.Path]::Combine($current, $component)
    if (!(Test-Path -LiteralPath $current)) { continue }
    $item = Get-Item -Force -LiteralPath $current
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.LinkType) {
      throw "Refusing to use a path that contains a junction, symbolic link or other reparse point: $current"
    }
  }
}

function Assert-NoReparseTree([string]$Path) {
  Assert-NoReparsePoints $Path
  if (!(Test-Path -LiteralPath $Path -PathType Container)) { return }
  $pending = [Collections.Generic.Stack[string]]::new()
  $pending.Push((ConvertTo-NormalizedLocalPath $Path))
  while ($pending.Count -gt 0) {
    $directory = $pending.Pop()
    foreach ($item in Get-ChildItem -Force -LiteralPath $directory) {
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.LinkType) {
        throw "Refusing to use an installation tree that contains a junction, symbolic link or other reparse point: $($item.FullName)"
      }
      if ($item.PSIsContainer) { $pending.Push($item.FullName) }
    }
  }
}

function Assert-TrustedDirectoryOwner([string]$Path) {
  if (!(Test-Path -LiteralPath $Path -PathType Container)) { return }
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  try {
    $ownerSid = ([Security.Principal.NTAccount](Get-Acl -LiteralPath $Path).Owner).Translate([Security.Principal.SecurityIdentifier]).Value
  } catch {
    throw "The owner of the installation directory could not be verified."
  }
  $trustedOwners = @($identity.User.Value, "S-1-5-18", "S-1-5-32-544")
  if ($ownerSid -notin $trustedOwners) { throw "The installation directory is not owned by the current user or a trusted Windows principal." }
}

function Resolve-SafeInstallRoot([string]$Path) {
  $resolved = ConvertTo-NormalizedLocalPath $Path
  $allowedRoots = @(
    (ConvertTo-NormalizedLocalPath $env:LOCALAPPDATA)
    (ConvertTo-NormalizedLocalPath $env:TEMP)
    (ConvertTo-NormalizedLocalPath (Join-Path $packageRoot "build"))
  ) | Select-Object -Unique
  $allowedRoot = $allowedRoots | Where-Object {
    $resolved.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase)
  } | Sort-Object Length -Descending | Select-Object -First 1
  if (!$allowedRoot) {
    throw "InstallRoot must be a child of LOCALAPPDATA, TEMP or the installer build directory."
  }
  Assert-NoReparsePoints $allowedRoot
  Assert-NoReparsePoints $resolved
  return $resolved
}

function Read-ValidatedInstallMarker([string]$Root) {
  $markerPath = Join-Path $Root $markerName
  if (!(Test-Path -LiteralPath $markerPath -PathType Leaf)) { return $null }
  Assert-NoReparsePoints $markerPath
  try { $marker = Get-Content -Raw -LiteralPath $markerPath | ConvertFrom-Json } catch { return $null }
  $markerGuid = [guid]::Empty
  if ($marker.schemaVersion -ne 1 -or $marker.appId -cne [string]$config.AppId -or
      ![guid]::TryParse([string]$marker.instanceId, [ref]$markerGuid)) { return $null }
  try { $markedRoot = ConvertTo-NormalizedLocalPath ([string]$marker.installRoot) } catch { return $null }
  if ($markedRoot -ine $Root) { return $null }
  return $marker
}

$InstallRoot = Resolve-SafeInstallRoot $InstallRoot
$expectedNode = [IO.Path]::GetFullPath((Join-Path $InstallRoot "runtime\node.exe"))
$existingMarker = $null
if (Test-Path -LiteralPath $InstallRoot) {
  if (!(Test-Path -LiteralPath $InstallRoot -PathType Container)) { throw "InstallRoot already exists and is not a directory." }
  Assert-NoReparsePoints $InstallRoot
  Assert-TrustedDirectoryOwner $InstallRoot
  $firstExistingItem = Get-ChildItem -Force -LiteralPath $InstallRoot | Select-Object -First 1
  if ($firstExistingItem) {
    $existingMarker = Read-ValidatedInstallMarker $InstallRoot
    if (!$existingMarker) { throw "Refusing to overwrite a non-empty directory that is not a verified existing installation." }
  }
}

function Stop-InstalledProcess([string]$PidPath) {
  Assert-NoReparsePoints $InstallRoot
  if (!(Test-Path -LiteralPath $PidPath -PathType Leaf)) { return }
  Assert-NoReparsePoints $PidPath
  $savedPid = 0
  [void][int]::TryParse((Get-Content -Raw -LiteralPath $PidPath), [ref]$savedPid)
  if ($savedPid -le 0) { return }
  $process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
  if ($process -and $process.Path -and ([IO.Path]::GetFullPath($process.Path) -eq $expectedNode)) {
    & $taskkillPath /PID $savedPid /T /F | Out-Null
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
    & $taskkillPath /PID $_.Id /T /F | Out-Null
    $_.WaitForExit(5000) | Out-Null
  }
}

function Remove-InstallDirectory([string]$Target) {
  $targetPath = ConvertTo-NormalizedLocalPath $Target
  if (!$targetPath.StartsWith($InstallRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe package target." }
  for ($attempt = 1; $attempt -le 12; $attempt++) {
    Assert-NoReparsePoints $InstallRoot
    Assert-NoReparsePoints $targetPath
    if (!(Test-Path -LiteralPath $targetPath)) { return }
    Assert-NoReparseTree $targetPath
    try {
      Remove-Item -LiteralPath $targetPath -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($attempt -eq 12) { throw }
      Start-Sleep -Milliseconds 250
    }
  }
}

[void][IO.Directory]::CreateDirectory($InstallRoot)
Assert-NoReparsePoints $InstallRoot
Assert-TrustedDirectoryOwner $InstallRoot
foreach ($name in @("app", "runtime")) { Remove-InstallDirectory (Join-Path $InstallRoot $name) }

Assert-NoReparsePoints $InstallRoot
Expand-Archive -LiteralPath $payloadPath -DestinationPath $InstallRoot -Force
Assert-NoReparsePoints $InstallRoot
Assert-NoReparseTree $InstallRoot
$localSettingsPath = Join-Path $InstallRoot "local-settings.json"
if (!(Test-Path -LiteralPath $localSettingsPath -PathType Leaf)) { throw "The extracted payload is missing local-settings.json." }
Assert-NoReparsePoints $localSettingsPath
try { $localSettings = Get-Content -Raw -LiteralPath $localSettingsPath | ConvertFrom-Json } catch {
  throw "The extracted local-settings.json is invalid."
}
$tokenBytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $random.GetBytes($tokenBytes) } finally { $random.Dispose() }
$localInstanceToken = -join ($tokenBytes | ForEach-Object { $_.ToString("x2") })
$localSettings | Add-Member -NotePropertyName localInstanceToken -NotePropertyValue $localInstanceToken -Force
$temporarySettingsPath = Join-Path $InstallRoot (".{0}.json.tmp" -f [guid]::NewGuid().ToString("N"))
$localSettings | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $temporarySettingsPath
Assert-NoReparsePoints $localSettingsPath
Move-Item -LiteralPath $temporarySettingsPath -Destination $localSettingsPath -Force
Copy-Item -LiteralPath $configPath -Destination (Join-Path $InstallRoot "installer-config.psd1") -Force

$instanceId = if ($existingMarker) { [string]$existingMarker.instanceId } else { [guid]::NewGuid().ToString("D") }
$markerPath = Join-Path $InstallRoot $markerName
Assert-NoReparsePoints $markerPath
$temporaryMarkerPath = Join-Path $InstallRoot (".{0}.tmp" -f [guid]::NewGuid().ToString("N"))
@{
  schemaVersion = 1
  appId = [string]$config.AppId
  installRoot = $InstallRoot
  instanceId = $instanceId
} | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $temporaryMarkerPath
Assert-NoReparsePoints $InstallRoot
Move-Item -LiteralPath $temporaryMarkerPath -Destination $markerPath -Force

$wscript = Join-Path $windowsDirectory "System32\wscript.exe"
$launchScript = Join-Path $InstallRoot "Launch.vbs"
$shortcutName = "$($config.ProductName).lnk"
$shortcutPaths = @()

if (!$SkipShortcuts) {
  if ($config.CreateDesktopShortcut) { $shortcutPaths += Join-Path ([Environment]::GetFolderPath("Desktop")) $shortcutName }
  if ($config.CreateStartMenuShortcut) {
    $startMenuFolder = Join-Path ([Environment]::GetFolderPath("Programs")) $config.Publisher
    [void][IO.Directory]::CreateDirectory($startMenuFolder)
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
  $powershellPath = Join-Path $windowsDirectory "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (!(Test-Path -LiteralPath $powershellPath -PathType Leaf)) { throw "The trusted Windows PowerShell executable is unavailable." }
  $uninstallCommand = "`"$powershellPath`" -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallRoot 'Uninstall.ps1')`""
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
