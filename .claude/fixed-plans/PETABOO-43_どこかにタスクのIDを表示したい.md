# PETABOO-43: タスクIDの表示

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

## 📋 タスク概要

**課題**: 現在URLからしかタスクIDがわからないため、UI上にタスクIDを表示したい

**URL**: https://petaboo.vercel.app/team/moricrew?board=PETABOO&task=43

---

## 🎯 目的

- タスクの識別子（displayId）をUI上で確認できるようにする
- URLを見なくても、タスクIDが分かるようにする
- 他のメンバーとタスクを共有する際に便利にする

---

## 📐 設計方針

### 表示するID

- `displayId` を表示する（URL同期やシェアで使用される識別子）
- 例: `task=43` の `43` の部分

### 表示位置

**案1: タイトル上部（推奨）**

- ヘッダー右側の `DateInfo` の隣に `#43` のような形式で表示
- 作成者アバター、日時情報と同じ行に配置

**案2: タイトルの前**

- タイトル入力欄の左に `#43` を表示

→ **案1を採用**: 既存のUIパターン（CreatorAvatar + DateInfo）と並べることで自然な配置になる

### 表示形式

```
#43
```

- 薄いグレー（text-muted-foreground）で目立ちすぎないように
- クリックでIDをクリップボードにコピー（オプション機能）

---

## 📁 変更ファイル

| ファイル                                            | 変更内容           |
| --------------------------------------------------- | ------------------ |
| `apps/web/components/features/task/task-editor.tsx` | タスクID表示の追加 |

---

## 🔧 実装手順

### 1. TaskEditor へのID表示追加

**変更箇所**: `task-editor.tsx` 1,390行目付近（DateInfoの後）

**現在のコード**:

```tsx
<CreatorAvatar
  createdBy={createdBy || task?.createdBy}
  avatarColor={createdByAvatarColor || task?.avatarColor}
  teamMode={teamMode}
  size="lg"
  className="mr-2"
/>
<DateInfo item={task} isEditing={!isDeleted} />
```

**変更後**:

```tsx
<CreatorAvatar
  createdBy={createdBy || task?.createdBy}
  avatarColor={createdByAvatarColor || task?.avatarColor}
  teamMode={teamMode}
  size="lg"
  className="mr-2"
/>
<DateInfo item={task} isEditing={!isDeleted} />
{/* タスクID表示（新規作成時以外） */}
{task?.displayId && (
  <span className="ml-2 text-xs text-muted-foreground select-all">
    #{task.displayId}
  </span>
)}
```

---

## 🎨 UIイメージ

### 変更前

```
[Avatar] 2024/12/01 作成                              [保存]
```

### 変更後

```
[Avatar] 2024/12/01 作成  #43                         [保存]
```

---

## ⚠️ 考慮事項

1. **新規作成時**: `task` が null のため、displayId は表示されない（正しい動作）
2. **削除済みタスク**: DeletedTask にも displayId があるため表示される
3. **レスポンシブ**: 小さい文字サイズ（text-xs）のため、モバイルでも邪魔にならない
4. **select-all**: クリックで全選択できるようにし、コピーしやすくする

---

## ✅ Codex用 ToDoリスト

- [ ] `task-editor.tsx` の DateInfo の後にタスクID表示を追加
  - 条件: `task?.displayId` が存在する場合のみ表示
  - スタイル: `ml-2 text-xs text-muted-foreground select-all`
  - 形式: `#{task.displayId}`

---

## 🧪 テスト観点

1. 既存タスクを開いた時、IDが表示されること
2. 新規タスク作成時、IDが表示されないこと
3. 削除済みタスクでもIDが表示されること
4. モバイル表示で崩れないこと
