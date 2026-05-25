#!/bin/bash
# 锚点一致性检查脚本
# 用法: ./scripts/check-anchors.sh [workspace目录]
# 功能: 检查所有 md 文件中引用的锚点是否都在目标文件中定义

WORKSPACE="${1:-.}"
ERRORS=0

echo "🔍 锚点一致性检查..."

# 使用 find 递归查找所有 md 文件（跟随软链，排除 placeholder 示例文件）
ALL_MD=$(find -L "$WORKSPACE" -name '*.md' ! -name '.placeholder.md' -type f 2>/dev/null)

if [ -z "$ALL_MD" ]; then
    echo "  ⚠️ 未找到 md 文件，跳过检查"
    exit 0
fi

# 收集所有已定义的锚点（<!-- #xxx --> 格式）
ALL_DEFINED=$(echo "$ALL_MD" | xargs grep -h '<!-- #.*-->' 2>/dev/null | grep -oE '#[a-zA-Z][a-zA-Z0-9_-]*' | sed 's/^#//' | sort -u)

# 收集所有引用的锚点（详见 XX「XX」（#xxx）格式，排除 placeholder 中的示例）
ALL_REFS=$(echo "$ALL_MD" | xargs grep -ohE '（#[a-zA-Z][a-zA-Z0-9_-]*）' 2>/dev/null | grep -oE '#[a-zA-Z][a-zA-Z0-9_-]*' | sed 's/^#//' | sort -u)

if [ -z "$ALL_REFS" ]; then
    echo "  ✅ 未找到锚点引用，跳过检查"
    exit 0
fi

for ref in $ALL_REFS; do
    if ! echo "$ALL_DEFINED" | grep -qx "$ref"; then
        echo "  ❌ 断裂锚点: #$ref"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -eq 0 ]; then
    echo "  ✅ 所有锚点一致，无断裂（共检查 $(echo "$ALL_REFS" | wc -l | tr -d ' ') 个引用）"
    exit 0
else
    echo "  ⚠️ 发现 $ERRORS 个断裂锚点"
    exit 1
fi
