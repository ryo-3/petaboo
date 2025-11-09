# モバイル用セレクターモーダル実装Plan

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

スマホ表示時（md未満）に、担当者・ボードカテゴリー・期限セレクターをモーダルにまとめて表示し、UIをコンパクトにする。

## 期待成果

### PC（md以上 / 768px以上）

現状維持：全セレクターを横並び表示

```
[ステータス] [優先度] [担当者] [ボードカテゴリー] [期限]
```

### スマホ（md未満 / 768px未満）

メニューボタンでモーダル表示

```
[ステータス] [優先度] [メニュー]
```

メニューボタンをタップ → モーダルが開く

- 担当者セレクター
- ボードカテゴリーセレクター
- 期限セレクター

## 変更範囲

### 新規作成ファイル

1. `apps/web/components/features/task/mobile-selector-modal.tsx`
   - モーダルコンポーネント
   - 担当者・カテゴリー・期限の3つのセレクター
   - 閉じるボタン

### 修正ファイル

1. `apps/web/components/features/task/task-editor.tsx`
   - モーダルの開閉state追加
   - md未満でメニューボタン表示
   - md以上で全セレクター表示（現状維持）

## 実装手順

### 1. モバイルセレクターモーダル作成

**ファイル**: `apps/web/components/features/task/mobile-selector-modal.tsx`

**Props**:

```typescript
interface MobileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;

  // 担当者
  teamMode: boolean;
  formAssigneeId: string | null | undefined;
  handleAssigneeChange?: (value: string | null) => void;
  teamMembers: TeamMember[];

  // ボードカテゴリー
  boardCategoryId: number | null;
  setBoardCategoryId: (value: number | null) => void;
  categories: BoardCategory[];
  initialBoardId: number;

  // 期限
  dueDate: string;
  setDueDate: (value: string) => void;

  // 共通
  isDeleted: boolean;
}
```

**UI構造**:

```tsx
{
  isOpen && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md p-4 max-h-[80vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">詳細設定</h3>
          <button onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* 担当者（teamMode時のみ） */}
        {teamMode && handleAssigneeChange && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">担当者</label>
            <AssigneeSelector
              members={teamMembers}
              value={formAssigneeId ?? null}
              onChange={handleAssigneeChange}
              disabled={isDeleted}
              width="100%"
              compact
              hideLabel
            />
          </div>
        )}

        {/* ボードカテゴリー */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            ボードカテゴリー
          </label>
          <BoardCategorySelector
            value={boardCategoryId}
            onChange={isDeleted ? () => {} : setBoardCategoryId}
            categories={categories}
            boardId={initialBoardId}
            disabled={isDeleted}
            allowCreate={true}
          />
        </div>

        {/* 期限 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">期限</label>
          <DatePickerSimple
            value={dueDate}
            onChange={isDeleted ? () => {} : setDueDate}
            disabled={isDeleted}
            placeholder="期限を選択"
          />
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-DeepBlue text-white rounded-lg font-medium hover:opacity-90"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
```

### 2. task-editor.tsx修正

**変更点**:

1. モーダルstate追加

```typescript
const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);
```

2. セレクターバーを条件分岐

```tsx
<div className="flex gap-1.5 mt-1">
  {/* ステータス・優先度は常に表示 */}
  <div className="w-16 md:w-20">
    <CustomSelector label="ステータス" ... />
  </div>

  <CustomSelector label="優先度" ... fullWidth />

  {/* PC（md以上）: 全セレクター表示 */}
  <div className="hidden md:flex gap-1.5">
    {teamMode && handleAssigneeChange && (
      <div className="w-24 md:w-28">
        <AssigneeSelector ... />
      </div>
    )}

    <div className="w-40">
      <BoardCategorySelector ... />
    </div>

    <div className="w-28 mr-2">
      <DatePickerSimple ... />
    </div>
  </div>

  {/* スマホ（md未満）: メニューボタン */}
  <button
    onClick={() => setIsMobileSelectorOpen(true)}
    disabled={isDeleted}
    className="md:hidden flex items-center gap-1 px-3 h-7 border border-gray-400 rounded-lg bg-white hover:opacity-80"
  >
    <Menu size={16} />
    <span className="text-sm">メニュー</span>
  </button>
</div>

{/* モーダル */}
<MobileSelectorModal
  isOpen={isMobileSelectorOpen}
  onClose={() => setIsMobileSelectorOpen(false)}
  teamMode={teamMode}
  formAssigneeId={formAssigneeId}
  handleAssigneeChange={handleAssigneeChange}
  teamMembers={teamMembers}
  boardCategoryId={boardCategoryId}
  setBoardCategoryId={setBoardCategoryId}
  categories={categories}
  initialBoardId={initialBoardId!}
  dueDate={dueDate}
  setDueDate={setDueDate}
  isDeleted={isDeleted}
/>
```

## 影響範囲・懸念点

### 影響範囲

- task-editor.tsx: セレクターバー表示ロジック
- 新規モーダルコンポーネント追加

### 懸念点

1. **モーダル内でDatePickerのカレンダーが開く**
   - モーダル内でカレンダーが表示されるか確認
   - z-indexの調整が必要な可能性

2. **モーダル内でBoardCategorySelectorの新規作成モーダルが開く**
   - モーダルの上に別モーダルが開くことになる
   - z-indexを適切に設定する必要

3. **スクロール処理**
   - モーダル開いている間、背景のスクロールを防ぐ
   - `overflow-hidden`をbodyに追加する処理が必要かも

4. **アクセシビリティ**
   - Escキーで閉じる
   - フォーカストラップ（モーダル内でのみフォーカス移動）

## テスト項目

- [ ] スマホサイズでメニューボタンが表示される
- [ ] メニューボタンクリックでモーダルが開く
- [ ] モーダル内の各セレクターが正常に動作する
- [ ] PC（md以上）で全セレクター表示される
- [ ] 閉じるボタンでモーダルが閉じる
- [ ] 背景クリックでモーダルが閉じる
- [ ] チームモード/個人モードで担当者の表示/非表示が切り替わる
- [ ] 削除済みタスクでセレクターが無効化される
- [ ] DatePickerのカレンダーがモーダル内で正しく表示される

## Codex用ToDoリスト

### Phase 1: モバイルセレクターモーダル作成

- [ ] `mobile-selector-modal.tsx` 作成
  - Props interface定義
  - モーダルUI実装（背景オーバーレイ + コンテンツ）
  - ヘッダー（タイトル + 閉じるボタン）
  - 担当者セレクター（teamMode時のみ）
  - ボードカテゴリーセレクター
  - 期限セレクター
  - 閉じるボタン
  - 背景クリックで閉じる処理

### Phase 2: task-editor.tsx統合

- [ ] import追加（MobileSelectorModal, Menu icon）
- [ ] モーダルstate追加（isMobileSelectorOpen）
- [ ] セレクターバーを条件分岐
  - ステータス・優先度は常に表示
  - md以上: 担当者・カテゴリー・期限表示（hidden md:flex）
  - md未満: メニューボタン表示（md:hidden）
- [ ] MobileSelectorModalコンポーネント配置
  - 必要なpropsを全て渡す

### Phase 3: スタイリング調整

- [ ] メニューボタンのスタイル統一
- [ ] モーダルの影・角丸・アニメーション調整
- [ ] モバイルでモーダルが画面下から出るアニメーション
- [ ] z-index調整（DatePicker、CreateCategoryModal考慮）
