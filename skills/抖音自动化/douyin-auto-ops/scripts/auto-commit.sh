#!/bin/bash
# 🐾 石榴·嗨舞 - 抖音自动化 skill 自动提交脚本
# 用法: ./auto-commit.sh "改动说明"
# 示例: ./auto-commit.sh "v52: 修复私信超时问题"

set -e

WORKSPACE="/Users/popoll/.openclaw/workspace"
SKILL_DIR="$WORKSPACE/skills/抖音自动化/douyin-auto-ops"
CHANGELOG="$SKILL_DIR/CHANGELOG.md"

# 获取参数
MSG="${1:-自动提交}"
TIME=$(date '+%Y-%m-%d %H:%M:%S')
DATE_TAG=$(date '+%Y-%m-%d')

cd "$WORKSPACE"

# 只提交抖音自动化 skill 目录
git add "skills/抖音自动化/"

# 检查是否有改动
CHANGED=$(git diff --cached --name-only 2>/dev/null || true)
if [ -z "$CHANGED" ]; then
    echo "🐾 没有检测到改动，跳过提交"
    exit 0
fi

# 提交
git commit -m "🐾 $MSG [$TIME]"

echo "✅ 提交成功: $MSG"
echo "📝 改动文件:"
echo "$CHANGED" | sed 's/^/   /'

# 更新 CHANGELOG
if [ -f "$CHANGELOG" ]; then
    # 读取现有内容
    EXISTING=$(cat "$CHANGELOG")
    # 写入新版本
    echo "# 抖音自动化 skill 改动日志

## $DATE_TAG - $MSG
- **时间**: $TIME
- **改动**: $MSG
- **文件**:
$(echo "$CHANGED" | sed 's/^/  - /')

---
$EXISTING" > "$CHANGELOG"
    echo "📋 CHANGELOG 已更新"
fi
