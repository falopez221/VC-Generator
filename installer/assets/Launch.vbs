Option Explicit
Dim shell, fileSystem, root, nodePath, launcherPath, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")
root = fileSystem.GetParentFolderName(WScript.ScriptFullName)
nodePath = fileSystem.BuildPath(root, "runtime\node.exe")
launcherPath = fileSystem.BuildPath(root, "launcher.mjs")
command = Chr(34) & nodePath & Chr(34) & " " & Chr(34) & launcherPath & Chr(34)
shell.Run command, 0, False
