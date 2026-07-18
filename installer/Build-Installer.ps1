[CmdletBinding()]
param([switch]$SkipApplicationBuild)

$ErrorActionPreference = "Stop"
$installerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $installerRoot
$config = Import-PowerShellDataFile -LiteralPath (Join-Path $installerRoot "config.psd1")
$buildRoot = Join-Path $installerRoot "build"
$payloadRoot = Join-Path $buildRoot "payload"
$stageRoot = Join-Path $buildRoot "stage"
$outputRoot = Join-Path $installerRoot "output"
$installerPath = Join-Path $outputRoot $config.InstallerFileName

function Assert-BuildPath([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path)
  $allowed = [IO.Path]::GetFullPath($buildRoot).TrimEnd('\') + '\'
  if (!$resolved.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe installer build path: $resolved" }
}

foreach ($path in @($payloadRoot, $stageRoot)) {
  Assert-BuildPath $path
  if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $path | Out-Null
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

if (!$SkipApplicationBuild) {
  Push-Location $projectRoot
  try {
    & npm.cmd run build:vercel
    if ($LASTEXITCODE -ne 0) { throw "The application build failed." }
  } finally { Pop-Location }
}

$standaloneRoot = Join-Path $projectRoot ".next\standalone"
if (!(Test-Path -LiteralPath (Join-Path $standaloneRoot "server.js"))) { throw "Missing .next/standalone/server.js. Run without -SkipApplicationBuild." }

$appRoot = Join-Path $payloadRoot "app"
$runtimeRoot = Join-Path $payloadRoot "runtime"
New-Item -ItemType Directory -Force -Path $appRoot, $runtimeRoot | Out-Null
Copy-Item -Path (Join-Path $standaloneRoot "*") -Destination $appRoot -Recurse -Force
New-Item -ItemType Directory -Force -Path (Join-Path $appRoot ".next\static") | Out-Null
Copy-Item -Path (Join-Path $projectRoot ".next\static\*") -Destination (Join-Path $appRoot ".next\static") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "public") -Destination (Join-Path $appRoot "public") -Recurse -Force
Copy-Item -LiteralPath (Get-Command node.exe).Source -Destination (Join-Path $runtimeRoot "node.exe") -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\launcher.mjs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\local-server.mjs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\Launch.vbs") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "assets\Uninstall.ps1") -Destination $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "config.psd1") -Destination (Join-Path $payloadRoot "installer-config.psd1") -Force

$settings = [ordered]@{
  port = [int]$config.Port
  localUserEmail = [string]$config.LocalUserEmail
  localUserName = [string]$config.LocalUserName
}
$settings | ConvertTo-Json | Set-Content -Encoding ascii -LiteralPath (Join-Path $payloadRoot "local-settings.json")

$iconPath = Join-Path $payloadRoot "app-icon.ico"
Add-Type -AssemblyName System.Drawing
$sourceImage = [Drawing.Bitmap]::FromFile((Join-Path $projectRoot "public\og.png"))
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
Copy-Item -LiteralPath (Join-Path $installerRoot "Install.cmd") -Destination $stageRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "Install.ps1") -Destination $stageRoot -Force
Copy-Item -LiteralPath (Join-Path $installerRoot "config.psd1") -Destination $stageRoot -Force

if (Test-Path -LiteralPath $installerPath) { Remove-Item -LiteralPath $installerPath -Force }
$compiler = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (!(Test-Path -LiteralPath $compiler)) { $compiler = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe" }
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
Write-Output "Installer created: $($installer.FullName)"
Write-Output "Size: $([Math]::Round($installer.Length / 1MB, 1)) MB"
