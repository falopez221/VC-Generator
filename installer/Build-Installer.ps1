[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$installerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $installerRoot
$config = Import-PowerShellDataFile -LiteralPath (Join-Path $installerRoot "config.psd1")
$installerFileName = [string]$config.InstallerFileName
if ([string]::IsNullOrWhiteSpace($installerFileName) -or
    [IO.Path]::GetFileName($installerFileName) -cne $installerFileName -or
    [IO.Path]::GetExtension($installerFileName) -ine ".exe") {
  throw "InstallerFileName must be a plain .exe file name."
}
$publicPort = [int]$config.Port
if ($publicPort -lt 1024 -or $publicPort -gt 65534) { throw "Port must be between 1024 and 65534." }
$localUserEmail = [string]$config.LocalUserEmail
if ($localUserEmail.Length -gt 254 -or $localUserEmail -notmatch '^[^@\s]+@[^@\s]+[.]invalid$') {
  throw "LocalUserEmail must be a non-deliverable .invalid identity."
}
$localUserName = [string]$config.LocalUserName
if ([string]::IsNullOrWhiteSpace($localUserName) -or $localUserName.Length -gt 120 -or $localUserName -match '[\x00-\x1F\x7F]') {
  throw "LocalUserName must be a bounded printable value."
}
$buildRoot = Join-Path $installerRoot "build"
$payloadRoot = Join-Path $buildRoot "payload"
$stageRoot = Join-Path $buildRoot "stage"
$outputRoot = Join-Path $installerRoot "output"
$installerPath = Join-Path $outputRoot $installerFileName
$checksumPath = "$installerPath.sha256"
$windowsDirectory = [Environment]::GetFolderPath([Environment+SpecialFolder]::Windows)
if ([string]::IsNullOrWhiteSpace($windowsDirectory)) { throw "The trusted Windows directory could not be resolved." }

function Assert-NoReparsePath([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path)
  $pathRoot = [IO.Path]::GetPathRoot($resolved)
  if ($pathRoot -notmatch '^[A-Za-z]:\\$') { throw "Only local-drive build paths are supported." }
  $current = $pathRoot
  foreach ($component in $resolved.Substring($pathRoot.Length).Split(@('\'), [StringSplitOptions]::RemoveEmptyEntries)) {
    $current = [IO.Path]::Combine($current, $component)
    if (!(Test-Path -LiteralPath $current)) { continue }
    $item = Get-Item -Force -LiteralPath $current
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.LinkType) {
      throw "The installer build path contains a reparse point: $current"
    }
  }
}

function Assert-NoReparseTree([string]$Path) {
  Assert-NoReparsePath $Path
  if (!(Test-Path -LiteralPath $Path -PathType Container)) { return }
  $pending = [Collections.Generic.Stack[string]]::new()
  $pending.Push([IO.Path]::GetFullPath($Path))
  while ($pending.Count -gt 0) {
    $directory = $pending.Pop()
    foreach ($item in Get-ChildItem -Force -LiteralPath $directory) {
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0 -or $item.LinkType) {
        throw "The installer build tree contains a reparse point: $($item.FullName)"
      }
      if ($item.PSIsContainer) { $pending.Push($item.FullName) }
    }
  }
}

function Assert-BuildPath([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path)
  $allowed = [IO.Path]::GetFullPath($buildRoot).TrimEnd('\') + '\'
  if (!$resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe installer build path: $resolved" }
  Assert-NoReparsePath $buildRoot
  Assert-NoReparsePath $resolved
}

function Resolve-TrustedNodeExecutable {
  $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1
  $nodePath = [IO.Path]::GetFullPath($nodeCommand.Source)
  if ([IO.Path]::GetFileName($nodePath) -ine "node.exe") { throw "The resolved Node.js runtime is not node.exe." }

  $nodeItem = Get-Item -LiteralPath $nodePath
  $versionMatch = [Text.RegularExpressions.Regex]::Match([string]$nodeItem.VersionInfo.ProductVersion, '^\d+\.\d+\.\d+')
  if (!$versionMatch.Success) { throw "The Node.js runtime version could not be verified." }
  $nodeVersion = [Version]::Parse($versionMatch.Value)
  if ($nodeVersion -lt [Version]"22.13.0") { throw "Node.js 22.13.0 or newer is required; found $nodeVersion." }

  $signature = Get-AuthenticodeSignature -LiteralPath $nodePath
  if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid -or !$signature.SignerCertificate) {
    throw "The Node.js runtime does not have a valid Authenticode signature."
  }
  if ($signature.SignerCertificate.Subject -notmatch '(?:^|,\s*)O=(?:OpenJS Foundation|Microsoft Corporation)(?:,|$)') {
    throw "The Node.js runtime signer is not an approved OpenJS or Microsoft publisher."
  }
  return $nodePath
}

function Resolve-TrustedNpmCli([string]$NodePath) {
  $nodeDirectory = [IO.Path]::GetFullPath((Split-Path -Parent $NodePath)).TrimEnd('\')
  $npmRoot = [IO.Path]::GetFullPath((Join-Path $nodeDirectory "node_modules\npm"))
  $npmCliPath = [IO.Path]::GetFullPath((Join-Path $npmRoot "bin\npm-cli.js"))
  if (!$npmCliPath.StartsWith($nodeDirectory + '\', [StringComparison]::OrdinalIgnoreCase) -or
      !(Test-Path -LiteralPath $npmCliPath -PathType Leaf)) {
    throw "npm-cli.js was not found beside the trusted Node.js runtime."
  }
  Assert-NoReparsePath $nodeDirectory
  Assert-NoReparsePath $npmCliPath

  try {
    $npmManifest = Get-Content -Raw -LiteralPath (Join-Path $npmRoot "package.json") | ConvertFrom-Json
    $npmVersion = [Version]::Parse([string]$npmManifest.version)
  } catch {
    throw "The adjacent npm installation manifest could not be verified."
  }
  if ($npmManifest.name -cne "npm" -or $npmVersion -lt [Version]"10.0.0") {
    throw "The adjacent npm installation is not an approved npm 10+ CLI."
  }

  try {
    $npmOwnerSid = ([Security.Principal.NTAccount](Get-Acl -LiteralPath $npmRoot).Owner).Translate([Security.Principal.SecurityIdentifier]).Value
  } catch {
    throw "The owner of the adjacent npm installation could not be verified."
  }
  $trustedInstallerSid = "S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464"
  if ($npmOwnerSid -notin @("S-1-5-18", "S-1-5-32-544", $trustedInstallerSid)) {
    throw "The adjacent npm installation must be owned by SYSTEM, Administrators or TrustedInstaller."
  }

  $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $untrustedWriterSids = @("S-1-1-0", "S-1-5-11", "S-1-5-32-545", $currentSid)
  $writeRights = [Security.AccessControl.FileSystemRights]::WriteData -bor
    [Security.AccessControl.FileSystemRights]::AppendData -bor
    [Security.AccessControl.FileSystemRights]::WriteExtendedAttributes -bor
    [Security.AccessControl.FileSystemRights]::WriteAttributes -bor
    [Security.AccessControl.FileSystemRights]::Delete -bor
    [Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor
    [Security.AccessControl.FileSystemRights]::ChangePermissions -bor
    [Security.AccessControl.FileSystemRights]::TakeOwnership
  foreach ($rule in (Get-Acl -LiteralPath $npmRoot).Access) {
    if ($rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or
        ($rule.FileSystemRights -band $writeRights) -eq 0) { continue }
    try { $ruleSid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value } catch { continue }
    if ($ruleSid -in $untrustedWriterSids) { throw "The adjacent npm installation is writable by an untrusted principal." }
  }
  return $npmCliPath
}

foreach ($path in @($payloadRoot, $stageRoot)) {
  Assert-BuildPath $path
  if (Test-Path -LiteralPath $path) {
    Assert-NoReparseTree $path
    Remove-Item -LiteralPath $path -Recurse -Force
  }
  [void][IO.Directory]::CreateDirectory($path)
  Assert-NoReparsePath $path
}
Assert-NoReparsePath $outputRoot
[void][IO.Directory]::CreateDirectory($outputRoot)
Assert-NoReparsePath $outputRoot
$trustedNodePath = Resolve-TrustedNodeExecutable
$trustedNpmCliPath = Resolve-TrustedNpmCli $trustedNodePath

Push-Location $projectRoot
try {
  if (!(Test-Path -LiteralPath (Join-Path $projectRoot "package-lock.json") -PathType Leaf)) {
    throw "A package-lock.json file is required for a reproducible installer build."
  }
  & $trustedNodePath $trustedNpmCliPath ci --ignore-scripts --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed; the lockfile or dependency integrity check did not pass." }
  & $trustedNodePath $trustedNpmCliPath run build:vercel
  if ($LASTEXITCODE -ne 0) { throw "The application build failed." }
} finally { Pop-Location }

$standaloneRoot = Join-Path $projectRoot ".next\standalone"
if (!(Test-Path -LiteralPath (Join-Path $standaloneRoot "server.js"))) { throw "Missing freshly built .next/standalone/server.js." }
Assert-NoReparseTree $standaloneRoot
Assert-NoReparseTree (Join-Path $projectRoot "public")

$appRoot = Join-Path $payloadRoot "app"
$runtimeRoot = Join-Path $payloadRoot "runtime"
New-Item -ItemType Directory -Force -Path $appRoot, $runtimeRoot | Out-Null
Copy-Item -Path (Join-Path $standaloneRoot "*") -Destination $appRoot -Recurse -Force
New-Item -ItemType Directory -Force -Path (Join-Path $appRoot ".next\static") | Out-Null
Copy-Item -Path (Join-Path $projectRoot ".next\static\*") -Destination (Join-Path $appRoot ".next\static") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "public") -Destination (Join-Path $appRoot "public") -Recurse -Force
Copy-Item -LiteralPath $trustedNodePath -Destination (Join-Path $runtimeRoot "node.exe") -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\launcher.mjs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\local-server.mjs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\local-proxy-security.mjs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\Launch.vbs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\Uninstall.ps1") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "config.psd1") -Destination (Join-Path $payloadRoot "installer-config.psd1") -Force

$settings = [ordered]@{
  port = $publicPort
  localUserEmail = $localUserEmail
  localUserName = $localUserName
  # Replaced with a cryptographically random per-install value by Install.ps1.
  localInstanceToken = ""
}
$settings | ConvertTo-Json | Set-Content -Encoding ascii -LiteralPath (Join-Path $payloadRoot "local-settings.json")

$iconPath = Join-Path $payloadRoot "app-icon.ico"
Add-Type -AssemblyName System.Drawing
$sourceImage = [Drawing.Bitmap]::FromFile((Join-Path $projectRoot "public\og-public-v2.png"))
try {
  $iconBitmap = New-Object Drawing.Bitmap 64, 64
  $graphics = [Drawing.Graphics]::FromImage($iconBitmap)
  try {
    $graphics.Clear([Drawing.Color]::FromArgb(4, 17, 31))
    $graphics.DrawImage($sourceImage, 0, 0, 64, 64)
    $icon = [Drawing.Icon]::FromHandle($iconBitmap.GetHicon())
    $stream = [IO.File]::Create($iconPath)
    try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose() }
  } finally { $graphics.Dispose(); $iconBitmap.Dispose() }
} finally { $sourceImage.Dispose() }

$payloadZip = Join-Path $stageRoot "payload.zip"
Compress-Archive -Path (Join-Path $payloadRoot "*") -DestinationPath $payloadZip -CompressionLevel Optimal -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "Install.ps1") -Destination $stageRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "config.psd1") -Destination $stageRoot -Force

Assert-NoReparsePath $installerPath
Assert-NoReparsePath $checksumPath
if (Test-Path -LiteralPath $installerPath) { Remove-Item -LiteralPath $installerPath -Force }
if (Test-Path -LiteralPath $checksumPath) { Remove-Item -LiteralPath $checksumPath -Force }
$compiler = Join-Path $windowsDirectory "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (!(Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $windowsDirectory "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (!(Test-Path -LiteralPath $compiler)) { throw "The Windows C# compiler is unavailable." }

$compilerArguments = @(
  "/nologo",
  "/target:winexe",
  "/optimize+",
  "/out:$installerPath",
  "/win32icon:$iconPath",
  "/reference:System.Windows.Forms.dll",
  "/resource:$payloadZip,payload.zip",
  "/resource:$(Join-Path $stageRoot 'Install.ps1'),Install.ps1",
  "/resource:$(Join-Path $stageRoot 'config.psd1'),config.psd1",
  (Join-Path $installerRoot "Bootstrapper.cs")
)
& $compiler $compilerArguments
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $installerPath)) { throw "The native installer compiler failed." }

$installer = Get-Item -LiteralPath $installerPath
$installerHash = Get-FileHash -Algorithm SHA256 -LiteralPath $installerPath
"$($installerHash.Hash.ToLowerInvariant())  $($installer.Name)" | Set-Content -Encoding ascii -LiteralPath $checksumPath
Write-Output "Installer created: $($installer.FullName)"
Write-Output "Size: $([Math]::Round($installer.Length / 1MB, 1)) MB"
Write-Output "SHA256: $($installerHash.Hash.ToLowerInvariant())"
Write-Output "Checksum file: $checksumPath"
