[CmdletBinding()]
param([switch]$Quiet)

$ErrorActionPreference = "Stop"
$markerName = ".venture-governance-install.json"
$windowsDirectory = [Environment]::GetFolderPath([Environment+SpecialFolder]::Windows)
if ([string]::IsNullOrWhiteSpace($windowsDirectory)) { throw "The trusted Windows directory could not be resolved." }
$taskkillPath = Join-Path $windowsDirectory "System32\taskkill.exe"

function ConvertTo-NormalizedLocalPath([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -match '[\x00-\x1F\x7F]') { throw "A local path is required." }
  $resolved = [IO.Path]::GetFullPath($Path).Replace('/', '\').TrimEnd('\')
  if ([IO.Path]::GetPathRoot($resolved) -notmatch '^[A-Za-z]:\\$') { throw "Only local drive paths are supported." }
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
        throw "Refusing to remove an installation tree that contains a junction, symbolic link or other reparse point: $($item.FullName)"
      }
      if ($item.PSIsContainer) { $pending.Push($item.FullName) }
    }
  }
}

function Assert-TrustedDirectoryOwner([string]$Path) {
  if (!(Test-Path -LiteralPath $Path -PathType Container)) { return }
  try {
    $ownerSid = ([Security.Principal.NTAccount](Get-Acl -LiteralPath $Path).Owner).Translate([Security.Principal.SecurityIdentifier]).Value
  } catch {
    throw "The owner of the installation directory could not be verified."
  }
  $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if ($ownerSid -notin @($currentSid, "S-1-5-18", "S-1-5-32-544")) {
    throw "The installation directory is not owned by the current user or a trusted Windows principal."
  }
}

function Resolve-SafeInstalledRoot([string]$Path) {
  $resolved = ConvertTo-NormalizedLocalPath $Path
  $allowedRoots = @(
    (ConvertTo-NormalizedLocalPath $env:LOCALAPPDATA)
    (ConvertTo-NormalizedLocalPath $env:TEMP)
  ) | Select-Object -Unique
  $allowedRoot = $allowedRoots | Where-Object {
    $resolved.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase)
  } | Sort-Object Length -Descending | Select-Object -First 1
  if (!$allowedRoot) { throw "Refusing to uninstall outside the approved per-user roots." }
  Assert-NoReparsePoints $allowedRoot
  Assert-NoReparsePoints $resolved
  Assert-TrustedDirectoryOwner $resolved
  return @{ InstallRoot = $resolved; AllowedRoot = $allowedRoot }
}

function Assert-PlainConfigName([string]$Value, [string]$FieldName) {
  if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Length -gt 120 -or
      $Value -in @(".", "..") -or $Value.EndsWith(".") -or $Value.EndsWith(" ") -or
      $Value.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0 -or $Value -match '[\x00-\x1F\x7F]') {
    throw "$FieldName is not a safe plain name."
  }
}

function ConvertTo-Base64([string]$Value) {
  return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Value))
}

$rootInfo = Resolve-SafeInstalledRoot (Split-Path -Parent $MyInvocation.MyCommand.Path)
$installRoot = [string]$rootInfo.InstallRoot
$allowedRoot = [string]$rootInfo.AllowedRoot
$configPath = Join-Path $installRoot "installer-config.psd1"
$markerPath = Join-Path $installRoot $markerName
if (!(Test-Path -LiteralPath $configPath -PathType Leaf) -or !(Test-Path -LiteralPath $markerPath -PathType Leaf)) {
  throw "Refusing to remove an installation without its configuration and ownership marker."
}
Assert-NoReparsePoints $configPath
Assert-NoReparsePoints $markerPath
$config = Import-PowerShellDataFile -LiteralPath $configPath
Assert-PlainConfigName ([string]$config.ProductName) "ProductName"
Assert-PlainConfigName ([string]$config.Publisher) "Publisher"
Assert-PlainConfigName ([string]$config.AppId) "AppId"
try { $marker = Get-Content -Raw -LiteralPath $markerPath | ConvertFrom-Json } catch { throw "The installation marker is invalid." }
$markerGuid = [guid]::Empty
if ($marker.schemaVersion -ne 1 -or $marker.appId -cne [string]$config.AppId -or
    ![guid]::TryParse([string]$marker.instanceId, [ref]$markerGuid) -or
    (ConvertTo-NormalizedLocalPath ([string]$marker.installRoot)) -ine $installRoot) {
  throw "The installation marker does not match this installation."
}
Assert-NoReparseTree $installRoot

$pidFile = Join-Path $installRoot "server.pid"
if (Test-Path -LiteralPath $pidFile -PathType Leaf) {
  Assert-NoReparsePoints $pidFile
  $savedPid = 0
  [void][int]::TryParse((Get-Content -Raw -LiteralPath $pidFile), [ref]$savedPid)
  $process = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
  $expectedNode = Join-Path $installRoot "runtime\node.exe"
  if ($process -and $process.Path -and ([IO.Path]::GetFullPath($process.Path) -eq [IO.Path]::GetFullPath($expectedNode))) {
    & $taskkillPath /PID $savedPid /T /F | Out-Null
  }
}

$shortcutName = "$($config.ProductName).lnk"
$shortcuts = @(
  (Join-Path ([Environment]::GetFolderPath("Desktop")) $shortcutName),
  (Join-Path (Join-Path ([Environment]::GetFolderPath("Programs")) $config.Publisher) $shortcutName)
)
foreach ($shortcut in $shortcuts) {
  if (!(Test-Path -LiteralPath $shortcut -PathType Leaf)) { continue }
  try {
    Assert-NoReparsePoints $shortcut
    Remove-Item -LiteralPath $shortcut -Force
  } catch {
    Write-Warning "A shortcut was left in place because its path could not be verified."
  }
}
$startMenuFolder = Join-Path ([Environment]::GetFolderPath("Programs")) $config.Publisher
if (Test-Path -LiteralPath $startMenuFolder -PathType Container) {
  try {
    Assert-NoReparsePoints $startMenuFolder
    if (!(Get-ChildItem -LiteralPath $startMenuFolder -Force | Select-Object -First 1)) {
      Remove-Item -LiteralPath $startMenuFolder -Force
    }
  } catch {
    Write-Warning "The Start Menu folder was left in place because its path could not be verified."
  }
}
Remove-Item -LiteralPath "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$($config.AppId)" -Recurse -Force -ErrorAction SilentlyContinue

# The uninstall script cannot reliably delete its own directory. Launch a fixed,
# temporary PowerShell helper and pass every variable value as UTF-8 Base64. No
# path is ever interpolated into cmd.exe or another shell command.
$cleanupRoot = Join-Path (ConvertTo-NormalizedLocalPath $env:TEMP) ("VentureGovernanceCleanup_" + [guid]::NewGuid().ToString("N"))
Assert-NoReparsePoints (Split-Path -Parent $cleanupRoot)
[void][IO.Directory]::CreateDirectory($cleanupRoot)
Assert-NoReparsePoints $cleanupRoot
Assert-TrustedDirectoryOwner $cleanupRoot
$cleanupScript = Join-Path $cleanupRoot "Remove-VerifiedInstall.ps1"
$cleanupSource = @'
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$EncodedTarget,
  [Parameter(Mandatory = $true)][string]$EncodedAllowedRoot,
  [Parameter(Mandatory = $true)][string]$EncodedAppId,
  [Parameter(Mandatory = $true)][string]$EncodedInstanceId
)
$ErrorActionPreference = "Stop"

function Decode([string]$Value) { return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Value)) }
function Normalize([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path) -or $Path -match '[\x00-\x1F\x7F]') { throw "Invalid cleanup path." }
  $resolved = [IO.Path]::GetFullPath($Path).Replace('/', '\').TrimEnd('\')
  if ([IO.Path]::GetPathRoot($resolved) -notmatch '^[A-Za-z]:\\$') { throw "Only local drive paths are supported." }
  foreach ($component in $resolved.Substring(3).Split(@('\'), [StringSplitOptions]::RemoveEmptyEntries)) {
    if ($component -in @(".", "..") -or $component.EndsWith(".") -or $component.EndsWith(" ") -or
        $component.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0) { throw "Unsafe cleanup path." }
  }
  return $resolved
}
function Assert-NoReparse([string]$Path) {
  $resolved = Normalize $Path
  $pathRoot = [IO.Path]::GetPathRoot($resolved)
  $current = $pathRoot
  foreach ($component in $resolved.Substring($pathRoot.Length).Split(@('\'), [StringSplitOptions]::RemoveEmptyEntries)) {
    $current = [IO.Path]::Combine($current, $component)
    if (!(Test-Path -LiteralPath $current)) { continue }
    $item = Get-Item -Force -LiteralPath $current
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.LinkType) { throw "Reparse point detected." }
  }
}
function Assert-NoReparseTree([string]$Path) {
  Assert-NoReparse $Path
  if (!(Test-Path -LiteralPath $Path -PathType Container)) { return }
  $pending = [Collections.Generic.Stack[string]]::new()
  $pending.Push((Normalize $Path))
  while ($pending.Count -gt 0) {
    $directory = $pending.Pop()
    foreach ($item in Get-ChildItem -Force -LiteralPath $directory) {
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.LinkType) { throw "Nested reparse point detected." }
      if ($item.PSIsContainer) { $pending.Push($item.FullName) }
    }
  }
}
function Assert-TrustedOwner([string]$Path) {
  $ownerSid = ([Security.Principal.NTAccount](Get-Acl -LiteralPath $Path).Owner).Translate([Security.Principal.SecurityIdentifier]).Value
  $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  if ($ownerSid -notin @($currentSid, "S-1-5-18", "S-1-5-32-544")) { throw "Untrusted directory owner." }
}
function Assert-Marker([string]$Directory, [string]$OriginalTarget, [string]$AppId, [string]$InstanceId) {
  $markerPath = Join-Path $Directory ".venture-governance-install.json"
  if (!(Test-Path -LiteralPath $markerPath -PathType Leaf)) { throw "Missing installation marker." }
  Assert-NoReparse $markerPath
  $marker = Get-Content -Raw -LiteralPath $markerPath | ConvertFrom-Json
  if ($marker.schemaVersion -ne 1 -or $marker.appId -cne $AppId -or $marker.instanceId -cne $InstanceId -or
      (Normalize ([string]$marker.installRoot)) -ine $OriginalTarget) { throw "Installation marker mismatch." }
}

$target = Normalize (Decode $EncodedTarget)
$allowedRoot = Normalize (Decode $EncodedAllowedRoot)
$appId = Decode $EncodedAppId
$instanceId = Decode $EncodedInstanceId
if (!$target.StartsWith($allowedRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Cleanup target escaped its approved root." }
$deleteTarget = $target
$renamed = $false
$quarantine = Join-Path (Split-Path -Parent $target) (".venture-governance-remove-" + [guid]::NewGuid().ToString("N"))

try {
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    if (!(Test-Path -LiteralPath $deleteTarget)) { break }
    try {
      Assert-NoReparse $allowedRoot
      Assert-NoReparse $deleteTarget
      Assert-NoReparseTree $deleteTarget
      Assert-TrustedOwner $deleteTarget
      Assert-Marker $deleteTarget $target $appId $instanceId
      if (!$renamed) {
        if (Test-Path -LiteralPath $quarantine) { throw "Cleanup quarantine collision." }
        Move-Item -LiteralPath $target -Destination $quarantine
        $deleteTarget = $quarantine
        $renamed = $true
        Assert-NoReparse $deleteTarget
        Assert-NoReparseTree $deleteTarget
        Assert-TrustedOwner $deleteTarget
        Assert-Marker $deleteTarget $target $appId $instanceId
      }
      Remove-Item -LiteralPath $deleteTarget -Recurse -Force -ErrorAction Stop
    } catch {
      if ($attempt -eq 20) { throw }
      Start-Sleep -Milliseconds 250
    }
  }
} finally {
  $self = $MyInvocation.MyCommand.Path
  $selfRoot = Split-Path -Parent $self
  Remove-Item -LiteralPath $self -Force -ErrorAction SilentlyContinue
  [IO.Directory]::Delete($selfRoot, $false)
}
'@
Set-Content -LiteralPath $cleanupScript -Encoding UTF8 -Value $cleanupSource
Assert-NoReparsePoints $cleanupScript

$powershellPath = Join-Path $windowsDirectory "System32\WindowsPowerShell\v1.0\powershell.exe"
if (!(Test-Path -LiteralPath $powershellPath -PathType Leaf)) { throw "The trusted Windows PowerShell executable is unavailable." }
$argumentLine = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -EncodedTarget {1} -EncodedAllowedRoot {2} -EncodedAppId {3} -EncodedInstanceId {4}' -f @(
  $cleanupScript.Replace('"', '""'),
  (ConvertTo-Base64 $installRoot),
  (ConvertTo-Base64 $allowedRoot),
  (ConvertTo-Base64 ([string]$config.AppId)),
  (ConvertTo-Base64 ([string]$marker.instanceId))
)
Start-Process -FilePath $powershellPath -ArgumentList $argumentLine -WorkingDirectory (Split-Path -Parent $cleanupRoot) -WindowStyle Hidden
if (!$Quiet) { Write-Output "$($config.ProductName) was removed." }
