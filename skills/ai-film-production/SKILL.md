# AI 电影 / 漫剧制作 Skill

> **Version: 3.1.0** | Created: 2026-06-05 | Updated: 2026-06-06
> 完整流程：剧本→豆包生分镜图→Agnes 图生视频→SadTalker 对口型→edge-tts 配音→ffmpeg 剪辑→发布
> **支持两种风格：AI 电影（写实/ cinematic）和 AI 漫剧（动漫/漫画风格）**
> **v3.1.0 更新：分镜脚本升级为工业级表格格式 (10 列标准)**

## 📁 项目存储规范

**所有 AI 电影/漫剧的素材和成品必须存放在** `projects/ai-films/` 目录下。

```
~/.openclaw/workspace/projects/ai-films/
│
├── <项目名>/                    # 每个项目一个独立文件夹
│   ├── script/                  # 分镜脚本（.md）
│   ├── storyboards/             # 分镜图（豆包生成的 .png/.jpg）
│   ├── videos/                  # 单镜头视频（Agnes 图生视频输出 .mp4）
│   ├── audio/                   # 配音文件（.mp3）
│   └── output/                  # 🎬 最终成片（preview.mp4 / final.mp4）
│
└── .template/                   # 项目模板目录
```

**每次新建项目时：**
1. 创建 `projects/ai-films/<项目名>/` 目录
2. 按上述结构初始化子目录
3. 所有中间素材（分镜图、视频片段、配音）归类存放
4. 最终成品放入 `output/`
5. 项目完成后 `git add` 提交

## 🛠️ 技术栈（最终确认版）

| 环节 | 工具 | 模型/服务 | 状态 |
|---|---|---|---|
| 剧本/分镜脚本 | Agnes AI | `agnes-2.0-flash`（文本） | ✅ 可用 |
| **角色设计 + 分镜图** | **豆包生图** | 豆包（支持参考图锁定角色） | ✅ 主人操作 |
| 图生视频（自然动作） | Agnes AI | `agnes-video-v2.0`（图生视频） | ✅ 可用 |
| **对口型（⭐ 关键步骤）** | **SadTalker-Video** | `~/.openclaw/tools/SadTalker-Video-Lip-Sync/` | ⏳ 安装中 |
| 配音 | edge-tts | `edge-tts` CLI | ✅ 已安装 |
| 视频拼接 | ffmpeg | 本地命令 | ✅ 可用 |
| 字幕生成 | ffmpeg drawtext / 剪映 | 本地命令 | ✅ 可用 |
| 发布 | 抖音/小红书 skill | `douyin-auto-ops` / `xhs-auto-publish` | ✅ 可用 |

## 📋 完整工作流（8 步）

```
┌─────────────────────────────────────────────┐
│  第1步：写剧本                              │
│  工具：Agnes 文本模型（agnes-2.0-flash）    │
│  产出：剧本 + 人物设定 + 分镜脚本 + prompt  │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第2步：角色设计（关键！决定人物一致性）    │
│  工具：豆包生图                             │
│  产出：角色四视图 → 选满意的作为基准图      │
│  注意：主人操作，生成后发 QQ 给我            │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第3步：生分镜图                            │
│  工具：豆包生图（参考图锁定角色）           │
│  产出：每个场景的分镜图（保持同一张脸）     │
│  注意：主人操作，生成后发 QQ 给我            │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第4步：图生视频                            │
│  工具：Agnes 视频（agnes-video-v2.0）      │
│  输入：分镜图 + 动作 prompt                 │
│  产出：人物自然动作的视频（有环境音，无口型）│
│  ⚠️ Agnes 不会根据台词对口型！              │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第5步：对口型（⭐ 我们独有的步骤）        │
│  工具：SadTalker-Video-Lip-Sync            │
│  输入：Agnes视频 + TTS配音音频             │
│  产出：嘴型对齐的视频                       │
│  ⚠️ 只改嘴型，不改表情/情绪；嘴部画质略降   │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第6步：配音                                │
│  工具：edge-tts                             │
│  产出：每个角色的台词音频                   │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第7步：剪辑拼接                            │
│  工具：ffmpeg                               │
│  操作：拼接镜头 + 加配音 + 加BGM + 加字幕  │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│  第8步：发布                                │
│  工具：抖音/小红书 skill                    │
│  产出：发布到平台                           │
└─────────────────────────────────────────────┘
```

### Step 1: 写剧本 + 分镜

用 Agnes 文本模型生成剧本，并转化为**标准工业分镜表**。

**分镜表格式（必须严格遵守）：**
输出必须为 Markdown 表格，包含以下列：
| 序号 | 时间 (几秒至几秒) | 镜头类型 | 拍摄角度 (俯视/平视/仰视) | 景别 (大全景/全景/中景/近景/特写) | 主体描述 | 主体运动描述 | 场景描述 | AI 提示词 (生图用，遵循六大维度) | Runway 视频动态描述 (图生视频用) |

**示例输出：**

| 序号 | 时间 | 镜头类型 | 拍摄角度 | 景别 | 主体描述 | 主体运动描述 | 场景描述 | AI 提示词 (生图用) | Runway 视频动态描述 |
|:---:|:---:|:---:|:---:|:---:|:---|:---|:---|:---|:---|
| 1 | 0s-5s | 跟拍 | 平视 | 中景 | 25 岁男子，黑色丝绸长衫，黑色礼帽，手持折扇，面部傲慢 | 迈步向前走出大门，微微抬头，眼神得意，折扇轻摇 | 1940 年代中国，傍晚夕阳，高大木制宅门，暖黄光调 | 1940s China, sunset. Young man in black silk changshan and black fedora walking out of wooden gate, arrogant smile, holding fan. Cinematic warm lighting, medium shot, 8k resolution. | Camera tracks forward. Character walks confidently forward. Subtle wind effect on clothes and fan. High quality motion. |

### Step 2-3: 角色设计 + 分镜图生成（豆包）

**⚠️ 这一步由主人操作，不在本地跑。**

**角色设计：**
1. 使用**Character Sheet（角色设计图）**技巧：在豆包 prompt 中必须包含 `Character Sheet, full body, front view, side view, back view` 等关键词。
2. 强调必须是**全身照**（Full Body Shot），以便后续图生视频时能生成行走、坐下等完整肢体动作。
3. 这样 AI 会在**同一张图里**画出角色的正面、侧面、背面全身像。
4. 生成后，选最清晰的一张作为"角色基准图"。

**分镜图生成：**
1. 使用豆包的"参考图"功能，上传基准图锁定角色
2. 描述新场景，让豆包生成分镜图（保持同一张脸）
3. 把满意的分镜图通过 QQ 发给我

### Step 4: 图生视频（让分镜动起来）

**⚠️ 关键规则（详见 agnes-ai skill）：**
1. 图片必须上传到 **freeimage.host** 拿到公网 URL
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
    "width": 1280,
    "height": 720,
    "num_frames": 161,
    "frame_rate": 30
  }'
```

**轮询结果：**
```bash
curl -X GET https://apihub.agnes-ai.com/v1/videos/<task_id> \
  -H "Authorization: Bearer sk-vX1AaXD5u873hysxhiL1XPh9VGLjMgJfIWUvrE1MegYLyfmx"
```

**⚠️ 重要提示：**
- Agnes 图生视频**不自带口型**，只生成自然动作（呼吸、眨眼、微笑）和环境音
- Agnes 图生视频**不会根据 prompt 中的台词生成口型或人声**
- 对口型需要在 Step 5 单独处理

**支持的 4 种模式：**

| 模式 | 必要参数 | 说明 |
|---|---|---|
| 文生视频 | `model` + `prompt` | 纯文字生成视频 |
| 图生视频 | `model` + `prompt` + `image` | 让静态图片动起来 |
| 多图引导 | `model` + `prompt` + `extra_body.image` | 多张图片引导生成 |
| 关键帧动画 | `model` + `prompt` + `extra_body` | `extra_body.mode: "keyframes"` + 关键帧数组 |

### Step 5: 对口型（⭐ 关键步骤）

**工具：** SadTalker-Video-Lip-Sync（`~/.openclaw/tools/SadTalker-Video-Lip-Sync/`）

**原理：** 分析 TTS 音频的发音，逐帧修改视频中人物嘴型，使其与配音对齐。

**输入：** Agnes 图生视频 + TTS 配音音频
**输出：** 嘴型对齐的视频

**⚠️ 效果预期：**
- ✅ 嘴型对上了配音
- ✅ 保留原有身体动作（点头、头部微动）
- ⚠️ 嘴部区域画质略有下降（有涂抹感）
- ⚠️ 表情不变（原视频在笑就保持笑，不会根据台词加表情）
- ❌ 侧面/低头/仰头角度效果差，正面效果最好
- ❌ 快速说话时嘴型可能跟不上

**推理命令：**

```bash
cd ~/.openclaw/tools/SadTalker-Video-Lip-Sync
python inference.py \
  --driven_audio <配音音频.wav> \
  --source_video <Agnes生成的视频.mp4> \
  --enhancer lip \
  --output <输出路径>
```

### Step 6: 配音

用 edge-tts 生成每段对白的语音：

```bash
# 男声（云健 - 成熟稳重）
edge-tts --text "欢迎光临！今天想吃点什么？" --voice zh-CN-YunjianNeural --write-media scene1_voice.mp3

# 年轻男声（云溪 - 阳光）
edge-tts --text "好嘞！马上上菜！" --voice zh-CN-YunxiNeural --write-media scene2_voice.mp3

# 女声（晓晓 - 温柔）
edge-tts --text "太好吃了！下次还来！" --voice zh-CN-XiaoxiaoNeural --write-media scene3_voice.mp3
```

### Step 7: 视频拼接 + 加字幕 + 加 BGM

**拼接：**
```bash
cat > /tmp/film_files.txt << EOF
file '/path/to/scene1_final.mp4'
file '/path/to/scene2_final.mp4'
file '/path/to/scene3_final.mp4'
EOF

ffmpeg -f concat -safe 0 -i /tmp/film_files.txt -c copy /tmp/film_merged.mp4
```

**加配音：**
```bash
ffmpeg -i scene1.mp4 -i scene1_voice.mp3 \
  -filter_complex "[1:a]adelay=300|300[a1]; [0:a][a1]amix=inputs=2:weights=0.2 1:duration=longest[aout]" \
  -map "0:v" -map "[aout]" -c:v copy -c:a aac -shortest scene1_final.mp4
```

**加 BGM：**
```bash
ffmpeg -i film_merged.mp4 -i bgm.mp3 \
  -filter_complex "[0:a][1:a]amix=inputs=2:weights=1 0.3" \
  film_final.mp4
```

**加字幕：**
```bash
ffmpeg -i film_final.mp4 \
  -vf "drawtext=text='欢迎光临！':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=h-th-30:box=1:boxcolor=black@0.5:enable='between(t,0,5)'" \
  -c:a copy film_with_subs.mp4
```

### Step 8: 发布

- 抖音发布 → 使用 `douyin-auto-ops` skill
- 小红书发布 → 使用 `xhs-auto-publish` skill

## 🎬 两种制作风格

### 风格 A：AI 电影（写实风格）

**分镜图 Prompt 关键词：**
```
[场景描述], cinematic, photorealistic, film still, dramatic lighting, shallow depth of field, 35mm lens, color graded, movie scene, high production value
```

### 风格 B：AI 漫剧（动漫/漫画风格）

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

## 📊 高清默认参数

所有视频生成默认：

```json
{
  "width": 1280,
  "height": 720,
  "num_frames": 161,
  "frame_rate": 30
}
```

- 720p 高清（1920×1080 会 OOM，已验证）
- 161 帧 @ 30fps ≈ 5.4 秒（满足 8n+1 约束）

## ⚠️ 重要注意事项

1. **免费用户排队时间长**：Agnes 视频生成可能需要等 5-40 分钟
2. **角色一致性**：豆包参考图功能可保持 85-90% 相似度，不是 100%
3. **Agnes 不自带口型**：prompt 中写台词不会让角色对口型或发声
4. **SadTalker 效果预期**：只改嘴型不改表情，嘴部画质略降，正面效果最好
5. **单镜头时长**：控制在 5-8 秒，长场景靠剪辑拼接
6. **API Key**：存储在 agnes-ai skill 中，本 skill 不重复存储
7. **合规**：个人学习/创作可用，商用需注意算法备案要求
8. **SadTalker 安装状态**：代码已克隆，预训练模型和依赖待安装完成
