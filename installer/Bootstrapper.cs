using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

internal static class Bootstrapper
{
    [STAThread]
    private static int Main(string[] args)
    {
        bool quiet = Array.Exists(args, value => string.Equals(value, "--quiet", StringComparison.OrdinalIgnoreCase));
        string testInstallRoot = null;
        for (int index = 0; index < args.Length - 1; index++)
        {
            if (string.Equals(args[index], "--install-root", StringComparison.OrdinalIgnoreCase)) testInstallRoot = args[index + 1];
        }
        string tempRoot = Path.Combine(Path.GetTempPath(), "VentureGovernanceSetup_" + Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(tempRoot);
            ExtractResource("payload.zip", Path.Combine(tempRoot, "payload.zip"));
            ExtractResource("Install.ps1", Path.Combine(tempRoot, "Install.ps1"));
            ExtractResource("config.psd1", Path.Combine(tempRoot, "config.psd1"));

            string script = Path.Combine(tempRoot, "Install.ps1");
            string windowsDirectory = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
            string powershellPath = Path.Combine(windowsDirectory, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
            if (!File.Exists(powershellPath)) throw new FileNotFoundException("The trusted Windows PowerShell executable is unavailable.", powershellPath);
            string powershellArguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"";
            if (!string.IsNullOrWhiteSpace(testInstallRoot))
            {
                string encodedInstallRoot = Convert.ToBase64String(Encoding.UTF8.GetBytes(testInstallRoot));
                powershellArguments += " -EncodedInstallRoot " + encodedInstallRoot + " -SkipShortcuts -SkipRegistry -NoLaunch";
            }
            var startInfo = new ProcessStartInfo
            {
                FileName = powershellPath,
                Arguments = powershellArguments,
                WorkingDirectory = tempRoot,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            };

            using (Process process = Process.Start(startInfo))
            {
                string output = process.StandardOutput.ReadToEnd();
                string error = process.StandardError.ReadToEnd();
                process.WaitForExit();
                if (process.ExitCode != 0)
                {
                    if (!quiet) MessageBox.Show(
                            "The installation could not be completed.\n\n" + error + output,
                            "Venture Governance Local Setup",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                    return process.ExitCode;
                }
            }

            if (!quiet) MessageBox.Show(
                    "Venture Governance Local was installed successfully.",
                    "Venture Governance Local Setup",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            return 0;
        }
        catch (Exception error)
        {
            if (!quiet) MessageBox.Show(
                    "The installer encountered an error.\n\n" + error.Message,
                    "Venture Governance Local Setup",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            return 1;
        }
        finally
        {
            try { if (Directory.Exists(tempRoot)) Directory.Delete(tempRoot, true); }
            catch { }
        }
    }

    private static void ExtractResource(string resourceName, string destination)
    {
        Assembly assembly = Assembly.GetExecutingAssembly();
        using (Stream input = assembly.GetManifestResourceStream(resourceName))
        {
            if (input == null) throw new InvalidOperationException("Missing embedded resource: " + resourceName);
            using (FileStream output = File.Create(destination)) input.CopyTo(output);
        }
    }
}
