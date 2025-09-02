#!/bin/bash
Run git add . and commit in Japanese .

# 常時ログ監視システム - web.logとapi.logをリアルタイム監視

API_LOG="/home/ryosuke/note/apps/api/api.log"
WEB_LOG="/home/ryosuke/note/web.log"

echo "🔄 常時ログ監視システム開始"
echo "監視対象:"
echo "  Web Log: $WEB_LOG" 
echo "  API Log: $API_LOG"
echo "終了するには Ctrl+C を押してください"
echo "======================================="

# ログファイルが存在しない場合は作成
touch "$API_LOG" "$WEB_LOG"

# 関数: ログエントリを処理する
process_log_entry() {
    local log_type="$1"
    local line="$2"
    local timestamp=$(date '+%H:%M:%S')
    
    # 全てのログエントリを表示
    echo "📋 [$log_type] $timestamp - $line"
    
    # エラーの場合は強調表示
    if echo "$line" | grep -iE "(error|exception|failed|エラー|失敗)" >/dev/null; then
        echo "🚨 [$log_type ERROR] $timestamp - $line"
        
        # 将来的な自動処理のフックポイント
        # ここに自動処理ロジックを追加可能
        
    fi
    
    # 警告の場合
    if echo "$line" | grep -iE "(warn|warning|注意)" >/dev/null; then
        echo "⚠️  [$log_type WARN] $timestamp - $line"
    fi
}

# API ログ監視
(
    echo "=== API LOG 監視開始 ==="
    tail -f "$API_LOG" 2>/dev/null | while read -r line; do
        [[ -n "$line" ]] && process_log_entry "API" "$line"
    done
) &

# Web ログ監視  
(
    echo "=== WEB LOG 監視開始 ==="
    tail -f "$WEB_LOG" 2>/dev/null | while read -r line; do
        [[ -n "$line" ]] && process_log_entry "WEB" "$line"
    done
) &

# バックグラウンドプロセス管理
trap 'kill $(jobs -p) 2>/dev/null; echo -e "\n🔴 常時監視を終了しました"; exit' INT TERM

echo "✅ 監視システム起動完了 - ログを待機中..."

# メインプロセス待機
wait