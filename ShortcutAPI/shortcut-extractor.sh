#!/bin/bash

# iCloud快捷指令源码提取工具
# 将iCloud快捷指令链接转换为JSON或XML格式
# 使用方法: ./shortcut-extractor.sh <iCloud链接> [format]
# format可以是json或xml，默认为xml
# author: zhuxingtongxue

set -e

# 检查参数
if [ $# -lt 1 ]; then
  echo "用法: $0 <iCloud快捷指令链接> [format]"
  echo "format可以是json或xml，默认为xml"
  exit 1
fi

# 定义变量
SHORTCUT_URL="$1"
FORMAT="${2:-json}"  # 默认为json

# 修改这一行，使用单括号和-a替代&&
if [ "$FORMAT" != "xml" -a "$FORMAT" != "json" ]; then
  echo "格式必须是xml或json"
  exit 1
fi

echo "开始处理快捷指令: $SHORTCUT_URL"

# 检查必要的工具
if command -v plutil &> /dev/null; then
  # macOS
  PLIST_TOOL="plutil"
  is_macos=true
elif command -v plistutil &> /dev/null; then
  # Ubuntu/Linux
  PLIST_TOOL="plistutil"
  is_macos=false
else
  echo "错误: 需要安装 plutil (macOS) 或 plistutil (Ubuntu/Linux)"
  exit 1
fi

# 检查jq是否安装
if ! command -v jq &> /dev/null; then
  echo "错误: 需要安装 jq 工具"
  echo "在Ubuntu上可以使用: sudo apt install jq"
  echo "在macOS上可以使用: brew install jq"
  exit 1
fi

# 从URL提取快捷指令ID
SHORTCUT_ID=$(echo "$SHORTCUT_URL" | grep -o '[^/]*$')
if [ -z "$SHORTCUT_ID" ]; then
  echo "错误: 无法从URL中提取快捷指令ID"
  exit 1
fi

# 构建API URL
API_URL="https://www.icloud.com/shortcuts/api/records/$SHORTCUT_ID"
echo "API URL: $API_URL"

# 创建临时目录
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# 下载API数据
echo "下载快捷指令元数据..."
RESPONSE_FILE="$TMP_DIR/response.json"
curl -s "$API_URL" > "$RESPONSE_FILE"

# 检查API响应
if ! jq -e . "$RESPONSE_FILE" &>/dev/null; then
  echo "错误: API响应不是有效的JSON"
  cat "$RESPONSE_FILE"
  exit 1
fi

# 提取下载URL和快捷指令名称
DOWNLOAD_URL=$(jq -r '.fields.shortcut.value.downloadURL' "$RESPONSE_FILE")
SHORTCUT_NAME=$(jq -r '.fields.name.value' "$RESPONSE_FILE")

# 如果名称为null或空，使用ID作为名称
if [ -z "$SHORTCUT_NAME" ] || [ "$SHORTCUT_NAME" == "null" ]; then
  SHORTCUT_NAME="shortcut_$SHORTCUT_ID"
fi

# 清理文件名
SHORTCUT_NAME=$(echo "$SHORTCUT_NAME" | tr ' ' '_' | tr -cd '[:alnum:]_-')
echo "快捷指令名称: $SHORTCUT_NAME"

if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" == "null" ]; then
  echo "错误: 无法找到下载链接"
  exit 1
fi

echo "下载链接: $DOWNLOAD_URL"

# 下载plist文件
PLIST_FILE="$TMP_DIR/$SHORTCUT_NAME.plist"
echo "下载快捷指令plist文件..."
curl -s "$DOWNLOAD_URL" -o "$PLIST_FILE"

# 检查plist文件
if [ ! -s "$PLIST_FILE" ]; then
  echo "错误: plist文件下载失败或为空"
  exit 1
fi

# 输出文件
OUTPUT_FILE="$SHORTCUT_NAME.$FORMAT"

# 转换plist到目标格式
echo "转换为$FORMAT格式..."
if $is_macos; then
  # macOS系统使用plutil
  if [ "$FORMAT" = "xml" ]; then
    $PLIST_TOOL -convert xml1 "$PLIST_FILE" -o "$OUTPUT_FILE"
  else
    $PLIST_TOOL -convert json "$PLIST_FILE" -o "$OUTPUT_FILE"
  fi
else
  # Ubuntu/Linux系统使用plistutil
  if [ "$FORMAT" = "xml" ]; then
    $PLIST_TOOL -i "$PLIST_FILE" -o "$OUTPUT_FILE" -f xml
  else
    $PLIST_TOOL -i "$PLIST_FILE" -o "$OUTPUT_FILE" -f json
    # 在Ubuntu上，修复可能的JSON格式问题
    if [ -f "$OUTPUT_FILE" ]; then
      # 确保JSON格式正确，将输出重新通过jq处理一遍
      TMP_JSON="$TMP_DIR/tmp.json"
      if jq '.' "$OUTPUT_FILE" > "$TMP_JSON" 2>/dev/null; then
        mv "$TMP_JSON" "$OUTPUT_FILE"
      fi
    fi
  fi
fi

echo "成功! 快捷指令已保存为: $OUTPUT_FILE"

# 打印有用的信息
echo ""
echo "快捷指令信息:"
if [ "$FORMAT" = "json" ]; then
  # 如果是JSON格式，打印一些基本信息，使用更兼容的jq表达式
  # 避免使用复杂的插值表达式，分开处理每个字段
  WF_NAME=$(jq -r '.WFWorkflowName // "无名称"' "$OUTPUT_FILE" 2>/dev/null || echo "无名称")
  WF_ACTIONS=$(jq -r '.WFWorkflowActions | length // 0' "$OUTPUT_FILE" 2>/dev/null || echo "0")
  echo "$WF_NAME - 动作数量: $WF_ACTIONS"
else
  # 如果是XML格式，仅打印文件大小
  echo "文件大小: $(du -h "$OUTPUT_FILE" | cut -f1)"
fi