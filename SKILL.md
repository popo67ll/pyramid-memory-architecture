---
name: 金字塔记忆架构
description: 通用 AI Agent 记忆架构 Skill。采用"金字塔"分层结构:顶层(AGENTS.md)只放铁律级行为规则,中层(MEMORY.md/SOUL.md/HEARTBEAT.md)放业务规则和人格配置,底层(SKILL.md/TOOLS.md)放技术实现细节。适用于所有新建子 Agent 工作区初始化。触发场景:创建新 Agent、初始化工作区、记忆架构设计、规则录入引导、md 文件冗余检查。
---

# 金字塔记忆架构(Pyramid Memory Architecture)

> 本 Skill 提供一套标准化的 Agent 记忆分层架构,适用于任何新建子 Agent 工作区。
> 核心理念:**规则按触发优先级分层存放,引导只能从上往下,下层不引导回上层。**
> 版本:**v2.7** - 冗余检查升级:新增金字塔合规检查+连接建议(仅明显相关时触发)

## 📐 架构总览

```
         ▲
        / \
       /   \
      / AGENTS.md \    ← 顶层:系统注入,铁律级行为规则(每次必加载)
     /-----------\
    / MEMORY.md   \    ← 中层:主会话加载,业务规则、触发器、长期记忆
   /---------------\
  /  SOUL.md 等      \  ← 中层:人格配置、心跳清单、身份信息
 /---------------------\
/  self-improving/     \ ← 按需读取:执行经验、错误纠正、领域教训
/-----------------------\
\   SKILL.md/TOOLS.md   / ← 底层:按需读取,技术实现细节、操作流程
```

### 各层定位

| 层级 | 文件 | 加载方式 | 内容定位 |
|------|------|----------|----------|
| **顶层** | `AGENTS.md` | 系统级注入,每次必加载 | 铁律级行为规则、安全红线、引导表 |
| **中层** | `MEMORY.md` | 主会话系统注入 | 业务触发规则、长期记忆、项目规则 |
| **中层** | `SOUL.md` | 系统级注入 | 人格、身份、使命、行为准则 |
| **中层** | `HEARTBEAT.md` | 心跳触发时加载 | 待办提醒、报告队列、周期性检查清单 |
| **中层** | `IDENTITY.md` | 系统级注入 | Agent 身份卡片(名字、形象、表情) |
| **中层** | `USER.md` | 系统级注入 | 主人信息、作息、偏好 |
| **中层** | `TOOLS.md` | 系统级注入 | 本地配置笔记(设备、端口、Cookie) |
| **按需读取** | `self-improving/` | 任务前主动读取 | 执行经验、错误纠正、领域教训(memory.md / domains/ / projects/ / corrections.md) |
| **底层** | `SKILL.md` | 匹配场景时读取 | 技术实现、操作流程、选择器、正则 |
| **底层** | `docs/*.md` | 按需读取 | 详细操作文档、临时任务规则等 |

## 📝 规则录入铁律

### 录入原则

1. **按触发优先级引导**:
   - 系统注入文件(AGENTS/SOUL/MEMORY/TOOLS/IDENTITY/USER)> 按需读取文件(HEARTBEAT/memory日志/self-improving)> 外部 SKILL.md
2. **引导方向主要从上往下**:
   - ✅ AGENTS.md → 引导去 MEMORY.md / SKILL.md
   - ✅ MEMORY.md → 引导去 SKILL.md
   - ❌ 底层文件**不要引导回上层**(如 MEMORY.md 不要写"详见 AGENTS.md")
   - ⚠️ **安全锚**:底层文件如果有一条规则和顶层铁律直接相关,可以加备注:`⚠️ 此规则与 AGENTS.md 铁律相关,如有冲突以 AGENTS.md 为准`
3. **检查冗余时以高层级文件为准**:
   - 删除低层级已覆盖的重复内容
   - 低层级只保留自己独有的规则
4. **能引导就引导,实在引导不了再向主人推荐其他写入方式**

### 📂 注入 vs 非注入文件说明

**注入文件**(每次对话自动加载,Agent 一定能读到):
- `AGENTS.md` `SOUL.md` `MEMORY.md` `IDENTITY.md` `USER.md` `TOOLS.md`(由 OpenClaw 系统注入)
- `HEARTBEAT.md`(心跳触发时加载)

**非注入文件**(需要 Agent 主动读取,可能读不到):
- `SKILL.md`(需 `<available_skills>` 匹配才自动读取)
- `self-improving/` 目录(需任务前主动读取)
- `memory/` 日志(需 `memory_search` 或 `memory_get` 主动搜索)
- `docs/` 目录(需按路径手动读取)

**引导原则**:
- ✅ 重要规则尽量放在注入文件内,形成闭环
- ⚠️ 引导到非注入文件时,确保目标文件在 `<available_skills>` 中有 description 匹配
- ⚠️ 可以多层引导(A→B→C),前提是:每一级的 `#[锚点]` 在目标文件真实存在,且目标是系统注入文件或 description 匹配的 SKILL.md,确保 AI 能读到
- ✅ **推荐多级联链**:AGENTS.md(一行核心)→ MEMORY.md(业务展开)→ SKILL.md(技术实现)

### ⚠️ 隔离场景直写铁律
<!-- #isolated-direct-write -->

**cron 定时任务、子 agent、隔离会话中,禁止使用多级引导(详见XX),规则必须直写在 prompt 里。**

原因:隔离会话不加载 MEMORY.md/SOUL.md/HEARTBEAT.md 等注入文件,引导会断裂。

适用场景:
- OpenClaw cron 定时任务的 prompt
- `sessions_spawn` 创建的隔离子 agent
- 任何 `sessionTarget: isolated` 的场景

正确做法:
```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "检查当月值班表 /path/to/duty.md,判断今天是否为值班日。\n\n如果是值班日:提醒用户做好值班准备。\n如果不是值班日:回复 NO_REPLY。"
  }
}
```

错误做法(引导会断裂):
```json
{
  "payload": {
    "kind": "agentTurn",
    "message": "详见 MEMORY.md(#duty-check)判断是否值班,如果是详见 HEARTBEAT.md(#duty-rules)推送提醒。"
  }
}
```

**总结:主会话对话可以 A→B→C 多级联链,隔离场景必须一句话写完,不要跳转。**

### 录入流程
<!-- #rule-entry-flow -->

```
主人要求写入新规则
    ↓
1. 判断规则类型:行为规则 / 业务规则 / 技术细节 / 人格配置 / 自我经验
    ↓
2. 匹配层级:
   - 行为规则(铁律级)→ AGENTS.md
   - 业务规则(触发器)→ MEMORY.md
   - 人格/身份 → SOUL.md / IDENTITY.md
   - 技术细节 → SKILL.md / docs/
   - 自我进化经验 → self-improving/
    ↓
3. 🔍 全局扫描关联项:
   - 扫描全部 md 文件,找出与新规则主题相关的所有现有规则
   - 判断这些相关规则之间是否能组成「多级联链」
   - 级联链不限于 2 层,可以 A→B→C 多层,前提是每层锚点真实存在且链路可达
    ↓
4. 向主人推荐级联方案:
   - 展示发现的关联规则分布
   - 推荐最优级联路径(例如:AGENTS.md 一行核心 → MEMORY.md 业务展开 → SKILL.md 技术实现)
   - 等待主人确认后执行
    ↓
5. 生成锚点名:<!-- #[英文短横线] -->
   - 命名规则:全小写 + 短横线分隔,如 #backup-rules
   - self-improving/ 锚点需加领域前缀,如 #ops-sync-failure
    ↓
6. 写入规则(级联格式):
   - AGENTS.md 只保留「一句话核心 + 一个引导语」
   - 执行步骤、技术细节等引导到下层文件
   - 每层只保留本层独有的内容
    ↓
7. 如不确定放哪层 → 向主人推荐
```

### 级联格式铁律
<!-- #cascade-format -->

**AGENTS.md 标准格式:一句话核心 + 引导语,不写执行步骤**

```markdown
- **修改 skill 必须同步问询**:详见 SKILL.md「同步流程」(#skill-sync-flow)
- **脚本执行失败就停手**:详见 SKILL.md「失败处理」(#fail-stop)
```

**多层级联链示例:**
```
AGENTS.md(铁律核心)
  → "修改 skill 必须同步问询":详见 SKILL.md「同步流程」(#skill-sync-flow)
      ↓
SKILL.md(执行细节)
  → #skill-sync-flow:同步内容=1版本号 2版本历史 3git commit+tag
  → "发布规则详见 MEMORY.md": 详见 MEMORY.md「发布渠道」(#publish-channels)
      ↓
MEMORY.md(业务规则)
  → #publish-channels:抖音走 QQ、小红书走微信
```

**级联链前提:链路必须通**
- 每一级的 `#[锚点]` 在目标文件中真实存在
- 引导目标是系统注入文件或 `<available_skills>` 匹配的 SKILL.md,确保 AI 能读到

### Skill 同步流程
<!-- #skill-sync-flow -->

修改任何 skill 内容并测试通过后,主动询问主人是否执行同步:
1. 更新 SKILL.md 版本号
2. 更新 SKILL.md 版本历史(保留最新 2 条)
3. git commit + tag + GitHub 推送
- 新增 skill 先创建独立 GitHub 仓库,禁止混入 monorepo
- 每个人格的 skill 推送各自对应的 GitHub 仓库,绝不混淆

### 失败处理
<!-- #fail-stop -->

当 SKILL.md 中明确写了「失败一次就停手汇报」时,第一次失败后必须立刻停止一切尝试,向主人汇报:
- 不得以任何理由继续自行尝试
- 这是保护 Cookie 和主人控制权的安全红线

### 各层"独有规则"示例

| 层级 | 应该放什么 | 不应该放什么 |
|------|-----------|-------------|
| **AGENTS.md** | 一句话核心铁律 + 引导语 | 执行步骤、技术细节、详细说明
| **MEMORY.md** | 推送渠道规则、业务触发器、项目专属规则、同步规则 | Cookie 保护铁律(应放 AGENTS.md)、技术选择器 |
| **SOUL.md** | 人格描述、使命、能力设定、行为准则、底线 | 通用行为铁律(应放 AGENTS.md) |
| **HEARTBEAT.md** | 待办提醒、报告队列、检查项 | 推送规则详情(应引到 MEMORY.md) |
| **SKILL.md** | 技术选择器、正则、API 流程、版本历史 | 行为规则、人格描述 |

### 标准引导语格式

**统一格式:** `详见 [文件]「[章节名]」(#[锚点])`

**AGENTS.md 标准引导表示例:**
```markdown
## 🔗 其他规则引导

| 类别 | 引导位置 |
|------|----------|
| 记忆系统规则 | 详见 MEMORY.md(#clawhub-publish-rules) |
| 心跳检查清单 | 详见 HEARTBEAT.md(#reminder-tasks) |
| 技能调用说明 | 详见各 SKILL.md |
| 本地配置 | 详见 TOOLS.md |
```

**其他常见引导示例:**
- `详见 SKILL.md「规则录入流程」(#rule-entry-flow)`
- `详见 MEMORY.md「ClawHub 上架规则」(#clawhub-publish-rules)`
- `详见 self-improving/memory.md(#ops-sync-failure)`



## 🔄 冗余检查机制
<!-- #redundancy-check -->

**每 3 天执行一次 8 项检查清单，发现后按照金字塔架构规则，推荐主人清理，主人确认后执行。**

### 8 项检查清单

1. **内容冗余**:同一规则是否出现在多个文件中
2. **引导方向**:有没有底层文件引导回顶层(违反从上往下原则)
3. **锚点一致性**:引导语里的 `#[锚点]` 是否在目标文件中真实存在
4. **引导格式**:是否都使用 `详见 [文件]「[章节名]」(#[锚点])` 格式
5. **版本历史**:各 SKILL.md 版本历史是否超过 2 条
6. **文件大小**:各 md 文件是否异常膨胀(>3KB 需检查)
7. **金字塔合规**:规则是否放在正确的层级(如通用行为铁律应在 AGENTS.md,不应在 MEMORY.md)
8. **连接建议**:只在发现明显主题相关的规则时才建议级联,不全量扫描

### 执行步骤

1. 读取所有 md 文件内容
2. 逐项检查上述 8 项清单
3. 第7项(金字塔合规):检查每条规则是否放在正确的层级,放错层的建议迁移
4. 第8项(连接建议):只在发现明显主题相关的规则时才建议级联(如两条都是运维安全类),不强制
5. 按照金字塔架构规则,以高层级文件为准,删除低层级重复
6. 向主人汇报检查结果,确认后执行清理

### 检查报告模板

```
## 冗余检查报告(YYYY-MM-DD)

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 内容冗余 | ✅/❌ | ... |
| 引导方向 | ✅/❌ | ... |
| 锚点一致性 | ✅/❌ | ... |
| 引导格式 | ✅/❌ | ... |
| 版本历史 | ✅/❌ | ... |
| 文件大小 | ✅/❌ | ... |
| 金字塔合规 | ✅/❌ | 检查规则是否放在正确层级 |
| 连接建议 | 💡/无 | 仅明显相关时建议 |

发现问题:[描述]
层级放错建议:[描述]
连接建议:[仅明显相关时才提]
建议操作:[描述]
```

## 🚀 快速部署

### 方式一:一键初始化脚本(推荐)

*   **Mac / Linux 用户**:
    ```bash
    ./scripts/init.sh my-new-agent
    ```
*   **Windows 用户 (PowerShell)**:
    ```powershell
    .\scripts\init.ps1 my-new-agent
    ```

### 方式二:手动初始化

创建新子 Agent 时,按以下结构初始化:

```
workspace-{name}/
├── AGENTS.md          ← 顶层铁律模板
├── MEMORY.md          ← 中层业务规则模板
├── SOUL.md            ← 中层人格配置模板
├── IDENTITY.md        ← 身份卡片模板
├── USER.md            ← 主人信息模板
├── TOOLS.md           ← 本地配置模板
├── HEARTBEAT.md       ← 心跳清单模板
├── docs/              ← 详细文档目录
└── self-improving/    ← 自我进化目录
```

## 📋 模板文件

各层模板详见 `templates/` 目录(v2.0 教学版):

| 模板 | 路径 | 说明 |
|------|------|------|
| AGENTS.md | `templates/AGENTS.md` | 顶层铁律模板(带使用说明注释) |
| MEMORY.md | `templates/MEMORY.md` | 中层业务规则模板(带示例) |
| SOUL.md | `templates/SOUL.md` | 中层人格配置模板(带安全锚示例) |
| IDENTITY.md | `templates/IDENTITY.md` | 身份卡片模板 |
| USER.md | `templates/USER.md` | 主人信息模板 |
| TOOLS.md | `templates/TOOLS.md` | 本地配置模板 |
| HEARTBEAT.md | `templates/HEARTBEAT.md` | 心跳清单模板 |

## 📖 版本历史

| 版本 | 日期 | 变更 |
| v2.7 | 2026-05-25 | **冗余检查升级**:1新增金字塔合规检查(规则是否放对层级);2新增连接建议(仅明显相关时触发,不全量扫描);3移除冗余的级联合规和隔离直写检查项(已合并) ✅ |
| v2.6 | 2026-05-25 | **隐患修复**:1新增锚点断裂自动检测脚本(check-anchors.sh);2锚点命名规范(领域-格式);3monorepo禁推铁律;4templates/AGENTS.md模板同步;5文件膨胀仅需提醒不拦截 ✅ |
