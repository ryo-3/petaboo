# PETABOO-58: 個人ボード詳細画面のURLにboard=パラメータを追加して安定性向上

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## ✅ 実装完了

### 目的

個人ボード詳細画面のURLにチームと同様の `board=` パラメータを追加し、キャッシュ更新の安定性を向上させる。

### 修正内容

- **Before:** `http://localhost:7593/?TEST&memo=3`
- **After:** `http://localhost:7593/?board=TEST&memo=3`

---

## 変更ファイル一覧

### URL生成の修正

| ファイル                                                | 変更箇所                                  |
| ------------------------------------------------------- | ----------------------------------------- |
| `components/screens/board-screen.tsx:98`                | `/?${slug}` → `/?board=${slug}`           |
| `src/hooks/use-main-client-handlers.ts:381,416,439,472` | `/?${slug}` → `/?board=${slug}`           |
| `app/boards/[slug]/page.tsx:22,26`                      | リダイレクト先を `/?board=${slug}` に変更 |

### URL読み取りの修正（新形式優先、旧形式は互換性のため維持）

| ファイル                                           | 変更内容                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| `src/contexts/navigation-context.tsx:207-227`      | `searchParams.get("board")` を優先、旧形式 `?SLUG` はフォールバック |
| `components/features/board/board-list.tsx:58-82`   | 同上                                                                |
| `components/client/main-client.tsx:80-102`         | 同上                                                                |
| `app/client-home.tsx:29-51`                        | 同上                                                                |
| `components/layout/header.tsx:59-86`               | 同上                                                                |
| `components/ui/buttons/share-url-button.tsx:36-63` | 同上                                                                |
| `src/utils/modeUtils.ts:86-89`                     | 個人ページで `?board` パラメータがある場合は `"board"` モードを返す |

---

## 後方互換性

旧形式 `?SLUG` は引き続きサポート（フォールバックとして動作）:

- `/boards/SLUG` → `/?board=SLUG` へリダイレクト
- `?SLUG` 形式でアクセスしても正常に動作

---

## テスト観点

1. ✅ ボード一覧からボード詳細に遷移 → URLに `board=` が付く
2. ✅ ボード詳細でアイテム選択 → URLが正しく更新される
3. ✅ アイテム削除 → キャッシュが正しく更新される（`board=` パラメータで特定可能に）
4. ✅ アイテム復元 → キャッシュが正しく更新される
5. ✅ 古いURLでアクセス → 正しく表示される（後方互換）
