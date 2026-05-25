# HEARTBEAT.md - 定时提醒任务清单

> **💡 使用说明**：
> 1. 本文件用于配置**周期性检查任务**（如：待办提醒、报告队列、数据维护）。
> 2. 只有在接收到 Heartbeat 信号时才会读取，平时不消耗 Token。

## ⏰ 待办提醒

- 检查 `~/self-improving/heartbeat-state.md` 中的 pending_reminders。
- 如果到达触发时间且未发送，通过 message 工具发送，发送后标记为 done。

## 📤 推送规则

- [推送渠道配置，如：舞蹈通知走 QQ，工作通知走微信]

## 📋 定期维护任务
<!-- #maintenance-tasks -->

- **每 3 天执行一次 6 项检查**：①内容冗余 ②引导方向 ③锚点一致性 ④引导格式 ⑤版本历史 ⑥文件大小。
- **执行逻辑**：详见 SKILL.md「冗余检查流程」（#redundancy-check）。

## Self-Improving Check

- 检查 `~/self-improving/` 目录是否有文件变更。
- 如有变更，整理索引或归档；如无变更，返回 `HEARTBEAT_OK`。
