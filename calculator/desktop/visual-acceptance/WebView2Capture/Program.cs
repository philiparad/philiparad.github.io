// CAL-012: actual Microsoft Edge WebView2 (not a Chromium stand-in).
// Runs only on Windows in the calculator Tauri workflow.
using System.Drawing;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        if (args.Length != 2)
        {
            Console.Error.WriteLine("Usage: WebView2Capture <staged-frontend> <output-directory>");
            Environment.ExitCode = 2;
            return;
        }
        ApplicationConfiguration.Initialize();
        using var window = new CaptureWindow(Path.GetFullPath(args[0]), Path.GetFullPath(args[1]));
        Application.Run(window);
        Environment.ExitCode = window.ExitCode;
    }
}

internal sealed class CaptureWindow : Form
{
    private readonly string frontend;
    private readonly string output;
    private readonly WebView2 webview;
    internal int ExitCode { get; private set; } = 1;
    private static readonly double[] Factors = [1.0, 1.25, 1.5, 2.0];
    private static readonly string[] Cases =
    [
        "ans", "mode", "eqnTypes", "eqnCoefficients", "fraction",
        "nestedRoot", "fractionAnswer", "engineering"
    ];

    internal CaptureWindow(string frontend, string output)
    {
        this.frontend = frontend;
        this.output = output;
        Text = "CAL-012 WebView2 capture";
        StartPosition = FormStartPosition.Manual;
        Location = new Point(25, 25);
        ClientSize = new Size(800, 420);
        ShowInTaskbar = false;
        webview = new WebView2 { Dock = DockStyle.Fill };
        Controls.Add(webview);
        Shown += async (_, _) =>
        {
            try { await CaptureAll(); ExitCode = 0; }
            catch (Exception error)
            {
                Console.Error.WriteLine("CAL-012 WebView2 failure: " + error);
                ExitCode = 1;
            }
            finally { Close(); }
        };
    }

    private async Task<JsonElement> Evaluate(string javascript)
    {
        var reply = await webview.CoreWebView2.ExecuteScriptAsync(javascript);
        using var json = JsonDocument.Parse(reply);
        return json.RootElement.Clone();
    }

    private async Task CaptureAll()
    {
        if (!File.Exists(Path.Combine(frontend, "visual-fixture.html")))
            throw new FileNotFoundException("The staged visual fixture is missing");
        Directory.CreateDirectory(output);
        var profile = Path.Combine(Path.GetTempPath(), "calculator-cal012-" + Guid.NewGuid().ToString("N"));
        await webview.EnsureCoreWebView2Async(
            await CoreWebView2Environment.CreateAsync(null, profile));
        webview.CoreWebView2.SetVirtualHostNameToFolderMapping(
            "calculator-cal012.test", frontend, CoreWebView2HostResourceAccessKind.Allow);
        var completed = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        void NavHandler(object? sender, CoreWebView2NavigationCompletedEventArgs e)
            => completed.TrySetResult(e.IsSuccess);
        webview.CoreWebView2.NavigationCompleted += NavHandler;
        webview.CoreWebView2.Navigate("https://calculator-cal012.test/visual-fixture.html");
        var success = await completed.Task.WaitAsync(TimeSpan.FromSeconds(30));
        webview.CoreWebView2.NavigationCompleted -= NavHandler;
        if (!success) throw new InvalidOperationException("WebView2 fixture navigation failed");
        var ready = await Evaluate("CAL012.ready()");
        if (ready.ValueKind != JsonValueKind.True)
            throw new InvalidOperationException("Local LCD font could not be loaded in WebView2");
        var actualCases = await Evaluate("CAL012.cases");
        if (actualCases.ValueKind != JsonValueKind.Array ||
            !actualCases.EnumerateArray().Select(item => item.GetString()).SequenceEqual(Cases))
            throw new InvalidOperationException("WebView2 scenarios differ from the shared fixture");

        var captures = new List<object>();
        foreach (var factor in Factors)
        {
            await webview.CoreWebView2.CallDevToolsProtocolMethodAsync(
                "Emulation.setDeviceMetricsOverride",
                JsonSerializer.Serialize(new { width = 800, height = 420, deviceScaleFactor = factor, mobile = false }));
            var scale = factor.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture).Replace('.', '_');
            foreach (var scenario in Cases)
            {
                var result = await Evaluate("CAL012.render(" + JsonSerializer.Serialize(scenario) + ")");
                if (result.GetProperty("mode").GetString() != "enhanced" ||
                    !result.GetProperty("fontReady").GetBoolean())
                    throw new InvalidOperationException("LCD renderer did not activate: " + scenario);
                var rect = await Evaluate(@"(() => {
                    const b = document.getElementById('lcd').getBoundingClientRect();
                    return {x:b.x,y:b.y,width:b.width,height:b.height};
                })()");
                var clip = new
                {
                    x = rect.GetProperty("x").GetDouble(),
                    y = rect.GetProperty("y").GetDouble(),
                    width = rect.GetProperty("width").GetDouble(),
                    height = rect.GetProperty("height").GetDouble(),
                    scale = 1
                };
                var screenshot = await webview.CoreWebView2.CallDevToolsProtocolMethodAsync(
                    "Page.captureScreenshot",
                    JsonSerializer.Serialize(new {
                        format = "png", captureBeyondViewport = false, fromSurface = true, clip
                    }));
                using var screenshotJson = JsonDocument.Parse(screenshot);
                var bytes = Convert.FromBase64String(
                    screenshotJson.RootElement.GetProperty("data").GetString()
                    ?? throw new InvalidOperationException("Screenshot has no data"));
                if (bytes.Length < 100) throw new InvalidOperationException("Empty WebView2 screenshot");
                var name = scenario + "-dpr-" + scale + ".png";
                await File.WriteAllBytesAsync(Path.Combine(output, name), bytes);
                captures.Add(new { scenario, factor, filename = name, bytes = bytes.Length,
                    ink = result.GetProperty("dark").GetInt32(),
                    chromiumVersion = webview.CoreWebView2.BrowserVersionString });
                Console.WriteLine("WebView2 capture: " + name);
            }
        }
        await File.WriteAllTextAsync(Path.Combine(output, "manifest.json"),
            JsonSerializer.Serialize(captures, new JsonSerializerOptions { WriteIndented = true }));
        if (captures.Count != Cases.Length * Factors.Length)
            throw new InvalidOperationException("Incomplete WebView2 screenshot coverage");
        Console.WriteLine("CAL-012 WebView2: " + captures.Count + " screenshots complete");
    }
}
