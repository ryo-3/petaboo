# PETABOO-53: ボード詳細でアイテム選択時にエディター内で削除するとアイテム一覧側に残ってしまう

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 問題

ボード詳細画面でメモ/タスクを選択し、エディター（右パネル）内で削除すると、左側の一覧からアイテムが消えない。

## 原因

`use-unified-item-operations.ts`の`deleteItem`で、`boardWithItems`（`["boards", boardId, "items"]`）のキャッシュに対して`invalidateQueries`と`refetchQueries`はしているが、**楽観的更新（`setQueryData`）で即座に削除されたアイテムを除去していない**。

そのため、refetch完了まで古いデータ（削除されたアイテムを含む）が表示され続ける。

### 現状の処理フロー

1. `deleteItem`実行
2. `cacheKeys.items`（`["memos"]`や`["tasks"]`）から楽観的更新で削除 ✓
3. `cacheKeys.boardItems`（`["boards", boardId, "items"]`）は`invalidateQueries`のみ ✗
4. refetch完了まで古いデータが表示される

### 期待する処理フロー

1. `deleteItem`実行
2. `cacheKeys.items`から楽観的更新で削除 ✓
3. **`cacheKeys.boardItems`からも楽観的更新で削除** ← これを追加
4. 即座にUIに反映される

## 修正方針

`use-unified-item-operations.ts`の`deleteItem`の`onSuccess`で、`cacheKeys.boardItems`がある場合に**楽観的更新（`setQueryData`）で即座にアイテムを除去**する。

## 変更対象ファイル

1. `apps/web/src/hooks/use-unified-item-operations.ts` - ボード詳細画面での削除時に使用

## 実装手順

### 手順1: use-unified-item-operations.ts の修正

`deleteItem`の`onSuccess`内（176-210行目付近の楽観的更新処理の後）に、`boardWithItems`の楽観的更新を追加:

**追加する処理（210行目付近、削除済み一覧への追加処理の後）:**

```typescript
// ボードアイテム一覧からも楽観的更新で即座に除去
if (cacheKeys.boardItems) {
  queryClient.setQueryData<BoardWithItems>(cacheKeys.boardItems, (oldData) => {
    if (!oldData) return oldData;
    return {
      ...oldData,
      items: oldData.items.filter(
        (item) => !(item.content && item.content.id === id),
      ),
    };
  });
}
```

**注意:** `BoardWithItems`型のインポートが必要:

```typescript
import { BoardWithItems } from "@/src/types/board";
```

### 手順2: 型定義の確認

`BoardWithItems`型が`items`配列を持ち、各アイテムが`content.id`でアクセスできることを確認。

## 影響範囲

- ボード詳細画面でのアイテム削除
- 削除後の一覧即時更新

## テスト項目

### ボード詳細画面（個人モード）

1. ボード詳細画面でメモを選択 → エディターで削除 → **即座に**一覧から消えることを確認
2. ボード詳細画面でタスクを選択 → エディターで削除 → **即座に**一覧から消えることを確認

### ボード詳細画面（チームモード）

3. チームボード詳細画面でメモを選択 → エディターで削除 → **即座に**一覧から消えることを確認
4. チームボード詳細画面でタスクを選択 → エディターで削除 → **即座に**一覧から消えることを確認

## Codex用 ToDo

- [ ] `apps/web/src/hooks/use-unified-item-operations.ts` に `BoardWithItems` 型をインポート
- [ ] `deleteItem` の `onSuccess` 内（210行目付近）で、`cacheKeys.boardItems`がある場合に`setQueryData`で楽観的更新を追加
- [ ] 型チェック（`npm run check:wsl`）が通ることを確認
