# PETABOO-48: コメントメンション機能の修正（名前にスペースが含まれる場合）

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

`@tarou yamada` のように名前にスペースが含まれるユーザーへのメンション通知が正しく動作するようにする。

## 現状の問題

### 原因

1. **フロントエンド**: メンション選択時に `@displayName `（スペース区切り）が挿入される
2. **バックエンド**: `extractMentions`関数の正規表現 `/@([\p{L}\p{N}_]+)/gu` がスペースを含む名前を認識できない
3. **フロントエンド表示**: 同様の正規表現でスペース以前の部分のみがハイライトされる

### 例

- ユーザー名: `tarou yamada`
- 入力されるテキスト: `@tarou yamada こんにちは`
- 抽出される名前: `tarou`（`tarou yamada`ではない）
- 結果: 通知が送られない

## 解決策

**方式A: フロントエンドから明示的にmentionsを送信する（推奨）**

フロントエンドでメンション候補を選択した時点でuserIdが分かっているため、APIにuserIdの配列を直接送信する。

### メリット

- バックエンドでの名前解析が不要になり確実
- 表示名を変更してもメンションが壊れない
- 正規表現の複雑化を避けられる

### デメリット

- APIスキーマの変更が必要
- 手入力での@メンション（サジェストを使わない場合）はサポートされない

---

## 変更範囲

### 1. フロントエンド

#### `apps/web/components/features/comments/comment-section.tsx`

- **状態追加**: `mentionedUserIds: string[]` を管理
- **selectMention関数**: 選択時にuserIdを配列に追加
- **handleSubmit**: API呼び出し時に`mentionedUserIds`を送信
- **入力クリア時**: `mentionedUserIds`もリセット

### 2. API

#### `apps/web/lib/api/comments.ts`（型定義確認）

- `CreateTeamCommentInput`に`mentionedUserIds?: string[]`を追加

#### `apps/api/src/routes/comments/api.ts`

- **スキーマ変更**: `TeamCommentInputSchema`に`mentionedUserIds`フィールド追加
- **postComment関数**: フロントから送られたuserIdsを優先使用、なければ従来のextractMentionsを使用（フォールバック）
- **extractMentions関数**: チームメンバーリストを取得してdisplayName完全一致で検索するように改善（フォールバック用）

### 3. フロントエンド表示（オプション）

#### `apps/web/components/features/comments/comment-section.tsx`

- `renderLineWithMentions`: チームメンバーリストを使って完全一致でメンション検出するように改善

---

## 実装手順

### ステップ1: APIスキーマ変更

**ファイル**: `apps/api/src/routes/comments/api.ts`

```diff
const TeamCommentInputSchema = z.object({
  targetType: z.enum(["memo", "task", "board"]),
  targetDisplayId: z.string(),
  boardId: z.number().optional(),
  content: z
    .string()
    .min(1)
    .max(1000, "コメントは1,000文字以内で入力してください"),
+ mentionedUserIds: z.array(z.string()).optional(),
});
```

### ステップ2: postComment関数の修正

**ファイル**: `apps/api/src/routes/comments/api.ts`

```diff
export const postComment = async (c: any) => {
  // ... 認証・チームメンバー確認 ...

  const body = c.req.valid("json");
- const { targetType, targetDisplayId, boardId, content } = body;
+ const { targetType, targetDisplayId, boardId, content, mentionedUserIds: clientMentionedUserIds } = body;

- // メンション解析
- const mentionedUserIds = await extractMentions(content, teamId, db);
+ // メンション解析（クライアントから送信されたものを優先、なければテキストから抽出）
+ let mentionedUserIds: string[];
+ if (clientMentionedUserIds && clientMentionedUserIds.length > 0) {
+   // クライアントから送信されたuserIdsを使用（チームメンバーかどうか検証）
+   const validatedUserIds = await validateMentionedUserIds(clientMentionedUserIds, teamId, db);
+   mentionedUserIds = validatedUserIds;
+ } else {
+   // フォールバック: テキストから抽出
+   mentionedUserIds = await extractMentions(content, teamId, db);
+ }
  const mentionsJson =
    mentionedUserIds.length > 0 ? JSON.stringify(mentionedUserIds) : null;

  // ... 以降は既存のまま ...
};
```

### ステップ3: validateMentionedUserIds関数の追加

**ファイル**: `apps/api/src/routes/comments/api.ts`

```typescript
// クライアントから送信されたuserIdsがチームメンバーか検証
async function validateMentionedUserIds(
  userIds: string[],
  teamId: number,
  db: any,
): Promise<string[]> {
  if (userIds.length === 0) return [];

  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), inArray(teamMembers.userId, userIds)),
    );

  return members.map((m: { userId: string }) => m.userId);
}
```

### ステップ4: フロントエンド状態管理

**ファイル**: `apps/web/components/features/comments/comment-section.tsx`

```diff
export default function CommentSection({
  // ... props ...
}: CommentSectionProps) {
  // ... 既存のstate ...
+ // メンションされたユーザーIDの管理
+ const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // メンション選択時の処理
  const selectMention = (member: TeamMember) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition);
    const textAfterCursor = newComment.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const displayName =
        member.displayName || `ユーザー${member.userId.slice(-4)}`;
      const before = textBeforeCursor.slice(0, lastAtIndex);
      const newText = `${before}@${displayName} ${textAfterCursor}`;
      setNewComment(newText);
      setShowMentionSuggestions(false);
+     // メンションされたユーザーIDを追加（重複排除）
+     setMentionedUserIds((prev) =>
+       prev.includes(member.userId) ? prev : [...prev, member.userId]
+     );

      // フォーカスを戻す
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = before.length + displayName.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleSubmit = async () => {
    // ... 既存のコード ...

    try {
      const createdComment = await createComment.mutateAsync({
        targetType,
        targetDisplayId,
        boardId,
        content: newComment.trim() || " ",
+       mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      });

      // ... 画像アップロード処理 ...

      setNewComment("");
+     setMentionedUserIds([]); // メンションリストをリセット
      setShowMentionSuggestions(false);

      // ...
    } catch (error) {
      // ...
    }
  };
```

### ステップ5: API呼び出し型定義の更新

**ファイル**: `apps/web/lib/api/comments.ts`

型定義を確認し、必要に応じて`mentionedUserIds`フィールドを追加。

### ステップ6: useCreateTeamComment hookの更新

**ファイル**: `apps/web/src/hooks/use-team-comments.ts`

mutateAsync呼び出しで`mentionedUserIds`を送信できるように確認。

---

## 影響範囲・懸念点

1. **後方互換性**: `mentionedUserIds`はオプショナルなので、既存のクライアントは動作継続
2. **手入力メンション**: サジェストを使わずに手入力した`@名前`は従来通りテキスト解析で処理される（スペースなしの名前のみ有効）
3. **セキュリティ**: クライアントから送信されたuserIdsはサーバー側でチームメンバーか検証するため、不正なuserIdは無視される
4. **テスト**: スペースを含む名前のユーザーでメンション通知が届くことを確認

---

## Codex用ToDoリスト

- [ ] `apps/api/src/routes/comments/api.ts`: `TeamCommentInputSchema`に`mentionedUserIds`追加
- [ ] `apps/api/src/routes/comments/api.ts`: `validateMentionedUserIds`関数を追加
- [ ] `apps/api/src/routes/comments/api.ts`: `postComment`関数でクライアントからのuserIdsを優先使用
- [ ] `apps/web/components/features/comments/comment-section.tsx`: `mentionedUserIds`状態を追加
- [ ] `apps/web/components/features/comments/comment-section.tsx`: `selectMention`でuserIdを配列に追加
- [ ] `apps/web/components/features/comments/comment-section.tsx`: `handleSubmit`でmutateAsyncに`mentionedUserIds`を渡す
- [ ] `apps/web/components/features/comments/comment-section.tsx`: 送信後に`mentionedUserIds`をリセット
- [ ] `apps/web/src/hooks/use-team-comments.ts`: 型定義を確認・更新
- [ ] 動作テスト: スペースを含む名前のユーザーにメンション通知が届くこと
