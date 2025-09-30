#!/bin/bash

# アイコンコンポーネントの重複Props定義を修正するスクリプト

ICONS_DIR="/home/ryosuke/petaboo/apps/web/components/icons"

echo "🔧 アイコンコンポーネント重複Props修正スクリプト開始"

cd "$ICONS_DIR"

# 対象ファイル数を確認
TOTAL_FILES=$(find . -name "*.tsx" -exec grep -l "extends BaseIconProps {" {} \; | wc -l)
echo "📊 対象ファイル数: $TOTAL_FILES"

# 各アイコンファイルを処理
UPDATED_COUNT=0

for file in $(find . -name "*.tsx" -exec grep -l "extends BaseIconProps {" {} \;); do
  echo "🔄 処理中: $(basename "$file")"

  # 現在の状態確認
  if grep -q "className?: string;" "$file"; then
    echo "   重複発見: className?: string; を削除中..."

    # 一時ファイルを作成
    temp_file=$(mktemp)

    # BaseIconProps { の次の行から className?: string; までを削除
    sed '/extends BaseIconProps {/{
      :a
      n
      /className\?: string;/d
      /^}$/!ba
    }' "$file" > "$temp_file"

    # 元ファイルと置換
    mv "$temp_file" "$file"

    UPDATED_COUNT=$((UPDATED_COUNT + 1))
    echo "   ✅ 修正完了: $(basename "$file")"
  else
    echo "   ⏭️  スキップ: $(basename "$file") (already clean)"
  fi
done

echo ""
echo "🎉 アイコンコンポーネント重複Props修正完了!"
echo "📈 修正ファイル数: $UPDATED_COUNT/$TOTAL_FILES"

# 修正結果の確認
echo ""
echo "🔍 修正結果確認:"
REMAINING=$(find . -name "*.tsx" -exec grep -l "className?: string;" {} \; | wc -l)
if [ "$REMAINING" -eq 0 ]; then
  echo "✅ 全ての重複が解消されました"
else
  echo "⚠️  まだ $REMAINING 個のファイルに重複が残っています"
fi

echo ""
echo "🔍 TypeScriptエラーチェックを実行してください:"
echo "   cd /home/ryosuke/petaboo && npm run check:wsl"