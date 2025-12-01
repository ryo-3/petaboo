# PETABOO-30: 個人側で一切画像アップロードができない

**日付**: 2025-12-02

## 問題

個人側で画像アップロードが一切できない。（本番環境のみ）

## 原因

本番DBのテーブル構造がローカルと一致していなかった。
マイグレーションファイルは `d1_migrations` テーブルに「適用済み」として記録されていたが、実際のカラム変更が行われていなかった。

## 発見された差分

| テーブル         | ローカル                 | 本番（修正前） | 状態       |
| ---------------- | ------------------------ | -------------- | ---------- |
| `attachments`    | `display_id`             | `original_id`  | 不一致     |
| `deleted_boards` | `display_id`             | `original_id`  | 不一致     |
| `taggings`       | `target_display_id` あり | なし           | カラム欠落 |

## 修正内容

以下のSQLを本番DBに直接実行：

```sql
-- attachments
ALTER TABLE attachments RENAME COLUMN original_id TO display_id;

-- deleted_boards
ALTER TABLE deleted_boards RENAME COLUMN original_id TO display_id;

-- taggings
ALTER TABLE taggings ADD COLUMN target_display_id TEXT;
```

## 再発防止策（検討事項）

1. **デプロイ後の検証スクリプト作成**
   - 主要テーブルのカラム構造をローカルと本番で比較
   - 差分があれば警告を出す

2. **マイグレーション実行時のログ確認**
   - `npx wrangler d1 migrations apply` の出力を確認
   - エラーが発生していないか注意

3. **定期的なDB構造チェック**
   - デプロイ前に全テーブルの構造比較を実施

## 比較コマンド例

```bash
# ローカル
npx wrangler d1 execute DB --local --command "PRAGMA table_info(テーブル名);"

# 本番
CLOUDFLARE_ACCOUNT_ID="e7ede1cb0525601a97c71931146a6696" npx wrangler d1 execute petaboo --remote --command "PRAGMA table_info(テーブル名);"
```

## 関連ファイル

- マイグレーション: `apps/api/drizzle/0026_rename_attachments_original_id_to_display_id.sql`
- スキーマ: `apps/api/src/db/schema/attachments.ts`
