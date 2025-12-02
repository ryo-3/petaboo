#!/bin/bash

# 共通ログフィルタリングスクリプト
# 使用方法: command 2>&1 | ./filter-logs.sh output.log

LOG_FILE=$1
if [ -z "$LOG_FILE" ]; then
  echo "Usage: command 2>&1 | ./filter-logs.sh output.log"
  exit 1
fi

# フィルタリングパターン（設定を一箇所に集約）
FILTER_PATTERNS=(
  "POST /api/browser-log"
  "GET /favicon\.ico"
  "\[Fast Refresh\]"
  "GET /team/.* 200"
  "POST .* 200 in.*ms$"
  "Clerk has been loaded with development keys"
  "Download the React DevTools"
  "⚡ Next\.js"
  "Local:"
  "Network:"
  "ready started server on"
  "webpack compiled"
  "⨯ " # webpack エラープレフィックス以外
  "○ Compiling"
  "✓ Compiled"
  "OPTIONS .* 204 No Content"
  "\[wrangler:info\] OPTIONS"
  "\[wrangler:info\] GET"
  "\[wrangler:info\] POST"
  "\[wrangler:info\] PUT"
  "\[wrangler:info\] DELETE"
  "GET http://localhost:7594/.*[^0-9]$"
  "POST http://localhost:7594/.*[^0-9]$"
  "PUT http://localhost:7594/.*[^0-9]$"
  "DELETE http://localhost:7594/.*[^0-9]$"
  # Next.js ページリクエストログ（GET /?xxx 200 形式）
  "GET /\?.* 200 in"
  "GET / 200 in"
)

# パターンを正規表現として結合
FILTER_REGEX=$(IFS='|'; echo "${FILTER_PATTERNS[*]}")

while IFS= read -r line; do
  # コンソールには全て表示
  echo "$line"

  # ANSIエスケープシーケンス、制御文字、カーソル移動文字を除去してクリーンにする
  clean_line=$(echo "$line" | sed $'s/\033\[[0-9;]*[a-zA-Z]//g' | sed $'s/\033\[?[0-9]*[a-zA-Z]//g' | tr -d '\r' | sed 's/[[:cntrl:]]\[[0-9;]*[a-zA-Z]//g')

  # フィルタリングチェック
  if ! echo "$clean_line" | grep -qE "$FILTER_REGEX"; then
    # タイムスタンプ付きでファイルに書き込み
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $clean_line" >> "$LOG_FILE"
  fi
done