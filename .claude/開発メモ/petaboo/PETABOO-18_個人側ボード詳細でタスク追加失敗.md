# 本番DB board_items display_idカラム欠落問題

## 発生日時

2025-12-01

## 問題

- 本番環境でのみ「ボードへのアイテム追加に失敗しました」エラーが発生
- ローカルでは再現しない

## エラー内容

```
Failed query: select "id", "board_id", "item_type", "display_id", ...
from "board_items" where ...
```

## 原因

- 本番DBの `board_items` テーブルに `display_id` カラムが存在しなかった
- 代わりに `original_id` カラムが残っていた
- マイグレーション `0025_rename_board_original_id_to_display_id.sql` は適用済みとして記録されていたが、実際のカラム変更が反映されていなかった

## 調査結果

| カラム      | ローカル | 本番（修正前） | 本番（修正後） |
| ----------- | -------- | -------------- | -------------- |
| display_id  | あり     | なし           | あり           |
| original_id | なし     | あり           | なし           |

## 解決方法

手動でカラムをリネーム：

```sql
ALTER TABLE board_items RENAME COLUMN original_id TO display_id;
```

## 推測される原因

- マイグレーション実行時に複数ステートメントの一部が失敗
- `--> statement-breakpoint` でステートメントが分割されていた
- 最初のALTERが失敗したまま「適用済み」としてマークされた可能性

## 教訓

- マイグレーション適用後は本番DBのスキーマを直接確認する
- 複数ステートメントを含むマイグレーションは注意が必要
- 本番でのみ発生するエラーはまずDBスキーマの差異を疑う
