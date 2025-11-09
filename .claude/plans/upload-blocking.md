# 画像アップロード中のタスク切り替え防止機能

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

画像アップロード中に：

1. タスク一覧で他のタスクをクリックしても切り替わらない
2. TaskEditorの閉じるボタンが無効化される

これにより、アップロード中のデータ損失を防ぐ。

## 実装方針

### 1. NavigationContextに isUploading状態を追加

- `isUploadingMemo: boolean`
- `isUploadingTask: boolean`
- `setIsUploadingMemo(uploading: boolean)`
- `setIsUploadingTask(uploading: boolean)`

### 2. TaskEditorでisUploadingをNavigationContextに同期

- `useEffect` で `attachmentManager.isUploading` の変化を監視
- NavigationContextの `setIsUploadingTask` を呼び出す
- コンポーネントアンマウント時に `false` に戻す

### 3. TaskEditorの閉じるボタンを無効化

- 閉じるボタン（PC版）に `disabled={isUploading}` を追加
- `className` に条件分岐を追加：
  ```tsx
  className={`... ${isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200"}`}
  ```

### 4. handleCloseClickでアップロード中をブロック

```tsx
const handleCloseClick = useCallback(() => {
  if (isUploading) {
    // 何もしない、またはトースト通知
    return;
  }
  if (hasUnsavedChanges) {
    setIsCloseConfirmModalOpen(true);
  } else {
    onClose();
  }
}, [isUploading, hasUnsavedChanges, onClose]);
```

### 5. TaskScreenでタスク選択をブロック

`onSelectTask` を呼び出す前に、NavigationContextの `isUploadingTask` をチェック：

```tsx
const handleTaskClick = (task: Task) => {
  if (isUploadingTask) {
    // 何もしない、またはトースト通知
    return;
  }
  onSelectTask(task);
};
```

## 変更ファイル

1. `apps/web/src/contexts/navigation-context.tsx`
   - isUploadingMemo/Task状態を追加
   - setter関数を追加

2. `apps/web/components/features/task/task-editor.tsx`
   - NavigationContextから `setIsUploadingTask` を取得
   - `useEffect` で isUploading を同期
   - 閉じるボタンに `disabled={isUploading}` を追加
   - `handleCloseClick` で isUploading をチェック

3. `apps/web/components/screens/task-screen.tsx`
   - NavigationContextから `isUploadingTask` を取得
   - タスククリック時に `isUploadingTask` をチェック

## 影響範囲

- メモにも同様の処理が必要になる可能性あり（将来対応）
- ボード詳細画面など、他の画面でも同様の対応が必要

## 懸念点

- NavigationContextが肥大化する可能性
- 代替案：専用の `UploadContext` を作成する方がクリーンかもしれない
