# Claude開発仕様書

## ✅ 必読事項

- 日本語で対応すること
- 作業開始前に `.claude/構造マップ` を確認し、最終更新日を必ずチェック
- 内容を更新した場合は、最終更新日も必ず書き換えること

## 📂 開発メモ保管場所

- 設計・実装の詳細メモは `.claude/開発メモ/` ディレクトリに保存。

---

# 🚨 禁止事項一覧

## サーバー起動禁止

- ❌ `npm run dev`（Web/API両方）
- ❌ `cd apps/web && npm run dev`
- ❌ `cd apps/api && npm run dev`

## 作業方法の禁止

- ❌ コードを読まずに修正提案
- ❌ 変数・関数の存在確認を怠る
- ❌ 型エラー・lintエラーを放置
- ❌ `as unknown as` など危険なキャスト
- ❌ 共通型を使わず `string/number` 直書き

## Git操作の制限

- ❌ 勝手にコミット実行
  ※ `Run git add . and commit in Japanese .` 指示時のみ許可

## UI/UXルール

- ❌ `title` 属性の直接使用（Tooltipコンポーネント必須）

## DB・マイグレーション制限

### 🚫 実行厳禁

- ❌ `npm run db:reset:local`（全データ消失）
- ❌ `npm run db:migration:prod`（本番DB変更）

### ⚠️ 要確認

- `npm run db:generate`（スキーマ変更時のみ）
- `npm run db:migration:local`（ローカル限定）
- drizzle-kit 実行（要提案前確認）

### ✅ 実行許可（慎重に）

- スキーマ編集（コード修正）
- マイグレーションファイル閲覧（内容確認のみ）
<!--

# 🧠 Cloud Code作業ルール

> Cloud Code = 設計担当（実装はCodexが行う）

## 作業原則

1. **原則としてコード実装は行わない**
2. 最初の出力は必ず **実装計画書（Plan）**
3. Plan保存先：`.claude/plans/`
4. Planには以下を必ず含めること：
   - 目的（意図・期待成果）
   - 変更範囲（画面・関数・API・型など）
   - 実装手順（ファイル単位）
   - 影響範囲・懸念点
   - Codex用ToDoリスト（実装指示）
5. **以下のテンプレートをPlan冒頭に必ず貼り付けること**

---

## 🧠 Cloud Code Plan用ヘッダー（このままコピペ）

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**  
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**  
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**

---

## 🌟 例外ルール（Codexトラブル時）

- ユーザーからの命令がある場合コード生成を行うこと　※codexの制限時など

## 運用ルール

- Plan作成後、ユーザー承認までコード修正は禁止
- PlanはCodexが実装しやすい形で記述する
- `.claude/` 配下（ドキュメント類）のみ直接更新可 -->

# 📘 プロジェクト概要

## プロジェクト名

**「ぺたぼー」**
個人・チーム向け **統合メモ × タスク管理 × プロジェクト整理** システム。

## モノレポ構成（Turborepo）

- `apps/web`：Next.js（フロント）
- `apps/api`：Hono + SQLite（API）
- `packages/*`：共通ロジック・型定義

## 主な機能

- メモ管理：思考整理・アイデア蓄積
- タスク管理：TODO・進捗・期限
- ボード管理：カンバン整理
- チーム機能（拡張予定）：共有・権限管理

## プロダクト思想

- **シンプル**：迷わず使える操作性
- **共通化ファースト**：重複排除・再利用優先
- **型安全**：TypeScriptで堅牢設計
- **自動化重視**：品質と効率の両立

詳細は `.claude/開発メモ/技術スタック.md` を参照。

---

# ⚙️ 開発原則・型システム

## 設計原則

- 共通化ファースト：2回以上使うなら即共通化
- Props設計：variant, size, colorで拡張
- サイズ指定：親から渡す（デフォルト値禁止）
- 型安全：共通型定義を使用、危険なキャスト禁止

## 共通型定義

`apps/web/src/types/common.ts`

```typescript
export type OriginalId = string;
```

### OriginalId設計思想

- 生成：`id.toString()`
- 一意性：AUTO_INCREMENTで保証
- 用途：削除・復元・識別
- 型安全：全箇所`OriginalId`型で統一

### ID種別

- `id`: number（DB主キー）
- `originalId`: OriginalId（復元識別用）

---

# 🔑 API認証パターン

```typescript
// Clerk Bearer認証（credentials不要）
const response = await fetch(`${API_BASE_URL}/categories`, {
  headers: {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  },
});
```

---

# 🧩 開発コマンド

```bash
# 品質チェック
npm run check:wsl   # Web
npm run check:api   # API
```

---

# 🚀 開発フロー

## 1️⃣ API開発

```bash
# スキーマ・ルート作成
# DBデータ確認
npx wrangler d1 execute DB --local --command "SELECT id, title FROM memos LIMIT 3;"

# 動作テスト
apitest "/categories"                           # GET
apitest "/memos" "POST" '{"title":"テストメモ"}' # POST
```

## 2️⃣ フロント実装

```bash
npm run check:wsl
tail -f petaboo/web.log | grep -i "error\|warn"
```

## 3️⃣ エラー対応

```bash
tail -50 petaboo/api.log
tail -50 petaboo/web.log
pkill -f "tsx.*apps/api"
```

---

# 🛠️ 開発補助コマンド集

## APIテスト関数

```bash
apitest() {
  local endpoint="$1"
  local method="${2:-GET}"
  local data="$3"
  local base_url="http://localhost:7594"
  echo "🧪 Testing: $method $base_url$endpoint"
  if [ -n "$data" ]; then
    curl -s -X "$method" "$base_url$endpoint" \
      -H "Authorization: Bearer ${API_TOKEN:-dummy}" \
      -H "Content-Type: application/json" \
      -d "$data" | jq
  else
    curl -s -X "$method" "$base_url$endpoint" \
      -H "Authorization: Bearer ${API_TOKEN:-dummy}" | jq
  fi
}
```

## データベース確認

```bash
npx wrangler d1 execute DB --local --command "SELECT id, title, LEFT(content, 50) as preview FROM memos ORDER BY createdAt DESC LIMIT 5;"
npx wrangler d1 execute DB --local --command "SELECT id, title, status, priority FROM tasks ORDER BY createdAt DESC LIMIT 5;"
npx wrangler d1 execute DB --local --command "SELECT id, name FROM categories ORDER BY createdAt DESC;"
npx wrangler d1 execute DB --local --command "PRAGMA table_info(memos);"
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## トラブルシューティング

```bash
lsof -ti:7594 | xargs -r kill -9  # API停止
lsof -ti:7593 | xargs -r kill -9  # Web停止
```

---

# 🚨 API追加時に必ず行うこと

1. ルート作成：`apps/api/src/routes/{name}/route.ts`
2. 実装：`apps/api/src/routes/{name}/api.ts`
3. 登録：`worker-d1.ts`

   ```typescript
   import newRoute from "./src/routes/{name}/route";
   app.route("/{path}", newRoute);
   ```

### よくある失敗

- `openapi.ts`登録のみ → 404発生
- 実エントリーポイントは`worker-d1.ts`

### チェックリスト

- [ ] ルート作成
- [ ] 実装完了
- [ ] インポート追加
- [ ] `app.route()`追加
- [ ] サーバー再起動・動作確認

---

# 🧹 ログフィルタリングシステム

## 概要

不要ログを除去し、開発効率を向上。

## 構成

- `filter-logs.sh`：共通フィルタ
- 起動時に旧ログ削除
- リクエスト開始ログを抑制、完了ログのみ保持

## 除外対象

- コンパイルメッセージ（✓ Compiledなど）
- Next.js起動文
- CORSプリフライト
- Wrangler情報ログ

## 保持対象

- エラー・警告
- 完了ログ（`GET ... - 200`形式）
- 重要初期化ログ
- 業務アプリログ

## 使用方法

```bash
cd apps/web && npm run dev
cd apps/api && npm run dev
```

### 設定変更

`filter-logs.sh` 内の `FILTER_PATTERNS` を編集。

---

# 🧩 レガシー回避策

既存タグAPI例：

```typescript
app.get("/tags", async (c) => {
  const teamId = c.req.query("teamId");
  if (teamId) {
    // チーム処理
  } else {
    // 個人処理
  }
});
```
