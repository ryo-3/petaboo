# PETABOO-52: 500エラー時リトライロジック追加

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

コールドスタートによる500エラー発生時に、自動リトライで保存失敗を防ぐ。
ユーザー体験を損なわず、一時的なサーバーエラーを吸収する。

---

## 変更範囲

### 対象ファイル

- `apps/web/src/lib/api-client.ts` - タスク・メモAPI
- `apps/web/lib/api/comments.ts` - コメントAPI

### 影響するAPI操作（自動適用）

- タスク: createTask, createTeamTask, updateTask, updateTeamTask
- メモ: createNote, createTeamMemo, updateNote, updateTeamMemo
- コメント: createTeamComment, updateTeamComment

---

## 実装手順

### Step 1: リトライユーティリティ関数の追加

`api-client.ts` の先頭（`createHeaders`関数の後）に以下を追加：

```typescript
// 500系エラー・ネットワークエラー時のリトライ設定
interface RetryConfig {
  maxRetries?: number; // 最大リトライ回数（デフォルト: 2）
  baseDelay?: number; // 基本遅延時間ms（デフォルト: 1000）
  retryOn5xx?: boolean; // 500系エラーでリトライするか（デフォルト: true）
}

// リトライ付きfetch関数
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {},
): Promise<Response> => {
  const { maxRetries = 2, baseDelay = 1000, retryOn5xx = true } = config;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // 成功またはクライアントエラー（4xx）は即座に返す
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // 500系エラーの場合
      if (response.status >= 500 && retryOn5xx) {
        if (attempt < maxRetries) {
          // 指数バックオフで待機
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
          console.warn(
            `⚠️ API ${response.status}エラー、${delay}ms後にリトライ (${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      // リトライ上限到達
      return response;
    } catch (error) {
      // ネットワークエラー（TypeError: Failed to fetch）
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        console.warn(
          `⚠️ ネットワークエラー、${delay}ms後にリトライ (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
};
```

### Step 2: 対象メソッドをfetchWithRetryに置き換え

以下のメソッドで `fetch` → `fetchWithRetry` に変更：

#### タスク関連（必須）

1. **createTask** (行321-331)
2. **createTeamTask** (行335-350)
3. **updateTask** (行391-401)
4. **updateTeamTask** (行353-371)

#### メモ関連（推奨）

5. **createNote** (行141-152)
6. **createTeamMemo** (行68-91)
7. **updateNote** (行155-166)
8. **updateTeamMemo** (行94-122)

#### 変更例（createTaskの場合）

**Before:**

```typescript
createTask: async (data: CreateTaskData, token?: string) => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: createHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
},
```

**After:**

```typescript
createTask: async (data: CreateTaskData, token?: string) => {
  const response = await fetchWithRetry(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: createHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
},
```

---

### Step 3: コメントAPIにもリトライを追加

`apps/web/lib/api/comments.ts` に `fetchWithRetry` を追加し、対象メソッドで使用。

#### 追加する関数（ファイル先頭、API_BASE_URLの後）

```typescript
// 500系エラー・ネットワークエラー時のリトライ付きfetch
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  baseDelay = 1000,
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      if (response.status >= 500 && attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        console.warn(
          `⚠️ API ${response.status}エラー、${delay}ms後にリトライ (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        console.warn(
          `⚠️ ネットワークエラー、${delay}ms後にリトライ (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
};
```

#### 変更対象メソッド

- `createTeamComment` (行100-119) - `fetch` → `fetchWithRetry`
- `updateTeamComment` (行122-141) - `fetch` → `fetchWithRetry`

---

## リトライしないメソッド

以下はリトライ対象外（べき等性の問題）：

- `deleteTask` / `deleteTeamTask` - 削除は1回のみ
- `permanentDeleteTask` / `permanentDeleteTeamTask` - 完全削除も同様
- `restoreTask` / `restoreTeamTask` - 復元も1回のみ
- `deleteTeamComment` - コメント削除も1回のみ
- GETメソッド全般 - React Queryが既にリトライを持つ

---

## 影響範囲・懸念点

### べき等性

- POST（作成）: 重複作成のリスクあり → サーバー側でoriginalIdによる重複チェックがあれば安全
- PUT（更新）: べき等なので問題なし

### ユーザー体験

- 最大リトライ時間: 1秒 + 2秒 = 約3秒
- リトライ中はUIの「保存中」表示が継続
- ユーザーには透過的（気づかない）

### ログ出力

- コンソールに警告ログを出力（開発時のデバッグ用）
- 本番では必要に応じて抑制可能

---

## Codex用ToDoリスト

### api-client.ts

1. [ ] `apps/web/src/lib/api-client.ts` を開く
2. [ ] `createHeaders`関数の後（29行目以降）に`fetchWithRetry`関数を追加
3. [ ] `tasksApi.createTask` の `fetch` を `fetchWithRetry` に置き換え
4. [ ] `tasksApi.createTeamTask` の `fetch` を `fetchWithRetry` に置き換え
5. [ ] `tasksApi.updateTask` の `fetch` を `fetchWithRetry` に置き換え
6. [ ] `tasksApi.updateTeamTask` の `fetch` を `fetchWithRetry` に置き換え
7. [ ] `memosApi.createNote` の `fetch` を `fetchWithRetry` に置き換え
8. [ ] `memosApi.createTeamMemo` の `fetch` を `fetchWithRetry` に置き換え
9. [ ] `memosApi.updateNote` の `fetch` を `fetchWithRetry` に置き換え
10. [ ] `memosApi.updateTeamMemo` の `fetch` を `fetchWithRetry` に置き換え

### comments.ts

11. [ ] `apps/web/lib/api/comments.ts` を開く
12. [ ] `API_BASE_URL`の後に`fetchWithRetry`関数を追加
13. [ ] `createTeamComment` の `fetch` を `fetchWithRetry` に置き換え
14. [ ] `updateTeamComment` の `fetch` を `fetchWithRetry` に置き換え

### 確認

15. [ ] `npm run check:wsl` で型チェック通過を確認

---

## テスト方法

1. APIサーバーを停止した状態でタスク保存を試行
2. コンソールにリトライログが出ることを確認
3. APIサーバー起動後、正常に保存されることを確認
