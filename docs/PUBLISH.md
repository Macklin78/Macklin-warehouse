# 发布到 GitHub 的完整步骤

> 按顺序执行即可。命令在仓库根目录（`dafiyu-wheel/`）下运行。

## 0. 准备

- 安装 [Git for Windows](https://git-scm.com/download/win)
- 有一个 GitHub 账号
- 建议配置一次身份（只需一次）：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

## 1. 在本地初始化仓库

```bash
git init -b main
git add .
git commit -m "feat: 抽奖转盘 v1.1.0（桌面版 + 网页版）"
```

> `node_modules/`、`dist/` 已经在 `.gitignore` 里，不会被提交。
> 打包出来的 exe 有 90MB+，**不要**提交进仓库，后面用 Release 上传。

## 2. 在 GitHub 上新建仓库

打开 <https://github.com/new>：

- Repository name：`dafiyu-wheel`
- 公开（Public）即可
- **不要**勾选 "Add a README / .gitignore / license"（本地已经有了，否则会冲突）

## 3. 关联远程仓库并推送

```bash
git remote add origin https://github.com/<你的用户名>/dafiyu-wheel.git
git push -u origin main
```

如果配置了 SSH，可以用 `git@github.com:<你的用户名>/dafiyu-wheel.git`。

## 4. 打 tag 触发自动构建（可选）

`.github/workflows/build.yml` 会在推送 `v*` 标签时，自动在 Windows / macOS / Linux 上各构建一份产物：

```bash
git tag v1.1.0
git push origin v1.1.0
```

之后到仓库的 **Actions** 页面就能看到构建进度，跑完可以在对应的 run 里下载 artifact。

## 5. 发布 Release（让别人一键下载 exe）

最简单的方式（网页操作）：

1. 仓库 → 右侧 **Releases** → **Draft a new release**
2. Tag 选 `v1.1.0`（或新建），标题写 `v1.1.0 首个版本`
3. 把本地 `dist/DaFeiYuWheel-1.1.0-portable.exe` 拖进上传区
4. 写一段更新说明，点 **Publish release**

这样 README 里的 `Releases` 链接就能直接下载到免安装 exe 了。

> 也可以用 GitHub CLI 一步完成：
> ```bash
> gh release create v1.1.0 dist/DaFeiYuWheel-1.1.0-portable.exe --title "v1.1.0" --notes "首个版本"
> ```

## 6. 建议补充的仓库信息

在仓库首页右侧 **About**（齿轮图标）里填：

- Description：`带权重的抽奖转盘 · 桌面版 + 网页版，零依赖、离线可用`
- Website：如果你把 `src/` 部署到 GitHub Pages，可以填那个地址
- Topics：`lottery` `lucky-wheel` `raffle` `spinner` `electron` `javascript` `canvas` `抽奖`

### 顺手把网页版挂到 GitHub Pages（免费）

仓库 → **Settings** → **Pages** → Source 选 `Deploy from a branch` →
Branch 选 `main`、目录选 `/ (root)`，保存后访问：

```
https://<你的用户名>.github.io/dafiyu-wheel/src/
```

就能直接在手机/电脑上打开网页版。

## 7. 换成自己的名字和图标（可选）

| 想改什么 | 改哪里 |
| --- | --- |
| 仓库名 / 描述 | GitHub 仓库设置 |
| 应用名（窗口标题、开始菜单） | `package.json` 的 `productName` |
| 打包产物文件名 | `package.json` 的 `build.portable.artifactName` |
| 图标 | 替换 `build/icon.ico`（Windows）和 `build/icon.png`（mac/Linux，512×512 以上） |
| 默认奖品 | `src/app.js` 的 `DEFAULT_NAMES` |
| 扇区配色 | `src/app.js` 的 `PALETTE` |
| 许可证署名 | `LICENSE` 里的 `Copyright (c) 2026 大肥鱼` |

## 8. 常见问题

- **推送被拒（rejected）**：远程仓库已有内容，先 `git pull --rebase origin main` 再推。
- **文件超过 100MB 推不上去**：不要把 `dist/` 里的 exe 提交进仓库，走 Release 上传。
- **Actions 构建失败**：
  - macOS 未签名 → 正常现象，产物是 `dmg`，别人打开时需要右键「打开」；
  - Linux 可能需要 `--no-sandbox` 才能在无显示环境跑，打包本身不受影响。
- **别人下载 exe 被杀毒软件拦**：未签名的 exe 常见现象，可以让对方选择"仍要运行"，
  或者给项目加代码签名证书（Windows 需付费证书）。
