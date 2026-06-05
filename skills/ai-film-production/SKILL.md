# AI 电影 / 漫剧制作 Skill

> **Version: 2.0.0** | Created: 2026-06-05 | Updated: 2026-06-05
> 利用 AI 生成分镜图 → 图生视频让分镜动起来 → 拼接成片 → 配音加字幕 → 发布
> **支持两种风格：AI 电影（写实/ cinematic）和 AI 漫剧（动漫/漫画风格）**

## 技术栈

| 环节 | 工具 | 模型/服务 |
|---|---|---|
| 剧本/分镜脚本 | Agnes AI | `agnes-2.0-flash`（文本） |
| 分镜图生成 | Agnes AI | `agnes-image-2.1-flash`（生图） |
| 分镜动画化 | Agnes AI | `agnes-video-v2.0`（图生视频） |
| 视频拼接 | ffmpeg | 本地命令 |
| 字幕生成 | ffmpeg drawtext | 本地命令 |
| 配音 | TTS 工具 | `tts` 工具或外部服务 |
| 发布 | 抖音/小红书 skill | `douyin-auto-ops` / `xhs-auto-publish` |

## 两种制作风格

### 🎬 风格 A：AI 电影（写实风格）

**适用场景**：短剧、微电影、品牌故事、情感短片、悬疑/剧情片段

**特点**：
- 写实画风，像真人拍摄的电影
- 电影级灯光、镜头语言
- 适合成熟受众、品牌调性内容

**分镜图 Prompt 关键词：**
```
[场景描述], cinematic, photorealistic, film still, dramatic lighting, shallow depth of field, 35mm lens, color graded, movie scene, high production value
```

### 🎨 风格 B：AI 漫剧（动漫/漫画风格）

**适用场景**：二次元短剧、搞笑漫画、校园故事、同人创作、轻松向内容

**特点**：
- 动漫画风，像漫画分镜动起来
- 夸张表情、鲜明色彩
- 适合年轻受众、二次元平台

**分镜图 Prompt 关键词：**

**日漫：**
```
[场景描述], anime style, manga panel, cel shading, dramatic lighting, high quality, vibrant colors, clean linework
```

**韩漫：**
```
[场景描述], webtoon style, Korean manhwa, soft shading, cinematic lighting, high detail, modern aesthetic
```

**国漫：**
```
[场景描述], Chinese donghua style, traditional ink painting elements mixed with modern anime, dramatic composition, high quality
```

## 通用工作流（6 步）

### Step 1: 写剧本 + 分镜

用 Agnes 文本模型生成剧本，拆成若干镜头。

每个镜头包含：
- **镜头编号**：#1, #2, #3...
- **画面描述**：场景 + 角色动作 + 表情 + 镜头角度
- **对白/旁白**：角色说的话或画外音
- **时长**：每个镜头约 5-8 秒
- **风格关键词**：根据选择添加对应风格的 prompt 后缀

**示例输出格式：**

```json
[
  {
    "scene": 1,
    "description": "一个穿红色卫衣的年轻男子坐在日式火锅店，桌上是鸳鸯火锅，他举着小茶壶微笑看向镜头",
    "dialogue": "今天来吃火锅啦！",
    "duration_seconds": 5,
    "style": "cinematic, photorealistic, film still, warm lighting, shallow depth of field"
  },
  {
    "scene": 2,
    "description": "铜制鸳鸯火锅特写，左侧红汤沸腾冒着热气，右侧清汤里煮着食材",
    "dialogue": "",
    "duration_seconds": 3,
    "style": "cinematic, food photography, dramatic steam, close-up shot"
  }
]
```

### Step 2: 生分镜图

用 `agnes-image-2.1-flash` 逐镜头生图。

**角色一致性技巧：**
- 每个角色写一份**固定外貌描述**（发色/服装/体型/面部特征），每个镜头的 prompt 里都带上
- 用相同的 `seed` 值可以提高一致性
- 如果效果不好，多跑几次选最好的
- AI 电影风格下，可以在 prompt 中强调角色面部特征（如 "sharp jawline, brown eyes, short black hair"）

**生图命令：**

```bash
curl -X POST https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "[分镜描述] + [风格关键词]",
    "n": 1,
    "size": "1024x1024"
  }'
```

### Step 3: 图生视频（让分镜动起来）

**⚠️ 关键规则（详见 agnes-ai skill）：**
1. 图片必须上传到 **freeimage.host** 拿到公网 URL（推荐）
2. 不支持 base64
3. 图片尺寸建议 800px 左右

**图床上传：**

```bash
curl -sL -X POST "https://freeimage.host/api/1/upload" \
  -F "source=@/path/to/image.jpg" \
  -F "key=6d207e02198a847aa98d0a2a901485a5"
# 返回 JSON 中的 image.url 就是图片链接
```

**图生视频调用（高清默认）：**

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "[画面动作描述], subtle motion, cinematic, high quality",
    "image": "https://iili.io/xxx.jpg",
    "width": 1920,
    "height": 1080,
    "num_frames": 241,
    "frame_rate": 30
  }'
```

**轮询结果：**
```bash
curl -X GET https://apihub.agnes-ai.com/v1/videos/<task_id> \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx"
```

下载视频到 `~/.openclaw/media/qqbot/` 目录。

### Step 4: 视频拼接

用 ffmpeg 把多个短视频按顺序拼接：

```bash
# 创建文件列表
cat > /tmp/film_files.txt << EOF
file '/path/to/scene1.mp4'
file '/path/to/scene2.mp4'
file '/path/to/scene3.mp4'
EOF

# 拼接
ffmpeg -f concat -safe 0 -i /tmp/film_files.txt -c copy /tmp/film_merged.mp4
```

### Step 5: 加字幕 + 配音 + BGM

**加字幕（ffmpeg drawtext）：**

```bash
ffmpeg -i /tmp/film_merged.mp4 \
  -vf "drawtext=text='今天来吃火锅啦！':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-th-50:box=1:boxcolor=black@0.5:enable='between(t,0,5)'" \
  -c:a copy \
  /tmp/film_with_subs.mp4
```

**配音：** 用 `tts` 工具生成每段对白的语音，再用 ffmpeg 叠加音频：

```bash
ffmpeg -i /tmp/film_with_subs.mp4 -i /tmp/voiceover.mp3 \
  -filter_complex "[0:a][1:a]amix=inputs=2:weights=1 0.7" \
  /tmp/film_with_voice.mp4
```

**加背景音乐（BGM）：**

```bash
ffmpeg -i /tmp/film_with_voice.mp4 -i /tmp/bgm.mp3 \
  -filter_complex "[0:a][1:a]amix=inputs=2:weights=1 0.3" \
  /tmp/film_final.mp4
```

### Step 6: 发布

- 抖音发布 → 使用 `douyin-auto-ops` skill
- 小红书发布 → 使用 `xhs-auto-publish` skill

## 高清默认参数（全局约定）

所有视频生成默认：

```json
{
  "width": 1920,
  "height": 1080,
  "num_frames": 241,
  "frame_rate": 30
}
```

- 1080p 全高清
- 241 帧 @ 30fps ≈ 8 秒（满足 8n+1 约束）

## 注意事项

1. **免费用户排队时间长**：视频生成可能需要等几分钟到十几分钟
2. **角色一致性**：用固定外貌描述 + 相同 seed 提高一致性，必要时多跑几次
3. **单镜头时长**：控制在 5-8 秒，长场景靠剪辑拼接
4. **API Key**：存储在 agnes-ai skill 中，本 skill 不重复存储
5. **合规**：个人学习/创作可用，商用需注意算法备案要求
6. **AI 电影 vs 漫剧**：核心流程完全一样，区别只在**风格关键词**——prompt 里写什么风格就出什么效果
