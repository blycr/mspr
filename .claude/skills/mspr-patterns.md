---
name: mspr-patterns
description: 从 MSPR（Media Share & Preview）仓库提取的编码模式
version: 1.0.0
source: local-git-analysis
analyzed_commits: 18
---

# MSPR 项目编码模式

## 提交规范

本项目使用 **Conventional Commits** 规范，前缀如下：

| 前缀 | 用途 | 频率 |
|------|------|------|
| `feat:` | 新功能（播放列表、歌词、主题统一） | 5 (28%) |
| `fix:` | Bug 修复（路径、IP 过滤、SPA 服务） | 2 (11%) |
| `refactor:` | 代码重构（常量提取、logo 统一） | 2 (11%) |
| `docs:` | 文档更新（架构文档、交接笔记） | 2 (11%) |
| `chore:` | 维护工作（.gitignore、工具配置） | 2 (11%) |
| `wip:` | 进行中（明确标记未完成的实验） | 1 (6%) |

**模式**：前缀后用小写描述范围，多变更用逗号分隔：
- `feat: playlist system, play modes, smart resume, lyrics highlight`
- `fix: filter proxy virtual adapters and 198.18.x.x benchmark net from LAN IP display`

**注意**：回滚提交使用 `Revert "refactor: ..."` 格式。

## 代码架构

### 单体仓库结构（Bun Workspaces）

```
packages/
├── shared/          # 纯类型与常量，无运行时逻辑
│   ├── src/types/   # 领域类型（MediaItem、AppConfig、ProbeResult）
│   └── src/constants/  # 扩展名映射、媒体常量
├── server/          # Bun + Elysia 后端，无构建步骤
│   ├── src/config/     # JSON 配置加载器，支持 fs.watch 热重载
│   ├── src/db/         # SQLite 初始化（bun:sqlite）
│   ├── src/routes/     # Elysia 路由处理器（media.ts、personal.ts）
│   ├── src/scanner/    # 文件系统扫描引擎
│   ├── src/security/   # IP 过滤中间件（部分接入）
│   ├── src/streaming/  # 直传、探测、转码、缩略图、硬件加速
│   └── src/utils/      # 错误工厂、响应辅助、路径校验
└── client/          # Svelte 5 单页应用，Vite 打包
    ├── src/components/     # Svelte 组件（PascalCase.svelte）
    │   ├── player/         # VideoPlayer、LyricsOverlay
    │   ├── grid/           # 网格布局组件
    │   └── layout/         # 布局外壳组件
    ├── src/lib/            # 工具函数（api、format、search、theme）
    │   └── player/         # 播放器引擎、歌词、播放列表逻辑
    ├── src/constants/      # 客户端常量（API 地址、布局、播放器）
    └── src/styles/         # CSS 令牌（玻璃拟态、z-index 层级）
```

### 命名规范

| 层级 | 模式 | 示例 |
|------|------|------|
| 组件 | PascalCase.svelte | `VideoPlayer.svelte`、`MediaCard.svelte` |
| 服务端模块 | kebab-case.ts | `transcode-pipeline.ts`、`hw-accel-detector.ts` |
| 工具函数 | kebab-case.ts | `media-path.ts`、`subtitle-converter.ts` |
| 常量 | 文件内 UPPER_SNAKE_CASE | `EXTENSION_MAP`、`SUBTITLE_EXTS` |
| 类型 | PascalCase 接口 | `MediaItem`、`ProbeResult` |
| Elysia 路由 | kebab-case.ts 匹配端点 | `media.ts` → `/media/*` |

### 导入规则

- **全 ESM**：所有 `package.json` 设置 `"type": "module"`
- **相对导入**：使用 `.js` 扩展名（`import { foo } from './bar.js'`）
- **工作区导入**：不带扩展名（`import { MediaItem } from '@mspr/shared'`）
- **路径映射**：根目录 `tsconfig.json` 将 `@mspr/shared` 映射到 `packages/shared/src`

## 工作流程

### 新增流媒体功能
1. 在 `packages/server/src/streaming/` 创建模块（kebab-case.ts）
2. 从 index 导出或直接导入路由处理器
3. 更新 `packages/server/src/routes/media.ts` 暴露新端点
4. 在 `packages/client/src/lib/api.ts` 添加客户端 API 调用
5. 更新 `packages/client/src/components/player/` 中的 UI 组件

### 新增共享类型/常量
1. 添加到 `packages/shared/src/types/` 或 `packages/shared/src/constants/`
2. 从 `packages/shared/src/index.ts` 重新导出
3. 在服务端/客户端通过 `@mspr/shared` 导入

### 客户端 UI 变更
1. 修改 `packages/client/src/components/` 中的 Svelte 组件
2. 如需新增设计令牌，更新 `packages/client/src/styles/tokens.css`
3. 在客户端运行 `bun run check` 进行类型检查

### 数据库结构变更
1. 修改 `packages/server/src/db/sqlite.ts`
2. 无迁移框架——结构在启动时程序化初始化

## 代码风格模式

### Svelte 5（Runes API）
- 使用 `$state`、`$derived`、`$effect`、`$props`——无类组件
- 副作用优先用 `$effect` 而非 `onMount`（自动清理）
- 组件通过 `main.ts` 中的 `mount()` 挂载
- 模板中使用过渡：`transition:fade`

### 服务端模式
- Elysia 路由通过 `.get()`、`.post()` 构建，常配合 `t` 校验模式
- 数据库：针对 `bun:sqlite` 的原始 SQL，使用类型化行接口（`MediaItemRow`）
- 异步 I/O：`Bun.file()`、`Bun.spawn()`、`fs.promises`
- 错误：使用 `utils/errors.ts` 保持 HTTP 响应一致（404/403/500）
- 路径沙箱：`resolveMediaPath()` 校验无目录遍历

### 常量提取
- 魔法数字 → `UPPER_SNAKE_CASE` 常量
- 共享常量放在 `@mspr/shared`
- 服务端/客户端专属常量放在各自的 `src/constants/` 目录，使用 barrel `index.ts`

## 测试模式

**未配置测试框架。** 手动测试使用 `packages/server/test_media/`。

如需添加测试：
- 服务端：必须在 Bun 下运行（使用 `bun:sqlite`、`Bun.file`、`Bun.spawn`）
- 客户端：考虑 `vitest` + `@testing-library/svelte`

## 热点文件（变更最频繁）

| 文件 | 变更次数 | 原因 |
|------|---------|------|
| `packages/client/src/App.svelte` | 8 | 根组件，单视图 |
| `packages/server/src/index.ts` | 7 | 服务端入口 |
| `packages/client/src/components/player/VideoPlayer.svelte` | 6 | 核心播放 UI |
| `scripts/start.mjs`、`scripts/dev.mjs` | 各 4 | 启动脚本 |
| 流媒体模块（5 个文件） | 各 4 | 核心服务端功能 |
| `packages/client/src/styles/tokens.css` | 4 | 设计系统令牌 |

## 文档模式

- 架构文档放在 `docs/architecture/`（00-09 编号）
- 演进日志放在 `docs/evolution/`（按日期）
- 会话交接放在 `docs/evolution/SESSION-HANDOFF-*.md`
- 需求规格放在 `docs/spec/`
- **AGENTS.md** 是 AI 代理的权威参考（非设想性文档）
