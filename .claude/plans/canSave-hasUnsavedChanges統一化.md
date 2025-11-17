# canSave / hasUnsavedChanges 統一化プラン

## 📋 目的

現在、保存ボタンの有効化判定（`canSave`）と未保存モーダル表示判定（`hasUnsavedChanges`）が**エディター側で個別に計算**されており、ロジックが重複している。

これを `use-simple-item-save` フックに集約し、判定ロジックを1箇所に統一する。

---

## 🔍 現状の問題

### 1. **判定ロジックが分散**

```typescript
// task-editor.tsx
const canSave = isDeleted
  ? false
  : isUploading
    ? false
    : isNewTask
      ? !!stripHtmlTags(title)
      : (hasChanges ||
          hasTagChanges ||
          pendingImages.length > 0 ||
          pendingDeletes.length > 0) &&
        !!stripHtmlTags(title);

const hasUnsavedChanges = isNewTask
  ? !!stripHtmlTags(title) ||
    !!stripHtmlTags(description) ||
    pendingImages.length > 0
  : hasChanges ||
    hasTagChanges ||
    pendingImages.length > 0 ||
    pendingDeletes.length > 0;
```

**問題点：**

- 似たような判定を2回書いている
- `stripHtmlTags` を何度も呼んでいる
- memo-editor.tsx でも同じパターンを繰り返している
- 修正時に2箇所（or 4箇所）更新が必要

### 2. **`canSave` と `hasUnsavedChanges` の違い**

| 条件                                   | canSave | hasUnsavedChanges |
| -------------------------------------- | ------- | ----------------- |
| タスク新規作成でタイトルなし・説明あり | `false` | `true`            |
| 削除済みアイテム                       | `false` | `true`            |
| アップロード中                         | `false` | `true`            |

**重要：** 2つは**別の責務**を持つため、統一はできない。

- `canSave`: 「今すぐ保存できるか」
- `hasUnsavedChanges`: 「破棄したら失われるデータがあるか」

---

## ✅ 解決策

### **use-simple-item-save フックに集約**

両方の判定ロジックを `use-simple-item-save` に移動し、エディター側は結果を受け取るだけにする。

```typescript
// use-simple-item-save.ts（新規追加）
export function useSimpleItemSave({...}) {
  // ... 既存のコード

  // 保存ボタン有効化判定
  const canSave = useMemo(() => {
    const strippedTitle = stripHtmlTags(title);
    const strippedContent = stripHtmlTags(content);

    if (isDeleted) return false;
    if (isUploading) return false;

    const isNewItem = !item || item.id === 0;
    if (isNewItem) {
      return !!strippedTitle; // タイトルがあれば保存可能
    } else {
      return (hasChanges || hasTagChanges || pendingImages.length > 0 || pendingDeletes.length > 0) &&
             !!strippedTitle; // 変更ありかつタイトルがあれば保存可能
    }
  }, [title, content, item, hasChanges, hasTagChanges, pendingImages, pendingDeletes, isDeleted, isUploading]);

  // 未保存モーダル表示判定
  const hasUnsavedChanges = useMemo(() => {
    const strippedTitle = stripHtmlTags(title);
    const strippedContent = stripHtmlTags(content);

    const isNewItem = !item || item.id === 0;
    if (isNewItem) {
      // 新規作成：何か入力があればモーダル出す
      return !!strippedTitle || !!strippedContent || pendingImages.length > 0;
    } else {
      // 既存アイテム：変更があればモーダル出す
      return hasChanges || hasTagChanges || pendingImages.length > 0 || pendingDeletes.length > 0;
    }
  }, [title, content, item, hasChanges, hasTagChanges, pendingImages, pendingDeletes]);

  return {
    // ... 既存の戻り値
    canSave,           // ← 追加
    hasUnsavedChanges, // ← 追加
  };
}
```

---

## 📝 実装手順

### **Step 1: use-simple-item-save.ts を修正**

1. `stripHtmlTags` を import（既にある）
2. `isDeleted` と `isUploading` の状態を受け取る（新規パラメータ）
3. `pendingImages` と `pendingDeletes` を受け取る（新規パラメータ）
4. `canSave` を計算
5. `hasUnsavedChanges` を計算
6. 戻り値に追加

### **Step 2: memo-editor.tsx を修正**

1. `useSimpleItemSave` に `isDeleted`, `isUploading`, `pendingImages`, `pendingDeletes` を渡す
2. `canSave` と `hasUnsavedChanges` を受け取る
3. エディター内の `canSave` と `hasUnsavedChanges` 計算を削除
4. `stripHtmlTags` の呼び出しを削除（use-simple-item-save内で実行されるため）

### **Step 3: task-editor.tsx を修正**

1. memo-editor.tsx と同じ修正を適用

### **Step 4: 動作確認**

1. TypeScript エラーチェック
2. 保存ボタンの有効化/無効化が正しく動作するか
3. 未保存モーダルが正しく表示されるか
4. 新規作成→タイトル空・説明ありでモーダルが出るか

---

## 🎯 期待される効果

### **コード削減**

- エディター側の判定ロジック削除：約20行 × 2ファイル = **40行削減**
- `stripHtmlTags` の重複呼び出し削除：パフォーマンス改善

### **保守性向上**

- 判定ロジックが1箇所に集約
- 修正時は use-simple-item-save のみ変更すればOK
- バグ混入リスク低減

### **型安全性**

- エディター側は結果を受け取るだけ
- 計算ロジックのミスがなくなる

---

## ⚠️ 注意点

### **パラメータ増加**

`use-simple-item-save` のパラメータが増えるため、呼び出し側が少し複雑になる。

**対策：**

- JSDoc でパラメータを明確に説明
- 必須パラメータと任意パラメータを分ける

### **アイテムタイプ依存の違い**

メモとタスクで微妙に判定条件が異なる可能性がある。

**対策：**

- `itemType` パラメータで分岐
- 必要に応じてアイテムタイプ別の判定を追加

---

## 🚀 次のステップ

このプラン承認後、Step 1 から順次実装します。
