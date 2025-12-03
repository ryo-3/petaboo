# Phase 6: originalId完全削除 本番マイグレーション手順書

**作成日**: 2025-11-24
**対象**: チーム側テーブルのみ（個人側は対象外）
**危険度**: 🔴 **高（不可逆的な変更）**

---

## ⚠️ 重要事項

- **この操作は不可逆です**。一度実行するとoriginalIdカラムを復元できません
- 必ず本番データのバックアップを取得してから実行してください
- 実行前に全ての変更をローカル環境でテスト済みであることを確認してください

---

## 📋 事前準備チェックリスト

### コード準備

- [ ] すべてのコード変更がローカルでテスト済み
- [ ] ローカルで型チェックが成功している
- [ ] git commitが完了している
- [ ] 本番環境にデプロイ済み（APIとWeb両方）

### バックアップ準備

- [ ] バックアップ用ディレクトリを作成: `mkdir -p backups/$(date +%Y%m%d-%H%M%S)`

---

## 🔄 本番マイグレーション手順

### ステップ1: 本番データの完全バックアップ（必須）

```bash
# 1. バックアップディレクトリ作成
BACKUP_DIR="backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# 2. 本番DBの完全エクスポート
npx wrangler d1 export DB --remote --output $BACKUP_DIR/production-full.sql

# 3. 主要テーブルをJSON形式でも保存（確認用）
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_tasks" --json > $BACKUP_DIR/team_tasks.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_memos" --json > $BACKUP_DIR/team_memos.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_deleted_tasks" --json > $BACKUP_DIR/team_deleted_tasks.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_deleted_memos" --json > $BACKUP_DIR/team_deleted_memos.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_board_items" --json > $BACKUP_DIR/team_board_items.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_notifications" --json > $BACKUP_DIR/team_notifications.json
npx wrangler d1 execute DB --remote --command "SELECT * FROM team_taggings" --json > $BACKUP_DIR/team_taggings.json

# 4. バックアップ確認
ls -lh $BACKUP_DIR/
echo "✅ バックアップ完了: $BACKUP_DIR"
```

### ステップ2: マイグレーション前の状態確認

```bash
# 1. 現在のテーブル構造を確認（originalId列が存在することを確認）
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_tasks)"
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_memos)"
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_board_items)"
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_notifications)"
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_taggings)"

# 2. データ件数を確認
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) as count FROM team_tasks"
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) as count FROM team_memos"
```

### ステップ3: マイグレーションSQL実行

```bash
# Phase 6マイグレーション実行
npx wrangler d1 execute DB --remote --file apps/api/drizzle/0028_drop_original_id_columns_phase6.sql

# 実行確認メッセージが表示されることを確認
# ✅ Successfully executed SQL
```

### ステップ4: マイグレーション後の確認

```bash
# 1. originalId列が削除されたことを確認
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_tasks)" | grep -i original
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_memos)" | grep -i original
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_board_items)" | grep -i original
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_notifications)" | grep -i original
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_taggings)" | grep -i original

# ↑ 何も表示されなければ成功（originalId列が削除されている）

# 2. displayId列が存在することを確認
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_tasks)" | grep display_id
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_memos)" | grep display_id

# ↑ display_idが表示されればOK

# 3. データ件数が変わっていないことを確認
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) as count FROM team_tasks"
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) as count FROM team_memos"

# ↑ ステップ2と同じ件数であることを確認
```

### ステップ5: アプリケーション動作確認

```bash
# 本番環境で以下を確認：
```

1. **チームタスク作成** → displayIdが正しく生成されるか
2. **チームメモ作成** → displayIdが正しく生成されるか
3. **タスク削除** → 正常に削除できるか
4. **タスク復元** → 正常に復元できるか（displayIdが保持されているか）
5. **メモ削除・復元** → 同様に動作するか
6. **ボードアイテム追加** → displayIdで正常に追加できるか
7. **通知機能** → 正常に動作するか
8. **タグ機能** → 正常に動作するか

---

## 🚨 トラブルシューティング

### マイグレーション実行エラーが発生した場合

```bash
# エラーメッセージを確認
# 多くの場合、カラムが既に存在しないか、データの不整合が原因

# 1. バックアップから復元（最終手段）
npx wrangler d1 execute DB --remote --file $BACKUP_DIR/production-full.sql

# 2. 状態を確認
npx wrangler d1 execute DB --remote --command "PRAGMA table_info(team_tasks)"
```

### アプリケーションでエラーが発生した場合

1. **エラーログを確認**

   ```bash
   npx wrangler tail --remote
   ```

2. **問題の特定**
   - `originalId` を参照している箇所が残っていないか確認
   - APIレスポンスに `originalId` が含まれていないか確認

3. **緊急対応**
   - 前のバージョンにロールバック
   - バックアップからDB復元

---

## ✅ 完了確認

Phase 6マイグレーションが完了したら、以下を確認：

- [ ] すべてのチーム側テーブルから `original_id` 列が削除されている
- [ ] `displayId` でチームタスク・メモが正常に動作している
- [ ] 削除・復元機能が正常に動作している
- [ ] ボード機能が正常に動作している
- [ ] 通知・タグ機能が正常に動作している
- [ ] 本番環境で1時間以上エラーが発生していない

---

## 📝 変更内容サマリー

### 削除されたカラム（8テーブル）

| テーブル             | 削除されたカラム                          |
| -------------------- | ----------------------------------------- |
| `team_tasks`         | `original_id`                             |
| `team_deleted_tasks` | `original_id`                             |
| `team_memos`         | `original_id`                             |
| `team_deleted_memos` | `original_id`                             |
| `team_board_items`   | `original_id`                             |
| `team_notifications` | `target_original_id`, `board_original_id` |
| `team_taggings`      | `target_original_id`                      |

### 残存するカラム

| テーブル       | 使用するカラム                          |
| -------------- | --------------------------------------- |
| チーム側すべて | `display_id`（単純連番: "1", "2", "3"） |
| 個人側すべて   | `original_id`（変更なし）               |

---

## 📞 サポート

問題が発生した場合は、バックアップディレクトリのパスとエラーメッセージを記録してください。

---

**最終更新**: 2025-11-24
