# Session Handoff: 2025-05-20

## 当前状态

| 服务 | 地址 | 状态 |
|------|------|------|
| 后端 | http://localhost:3000 | 运行中 (production) |
| 前端 | `packages/client/dist/` | 已 build |

**启动命令：**
```bash
# 开发模式（一键启动 server + client，自动清理残留进程和旧构建）
bun run dev

# 生产模式（build + 启动 server，自动 serve 前端静态文件）
bun run start

# 单独启动（高级）
bun run dev:server   # backend only
bun run dev:client   # Vite dev server only
bun run build        # build client
```

Server 启动时自动检测并打印局域网 IP（如 `http://192.168.1.xxx:3000`），同网络设备可直接访问。

---

## 本次会话完成的工作

### 1. 前端虚拟滚动（核心性能优化）

**问题：** 几千条媒体数据时 DOM 节点过多导致卡顿。

**方案：** 实现网格虚拟滚动。无论底层有几千条数据，DOM 中只保留视口附近 ~20-40 个节点。

- **新增** `packages/client/src/components/MediaCard.svelte` — 卡片组件抽离
- **重写** `App.svelte` 网格区域 — `ResizeObserver` 动态计算列数 + 绝对定位虚拟容器
  - 桌面端列数：`max(2, floor(width / 220))`
  - 移动端：固定 2 列
  - 行高估算：桌面 `280px` / 移动 `220px`
  - 上下各缓冲 4 行
- **移除** `displayLimit` 无限滚动（已无用）

**验证数据（3028 items）：**
- 虚拟容器高度：`282800px`（精确滚动条）
- 实际 DOM 节点：`18-33` 个（恒定）

### 2. 音频播放器 UI 重构

- 移除原生 `<audio controls>`，替换为自定义样式控件
- 左侧：大封面图 + 进度条（可点击/键盘左右箭头）+ 时间 + 播放/暂停 + 音量
- 右侧：歌词（保持）
- 新增图标：`pause`、`volume-up`、`volume-off`、`menu`
- 播放器弹窗移动端全屏适配（`100dvh`，无边框圆角）

### 3. 移动端适配

- 桌面端：侧边栏 220px（保持）
- 移动端：
  - 顶部固定导航栏（汉堡菜单 + Logo + 搜索框）
  - 横向滚动分类 Tabs
  - 抽屉式侧边栏（带关闭按钮）
  - 2 列紧凑网格

### 4. 全局沉浸式体验

- 所有滚动区域隐藏滚动条（`scrollbar-width: none` + `::-webkit-scrollbar`）
- 去除移动端 tap 高亮（`-webkit-tap-highlight-color: transparent`）
- 暗色主题选中文本样式（`::selection`）
- `index.html` title 改为 `MSP`，添加 `theme-color`

### 5. 局域网访问修复

**问题：** 其他设备通过局域网 IP 访问前端时显示 "No items found."

**根因：** `api.ts` 硬编码 `http://localhost:3000`，其他设备请求不到后端。

**修复：** `api.ts` 使用 `window.location.hostname` 动态构建 API 地址：
```ts
const API_BASE = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3000`
  : 'http://localhost:3000';
```

### 6. 音频进度条跳转 Bug 修复

**问题：** 点击音频进度条时自动从头重新播放，无法跳转。

**根因：** 转码后的音频流通过 `pipe:1` 输出，浏览器无法在其中 seek。设置 `currentTime` 会导致加载失败并回退到 0。

**修复（前后端配合）：**
- **后端** `transcode-pipeline.ts`：音频转码时把 `-ss offset` 从 `-i` 之后移到 `-i` 之前（input seeking），加快 seek 速度
- **前端** `VideoPlayer.svelte`：
  - 保存 `probeResult`，使用 `probe.duration` 作为总时长（稳定，不被重新加载覆盖）
  - 新增 `seekOffset` 状态：转码音频 seek 时记录偏移量
  - `displayTime = currentTime + seekOffset`，进度条、时间显示、歌词同步均基于 `displayTime`
  - 转码音频点击进度条 → 计算目标时间 → `playerEngine.getStreamUrl(id, true, offset)` 重新加载
  - 直接播放音频保持 `currentTime = targetTime`
  - 键盘左右箭头支持（±5 秒，自动判断直接/转码流）

### 7. Scanner 文件黑名单

**问题：** 非媒体文件（如 `.txt`, `.exe`, `.zip` 等）被扫描入库。

**修复：** `scanner/engine.ts` 中增加白名单过滤：
```ts
if (kind === 'other' && !SUBTITLE_EXTS.includes(ext) && !LYRIC_EXTS.includes(ext)) {
  continue;
}
```

只保留：`video`、`audio`、`image` + 字幕/歌词 sidecar 文件。

### 8. 无障碍（a11y）编译警告清零

- Drawer overlay 添加 `role="presentation"`
- 虚拟容器添加 `role="list"` + `aria-label`
- 进度条添加 `role="slider"` + `aria-valuenow/max` + 键盘事件

### 9. 播放列表系统

**新增** `packages/client/src/lib/player/playlist.ts` — `PlaylistManager` 单例：
- 按类型分离播放列表（audio/video 分开）
- 三种播放模式：`loop`（顺序）、`shuffle`（加权随机）、`repeat-one`
- shuffle 模式：已播放权重 0.05，未播放权重 1.0，一轮结束后自动重置
- `setPlaylist(items, startIndex)` / `next()` / `prev()` / `toggleMode()`

**前端集成：**
- `App.svelte`：`playMode = $state(playlistManager.mode)` 实时同步
- `VideoPlayer.svelte`：音频/视频控制栏均显示播放模式按钮
- `handleEnded()`：`repeat-one` 重播当前，否则 `onNext()`

### 10. 智能续播

**移除 resume toast**（用户反馈干扰体验）。

**新行为：**
- 手动点击卡片播放 → 若保存进度 > 10 秒，自动 seek 到该位置
- 自动切歌（`onNext`/`onPrev`/`handleEnded`）→ 从头开始播放
- `isAutoPlay` 状态区分手动/自动触发

### 11. 歌词高亮优化

- 桌面端 active line：`transform: scale(1.1)` + `text-shadow`
- 移动端 active line：仅 `text-shadow`（去掉 scale，防止溢出被裁）
- 移除 `mask-image` 渐变（避免边缘淡出）

### 12. 启动脚本系统

**问题：** 开发模式需要开两个终端，生产模式 build 后 server 不 serve 前端静态文件，启动前残留进程和旧构建导致冲突。

**新增脚本：**
- `scripts/cleanup.mjs` — 删除 `packages/client/dist/`，通过端口扫描（3000/5173/5174）+ PID 文件双重清理残留的 bun/node/vite 进程，只匹配进程名不误杀系统程序
- `scripts/dev.mjs` — `cleanup` → 启动 server + client → 记录 PID → Ctrl+C 时 `taskkill /T /F` 整棵树
- `scripts/start.mjs` — `cleanup` → `build` → 启动生产 server

**根 `package.json`：**
- `bun run dev` → `bun scripts/dev.mjs`
- `bun run start` → `bun scripts/start.mjs`

### 13. FFmpeg 硬件加速检测修复

**问题：** 所有视频走 CPU 转码（`libx264`），GPU 未启用。

**根因 1：** `testEncoder` 用 `nullsrc=s=64x64:d=1` 测试编码器，64×64 像素低于 NVENC/AMF 最小分辨率限制，初始化直接失败。
**根因 2：** `testEncoder` 只检查 exit code，但 ffmpeg 编码失败时 exit code 也可能是 0（"Conversion failed" 但返回 0）。

**修复：**
- 测试分辨率改为 `testsrc=duration=1:size=320x240:rate=1`
- 同时检查 stderr 的 `Error`/`failed` 关键字和 stdout 中是否有实际编码的帧
- **关键发现：** ffmpeg 把所有输出（包括 `frame=` 进度）写到了 stderr，stdout 是空的。`wroteFrames` 检查对象从 stdout 改为 stderr

### 14. Remux 直通修复

**问题：** MKV 里的 h264+aac 被全量重新编码（浪费算力），而不是只换容器。

**根因：** `transcode-pipeline.ts` 中 `probe.needVideoTranscode || probe.strategy === 'remux'` 把 remux 也推进了重新编码分支。

**修复：** 改为 `probe.needVideoTranscode`，remux 时走 `-c:v copy -c:a copy`（只换容器，不重新编码）。

### 15. 启动 URL 高亮与局域网 IP 显示

**问题：** 启动后终端中 URL 被大量日志淹没，用户找不到访问地址；局域网设备需要手动猜测 IP。

**修复：**
- Server 启动日志中的 URL 使用 ANSI 加粗 + 青色高亮
- `scripts/dev.mjs` 和 `scripts/start.mjs` 在启动 2 秒后打印醒目横幅
- Server 自动检测局域网 IP（过滤虚拟网卡和链路本地地址），同时打印 localhost 和 LAN 地址

---

## 关键已知问题（未修复）

### 移动端音频播放器歌词区域高度 Bug

**现象：** 移动端音频播放器中，当前高亮歌词行（active line）被播放控件面板（`.audio-left`）遮挡，显示位置过低。

**根因：** `.audio-left`（封面+进度条+播放控件）和 `.lyrics-section`（歌词）被包裹在同一个 `.player-main` flex 容器内。即使使用 flex/grid 分配空间，LyricsOverlay 内部的 auto-scroll 仍会将 active line 滚动到歌词容器的垂直中间。当歌词容器本身就在屏幕下半部分时，active line 的位置会过低，视觉上像是被播放控件"挡住"。

**已尝试的方案（均未生效）：**
1. `.player-content flex: 1` + `.lyrics-section flex: 1` — 标准 flex 填充，但嵌套 flex 高度计算不可靠
2. JS ResizeObserver 精确计算 `.lyrics-section` 高度 — 计算正确但无法解决 auto-scroll 偏移问题
3. `.player-main.audio-layout display: contents` — 让子元素直接参与 `.player-content` 的 flex 布局，但未达到预期效果

**正确的修复方向（推测）：**
- **方案 A：** 调整 LyricsOverlay 的 auto-scroll 偏移量。在移动端，active line 不应滚动到容器正中间，而应滚动到容器的偏上位置（如 20-30% 处）。这样即使歌词容器在屏幕下半部分，active line 也会显示得更高。
- **方案 B：** 将 `.audio-left` 从 `.player-main` 中移出，放到 `.player-content` 中作为独立 flex item，`.player-main` 只包含 `.lyrics-section`。这需要修改 DOM 结构和对应的桌面端布局。
- **方案 C：** 给 `.lyrics-section` 设置一个 `max-height` 上限，确保歌词容器不会太大，从而让 active line 的"中间位置"更靠上。

### Bun ReadableStream 二进制损坏（Windows）

**现象：** 通过 Elysia/Bun HTTP 返回 `new Response(ReadableStream)` 时，二进制数据被替换为 `0xEFBFBD`。

**当前规避：** `transcode-pipeline.ts` 和 `thumbnail-generator.ts` 已改用 `ArrayBuffer` 缓冲模式。**不要改回 ReadableStream。**

---

## 待办 / 后续可优化

- [ ] **移动端歌词高度 Bug** — 见上方"已知问题"
- [ ] 视频播放未在浏览器中实际验证（只验证了音频）
- [ ] 歌词同步滚动效果可进一步优化
- [ ] 播放器关闭时的进度保存可添加重试逻辑
- [ ] 可考虑为音频文件添加可视化波形或频谱动画
- [ ] 图片 tab 的点击行为（目前不可点击，仅展示）
- [ ] 虚拟滚动的行高目前是固定估算值，极端情况下滚动条可能有微小漂移（<5%）
- [ ] 可考虑为 scanner 黑名单添加配置项（当前硬编码在 engine.ts 中）

---

## 文件变更汇总

### 新增
- `packages/client/src/components/MediaCard.svelte`
- `packages/client/src/components/Icon.svelte`
- `packages/client/src/lib/api.ts`
- `packages/client/src/lib/format.ts`
- `packages/client/src/lib/player/playlist.ts`
- `scripts/cleanup.mjs` — 进程与构建清理
- `scripts/dev.mjs` — 一键开发启动
- `scripts/start.mjs` — 一键生产启动

### 修改（按重要性排序）
- `packages/client/src/App.svelte` — 虚拟滚动 + 移动端适配 + 播放列表集成
- `packages/client/src/components/player/VideoPlayer.svelte` — 音频UI重构 + seek修复 + 播放模式 + 智能续播
- `packages/client/src/components/player/LyricsOverlay.svelte` — 歌词高亮优化
- `packages/server/src/streaming/transcode-pipeline.ts` — 音频转码 `-ss` 位置修复 + remux 直通修复
- `packages/server/src/streaming/hw-accel-detector.ts` — 分辨率修复 + stderr 检测修复
- `packages/server/src/index.ts` — 静态文件服务 + LAN IP 检测 + URL 高亮
- `packages/client/src/lib/api.ts` — 动态局域网IP
- `packages/server/src/scanner/engine.ts` — 文件类型白名单
- `package.json` — 新增 `dev`/`start` 脚本
- `README.md` / `AGENTS.md` — 启动说明更新
- `packages/client/index.html` — title + theme-color
- `packages/client/src/styles/tokens.css` — tap-highlight + selection

### 删除
- `packages/client/src/lib/Counter.svelte`
- `packages/client/src/assets/hero.png`
- `packages/client/src/assets/svelte.svg`
- `packages/client/src/assets/vite.svg`
