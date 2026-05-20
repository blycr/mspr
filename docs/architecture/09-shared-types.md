# 模块 09 — 共享类型与常量定义 (Shared Types & Constants)

> 保证前后端数据契约强一致性，所有数据模型接口使用 TypeScript 共享声明

---

## 1. 共享类型定义 (`packages/shared/src/types/media.ts`)

### 1.1 核心媒体结构

```typescript
export type MediaKind = 'video' | 'audio' | 'image' | 'other';

export interface Subtitle {
  id: string;
  label: string;       // 前端显示标签 (如 "中文(简体)")
  lang?: string;       // 语言代码 (如 "zh")
  src: string;         // 字幕资源 URL
  default: boolean;    // 是否默认加载
}

export interface MediaItem {
  id: string;          // 基于 shareLabel + relPath 生成的 MD5 Hash
  relPath: string;     // 相对共享目录的路径
  name: string;        // 去后缀的文件名
  ext: string;         // 小写文件扩展名（不带 .）
  kind: MediaKind;     // 媒体大类
  shareLabel: string;  // 归属的共享别名
  size: number;        // 文件大小（字节）
  modTime: number;     // 物理修改时间戳
  subtitles?: Subtitle[]; // 外挂字幕列表（数据库中存储为 JSON 字符串）
  coverId?: string;    // 关联的音频封面文件 ID (可选)
  lyricsId?: string;   // 关联的歌词文件 ID (可选)
}
```

### 1.2 配置结构

```typescript
export interface Share {
  label: string;
  path: string;
}

export interface AppConfig {
  shares: Share[];
  port: number;
  security: {
    pin?: string;
    allowedIps?: string[];
    blockedIps?: string[];
  };
  scanner: {
    excludeExts: string[];
    excludeNames: string[];
    minSize?: number;
    maxSize?: number;
  };
}
```

### 1.3 流媒体探测结果

```typescript
export interface ProbeResult {
  mediaId: string;
  strategy: 'direct' | 'transcode' | 'remux';
  container: string;
  videoCodec: string | null;
  audioCodec: string | null;
  needVideoTranscode: boolean;
  needAudioTranscode: boolean;
  duration: number;
  width: number | null;
  height: number | null;
}
```

### 1.4 硬件加速检测结果

```typescript
export interface HWAccelResult {
  available: string[];              // 检测到的加速器名称列表
  preferred: string | 'cpu';        // 首选加速器
  encoderMap: Record<string, string>; // 加速器名称 → 编码器名称映射
}
```

---

## 2. 共享常量定义 (`packages/shared/src/constants/extensions.ts`)

```typescript
export const EXTENSION_MAP: Record<string, MediaKind> = {
  mp4: 'video', mkv: 'video', avi: 'video', mov: 'video',
  wmv: 'video', flv: 'video', webm: 'video', ts: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio',
  ogg: 'audio', m4a: 'audio', wma: 'audio', ape: 'audio', opus: 'audio',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
  webp: 'image', bmp: 'image', svg: 'image',
};

export const VIDEO_EXTS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'm4v'
]);

export const AUDIO_EXTS = new Set([
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'ape', 'opus'
]);

export const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'
]);

export const SUBTITLE_EXTS = new Set(['srt', 'vtt', 'ass', 'ssa']);
export const LYRIC_EXTS = new Set(['lrc']);
```

后续修改在此常量中统一添加，前后端自动适配。
