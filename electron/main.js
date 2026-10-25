/* 抽奖转盘 · Electron 主进程
 * 只负责开一个干净的窗口，所有逻辑都在 src/ 里的网页代码中。
 */
'use strict';

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.argv.includes('--dev');
const DEFAULT_SIZE = { width: 500, height: 880 };
const MIN_SIZE = { width: 380, height: 600 };

// Windows 任务栏分组 / 通知标识
app.setAppUserModelId('com.dafeiyu.wheel');

function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadBounds() {
  try {
    const data = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (data && Number.isFinite(data.width) && Number.isFinite(data.height)) {
      return {
        width: Math.max(MIN_SIZE.width, Math.round(data.width)),
        height: Math.max(MIN_SIZE.height, Math.round(data.height)),
        x: Number.isFinite(data.x) ? Math.round(data.x) : undefined,
        y: Number.isFinite(data.y) ? Math.round(data.y) : undefined
      };
    }
  } catch (e) {
    /* 首次启动或文件损坏：用默认尺寸 */
  }
  return null;
}

function saveBounds(win) {
  try {
    if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    fs.writeFileSync(stateFile(), JSON.stringify(win.getBounds()), 'utf8');
  } catch (e) {
    /* 忽略：记不住窗口大小不影响使用 */
  }
}

let win = null;

function createWindow() {
  const saved = loadBounds();

  win = new BrowserWindow({
    width: saved ? saved.width : DEFAULT_SIZE.width,
    height: saved ? saved.height : DEFAULT_SIZE.height,
    x: saved ? saved.x : undefined,
    y: saved ? saved.y : undefined,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    title: '抽奖转盘',
    backgroundColor: '#f1f2f4',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  // 页面里的外链一律交给系统浏览器，不在应用内导航
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  // F11 全屏；--dev 下额外支持 F12 / Ctrl+R
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (isDev && input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    } else if (isDev && input.control && input.key.toLowerCase() === 'r') {
      win.webContents.reload();
      event.preventDefault();
    }
  });

  win.on('close', () => saveBounds(win));
  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
