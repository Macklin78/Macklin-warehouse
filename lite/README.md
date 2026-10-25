# 抽奖转盘 · 轻量版（Windows / WebView2）

同一个抽奖转盘，把桌面外壳从 Electron 换成 **Windows 自带的 WebView2 运行时**：

| | 标准版（Electron） | 轻量版（本目录） |
| --- | --- | --- |
| 体积 | 约 240 MB（zip 150 MB） | **1 MB**（zip 315 KB） |
| 首次启动 | 10~40 秒（杀毒软件要扫 240 MB） | **2~3 秒** |
| 平台 | Windows / macOS / Linux | 仅 Windows 10 / 11 |
| 功能 | 完全相同（共用同一套 `../src/` 网页代码） | 完全相同 |

## 原理

- 界面、逻辑、抽奖算法全部复用主项目的 `src/index.html` / `styles.css` / `app.js`，**没有第二份代码**
- 通过 WebView2 的 `SetVirtualHostNameToFolderMapping` 把本地目录映射成 `https://dafiyu.lite/`，
  这样 `localStorage` 能像普通网站一样正常持久化
- 三个文件（网页、WebView2 托管 dll、原生 loader）都作为**内嵌资源**打进单个 exe，
  首次运行时解到 `%LOCALAPPDATA%\DaFeiYuWheelLite\`，所以下载下来只有一个文件

## 目录结构

```
lite/
├─ src/Program.cs        宿主程序（WinForms + WebView2，约 400 行）
├─ build/app.manifest    DPI 感知（PerMonitorV2）+ 兼容性声明
├─ build/lib/            WebView2 SDK 的 dll（需自行下载，见下）
├─ build.bat             一键编译
└─ out/                  编译产物
```

## 编译

1. 准备 WebView2 SDK 的 3 个 dll 放进 `build/lib/`
   （NuGet 包 `Microsoft.Web.WebView2` 里的 `lib/net462/*.dll` 与 `runtimes/win-x64/native/WebView2Loader.dll`）
2. 双击 `build.bat`，产物在 `out/DaFeiYuWheel-Lite.exe`

只依赖系统自带的 .NET Framework 4.6.2+（Win10/11 预装），不需要安装 .NET SDK 或 Node。

## 数据存放

```
%LOCALAPPDATA%\DaFeiYuWheelLite\
├─ www\       界面文件（从 exe 内嵌资源解出）
├─ profile\   WebView2 用户数据（奖品配置、抽奖记录都在这里）
├─ bin\       WebView2 的 dll
└─ boot.log   启动日志（排错用）
```

删除整个文件夹 = 恢复出厂设置。
