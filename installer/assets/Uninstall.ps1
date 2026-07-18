[CmdletBinding()]
param([switch]$Quiet)

$ErrorActionPreference = "Stop"
$installRoot = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path)).TrimEnd('\')
$localRoot = [IO.Path]::GetFullPath($env:LOCALAPPDATA).TrimEnd('\') + '\'
if (!$installRoot.StartsWith($localRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to uninstall outside LOCALAPPDATA."
}

$config = Import-PowerShellDataFile -LiteralPath (Join-Path $installRoot "installer-config.psd1")
$pidFile = Join-Path $installRoot "server.pid"
if (Test-Path -LiteralPath $pidFile) {
  $savedPid = 0
  [void][int]::TryParse((Get-Content -Raw -LiteralPath $pidFile), [ref]$savedPid)
  $process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
  $expectedNode = Join-Path $installRoot "runtime\node.exe"
  if ($process -and $process.Path -and ([IO.Path]::GetFullPath($process.Path) -eq [IO.Path]::GetFullPath($expectedNode))) {
    & "$env:WINDIR\System32\taskkill.exe" /PID $savedPid /T /F | Out-Null
  }
}

$shortcutName = "$($config.ProductName).lnk"
$shortcuts = @(
  (Join-Path ([Environment]::GetFolderPath("Desktop")) $shortcutName),
  (Join-Path (Join-Path ([Environment]::GetFolderPath("Programs")) $config.Publisher) $shortcutName)
)
foreach ($shortcut in $shortcuts) { if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force } }
$startMenuFolder = Join-Path ([Environment]::GetFolderPath("Programs")) $config.Publisher
if ((Test-Path -LiteralPath $startMenuFolder) -and !(Get-ChildItem -LiteralPath $startMenuFolder -Force)) { Remove-Item -LiteralPath $startMenuFolder -Force }
Remove-Item -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$($config.AppId)" -Recurse -Force -ErrorAction SilentlyContinue

$cleanup = "ping 127.0.0.1 -n 3 > nul & rmdir /s /q `"$installRoot`""
Start-Process -FilePath $env:ComSpec -ArgumentList @("/d", "/c", $cleanup) -WindowStyle Hidden
if (!$Quiet) { Write-Output "$($config.ProductName) was removed." }
