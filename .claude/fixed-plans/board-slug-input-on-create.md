# ボード新規作成時にslug入力欄を追加

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 目的

ボード新規作成時にslug入力欄を追加し、ユーザーが任意のslugを設定できるようにする。現在はslugが自動生成されているが、ユーザーには見えず編集もできない状態なので、作成時から明示的にslugを設定できるようにする。

## 背景

現在の実装状況：

- **既存ボード編集時**：`shared-board-settings.tsx`でslug編集可能（実装済み）
- **新規作成時**：`board-form.tsx`でslugは自動生成されるが、入力欄がない

問題点：

- 新規作成時にslugを指定できない
- 日本語ボード名の場合、自動生成されたslugがタイムスタンプになる（例：`board-1763807621290`）
- 作成後に編集画面で変更する必要がある（非効率）

改善要望：

- 新規作成時にslug入力欄を表示
- nameを入力すると、自動でslugのプレビューを生成・表示
- ユーザーが手動でslugを編集可能
- 必須フィールドとして扱う（ただし自動生成値をフォールバック）

## 変更範囲

### 対象ファイル

1. `apps/web/components/features/board/board-form.tsx`
   - slug入力フィールドの追加
   - nameに連動したslugの自動生成（リアルタイム）
   - ユーザーによる手動編集機能
   - バリデーション（英数字とハイフンのみ）

## 実装手順

### ステップ1: board-form.tsxの更新

**ファイル**: `apps/web/components/features/board/board-form.tsx`

#### 1-1. stateにslugを追加

```diff
export default function BoardForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: BoardFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
+ const [slug, setSlug] = useState("");
+ const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
```

**説明**：

- `slug`：現在のslug値
- `isSlugManuallyEdited`：ユーザーが手動でslugを編集したかのフラグ（true時は自動生成しない）

#### 1-2. slug生成関数を追加

```typescript
// slug生成用の関数（既存のロジックを関数化）
const generateSlug = (text: string): string => {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // 特殊文字除去
    .replace(/\s+/g, "-") // スペースをハイフンに
    .replace(/--+/g, "-") // 連続ハイフンを単一に
    .trim();
};
```

#### 1-3. nameの変更時にslugを自動生成（手動編集されていない場合のみ）

```diff
+ // nameが変更された時、slugが手動編集されていなければ自動生成
+ const handleNameChange = (value: string) => {
+   setName(value);
+   if (!isSlugManuallyEdited) {
+     setSlug(generateSlug(value));
+   }
+ };
+
+ // slugを手動編集した時
+ const handleSlugChange = (value: string) => {
+   // 英数字とハイフンのみ許可
+   const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
+   setSlug(sanitized);
+   setIsSlugManuallyEdited(true);
+ };
```

#### 1-4. UI部分にslug入力欄を追加（nameとdescriptionの間）

```diff
<form onSubmit={handleSubmit} className="space-y-4">
  <TextInputWithCounter
    id="name"
    value={name}
-   onChange={setName}
+   onChange={handleNameChange}
    placeholder="例: プロジェクト名、学習テーマなど（50文字以内）"
    maxLength={50}
    label="ボード名"
    required
  />

+ <div className="space-y-2">
+   <TextInputWithCounter
+     id="slug"
+     value={slug}
+     onChange={handleSlugChange}
+     placeholder="例: my-project-board（英数字とハイフンのみ、50文字以内）"
+     maxLength={50}
+     label="スラッグ（URL用の識別子）"
+     required
+     className="font-mono"
+   />
+   <p className="text-xs text-gray-500">
+     URL: /boards/<span className="font-mono font-semibold text-blue-600">{slug || "（自動生成）"}</span>
+   </p>
+   <p className="text-xs text-gray-400">
+     ※ ボード名から自動生成されます。手動で変更も可能です。
+   </p>
+ </div>

  <TextareaWithCounter
    id="description"
    value={description}
    onChange={setDescription}
    // ... 省略 ...
  />
```

#### 1-5. 送信処理の更新（slug処理を統合）

```diff
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (
    name.trim() &&
    name.trim().length <= 50 &&
    description.trim().length <= 200
  ) {
-   // slugを自動生成（name -> slug変換）
-   const slug = name
-     .trim()
-     .toLowerCase()
-     .replace(/[^\w\s-]/g, "") // 特殊文字除去
-     .replace(/\s+/g, "-") // スペースをハイフンに
-     .replace(/--+/g, "-") // 連続ハイフンを単一に
-     .trim();
-
    onSubmit({
      name: name.trim(),
-     slug: slug || `board-${Date.now()}`, // slugが空の場合はタイムスタンプ
+     slug: slug.trim() || `board-${Date.now()}`, // slugが空の場合はタイムスタンプ
      description: description.trim() || undefined,
    });
  }
};
```

#### 1-6. バリデーション追加

```diff
<button
  type="submit"
  disabled={
    !name.trim() ||
+   !slug.trim() ||
    name.trim().length > 50 ||
+   slug.trim().length > 50 ||
    description.trim().length > 200 ||
    isLoading
  }
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
```

## UI/UX設計の詳細

### 動作フロー

1. **初期状態**：
   - name欄：空
   - slug欄：空（プレースホルダー表示）

2. **ボード名入力時**：
   - nameに「開発計画」と入力
   - slugに自動的に空文字（日本語は除去されるため）
   - URL表示：`/boards/（自動生成）`

3. **slug手動編集**：
   - ユーザーがslug欄をクリックして「dev-plan」と入力
   - `isSlugManuallyEdited`がtrueに
   - 以降nameを変更してもslugは自動更新されない

4. **送信時**：
   - slugが空の場合は`board-${Date.now()}`で代替
   - slugが入力されている場合はその値を使用

### 表示例

```
┌─────────────────────────────────────────┐
│ ボード名 *                               │
│ ┌─────────────────────────────────────┐ │
│ │ 開発計画                            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ スラッグ（URL用の識別子）*              │
│ ┌─────────────────────────────────────┐ │
│ │ dev-plan                            │ │
│ └─────────────────────────────────────┘ │
│ URL: /boards/dev-plan                   │
│ ※ ボード名から自動生成されます。手動で │
│    変更も可能です。                     │
│                                         │
│ 説明（任意）                            │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## チームボード対応

チームボードの新規作成フォームが別途存在する場合は、同様の対応が必要。該当ファイルを確認してから判断。

## 懸念点・注意事項

1. **既存の自動生成ロジック**
   - 既存の自動生成ロジックは残し、slug欄が空の場合のフォールバックとして機能
   - 通常はユーザーがslugを明示的に指定（推奨フロー）

2. **重複チェック**
   - 現時点では新規作成時の重複チェックはAPIで実施
   - フロント側でリアルタイム重複チェックは実装しない（コストパフォーマンス悪い）

3. **バリデーション**
   - 英数字とハイフン以外は自動除去
   - 小文字に自動変換
   - 50文字制限

4. **slug手動編集フラグ**
   - 一度手動編集したら自動生成を停止
   - 編集フラグをリセットする機能は不要（新規作成は1回きり）

## Codex用ToDoリスト

- [ ] `board-form.tsx`にslug関連のstateを追加
- [ ] slug生成関数を追加
- [ ] nameとslugの連動ロジックを実装
- [ ] UI部分にslug入力欄を追加
- [ ] バリデーションを更新
- [ ] 送信処理を更新
- [ ] 動作確認（特にslug自動生成とフォールバック）

## テスト項目

1. **自動生成**
   - [ ] ボード名「Test Project」→ slug「test-project」自動生成
   - [ ] ボード名「開発計画」→ slug空（日本語除去）→ 送信時タイムスタンプ代替

2. **手動編集**
   - [ ] slug欄を手動編集したら、以降ボード名変更に連動しない
   - [ ] 英数字とハイフン以外の文字が自動除去される

3. **バリデーション**
   - [ ] slug欄が空の場合でも送信可能（タイムスタンプで代替）
   - [ ] 50文字制限が機能する

4. **UI/UX**
   - [ ] URLプレビューが正しく表示される
   - [ ] プレースホルダーが適切

5. **既存機能への影響**
   - [ ] ボード作成が正常に動作する
   - [ ] メモ・タスク作成は影響を受けない
