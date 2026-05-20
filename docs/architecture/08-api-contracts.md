# 模块 08 — 接口契约与通讯契约 (API Contracts)

> 对应 URS §5  
> 定义前后端交互的 RESTful API 路径、请求 Payload、响应 JSON 结构体

---

## 1. 认证控制 (Authentication)

### 1.1 PIN 校验登录 (POST /api/pin)
- **安全级**: 免认证
- **请求 Payload**:
  ```json
  {
    "pin": "123456"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "status": "success",
    "token": "session_jwt_string_here",
    "expiresAt": 1716180000000
  }
  ```
- **失败响应 (401 Unauthorized)**:
  ```json
  {
    "status": "error",
    "message": "Invalid PIN"
  }
  ```
- *注: 失败时延迟 1000ms 返回以防爆破。*

---

## 2. 媒体发现与导航 (Discovery & Navigation)

### 2.1 全量媒体列表获取 (GET /media)
- **安全级**: 开放
- **成功响应 (200 OK)**:
  ```json
  [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "relPath": "Movies/Inception.2010.mp4",
      "name": "Inception.2010",
      "ext": "mp4",
      "kind": "video",
      "shareLabel": "电影",
      "size": 2147483648,
      "modTime": 1716100000000,
      "subtitles": ["subtitle-id-1"],
      "coverId": null,
      "lyricsId": null
    }
  ]
  ```

### 2.2 触发媒体扫描 (POST /media/refresh)
- **安全级**: 开放
- **成功响应 (200 OK)**:
  ```json
  { "success": true }
  ```

### 2.2 播放决策探测 (GET /media/probe)
- **安全级**: 需 Session 鉴权
- **参数**:
  - `id=a1b2c3d4e5f6g7h8` (必填, 媒体 ID)
- **成功响应 (200 OK)**:
  ```json
  {
    "mediaId": "a1b2c3d4e5f6g7h8",
    "strategy": "direct",
    "container": "mp4",
    "videoCodec": "h264",
    "audioCodec": "aac",
    "needVideoTranscode": false,
    "needAudioTranscode": false,
    "duration": 8880.5,
    "width": 1920,
    "height": 1080
  }
  ```

---

## 3. 流媒体传输 (Streaming)

### 3.1 媒体流传输 (GET /media/stream)
- **安全级**: 需 Session 鉴权
- **参数**:
  - `id=a1b2c3d4e5f6g7h8` (必填, 媒体 ID)
  - `transcode=1` (Optional, 强制开启转码)
  - `offset=120` (Optional, 播放定位秒数，主要在转码时起作用)
  - `quality=1080` (Optional, 转码画质：`1080 | 720 | 480`，默认直传/直转)
- **响应头 (直连)**:
  - `HTTP 206 Partial Content`
  - `Accept-Ranges: bytes`
  - `Content-Range: bytes 1024-2048/1234567`
  - `Content-Type: video/mp4`
- **响应头 (转码)**:
  - `HTTP 200 OK`
  - `Transfer-Encoding: chunked`
  - `Content-Type: video/mp4`
  - `X-MSP-Transcode: active`

### 3.2 视频缩略图 (GET /media/thumbnail)
- **安全级**: 需 Session 鉴权
- **参数**:
  - `id=a1b2c3d4e5f6g7h8` (必填)
- **成功响应**:
  - `Content-Type: image/webp`
  - 返回 WebP 二进制图片数据（缓存命中或实时生成）。

### 3.3 外挂字幕加载 (GET /media/subtitle)
- **安全级**: 开放
- **参数**:
  - `id=sub_id_string` (必填)
- **成功响应**:
  - `Content-Type: text/vtt`
  - 返回转换后的标准 WebVTT 字幕数据。

### 3.4 歌词加载 (GET /media/lyric)
- **安全级**: 开放
- **参数**:
  - `id=lyric_id_string` (必填)
- **成功响应**:
  - 返回原始歌词文件内容（如 LRC 格式）。

---

## 4. 进度同步与个性化 (UX Synchronization)

### 4.1 进度保存 (POST /personal/progress)
- **安全级**: 开放
- **请求 Payload**:
  ```json
  {
    "id": "a1b2c3d4e5f6g7h8",
    "time": 125.4
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  { "success": true }
  ```

### 4.2 进度获取 (GET /personal/progress)
- **参数**: `id=a1b2c3d4e5f6g7h8`
- **成功响应 (200 OK)**:
  ```json
  {
    "mediaId": "a1b2c3d4e5f6g7h8",
    "time": 125.4,
    "updatedAt": 1716180000000
  }
  ```
  或 `{ "time": 0 }`（无记录时）

### 4.3 最近播放历史 (GET /personal/history)
- **成功响应 (200 OK)**:
  ```json
  [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "name": "Inception.2010",
      "kind": "video",
      "shareLabel": "电影",
      "time": 125.4,
      "updatedAt": 1716180000000
    }
  ]
  ```

### 4.4 收藏夹操作 (GET/POST/DELETE /personal/favorites)
- **POST 请求**: `{ "id": "a1b2c3d4e5f6g7h8" }`
- **DELETE 请求**: body `{ "id": "a1b2c3d4e5f6g7h8" }`
- **GET 响应 (200 OK)**:
  返回完整的 `MediaItem[]`（Join `media_items` 表）

---

## 5. 健康检查

### 5.1 Ping (GET /ping)
- **安全级**: 开放
- **成功响应 (200 OK)**: `pong`

## 6. 日志与运维 (Maintenance)

### 6.1 前端日志上报 (POST /log) — 未实现
- **安全级**: 需 Session 鉴权
- **请求 Payload**:
  ```json
  {
    "level": "error",
    "message": "HTMLVideoElement Playback Error: DECODE_ERR",
    "stack": "Error: ... at VideoPlayer.svelte:45",
    "userAgent": "Mozilla/5.0...",
    "mediaId": "a1b2c3d4e5f6g7h8"
  }
  ```
- **成功响应**:
  ```json
  { "status": "logged" }
  ```

---

## 6. 实施弹性说明 (API Flexibilities)

*   **RESTful 路径规范微调**: 文档中列出的 API 端点为参考契约。如果所用后端框架在处理如 `/api/favorites/:id` 等路径参数或多重嵌套查询时有自身的惯例（例如 Elysia/Fastify 推荐使用 query params 替代 path params），AI 拥有对 API 参数传递方式（如 Query vs Path 传参）进行优化微调的裁量权。
*   **字段结构扩展与裁剪**: 允许在不破坏核心播放逻辑的前提下，为响应体 JSON 动态添加辅助字段（例如给 `/api/media` 里的文件加上物理文件修改时间的易读格式字符串，或缩略图生成状态标识），前端做相应适配即可。
*   **状态码容错**: 业务逻辑错误（例如 PIN 码失效、找不到文件）在文档中约定返回 `401` 或 `403` 等标准 HTTP 状态码。AI 也可以选择统一返回 `200 OK` 并通过 `{ success: false, code: 401, message: "..." }` 的业务包结构体包装，以简化客户端的 fetch 状态码校验。

