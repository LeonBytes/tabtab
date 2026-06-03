# TabEcho

> Save, name, and restore your browser tab sessions.

**Language:** [English](#english) | [中文](#中文)

---

## English

TabEcho is a Chrome extension for saving groups of browser tabs as named sessions. It helps you quickly restore workspaces for studying, coding, research, entertainment, or any recurring browsing context.

### Features

#### v1.6.0
- **Tab layout switcher** — The full-page detail view includes three layout modes, and your preference is saved locally:
  - **Grid**: the default responsive card layout with title, URL, and favicon.
  - **Compact**: a denser multi-column layout that hides URLs to save space.
  - **List**: a single-column full-width list for quick scanning.

#### v1.5.0
- **Complete language switching** — Switching between Chinese and English updates all visible UI text immediately across both the popup and full-page manager.
- **Inline full-page save panel** — The full-page manager opens the save workflow directly in the main content area instead of showing a small popup.
- **Session tab management** — Remove individual tabs from a session, or add new tabs from the current browser window.

#### v1.4.0
- **Expand and collapse controls** — Open the full-page manager from the popup, and close the full-page manager from the top-right action.
- **Full-page settings panel** — Theme, custom background, image opacity, and language settings are available in the full-page manager.
- **Full-page save workflow** — Save current-window tabs directly from the full-page manager.

#### v1.3.0
- **Language switching** — Choose Chinese or English in settings. The preference is saved locally.
- **Improved import** — Import sessions from a share code or from a local `.json` backup file.
- **Full-page management mode** — Browse all sessions in a sidebar, inspect session details, open individual tabs, restore, share, delete, and rename sessions.

#### v1.2.0
- **Theme presets** — Dark, light, and eye-care green themes.
- **Custom background color** — Pick a background color and opacity.
- **Local image background** — Use a local image as the background with independent opacity control.
- **Share sessions** — Generate a Base64 share code for a session.
- **Import sessions** — Paste a share code to restore a shared session.

#### v1.1.0
- **Rename sessions** — Edit a session name inline.
- **Export JSON backups** — Export all saved sessions as a dated JSON backup file.

#### v1.0.0
- **Save current tabs** — Save the current browser window as a named session.
- **Custom session names** — Give each session a meaningful name.
- **Selective saving** — Choose exactly which tabs to save.
- **Restore sessions** — Reopen all tabs from a session in a new browser window.
- **Search sessions** — Quickly find saved sessions by name.
- **Delete sessions** — Confirm before deleting a session.
- **Dark UI** — A polished dark interface for readable tab titles and URLs.

### Installation for Development

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select this project folder, the one that contains `manifest.json`.

### Project Structure

```text
webpage manager/
├── manifest.json
├── assets/
│   └── icons/
├── src/
│   ├── background/
│   │   └── background.js
│   ├── fullpage/
│   │   ├── fullpage.html
│   │   ├── fullpage.css
│   │   └── fullpage.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── i18n.js
└── README.md
```

### Data Storage

Session data is stored locally with `chrome.storage.local`. TabEcho does not upload your sessions to any server and works fully offline.

### Roadmap

- [ ] Drag-and-drop tab ordering
- [ ] Session groups or tags
- [ ] Chrome Sync support
- [ ] Keyboard shortcuts
- [ ] Additional browser support

---

## 中文

TabEcho 是一个 Chrome 标签页会话管理扩展，可以一键保存、命名、恢复你的浏览器标签页组合，适合学习、编程、资料检索、娱乐等反复切换的浏览场景。

### 功能特性

#### v1.6.0
- **标签页布局切换** — 大框页面详情区右侧新增三种布局切换按钮，偏好自动保存到本地：
  - **平铺（Grid）**：默认，自适应多列卡片，标题 + URL + 图标。
  - **紧凑（Compact）**：更密集的多列展示，隐藏 URL 节省空间，适合标签页多的会话。
  - **列表（List）**：单列全宽行，标题和 URL 在同一行，快速浏览。

#### v1.5.0
- **完整语言切换** — 切换中/英文后，所有界面文字即时更新：Header 统计、侧边栏标题、详情区按钮、空状态提示、弹窗内容等全面覆盖，两个页面均同步生效。
- **全页内嵌保存面板** — 大框页面点击「保存标签页」不再弹出小窗，而是在右侧主内容区直接展开操作面板。
- **会话标签页管理** — 每个标签页卡片右侧新增删除按钮，可单独从会话中移除；详情区新增「添加标签页」按钮。

#### v1.4.0
- **展开/收起图标** — 小窗展开按钮改为斜尖头箭头；全页右上角新增收起按钮，点击关闭当前标签页。
- **全页设置面板** — 设置弹窗包含主题切换、自定义背景、图片透明度、语言切换，与小窗设置一致。
- **全页保存标签页** — 在完整管理界面中保存当前窗口标签页，自动排除扩展页本身。

#### v1.3.0
- **语言切换** — 设置面板新增语言选项，支持中文和 English，切换后即时更新并持久化。
- **导入增强** — 支持粘贴分享码，或从本地 `.json` 备份文件导入全部会话。
- **全页管理模式** — 在新标签页打开完整管理界面，包含侧边栏、详情区、顶部操作栏、恢复、分享、删除、重命名等能力。

#### v1.2.0
- **主题切换** — 提供深色、浅色、护眼绿三套主题。
- **自定义背景颜色** — 颜色选择器 + 透明度滑块。
- **本地图片背景** — 选择本地任意图片作为背景，支持透明度控制、预览和移除。
- **分享会话** — 生成分享码，发给对方后一键导入还原全部标签页。
- **导入会话** — 粘贴分享码即可将他人会话恢复为本地新会话。

#### v1.1.0
- **编辑会话名称** — 点击卡片右上角铅笔图标，直接内联编辑名称。
- **导出 JSON 备份** — 将所有会话导出为带日期的 JSON 文件，方便备份或迁移。

#### v1.0.0
- **保存当前标签页** — 点击插件图标，一键保存当前窗口所有打开的标签页。
- **自定义命名** — 为每次会话起有意义的名字。
- **选择性保存** — 可勾选或取消勾选任意标签页。
- **恢复会话** — 点击「恢复会话」在新窗口中还原所有标签页。
- **搜索会话** — 支持按名称快速搜索已保存的会话。
- **删除会话** — 删除前有确认弹窗，防止误操作。
- **暗色 UI** — 图标、标题、URL 一目了然。

### 安装方法（开发者模式）

1. 打开 Chrome，访问 `chrome://extensions/`。
2. 右上角开启「开发者模式」。
3. 点击「加载已解压的扩展程序」。
4. 选择本项目根目录，也就是包含 `manifest.json` 的文件夹。

### 项目结构

```text
webpage manager/
├── manifest.json
├── assets/
│   └── icons/
├── src/
│   ├── background/
│   │   └── background.js
│   ├── fullpage/
│   │   ├── fullpage.html
│   │   ├── fullpage.css
│   │   └── fullpage.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── i18n.js
└── README.md
```

### 数据存储

会话数据存储在浏览器本地 `chrome.storage.local`，不上传到任何服务器，完全离线可用。

### 开发计划

- [ ] 标签页排序拖拽
- [ ] 会话分组/标签分类
- [ ] Chrome Sync 跨设备同步
- [ ] 快捷键支持
- [ ] 更多浏览器支持
