# 模块 09 — 共享类型与常量定义 (Shared Types & Constants)

> 保证前后端数据契约强一致性，所有数据模型接口使用 TypeScript 共享声明

---

## 1. 共享类型定义 (packages/shared/src/types/)

### 1.1 核心媒体结构 (`media.ts`)
```typescript
export type MediaKind = "video" | "audio" | "image" | "other";

export interface MediaItem {
  id: string;          // 基于相对路径生成的 16 位 Hash
  relPath: string;     // 相对共享目录的路径
  name: string;        // 去后缀的文件名
  ext: string;         // 小写文件扩展名（不带 .）
  kind: MediaKind;     // 媒体大类
  shareLabel: string;  // 归属的共享别名
  size: number;        // 文件大小（字节）
  modTime: number;     // 物理修改时间戳
  coverId?: string;    // 关联的音频封面文件 ID (可选)
  lyricsId?: string;   // 关联的歌词文件 ID (可选)
  subtitles?: SubtitleMeta[]; // 外挂字幕列表
}

export interface SubtitleMeta {
  id: string;
  mediaId: string;
  label: string;       // 前端显示标签 (如 "中文(简体)")
  lang?: string;       // 语言代码 (如 "zh")
  isDefault: boolean;  // 是否默认加载
}
```

### 1.2 用户偏好与状态结构 (`config.ts`)
```typescript
export interface ShareConfig {
  label: string;
  path: string;
  enabled: boolean;
}

export interface BlacklistConfig {
  extensions: string[];
  filenames: string[];
  directories: string[];
  maxSizeBytes: number;
}

export interface UserPrefs {
  theme: "dark" | "light";
  browseMode: "flat" | "folder";
}
```

---

## 2. 共享常量定义 (packages/shared/src/constants/)

### 2.1 扩展名映射表 (`extensions.ts`)
```typescript
export const VIDEO_EXTENSIONS = new Set([
  "mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "ts", "m4v"
]);

export const AUDIO_EXTENSIONS = new Set([
  "mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "ape"
]);

export const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
]);

export const SUBTITLE_EXTENSIONS = new Set([
  "srt", "vtt", "ass", "ssa"
]);

export const LYRIC_EXTENSIONS = new Set([
  "lrc"
]);
```
- 后续修改在此常量中统一添加，前后端自动适配。
