# 模块 06 — 客户端 UI 与交互 (Client UI & Interaction)

> 对应 URS §3.1  
> 负责自适应响应式布局、设计令牌/主题系统、精细微动画、全功能播放器交互及全局快捷键

> [!NOTE]
> 本文档为设计规格。当前实际实现状态：
> - **响应式布局**、**虚拟滚动网格**、**侧边栏/抽屉导航**、**搜索过滤** 已实现
> - **暗色/明亮主题切换**、**底部播放条**、**目录树浏览模式** 尚未实现
> - **全局快捷键**（空格播放/暂停、左右箭头 seek、上下箭头音量）已在 `VideoPlayer.svelte` 中实现

---

## 1. 界面与交互流 (Layout Flow)

```
+-----------------------------------------------------------------------+
|  Logo  | 全局搜索...                       | [暗色/明亮] | ⚙️设置 |
+-----------------------------------------------------------------------+
|        |                                                              |
|  首页  |   最近观看 (断点续播卡片流，支持平滑悬浮滑入)               |
|  视频  |   +-------------------------------------------------------+  |
|  音频  |   | [封面缩略图] -> 鼠标悬浮播放按钮微动画                |  |
|  图片  |   +-------------------------------------------------------+  |
|  文档  |                                                              |
|        |   媒体内容区 (网格模式 / 目录树模式)                         |
|  收藏  |   [文件夹 A]   [文件夹 B]   [视频.mp4]   [音频.mp3]          |
|        |                                                              |
+--------+--------------------------------------------------------------+
| 🎧 底部播放条: 媒体名称 (LRC歌词平滑滚动中) |  ⏸️  | 🔊 80% | ⚙️码率 |  全屏 |
+-----------------------------------------------------------------------+
```

---

## 2. 设计令牌与色彩系统 (Theme System)

**文件位置**: `client/src/styles/tokens.css` & `themes.css`

**设计理念**:
- 采用 **HSL 动态色彩系统**，支持暗黑模式 (Dark Mode) 和明亮模式 (Light Mode)。
- 拒绝纯白和纯黑，使用莫兰迪色系低饱和背景。
- 引入 **玻璃态 (Glassmorphism)**：使用 `backdrop-filter: blur(16px)` 和半透明白/黑边框，创造多维悬浮视觉。

**设计变量 (Tokens)**:
```css
:root {
  /* 基础字体 */
  --font-sans: 'Outfit', 'Inter', -apple-system, sans-serif;
  
  /* 统一过渡时间 */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 统一圆角 */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
}

[data-theme="dark"] {
  --bg-base: hsl(222, 15%, 10%);       /* 经典深邃底色 */
  --bg-surface: rgba(30, 41, 59, 0.7);  /* 半透明卡片表面 */
  --border-color: rgba(255, 255, 255, 0.08);
  --text-primary: hsl(210, 40%, 98%);
  --text-secondary: hsl(215, 20%, 65%);
  --accent: hsl(250, 85%, 65%);         /* 微妙的紫罗兰主调 */
  --accent-glow: rgba(124, 58, 237, 0.3);
}

[data-theme="light"] {
  --bg-base: hsl(210, 20%, 98%);        /* 暖灰白色 */
  --bg-surface: rgba(255, 255, 255, 0.8);
  --border-color: rgba(0, 0, 0, 0.06);
  --text-primary: hsl(222, 47%, 11%);
  --text-secondary: hsl(215, 16%, 47%);
  --accent: hsl(250, 80%, 60%);
  --accent-glow: rgba(124, 58, 237, 0.15);
}
```

---

## 3. 微动画规范 (Micro-Animations)

**文件位置**: `client/src/styles/animations.css`

**关键交互动效**:
1. **媒体卡片悬浮**:
   - `transform: translateY(-4px) scale(1.02)`，带有细腻的阴影扩展 `box-shadow: 0 12px 24px -10px var(--accent-glow)`。
   - 动画过渡时间：`var(--transition-normal)`。
2. **播放按钮显现**:
   - 鼠标滑入卡片时，播放图标从 `opacity: 0; transform: scale(0.8)` 渐变至 `opacity: 1; transform: scale(1)`。
3. **加载中状态骨架屏 (Skeleton)**:
   - 采用对角线闪烁的渐变流光背景：
     ```css
     @keyframes shimmer {
       100% { transform: translateX(100%); }
     }
     ```
4. **控制栏自动隐藏**:
   - 全屏播放时，鼠标静止 3 秒后，控制栏 `translateY(100%)` 划出，光标隐藏 `cursor: none`；鼠标移动时顺畅移回。

---

## 4. 自适应布局架构 (Responsive Layout)

**框架组件划分**:
- `client/src/components/layout/Shell.svelte`:
  - 检测屏幕宽度（结合 CSS Media Queries 和 Svelte 状态）。
  - **大屏**: 侧边固定导航栏，主内容区自适应，播放器右下角悬浮或折叠在底部。
  - **小屏**: 侧边栏折叠隐藏，转为底部 TabBar 导航，播放器强制沉浸式全屏渲染。

---

## 5. 多媒体播放器内核与 UI (Custom Player)

**文件位置**: `client/src/components/player/VideoPlayer.svelte` & `AudioPlayer.svelte`

**控制组件要求**:
1. **自定义进度条**:
   - 实现悬浮时间预览（Hover Time Tooltip）。
   - 双层进度展示：背景深色条 + 缓冲进度条（Buffered）+ 已播放进度条（Accent色）。
2. **转码状态指示器**:
   - 若当前在转码播放，显示 `[转码中]` 徽章，并提供画质切换下拉单（直连、1080P、720P、480P），从而请求不同的转码参数。
3. **字幕渲染层**:
   - 独立 CSS 渲染外挂 WebVTT，支持调整字幕字号（大、中、小）、背景阴影。
4. **音频播放器歌词面板**:
   - 唱片旋转动画（CD Rotate），在播放时启动，暂停时平滑停止。
   - 右侧歌词展示区，滚动聚焦。

---

## 6. 全局快捷键设计 (Hotkeys)

**实现逻辑**:
- 在全局或播放器组件挂载时注册键盘事件监听：
  ```typescript
  function handleKeyDown(e: KeyboardEvent) {
    // 过滤输入框，防止打字时触发快捷键
    if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
    
    switch(e.code) {
      case "Space":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        seekRelative(-10); // 快退 10s
        break;
      case "ArrowRight":
        seekRelative(10);  // 快进 10s
        break;
      case "ArrowUp":
        e.preventDefault();
        adjustVolume(0.05); // 音量加 5%
        break;
      case "ArrowDown":
        e.preventDefault();
        adjustVolume(-0.05); // 音量减 5%
        break;
      case "KeyF":
        toggleFullscreen();
        break;
    }
  }
  ```
- 触发对应动作时，在屏幕中央渲染一个半透明的微动画 OSD（On-Screen Display）图标（例如闪烁的静音图标、快进数字提示），提供极致播放体验。
