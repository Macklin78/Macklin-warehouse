@echo off
rem ============================================================
rem  Build the lightweight (WebView2) Windows version.
rem
rem  Requirements:
rem    - Windows 10/11 (csc.exe comes with .NET Framework 4.6.2+)
rem    - WebView2 SDK DLLs placed in build\lib\ :
rem        Microsoft.Web.WebView2.Core.dll
rem        Microsoft.Web.WebView2.WinForms.dll
rem        WebView2Loader.dll
rem      (from NuGet package "Microsoft.Web.WebView2":
rem         lib\net462\*.dll  +  runtimes\win-x64\native\WebView2Loader.dll)
rem ============================================================
setlocal
cd /d "%~dp0"

set "CSC=%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" (
  echo [!] csc.exe not found - install .NET Framework 4.6.2 or newer.
  pause
  exit /b 1
)
if not exist "build\lib\Microsoft.Web.WebView2.WinForms.dll" (
  echo [!] WebView2 SDK DLLs are missing. Put them into build\lib\ first.
  echo     See the header of this file for the exact file names.
  pause
  exit /b 1
)

rem Reuse the web assets from the main project (single source of truth)
copy /y "..\src\index.html" "build\index.html" >nul
copy /y "..\src\styles.css" "build\styles.css" >nul
copy /y "..\src\app.js"     "build\app.js"     >nul
copy /y "..\build\icon.ico" "build\icon.ico"   >nul
if not exist out mkdir out

"%CSC%" -nologo -target:winexe -platform:x64 -optimize+ ^
  -out:out\DaFeiYuWheel-Lite.exe -win32manifest:build\app.manifest ^
  -resource:build\lib\Microsoft.Web.WebView2.Core.dll,bin.Microsoft.Web.WebView2.Core.dll ^
  -resource:build\lib\Microsoft.Web.WebView2.WinForms.dll,bin.Microsoft.Web.WebView2.WinForms.dll ^
  -resource:build\lib\WebView2Loader.dll,bin.WebView2Loader.dll ^
  -resource:build\index.html,www.index.html ^
  -resource:build\styles.css,www.styles.css ^
  -resource:build\app.js,www.app.js ^
  -resource:build\icon.ico,app.ico ^
  -reference:System.dll -reference:System.Core.dll ^
  -reference:System.Windows.Forms.dll -reference:System.Drawing.dll ^
  -reference:build\lib\Microsoft.Web.WebView2.Core.dll ^
  -reference:build\lib\Microsoft.Web.WebView2.WinForms.dll ^
  src\Program.cs

echo.
echo Built: out\DaFeiYuWheel-Lite.exe
pause
