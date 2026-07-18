# Editable Windows installer

The installer is intentionally source-controlled and editable. Change `config.psd1` to customize the product name, version, publisher, installation folder, local port, local display name, shortcut behavior and output filename. `Bootstrapper.cs` contains the editable native setup window and extraction flow.

## Build

From PowerShell in the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\Build-Installer.ps1
```

The resulting installer is written to `installer/output`. It bundles the standalone application and a private Node.js runtime, so the target machine does not need Node.js or npm.

## Installed behavior

- installs per-user under `%LOCALAPPDATA%` without administrator privileges;
- binds the application only to `127.0.0.1`;
- uses a loopback-only local gateway to provide the installed user identity;
- creates optional Desktop and Start Menu shortcuts;
- starts the local server and opens `/app` in the default browser;
- registers an uninstaller in Windows Apps & Features;
- stores editable runtime settings in `local-settings.json` inside the installation directory.

The local installed identity is a loopback-only convenience for this public preview. It is not the future password-based private authentication system.
