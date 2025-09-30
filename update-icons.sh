#!/bin/bash

# アイコンコンポーネントのProps型を統一するスクリプト

ICONS_DIR="/home/ryosuke/petaboo/apps/web/components/icons"

echo "🔧 アイコンコンポーネントProps統一スクリプト開始"

# 対象ファイル数を確認
TOTAL_FILES=$(find "$ICONS_DIR" -name "*.tsx" -exec grep -l "interface.*IconProps" {} \; | wc -l)
echo "📊 対象ファイル数: $TOTAL_FILES"

# 各アイコンファイルを処理
UPDATED_COUNT=0

for file in $(find "$ICONS_DIR" -name "*.tsx" -exec grep -l "interface.*IconProps" {} \;); do
  echo "🔄 処理中: $(basename "$file")"

  # 既にimportがある場合はスキップ
  if grep -q "BaseIconProps" "$file"; then
    echo "⏭️  スキップ: $(basename "$file") (already updated)"
    continue
  fi

  # 一時ファイルを作成
  temp_file=$(mktemp)

  # 1. importを追加
  # 2. interface定義を置換
  sed '1i\
import { BaseIconProps } from "@/src/types/icon";\
' "$file" | sed 's/interface \([A-Za-z]*\)IconProps {/interface \1IconProps extends BaseIconProps {/' | sed '/className\?: string;/d' > "$temp_file"

  # 元ファイルと置換
  mv "$temp_file" "$file"

  UPDATED_COUNT=$((UPDATED_COUNT + 1))
  echo "✅ 完了: $(basename "$file")"
done

echo ""
echo "🎉 アイコンコンポーネントProps統一完了!"
echo "📈 更新ファイル数: $UPDATED_COUNT/$TOTAL_FILES"
echo ""
echo "🔍 TypeScriptエラーチェックを実行してください:"
echo "   npm run check:wsl"