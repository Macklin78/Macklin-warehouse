# 抽奖转盘 · 轻量版（Windows）

同一个抽奖转盘，只是换了显示界面的方式。

| | 标准版（Electron） | 轻量版（本目录） |
| --- | --- | --- |
| 体积 | 240 MB（压缩包 150 MB） | **1 MB**（压缩包 315 KB） |
| 首次启动 | 10~40 秒（杀毒软件要扫 240 MB） | **2~3 秒** |
| 平台 | Windows / macOS / Linux | 仅 Windows 10 / 11 |
| 功能 | 完全一样，界面也是同一份代码 | 完全一样 |

## 怎么做的

界面和抽奖逻辑直接用主项目的 `src/index.html` / `styles.css` / `app.js`，没有另抄一份。

普通网页要有服务器才有 `localStorage`，所以这里用 `SetVirtualHostNameToFolderMapping`
把本地目录映射成 `https://dafiyu.lite/`，奖品配置才存得住。

网页文件、WebView2 的两个 dll、以及原生的 `WebView2Loader.dll` 都放进了 exe 的内嵌资源，
第一次运行时解到 `%LOCALAPPDATA%\DaFeiYuWheelLite\`，所以下载下来只有一个文件。

## 目录结构

```
lite/
├─ src/Program.cs        程序这一层（C#，四百行左右）
├─ build/app.manifest    声明 DPI 感知（高分屏不糊）
├─ build/lib/            WebView2 的 dll（需自行下载，见下）
├─ build.bat             一键编译
└─ out/                  编译产物
```

## 编译

1. 把 WebView2 的 3 个 dll 放进 `build/lib/`
   （NuGet 包 `Microsoft.Web.WebView2` 里的 `lib/net462/*.dll`，以及
   `runtimes/win-x64/native/WebView2Loader.dll`）
2. 双击 `build.bat`，产物在 `out/DaFeiYuWheel-Lite.exe`

只用到系统自带的 .NET Framework 4.6.2+（Win10/11 都有），不需要装 .NET SDK 或 Node。

## 数据放在哪

```
%LOCALAPPDATA%\DaFeiYuWheelLite\
├─ www\       界面文件（从 exe 里解出来）
├─ profile\   WebView2 的数据（奖品配置、抽奖记录都在这儿）
├─ bin\       WebView2 的 dll
└─ boot.log   启动日志，出问题时看这个
```

删掉整个文件夹就等于恢复出厂设置。
