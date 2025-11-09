# メモ・タスクカード一覧に画像サムネイル表示機能を追加

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 🎯 目的

メモとタスクのカードリスト表示で、添付画像がある場合に小さなサムネイル（1枚のみ）を表示し、視認性を向上させる。

## 📝 変更範囲

### 画面

- メモ一覧画面
- タスク一覧画面

### 関数・API

- 新規フック: `use-all-attachments.ts`（全添付ファイル一括取得）

### 型

- `Attachment` 型（既存、変更なし）

### 影響範囲

以下のファイルを変更：

1. `/apps/web/src/hooks/use-all-attachments.ts`（新規作成）
2. `/apps/web/components/ui/layout/item-display.tsx`（Props追加、UI追加）
3. `/apps/web/components/features/memo/memo-status-display.tsx`（データマッピング追加）
4. `/apps/web/components/features/task/task-status-display.tsx`（データマッピング追加）
5. `/apps/web/components/screens/memo-screen.tsx`（データ取得・Props渡し）
6. `/apps/web/components/screens/task-screen.tsx`（データ取得・Props渡し）

## 🔧 実装手順（Codex用）

### 1. use-all-attachments.ts フック作成（新規ファイル）

**ファイルパス**: `/apps/web/src/hooks/use-all-attachments.ts`

**内容**:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { Attachment } from "@/src/hooks/use-attachments";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * 全メモまたはタスクの添付ファイルを一括取得するフック
 * カード一覧表示でサムネイル表示のために使用
 */
export function useAllAttachments(
  teamId: number | undefined,
  attachedTo: "memo" | "task",
  enabled: boolean = true,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["all-attachments", teamId, attachedTo],
    queryFn: async (): Promise<Attachment[]> => {
      const token = await getToken();
      const url = teamId
        ? `${API_URL}/attachments?teamId=${teamId}&attachedTo=${attachedTo}`
        : `${API_URL}/attachments?attachedTo=${attachedTo}`;

      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("添付ファイルの取得に失敗しました");
      }

      return response.json();
    },
    enabled,
  });
}
```

---

### 2. item-display.tsx に画像サムネイル表示エリアを追加

**ファイルパス**: `/apps/web/components/ui/layout/item-display.tsx`

**変更内容**:

#### 2-1. Props に `preloadedAttachments` を追加

```diff
+ import type { Attachment } from "@/src/hooks/use-attachments";

  interface ItemDisplayProps {
    // ... 既存のProps ...

    // 全データ事前取得（ちらつき解消）
    preloadedTags?: Tag[];
    preloadedBoards?: Board[];
+   preloadedAttachments?: Attachment[];
```

#### 2-2. 関数シグネチャに追加

```diff
  function ItemDisplay({
    // ... 既存のProps ...
    preloadedTags = [],
    preloadedBoards = [],
+   preloadedAttachments = [],
    teamMode = false,
    initialBoardId,
  }: ItemDisplayProps) {
```

#### 2-3. サムネイル表示UI追加（日付表示の直前に挿入）

コンテンツ部分の後、日付表示の前に以下を追加：

```typescript
            {/* 画像サムネイル表示（1枚のみ） */}
            {preloadedAttachments && preloadedAttachments.length > 0 && (
              <div className="mt-2 mb-2">
                <div className="relative inline-block">
                  <img
                    src={preloadedAttachments[0].url}
                    alt={preloadedAttachments[0].fileName}
                    className="w-20 h-20 object-cover rounded border border-gray-200"
                    loading="lazy"
                  />
                  {preloadedAttachments.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
                      +{preloadedAttachments.length - 1}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 日付表示 */}
```

挿入位置: 243行目付近（コメント数表示の後、日付表示の前）

---

### 3. memo-status-display.tsx でデータマッピングに attachments 追加

**ファイルパス**: `/apps/web/components/features/memo/memo-status-display.tsx`

**変更内容**:

#### 3-1. Props に `allAttachments` を追加

```diff
+ import type { Attachment } from "@/src/hooks/use-attachments";

  interface MemoStatusDisplayProps {
    // ... 既存のProps ...

    // 全データ事前取得（ちらつき解消）
    allTags?: Tag[];
    allBoards?: Board[];
    allTaggings?: Tagging[];
+   allAttachments?: Attachment[];
```

#### 3-2. 関数シグネチャに追加

```diff
  function MemoStatusDisplay({
    // ... 既存のProps ...
    allTags,
    allBoards,
    allTaggings,
    allBoardItems,
+   allAttachments,
    teamMode,
  }: MemoStatusDisplayProps) {
```

#### 3-3. memoDataMap に attachments を追加

```diff
  const memoDataMap = useMemo(() => {
    // ... 既存のロジック ...
    const safeAllTags = allTags || [];
    const safeAllBoards = allBoards || [];
+   const safeAllAttachments = allAttachments || [];

    const map = new Map();
    filteredMemos.forEach((memo) => {
      // ... 既存のタグ・ボード取得ロジック ...

+     // メモの添付ファイルを抽出（画像のみ）
+     const memoAttachments = safeAllAttachments.filter(
+       (attachment) =>
+         attachment.attachedOriginalId === originalId &&
+         attachment.mimeType.startsWith("image/")
+     );

-     map.set(memo.id, { tags: memoTags, boards: memoBoards });
+     map.set(memo.id, { tags: memoTags, boards: memoBoards, attachments: memoAttachments });
    });

    return map;
- }, [filteredMemos, allTaggings, allBoardItems, allTags, allBoards]);
+ }, [filteredMemos, allTaggings, allBoardItems, allTags, allBoards, allAttachments]);
```

#### 3-4. renderMemo で attachments を渡す

```diff
  const renderMemo = (
    memo: Memo,
    props: { /* ... */ },
  ) => {
-   const memoData = memoDataMap.get(memo.id) || { tags: [], boards: [] };
+   const memoData = memoDataMap.get(memo.id) || { tags: [], boards: [], attachments: [] };

    const memoComponent = (
      <ItemDisplay
        // ... 既存のProps ...
        preloadedTags={memoData.tags}
        preloadedBoards={memoData.boards}
+       preloadedAttachments={memoData.attachments}
        teamMode={teamMode}
      />
    );
```

#### 3-5. DeletedMemoDisplay も同様に対応

`DeletedMemoDisplayProps` と `DeletedMemoDisplay` 関数にも同じ変更を適用。

---

### 4. task-status-display.tsx でデータマッピングに attachments 追加

**ファイルパス**: `/apps/web/components/features/task/task-status-display.tsx`

**変更内容**: memo-status-display.tsx と同じパターンで実装

- Props に `allAttachments?: Attachment[]` 追加
- `taskDataMap` に attachments フィールド追加
- `renderTask` で attachments を渡す
- `DeletedTaskDisplay` も同様に対応

---

### 5. memo-screen.tsx で全添付ファイル取得・Props渡し

**ファイルパス**: `/apps/web/components/screens/memo-screen.tsx`

**変更内容**:

#### 5-1. useAllAttachments フックのインポートと使用

```diff
+ import { useAllAttachments } from "@/src/hooks/use-all-attachments";

  function MemoScreen({ /* ... */ }) {
    // ... 既存のデータ取得 ...

+   // 全メモの添付ファイルを取得（サムネイル表示用）
+   const { data: allMemoAttachments } = useAllAttachments(
+     teamMode ? teamId : undefined,
+     "memo",
+     true
+   );
```

#### 5-2. DesktopLower に Props を渡す

```diff
  <DesktopLower
    // ... 既存のProps ...
    allTags={tags || []}
    allBoards={boards || []}
    allTaggings={safeAllTaggings || []}
    allBoardItems={safeAllBoardItems || []}
+   allAttachments={allMemoAttachments || []}
  />
```

2箇所ある（デスクトップ版とモバイル版）ので両方変更。

---

### 6. task-screen.tsx で全添付ファイル取得・Props渡し

**ファイルパス**: `/apps/web/components/screens/task-screen.tsx`

**変更内容**: memo-screen.tsx と同じパターンで実装

```diff
+ import { useAllAttachments } from "@/src/hooks/use-all-attachments";

+ const { data: allTaskAttachments } = useAllAttachments(
+   teamMode ? teamId : undefined,
+   "task",
+   true
+ );
```

DesktopLower に `allAttachments={allTaskAttachments || []}` を追加。

---

### 7. desktop-lower.tsx で Props 追加

**ファイルパス**: `/apps/web/components/layout/desktop-lower.tsx`

**変更内容**:

```diff
+ import type { Attachment } from "@/src/hooks/use-attachments";

  interface DesktopLowerProps {
    // ... 既存のProps ...
    allTags?: Tag[];
    allBoards?: Board[];
    allTaggings?: Tagging[];
+   allAttachments?: Attachment[];
```

関数シグネチャと MemoStatusDisplay/TaskStatusDisplay への Props 渡しにも追加。

---

## 💡 懸念点・注意事項

1. **パフォーマンス**: 全添付ファイル取得による負荷増加
   - 対策: React Query のキャッシュ活用
   - 画像のみフィルタリング（`mimeType.startsWith("image/")`）

2. **サムネイル読み込み遅延**
   - 対策: `loading="lazy"` 属性を使用

3. **データ不整合**
   - `originalId` のマッチングに注意
   - 既存の memo-status-display.tsx のパターンに倣う

## ✅ Codex用チェックリスト

- [ ] use-all-attachments.ts 新規作成
- [ ] item-display.tsx に Props 追加・UI追加
- [ ] memo-status-display.tsx のデータマッピング更新
- [ ] task-status-display.tsx のデータマッピング更新
- [ ] memo-screen.tsx でデータ取得・Props渡し
- [ ] task-screen.tsx でデータ取得・Props渡し
- [ ] desktop-lower.tsx で Props 追加・渡し
- [ ] 削除済みタブ（DeletedMemoDisplay/DeletedTaskDisplay）も対応

## 🎨 UI仕様

- サムネイルサイズ: 80px × 80px（正方形）
- `object-cover` でアスペクト比を保持
- 角丸: `rounded`
- ボーダー: `border border-gray-200`
- 2枚以上ある場合: 右下に `+N` バッジ表示
  - 背景: 黒・半透明（`bg-black bg-opacity-60`）
  - 文字: 白・小サイズ（`text-white text-xs`）
