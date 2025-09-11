#!/bin/bash

# WebとAPIの開発サーバーをログ付きで起動するスクリプト

echo "🚀 開発サーバーをログ付きで起動中..."
echo "Web Log: $(pwd)/web.log"
echo "API Log: $(pwd)/api.log"
echo "======================================="

# ログファイルをクリア
> web.log
> api.log

# turbo run devの出力を分離してログに保存
turbo run dev 2>&1 | while IFS= read -r line; do
  echo "$line"  # コンソールにも表示
  
  # ANSIエスケープシーケンス、制御文字、カーソル移動文字を除去
  clean_line=$(echo "$line" | sed $'s/\033\[[0-9;]*[a-zA-Z]//g' | sed $'s/\033\[?[0-9]*[a-zA-Z]//g' | tr -d '\r' | sed 's/[[:cntrl:]]\[[0-9;]*[a-zA-Z]//g')
  
  # Web関連のログ
  if echo "$line" | grep -E "web:dev|^web:" >/dev/null; then
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $clean_line" >> web.log
  
  # API関連のログ  
  elif echo "$line" | grep -E "api:dev|^api:" >/dev/null; then
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $clean_line" >> api.log
  
  # その他のログ（両方に記録）
  else
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $clean_line" >> api.log
  fi
done