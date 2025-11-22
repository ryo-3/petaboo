#!/bin/bash
# リファクタリングチェックスクリプト
# .claude/agents/refactor-checker.md のチェック項目を自動実行

set -e

# ステージングされたTypeScript/TSXファイルを取得
STAGED_FILES=$(git diff --cached --name-only | grep -E '\.(ts|tsx)$' | grep -v -E '\.(test|spec)\.(ts|tsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "🔍 リファクタリングチェック中..."

ERRORS=0
WARNINGS=0

# 1️⃣ 危険なコード検出
echo ""
echo "【1/5】危険なコード検出..."

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    # as unknown as 検出
    if grep -n "as unknown as" "$file" 2>/dev/null | head -5; then
      echo "❌ 危険な型キャスト検出: $file"
      echo "💡 Zodスキーマでバリデーションを推奨"
      ERRORS=1
    fi

    # any 型検出（型定義以外）
    if grep -n ": any" "$file" 2>/dev/null | grep -v "^[[:space:]]*\/\/" | head -5; then
      echo "⚠️  any型の使用: $file"
      echo "💡 具体的な型定義を推奨"
      WARNINGS=1
    fi

    # @ts-ignore / @ts-expect-error 検出
    if grep -n "@ts-ignore\|@ts-expect-error" "$file" 2>/dev/null | head -5; then
      echo "⚠️  型エラー抑制コメント検出: $file"
      echo "💡 根本的な型エラー修正を推奨"
      WARNINGS=1
    fi
  fi
done

# 2️⃣ title属性の直接使用検出
echo ""
echo "【2/5】title属性チェック..."

for file in $STAGED_FILES; do
  if [ -f "$file" ] && [[ "$file" == *.tsx ]]; then
    if grep -n 'title=' "$file" 2>/dev/null | grep -v "Tooltip" | grep -v "^[[:space:]]*\/\/" | head -5; then
      echo "❌ title属性の直接使用: $file"
      echo "💡 Tooltipコンポーネントの使用を推奨"
      ERRORS=1
    fi
  fi
done

# 3️⃣ コード重複検出
echo ""
echo "【3/5】コード重複チェック..."

TEMP_FILE=$(mktemp)

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    # 関数名を抽出
    grep -E '(export\s+)?(const|function)\s+([a-zA-Z0-9_]+)' "$file" 2>/dev/null | \
      sed -E 's/.*(const|function)\s+([a-zA-Z0-9_]+).*/\2/' | \
      while read -r func_name; do
        if [ -n "$func_name" ] && [ "$func_name" != "const" ] && [ "$func_name" != "function" ]; then
          echo "$func_name:$file" >> "$TEMP_FILE"
        fi
      done
  fi
done

if [ -f "$TEMP_FILE" ] && [ -s "$TEMP_FILE" ]; then
  DUPLICATES=$(cat "$TEMP_FILE" | cut -d':' -f1 | sort | uniq -c | awk '$1 > 1 {print $2}')

  if [ -n "$DUPLICATES" ]; then
    for func in $DUPLICATES; do
      echo "⚠️  関数 '$func' が複数箇所で定義されています:"
      grep "^$func:" "$TEMP_FILE" | cut -d':' -f2 | while read -r file; do
        LINE=$(grep -n -E "(const|function)\s+$func" "$file" 2>/dev/null | head -1 | cut -d':' -f1)
        if [ -n "$LINE" ]; then
          echo "   📍 $file:$LINE"
        fi
      done
      WARNINGS=1
    done
    echo "💡 共通化を検討してください"
  fi
fi

rm -f "$TEMP_FILE"

# 4️⃣ 長い関数検出（100行以上）
echo ""
echo "【4/5】長い関数チェック..."

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    # 関数の長さをチェック（簡易版：exportされた関数のみ）
    awk '/^export (const|function) / {start=NR; name=$3} /^}/ {if(start>0 && NR-start>100) print "⚠️  長い関数検出: " name " (" NR-start " 行) in FILENAME:" start; start=0}' "$file" 2>/dev/null || true
  fi
done

# 5️⃣ console.log 検出
echo ""
echo "【5/5】console.log チェック..."

for file in $STAGED_FILES; do
  if [ -f "$file" ]; then
    if grep -n "console\.log\|console\.warn\|console\.error" "$file" 2>/dev/null | grep -v "^[[:space:]]*\/\/" | head -3; then
      echo "⚠️  console.log 検出: $file"
      echo "💡 本番環境では削除を推奨"
      # これは警告のみ（エラーにしない）
    fi
  fi
done

# 結果サマリー
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 1 ]; then
  echo "❌ リファクタリングチェック: エラーあり"
  echo "上記の問題を修正してから再度コミットしてください"
  exit 1
fi

if [ $WARNINGS -eq 1 ]; then
  echo "⚠️  リファクタリングチェック: 警告あり"
  echo "上記の警告を確認してください（コミットは続行）"
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ リファクタリングチェック: 問題なし"
fi

exit 0
