// 抽奖转盘 · 轻量版（WebView2 宿主）
// 目标框架：.NET Framework 4.6.2+（Windows 10/11 自带）
// 编译：csc /target:winexe /platform:x64（见 build.bat）
// 体积特点：单个 exe ≈ 2.6 MB，依赖系统自带的 Edge WebView2 运行时
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;

using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
// 程序集信息（exe 文件属性里显示的"作者/公司"）
[assembly: AssemblyTitle("抽奖转盘 轻量版")]
[assembly: AssemblyDescription("带权重的抽奖转盘 · WebView2 轻量版")]
[assembly: AssemblyProduct("抽奖转盘")]
[assembly: AssemblyCompany("Macklin78")]
[assembly: AssemblyCopyright("Copyright (c) 2026 Macklin78")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]

namespace DaFeiYuWheelLite
{
    internal static class Program
    {
        internal static readonly string DataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "DaFeiYuWheelLite");

        internal static readonly string WwwDir = Path.Combine(DataDir, "www");

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool SetDllDirectory(string lpPathName);

        // 启动排错日志：%LOCALAPPDATA%\DaFeiYuWheelLite\boot.log
        internal static void Log(string message)
        {
            try
            {
                Directory.CreateDirectory(DataDir);
                string line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff", CultureInfo.InvariantCulture)
                    + "  " + message + Environment.NewLine;
                File.AppendAllText(Path.Combine(DataDir, "boot.log"), line);
            }
            catch (Exception)
            {
                // 日志失败不影响主流程
            }
        }

        internal static void LogException(string where, Exception ex)
        {
            Log("EXCEPTION @" + where + " : " + ex.GetType().FullName + " : " + ex.Message);
            Log(ex.ToString());
        }

        // 托管依赖（WebView2 的两个 dll）从内嵌资源解出来后按需加载。
        // 用 Assembly.Load(byte[]) 而不是 LoadFrom：解压出来的 dll 可能带 Zone 标记，
        // LoadFrom 会因此抛出 "尝试从远程位置加载程序集" 的 NotSupportedException。
        private static Assembly OnResolve(object sender, ResolveEventArgs args)
        {
            string file = new AssemblyName(args.Name).Name + ".dll";
            string path = Path.Combine(Path.Combine(DataDir, "bin"), file);
            if (File.Exists(path))
            {
                return Assembly.Load(File.ReadAllBytes(path));
            }
            return null;
        }

        [STAThread]
        private static void Main()
        {
            Log("=== boot start ===");
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            AppDomain.CurrentDomain.AssemblyResolve += new ResolveEventHandler(OnResolve);
            AppDomain.CurrentDomain.UnhandledException += delegate(object s, UnhandledExceptionEventArgs e)
            {
                LogException("AppDomain", e.ExceptionObject as Exception);
            };
            Application.ThreadException += delegate(object s, System.Threading.ThreadExceptionEventArgs e)
            {
                LogException("Thread", e.Exception);
            };

            try
            {
                string bin = Path.Combine(DataDir, "bin");
                Log("prepare dirs: " + DataDir);
                Directory.CreateDirectory(bin);
                Directory.CreateDirectory(WwwDir);

                Unpack("bin.Microsoft.Web.WebView2.Core.dll", Path.Combine(bin, "Microsoft.Web.WebView2.Core.dll"));
                Unpack("bin.Microsoft.Web.WebView2.WinForms.dll", Path.Combine(bin, "Microsoft.Web.WebView2.WinForms.dll"));
                Unpack("bin.WebView2Loader.dll", Path.Combine(bin, "WebView2Loader.dll"));
                Unpack("www.index.html", Path.Combine(WwwDir, "index.html"));
                Unpack("www.styles.css", Path.Combine(WwwDir, "styles.css"));
                Unpack("www.app.js", Path.Combine(WwwDir, "app.js"));
                Log("resources unpacked");

                // WebView2Loader.dll 是原生库，必须在任何 WebView2 调用之前让系统能搜到
                bool dllDir = SetDllDirectory(bin);
                Log("SetDllDirectory=" + dllDir);

                Log("creating form");
                Application.Run(new MainForm());
                Log("=== exit cleanly ===");
            }
            catch (Exception ex)
            {
                LogException("Main", ex);
                MessageBox.Show("启动失败：" + ex.Message + "\r\n\r\n日志：" + Path.Combine(DataDir, "boot.log"),
                    "抽奖转盘", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void Unpack(string resource, string dest)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream src = asm.GetManifestResourceStream(resource))
            {
                if (src == null)
                {
                    throw new InvalidOperationException("缺少内嵌资源: " + resource);
                }
                using (FileStream dst = File.Create(dest))
                {
                    src.CopyTo(dst);
                }
            }
            // 去掉可能存在的“来自互联网”标记，避免 .NET 把它当成远程程序集
            try
            {
                File.Delete(dest + ":Zone.Identifier");
            }
            catch (Exception)
            {
                // 没有该备用流时忽略
            }
        }

        internal static Icon LoadAppIcon()
        {
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("app.ico"))
                {
                    if (s != null)
                    {
                        return new Icon(s);
                    }
                }
            }
            catch (Exception)
            {
                // 图标加载失败不影响使用
            }
            return null;
        }
    }

    internal sealed class MainForm : Form
    {
        private const int DefaultWidth = 500;
        private const int DefaultHeight = 880;
        private const int MinWidth = 380;
        private const int MinHeight = 600;
        private const string VirtualHost = "dafiyu.lite";

        private readonly WebView2 _web = new WebView2();
        private readonly string _stateFile = Path.Combine(Program.DataDir, "window.txt");
        private bool _loaded;

        internal MainForm()
        {
            Text = "抽奖转盘";
            BackColor = Color.FromArgb(241, 242, 244);
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(MinWidth, MinHeight);
            Size = new Size(DefaultWidth, DefaultHeight);
            ApplyIcon();
            ApplySavedBounds();

            _web.Dock = DockStyle.Fill;
            Controls.Add(_web);

            Load += OnFormLoad;
            FormClosing += OnFormClosing;
        }

        private void ApplyIcon()
        {
            Icon ico = Program.LoadAppIcon();
            if (ico != null)
            {
                Icon = ico;
            }
        }

        private async void OnFormLoad(object sender, EventArgs e)
        {
            Program.Log("form load: begin");
            try
            {
                CoreWebView2EnvironmentOptions options = new CoreWebView2EnvironmentOptions(
                    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection");
                Program.Log("form load: CreateAsync start");
                CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(
                    null, Path.Combine(Program.DataDir, "profile"), options);
                Program.Log("form load: CreateAsync done");
                await _web.EnsureCoreWebView2Async(env);
                Program.Log("form load: EnsureCoreWebView2 done");

                CoreWebView2Settings settings = _web.CoreWebView2.Settings;
                settings.AreDevToolsEnabled = false;
                settings.IsStatusBarEnabled = false;
                settings.IsZoomControlEnabled = true;
                settings.AreDefaultContextMenusEnabled = true;

                _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    VirtualHost, Program.WwwDir, CoreWebView2HostResourceAccessKind.Allow);
                _web.CoreWebView2.NewWindowRequested += delegate(object s, CoreWebView2NewWindowRequestedEventArgs args)
                {
                    args.Handled = true;
                };

                Program.Log("form load: navigate");
                _web.CoreWebView2.Navigate("https://" + VirtualHost + "/index.html");
                _loaded = true;
                Program.Log("form load: ok");
            }
            catch (Exception ex)
            {
                Program.LogException("OnFormLoad", ex);
                MessageBox.Show(this,
                    "启动失败：本程序需要 Microsoft Edge WebView2 运行时。\r\n\r\n" +
                    "Windows 10/11 一般都自带；若确实缺失，可从这里安装后再试：\r\n" +
                    "https://go.microsoft.com/fwlink/p/?LinkId=2124703\r\n\r\n" +
                    "错误信息：" + ex.Message,
                    "抽奖转盘", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            }
        }

        private void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            SaveBounds();
        }

        private void ApplySavedBounds()
        {
            try
            {
                if (!File.Exists(_stateFile))
                {
                    return;
                }
                Dictionary<string, int> map = new Dictionary<string, int>();
                foreach (string line in File.ReadAllLines(_stateFile))
                {
                    int idx = line.IndexOf('=');
                    if (idx <= 0)
                    {
                        continue;
                    }
                    int value;
                    if (int.TryParse(line.Substring(idx + 1).Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
                    {
                        map[line.Substring(0, idx).Trim()] = value;
                    }
                }
                int w, h;
                if (map.TryGetValue("w", out w) && map.TryGetValue("h", out h) && w >= MinWidth && h >= MinHeight)
                {
                    Size = new Size(w, h);
                }
                int x, y;
                if (map.TryGetValue("x", out x) && map.TryGetValue("y", out y))
                {
                    Rectangle bounds = new Rectangle(x, y, Width, Height);
                    bool visible = false;
                    foreach (Screen screen in Screen.AllScreens)
                    {
                        if (screen.WorkingArea.IntersectsWith(bounds))
                        {
                            visible = true;
                            break;
                        }
                    }
                    if (visible)
                    {
                        StartPosition = FormStartPosition.Manual;
                        Location = new Point(x, y);
                    }
                }
            }
            catch (Exception)
            {
                // 记不住窗口大小不影响使用
            }
        }

        private void SaveBounds()
        {
            try
            {
                if (WindowState != FormWindowState.Normal)
                {
                    return;
                }
                Directory.CreateDirectory(Program.DataDir);
                string[] lines = new string[]
                {
                    "w=" + Width.ToString(CultureInfo.InvariantCulture),
                    "h=" + Height.ToString(CultureInfo.InvariantCulture),
                    "x=" + Location.X.ToString(CultureInfo.InvariantCulture),
                    "y=" + Location.Y.ToString(CultureInfo.InvariantCulture)
                };
                File.WriteAllLines(_stateFile, lines);
            }
            catch (Exception)
            {
                // 忽略
            }
        }
    }
}
