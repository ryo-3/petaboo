# ボード設定でslug編集機能の実装

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

ボード設定画面でslugを手動編集できるようにする。現在は自動生成のみで、特に日本語ボード名の場合はタイムスタンプIDになってしまうため、ユーザーが任意のslugを設定できるようにする。

## 背景

現在の挙動：

- 英数字のボード名（例："ggg"）→ そのままslug化 → `?slug=ggg`
- 日本語のボード名（例："開発計画"）→ 空文字列に → タイムスタンプで代替 → `?slug=board-1763807621290`

改善要望：

- ボード設定画面（`?tab=board&slug=xxx&settings=true`）でslugを手動編集可能にする
- 英数字とハイフンのみ許可
- 重複チェック実装

## 変更範囲

### 1. 型定義の更新

- `apps/web/src/types/board.ts`
  - `UpdateBoardData` にslugフィールドを追加

### 2. API側の変更

- `apps/api/src/routes/boards/api.ts`
  - `UpdateBoardSchema` にslugを追加（optional）
  - slug更新時の重複チェックロジック追加
  - slug更新時のバリデーション（英数字とハイフンのみ）

### 3. フロント側の変更

- `apps/web/components/features/board/shared-board-settings.tsx`
  - slug編集用の入力フィールド追加
  - リアルタイムバリデーション（英数字とハイフンのみ）
  - 重複チェック（API呼び出し）
  - 保存時にslugも含めて送信

### 4. フックの更新（必要に応じて）

- `apps/web/src/hooks/use-boards.ts`
- `apps/web/src/hooks/use-team-boards.ts`
  - 更新時の型にslugを追加

## 実装手順

### ステップ1: 型定義の更新

**ファイル**: `apps/web/src/types/board.ts`

```diff
export interface UpdateBoardData {
  name?: string;
  description?: string;
+ slug?: string;
}
```

### ステップ2: API側の更新

**ファイル**: `apps/api/src/routes/boards/api.ts`

1. UpdateBoardSchemaにslugを追加：

```typescript
const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    )
    .min(1)
    .max(50)
    .optional(),
});
```

2. updateBoardRoute のハンドラー内で重複チェックを追加：

```typescript
app.openapi(updateBoardRoute, async (c) => {
  // ... 既存の認証・所有権確認 ...

  const updateData = c.req.valid("json");

  // slugが指定されている場合は重複チェック
  if (updateData.slug) {
    const existingBoard = await db
      .select()
      .from(boards)
      .where(eq(boards.slug, updateData.slug))
      .limit(1);

    // 自分以外のボードで同じslugが存在する場合はエラー
    if (existingBoard.length > 0 && existingBoard[0].id !== boardId) {
      return c.json({ error: "このスラッグは既に使用されています" }, 400);
    }
  }

  // ... 既存の更新処理 ...
});
```

### ステップ3: フロント側UI追加

**ファイル**: `apps/web/components/features/board/shared-board-settings.tsx`

1. stateにslugを追加：

```typescript
const [editSlug, setEditSlug] = useState(boardSlug);
```

2. 変更検知にslugを追加：

```typescript
const handleSlugChange = (value: string) => {
  // 英数字とハイフンのみ許可
  const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
  setEditSlug(sanitized);
  setHasChanges(
    editName !== initialBoardName ||
      editDescription !== (initialBoardDescription || "") ||
      sanitized !== boardSlug,
  );
};
```

3. 基本情報セクションにslug入力欄を追加（nameとdescriptionの間）：

```tsx
<TextInputWithCounter
  value={editSlug}
  onChange={(value) => handleSlugChange(value)}
  placeholder="例: my-project-board（英数字とハイフンのみ、50文字以内）"
  maxLength={50}
  label="スラッグ（URL用の識別子）"
  className="px-4 py-3"
/>
<p className="text-xs text-gray-500 -mt-2">
  URL: {isTeamMode ? `/team/${teamCustomUrl}?tab=board&slug=` : `/boards/`}
  <span className="font-mono font-semibold text-blue-600">{editSlug}</span>
</p>
```

4. 保存処理でslugを含める：

```typescript
await updateMutation.mutateAsync({
  id: boardId,
  data: {
    name: editName.trim(),
    description: editDescription || undefined,
    slug: editSlug !== boardSlug ? editSlug : undefined,
  },
});
```

### ステップ4: チームボードAPIの更新

**チームボードのAPIファイルも同様に更新**（個人ボードと同じロジック）

## 懸念点・注意事項

1. **slug変更後の既存リンク**
   - 既存のブックマークやリンクが切れる可能性
   - → ユーザーに警告メッセージを表示（「slug変更すると既存のURLが無効になります」）

2. **重複チェックのタイミング**
   - 保存時のみチェック（リアルタイムチェックは不要）
   - エラーメッセージで重複を通知

3. **バリデーション**
   - 英数字とハイフン以外は自動除去
   - 小文字に自動変換
   - 50文字制限

4. **チームボード対応**
   - 個人ボードとチームボードで同じ仕組み
   - 重複チェックはユーザー/チーム内でのみ

## Codex用ToDoリスト

- [ ] 型定義を更新（`apps/web/src/types/board.ts`）
- [ ] API側のスキーマとロジックを更新（`apps/api/src/routes/boards/api.ts`）
- [ ] チームボードAPI側も同様に更新（該当ファイルを確認）
- [ ] フロント側のUIを更新（`apps/web/components/features/board/shared-board-settings.tsx`）
- [ ] 動作確認（個人ボード・チームボード両方）
- [ ] エラーハンドリングの確認

## テスト項目

1. slug編集が正常に動作するか
2. 重複チェックが機能するか
3. 英数字とハイフン以外が自動除去されるか
4. 小文字への自動変換が機能するか
5. 保存後にURLが正しく更新されるか
6. チームボードでも同様に動作するか
