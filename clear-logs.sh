#!/bin/bash

# 開発用ログクリアスクリプト
# 画面更新時に呼び出すことでログファイルをクリーンにする

LOG_DIR="/home/ryosuke/petaboo"

# ログファイルが存在する場合のみクリア
if [ -f "$LOG_DIR/web.log" ]; then
    > "$LOG_DIR/web.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Web log cleared"
fi

if [ -f "$LOG_DIR/api.log" ]; then
    > "$LOG_DIR/api.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - API log cleared"
fi

echo "Development logs cleared successfully"