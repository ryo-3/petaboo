#!/bin/bash

# WebとAPIの開発サーバーをログ付きで起動するスクリプト

echo "🚀 開発サーバーをログ付きで起動中..."
echo "Web Log: /home/ryosuke/note/web.log"
echo "API Log: /home/ryosuke/note/api.log"
echo "======================================="

# ログファイルをクリア
> /home/ryosuke/note/web.log
> /home/ryosuke/note/api.log

# turbo run devの出力を分離してログに保存
turbo run dev 2>&1 | while IFS= read -r line; do
  echo "$line"  # コンソールにも表示
  
  # Web関連のログ
  if echo "$line" | grep -E "web:dev|^web:" >/dev/null; then
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $line" >> /home/ryosuke/note/web.log
  
  # API関連のログ  
  elif echo "$line" | grep -E "api:dev|^api:" >/dev/null; then
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $line" >> /home/ryosuke/note/api.log
  
  # その他のログ（両方に記録）
  else
    echo "$(date '+[%Y-%m-%dT%H:%M:%S.%3NZ]') $line" >> /home/ryosuke/note/api.log
  fi
done