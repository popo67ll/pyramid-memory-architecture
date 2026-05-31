# HEARTBEAT.md - 定期检查任务

<!-- #redundancy-check-task -->
## 🔺 金字塔冗余检查（每 3 天一次）

**触发逻辑**：
1. 读取 `memory/redundancy-check-state.json`，检查 `lastCheckDate`
2. 如果距今天 ≥ 3 天，或 `lastCheck` 为 `null`（首次执行），则执行
3. 执行方法：读取 `skills/金字塔记忆架构/SKILL.md` 的 `#redundancy-check` 章节（冗余检查机制），按其中 9 项清单逐一检查 workspace 下的所有 md 文件
4. 检查完后向主人汇报结果（只汇报，不擅自修改文件，等主人确认再清理）
5. 更新 `memory/redundancy-check-state.json` 中的 `lastCheck` 和 `lastCheckDate` 为当前时间

⚠️ 归属：走 heartbeat
