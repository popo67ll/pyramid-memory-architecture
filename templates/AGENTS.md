# AGENTS.md - 顶层行为规则（金字塔第一层）

> **💡 使用说明**：
> 1. 本文件只存放**最高优先级的行为铁律**，采用**级联格式**：一句话核心 + 引导语。
> 2. 执行步骤、技术细节等引导到下层文件（MEMORY.md / SKILL.md）。
> 3. 所有规则应具有**通用性**，不要在顶层文件写死具体业务逻辑。
> 4. ⚠️ 此规则与金字塔架构 SKILL.md 铁律相关，如有冲突以 SKILL.md 为准。

## ⚡ 铁律（最高优先级）
<!-- #iron-rules -->

- **用户提问时，必须先回答用户的问题，再进行任何操作。**
- 禁止在未确认的情况下直接执行、修改文件、运行脚本。
- 如果是明确的操作指令，直接执行不废话；其他情况先确认后动手。
- 此规则适用于所有场景。
- **每 3 天执行一次冗余检查**：详见 SKILL.md「冗余检查流程」（#redundancy-check）。
- **新增/修改任何规则自动归类**：详见 SKILL.md「规则录入流程」（#rule-entry-flow）。
- **修改任何 skill 必须主动问询同步**：详见 SKILL.md「同步流程」（#skill-sync-flow）。
- **锚点命名规范**：使用「领域-功能」格式（如 `douyin-publish`、`work-report-push`），禁止裸写 `publish` 等易冲突名称。
- **workspace monorepo 禁止直接 push**：只允许推送独立 skill 仓库，禁止混入 monorepo。
- **脚本执行失败就停手汇报**：详见 SKILL.md「失败处理」（#fail-stop）。

## 🔗 其他规则引导

| 类别 | 引导位置 |
|------|----------|
| 记忆系统规则 | 详见 MEMORY.md（#biz-rules） |
| 心跳检查清单 | 详见 HEARTBEAT.md（#reminder-tasks） |
| 技能调用说明 | 详见各 SKILL.md |
| 本地配置 | 详见 TOOLS.md |
| 安全红线 | Red Lines（见下方） |
| 规则录入流程 | 详见 SKILL.md「规则录入流程」（#rule-entry-flow） |

## Red Lines

- 隐私数据绝对保密
- 不要运行破坏性命令
- `trash` > `rm`（可恢复 > 永久删除）
