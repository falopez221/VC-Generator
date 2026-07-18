# Editable Windows installer

The installer is intentionally source-controlled and editable. Change `config.psd1` to customize the product name, version, publisher, installation folder, local port, local display name, shortcut behavior and output filename. `Bootstrapper.cs` contains the editable native setup window and extraction flow.

## Build

From PowerShell in the repository root:

```powershell
$windowsDirectory = [Environment]::GetFolderPath([Environment+SpecialFolder]::Windows)
$powershell = Join-Path $windowsDirectory "System32\WindowsPowerShell\v1.0\powershell.exe"
& $powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1
```

The resulting installer is written to `installer/output`. It bundles the standalone application and a private Node.js runtime, so the target machine does not need Node.js or npm.

The build accepts only an Authenticode-valid OpenJS/Microsoft Node.js runtime and resolves `npm-cli.js` from that same protected installation. It runs `npm ci --ignore-scripts` against `package-lock.json` before every application build; a stale lockfile or failed package-integrity check stops packaging.

## Installed behavior

- installs per-user under `%LOCALAPPDATA%` without administrator privileges;
- binds the application only to `127.0.0.1`;
- uses a loopback-only local gateway to provide the installed user identity;
- creates optional Desktop and Start Menu shortcuts;
- starts the local server and opens `/app` in the default browser;
- registers an uninstaller in Windows Apps & Features;
- stores editable runtime settings in `local-settings.json` inside the installation directory.

The launcher and web process receive a small allowlist of ordinary Windows environment variables, not the caller's arbitrary credentials or tokens. A random per-install marker binds the launcher to its own public loopback proxy. On every start, the proxy also creates an ephemeral secret and verifies the internal Next.js child with a fresh challenge/HMAC before it starts listening publicly. That same secret authenticates every gateway request, so direct access to the adjacent internal port cannot spoof the installed identity.

The loopback gateway rejects cross-site writes before reading their bodies, caps request bodies at 20 KiB, and bounds simultaneous requests and sockets. Client-supplied forwarding, identity, IP and gateway-proof headers are removed before the gateway adds its trusted values.

## Filesystem safety

The installer accepts only local-drive child directories under the current user's `LOCALAPPDATA` or temporary directory (the repository build directory is also accepted for packaging tests). Existing junctions, symbolic links and other reparse points in the path are rejected, and a non-empty destination must contain the matching installation marker. Directory ownership is checked before updates or removal.

The uninstaller revalidates the path, owner and installation marker before removal. Its delayed self-cleanup uses a temporary PowerShell helper with Base64-encoded arguments and `Remove-Item -LiteralPath`; it never sends the installation path through `cmd.exe`. Custom roots containing characters such as `%`, `&` or `;` are therefore treated as literal path text.

The local installed identity is a loopback-only convenience for this public preview. It is not the future password-based private authentication system.
