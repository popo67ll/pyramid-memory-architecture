# Agnes AI 技能

> **Version: 1.2.0** | Last updated: 2026-06-05
> Changelog:
> - v1.0.0: 初始版本，文本/生图/文生视频
> - v1.1.0: 图生视频实测通过，踩坑经验沉淀（freeimage.host 图床、base64 不可用）
> - v1.2.0: 默认高清参数（1920×1080, 241帧, 30fps）；漫剧工作流说明

Agnes AI 平台 API 调用技能，兼容 OpenAI 格式，国内直连无需翻墙。

## 基本信息

- **控制台**：https://platform.agnes-ai.com
- **API 文档**：https://agnes-ai.com/doc
- **统一 Base URL**：`https://apihub.agnes-ai.com/v1`
- **认证**：`Authorization: Bearer <API_KEY>`

## API Key

```
sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx
```

## 可用模型

| 模型 | 类型 | 接口路径 |
|---|---|---|
| `agnes-1.5-flash` | 文本 | `/v1/chat/completions` |
| `agnes-2.0-flash` | 文本 | `/v1/chat/completions` |
| `agnes-image-2.0-flash` | 生图 | `/v1/images/generations` |
| `agnes-image-2.1-flash` | 生图 | `/v1/images/generations` |
| `agnes-video-v2.0` | 生视频 | `/v1/videos`（异步） |

## 文本对话

```bash
curl -X POST https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

## 图片生成

```bash
curl -X POST https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A cute blue merle border collie puppy",
    "n": 1,
    "size": "1024x1024"
  }'
```

返回图片 URL（托管在 Google Cloud），需下载到 `~/.openclaw/media/qqbot/` 后用 `<qqmedia>` 发送。

## 视频生成（异步流程）

### 通用流程

**第 1 步：创建任务** → `POST /v1/videos` → 返回 `task_id`

**第 2 步：轮询查结果** → `GET /v1/videos/<task_id>` → 等待 `status: completed`

返回包含视频 URL，下载到 `~/.openclaw/media/qqbot/` 后用 `<qqmedia>` 发送。

### 📝 模式 1：文生视频（Text-to-Video）

最简单，只传 `model` + `prompt`：

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic shot of a cat walking on the beach at sunset, soft ocean waves, warm golden lighting, realistic motion",
    "height": 768,
    "width": 1152,
    "num_frames": 121,
    "frame_rate": 24
  }'
```

### 🖼️ 模式 2：图生视频（Image-to-Video）✅ 已验证可行

**⚠️ 关键规则（踩坑总结）：**

1. **`image` 参数必须是公网 HTTP/HTTPS URL**，不支持 base64 data URI
2. **图片必须能被 Agnes 服务器访问到**。测试通过的图床：
   - ✅ `freeimage.host`（返回 `https://iili.io/xxx.jpg`）— **推荐**
   - ✅ Agnes 自己的 CDN（`storage.googleapis.com/agnes-aigc-*`）
   - ❌ catbox.moe、imgur、telegra.ph 等 — 服务器访问超时
3. **图片尺寸建议 800px 左右**，太小可能无法识别

**图床上传方法（freeimage.host）：**

```bash
curl -sL -X POST "https://freeimage.host/api/1/upload" \
  -F "source=@/path/to/image.jpg" \
  -F "key=6d207e02198a847aa98d0a2a901485a5"
# 返回 JSON 中的 image.url 就是图片链接
```

### 🎬 默认高清参数（全局约定）

**所有视频生成默认使用高清参数，除非主人特别要求降低：**

```json
{
  "width": 1920,
  "height": 1080,
  "num_frames": 241,
  "frame_rate": 30
}
```

- 1920×1080 = 1080p 全高清
- 241 帧 @ 30fps ≈ 8 秒视频（满足 8n+1 约束）
- 主人说"快一点"可降到 num_frames=81（约 2.7 秒 @ 30fps）

### 🖼️ 图生视频调用示例（高清）：

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "The man smiles naturally, gently tilts the teapot, subtle head movement, realistic facial expression, keep face identical to photo",
    "image": "https://iili.io/Cf9ZiEN.jpg",
    "width": 1920,
    "height": 1080,
    "num_frames": 241,
    "frame_rate": 30
  }'
```

### 🎭 漫剧工作流（Image-to-Video 串联）

有了图生视频能力，可以串联做**AI 漫剧**：

1. **分镜设计** → 把剧本拆成若干镜头，每个镜头写一段 prompt
2. **生图** → 用 `agnes-image-2.1-flash` 逐帧生漫画风格分镜图
3. **图生视频** → 每帧图用图生视频接口生成 3-8 秒短视频
4. **拼接** → 用 ffmpeg 把短视频按顺序拼接成片，加字幕/BGM
5. **发布** → 投抖音/小红书/视频号

关键技巧：
- 分镜图保持角色一致性：prompt 中固定角色外貌描述（发色/服装/体型）或用参考图
- 单镜头控制在 5-8 秒（num_frames=161~241 @30fps），多镜头靠剪辑拼接
- 漫画风格 prompt 加 `anime style, manga panel, cel shading, dramatic lighting` 等关键词
- 对白字幕用 ffmpeg drawtext 或剪映后期加

### 📋 视频参数说明

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | ✅ | 固定 `agnes-video-v2.0` |
| `prompt` | string | ✅ | 视频描述 |
| `image` | string | ❌ | 单图生视频 — **必须是公网 URL** |
| `extra_body.image` | array | ❌ | 多图引导 — 图片 URL 数组 |
| `extra_body.mode` | string | ❌ | 关键帧模式 `"keyframes"` |
| `width` | int | ❌ | **默认 1920**（高清） |
| `height` | int | ❌ | **默认 1080**（高清） |
| `num_frames` | int | ❌ | ≤441，必须满足 `8n+1`（81, 121, 161, 241, 441） |
| `frame_rate` | number | ❌ | 1-60，推荐 24 或 30 |
| `negative_prompt` | string | ❌ | 避免的内容 |
| `seed` | int | ❌ | 固定随机种子 |

### 🔄 支持的 4 种模式

| 模式 | 必要参数 | 说明 |
|---|---|---|
| 文生视频 | `model` + `prompt` | 纯文字生成视频 |
| 图生视频 | `model` + `prompt` + `image` | 让静态图片动起来 |
| 多图引导 | `model` + `prompt` + `extra_body.image` | 多张图片引导生成 |
| 关键帧动画 | `model` + `prompt` + `extra_body` | `extra_body.mode: "keyframes"` + 关键帧数组 |

## 合规提醒

- 个人学习/测试/创作：✅ 可用
- 商用上架：⚠️ 未完成国内算法备案，优先选用豆包、通义千问等备案模型
- 禁止生成违规、时政类内容
