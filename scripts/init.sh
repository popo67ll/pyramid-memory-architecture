#!/bin/bash

# 金字塔记忆架构 - 一键初始化脚本 v2.0
# 用法: ./init.sh [工作区名称]
# 示例: ./init.sh my-agent

set -e

WORKSPACE_NAME=${1:-"my-new-agent"}
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)/.."
TEMPLATES_DIR="$SKILL_DIR/templates"
TARGET_DIR="$SKILL_DIR/workspace-$WORKSPACE_NAME"

echo "🏗️ 开始初始化工作区: $WORKSPACE_NAME..."

# 1. 创建目录结构
mkdir -p "$TARGET_DIR"/docs
mkdir -p "$TARGET_DIR"/memory
mkdir -p "$TARGET_DIR"/self-improving/{domains,projects,archive}

# 2. 复制模板文件
cp "$TEMPLATES_DIR/AGENTS.md" "$TARGET_DIR/"
cp "$TEMPLATES_DIR/MEMORY.md" "$TARGET_DIR/"
cp "$TEMPLATES_DIR/SOUL.md" "$TARGET_DIR/"
cp "$TEMPLATES_DIR/HEARTBEAT.md" "$TARGET_DIR/"
cp "$TEMPLATES_DIR/IDENTITY.md" "$TARGET_DIR/"
cp "$TEMPLATES_DIR/USER.md" "$TARGET_DIR/"
cp "$TEMPLATES_DIR/TOOLS.md" "$TARGET_DIR/"

echo "✅ 工作区 '$WORKSPACE_NAME' 初始化完成！"
echo "📂 路径: $TARGET_DIR"
echo "📝 请编辑各 .md 文件，替换 [方括号] 内容为你的实际配置。"
