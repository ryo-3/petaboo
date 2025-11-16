# 画面間のパディング統一Plan

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 📌 目的

メモ一覧・タスク一覧・ボード詳細画面でパディングの付け方が微妙に異なっており、統一性に欠ける。
特に**ボード詳細のコメントのみ表示時**に左パディング(`md:pl-5`)が不要なケースがあるため、整理して統一する。

---

## 🔍 徹底調査結果

### 📱 画面レベルのパディング

#### 1. メモ一覧画面 (memo-screen.tsx)

**外側コンテナ (line 883):**

```typescript
className={`${hideHeaderButtons ? "pt-2 md:pt-3" : "pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2"} flex flex-col h-full relative`}
```

| 条件                   | モバイル       | デスクトップ     |
| ---------------------- | -------------- | ---------------- |
| 通常                   | `pt-2 pl-2`    | `pt-3 pl-5 pr-2` |
| hideHeaderButtons=true | `pt-2 md:pt-3` | 左右なし         |

**その他のパディング:**

- モバイル画像一覧ヘッダー (line 95): `pl-2 pr-2 pt-2 pb-2`
- モバイル画像コンテンツ (line 111): `p-4`
- チーム選択時・詳細非表示 (line 1005): `pl-2` (条件付き)
- モバイル固定ツールバー (line 1182): `px-2`
- モバイルスクロールコンテンツ (line 1206): `pt-20 pl-2`

#### 2. タスク一覧画面 (task-screen.tsx)

**外側コンテナ (line 808):**

```typescript
className={`${hideHeaderButtons ? "pt-2 md:pt-3" : "pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2"} flex flex-col h-full relative`}
```

| 条件                   | モバイル       | デスクトップ     |
| ---------------------- | -------------- | ---------------- |
| 通常                   | `pt-2 pl-2`    | `pt-3 pl-5 pr-2` |
| hideHeaderButtons=true | `pt-2 md:pt-3` | 左右なし         |

→ **メモ一覧と完全に同じパターン** ✅

**その他のパディング:**

- モバイル画像一覧ヘッダー (line 95): `pl-2 pr-2 pt-2 pb-2`
- モバイル画像コンテンツ (line 111): `p-4`
- モバイル固定ツールバー (line 1108): `px-2`
- モバイルスクロールコンテンツ (line 1143): `pt-20 pl-2`

#### 3. ボード一覧画面 (board-screen.tsx)

**外側コンテナ (line 115):**

```typescript
className = "pt-2 md:pt-3 pl-2 md:pl-5 md:pr-2 md:mr-3 flex flex-col h-full";
```

| モバイル    | デスクトップ          |
| ----------- | --------------------- |
| `pt-2 pl-2` | `pt-3 pl-5 pr-2 mr-3` |

→ **メモ・タスクとほぼ同じ（mr-3が追加）** ✅

#### 4. ボード詳細画面 (board-detail-screen-3panel.tsx)

**外側コンテナ (line 954):**

```typescript
} pl-2 pr-0 md:pl-5 md:pr-4 ${selectedMemo || selectedTask || rightPanelMode ? "md:pr-2" : "md:pr-4"} flex flex-col ${...
```

| 条件                | モバイル    | デスクトップ |
| ------------------- | ----------- | ------------ |
| 通常時              | `pl-2 pr-0` | `pl-5 pr-4`  |
| 選択時/リスト表示時 | `pl-2 pr-0` | `pl-5 pr-2`  |

→ **他の画面と異なる点:**

1. ❌ **`pt-`がない** （上パディングなし）
2. ❌ **`pr`が動的** （`pr-4` または `pr-2`）
3. ❌ **モバイルで`pr-0`** （他は`pr-2`または指定なし）

**エラー時 (line 920):**

```typescript
className={showBoardHeader ? "p-6" : ""}
```

---

### 🎨 内部コンポーネントのパディング

#### BoardMemoSection (board-memo-section.tsx)

**ヘッダー (line 201):**

```typescript
className = "hidden md:flex items-center justify-between mb-1 pt-2";
```

- デスクトップのみ: `pt-2`

**スクロール領域 (line 315):**

```typescript
className = "flex-1 overflow-y-auto pr-2 pb-10 mb-2 hover-scrollbar";
```

- `pr-2 pb-10 mb-2`

#### BoardTaskSection (board-task-section.tsx)

**外側コンテナ (line 222):**

```typescript
className={`flex flex-col flex-1 min-h-0 relative ${showMemo && !isReversed ? "pl-[7px]" : ""}`}
```

- **重要**: メモ表示時（非反転）に `pl-[7px]` を追加 ⚠️
- これは左右のパネル間の視覚的バランス調整

**ヘッダー (line 224):**

```typescript
className = "hidden md:flex items-center justify-between mb-1 pt-2";
```

- デスクトップのみ: `pt-2`

**スクロール領域 (line 375):**

```typescript
className = "flex-1 overflow-y-auto pr-2 pb-10 mb-2 hover-scrollbar";
```

- `pr-2 pb-10 mb-2`

#### CommentSection (comment-section.tsx)

**デスクトップヘッダー (line 565):**

```typescript
className = "p-4 flex-shrink-0 items-center justify-between hidden md:flex";
```

- `p-4`

**コメント一覧 (line 604):**

```typescript
className = "flex-1 px-4 py-3 space-y-3 overflow-y-auto hover-scrollbar";
```

- `px-4 py-3`

**入力エリア (line 796):**

```typescript
className = "p-4 border-t border-gray-200 flex-shrink-0";
```

- `p-4`

---

### 🏗️ 3パネルレイアウトの内部構造

#### ResizablePanel (board-detail-screen-3panel.tsx)

**メモパネル (line 2210):**

```typescript
className =
  "rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200";
```

- パディングなし

**タスクパネル (line 2312):**

```typescript
className =
  "rounded-lg bg-white flex flex-col min-h-0 border-r border-gray-200";
```

- パディングなし

**コメントパネル (line 2425, 1829):**

```typescript
className = "rounded-lg bg-white pr-2 flex flex-col min-h-0";
```

- `pr-2` のみ

**内側のdiv:**

```typescript
className = "flex flex-col h-full relative";
// または
className = "flex flex-col h-full relative pt-2"; // モバイル時のみ
```

- 基本的にパディングなし
- モバイル時のみ `pt-2` (line 2016, 2102)

---

### 🔧 レイアウトコンポーネントのパディング

#### DesktopUpper (desktop-upper.tsx)

**外側コンテナ (line 362):**

```typescript
className={`fixed md:static top-0 left-0 right-0 z-10 bg-white px-2 md:px-0 ${marginBottom}`}
```

- モバイル: `px-2`
- デスクトップ: パディングなし
- marginBottomは親から渡される（通常`mb-1.5`または`mb-2`）

#### DesktopLower (desktop-lower.tsx)

- パディング関連のclassNameなし

#### ControlPanelLayout (control-panel-layout.tsx)

- パディング関連のclassNameなし

---

## 📊 問題点の整理

### 1. ボード詳細画面の pt がない

- メモ・タスク画面: `pt-2 md:pt-3`
- ボード詳細画面: pt なし

→ **統一性に欠ける**

### 2. ボード詳細の pr が違う

- メモ・タスク画面: `md:pr-2`（固定）
- ボード詳細画面: `md:pr-4`（通常時）/ `md:pr-2`（選択時）

→ **条件分岐が複雑**

### 3. コメントのみ表示時の pl-5 問題（本題）

**シナリオ:**

- ボード詳細で、メモとタスクを非表示にし、コメントのみ表示
- 外側コンテナに `md:pl-5` がついている
- 3パネルレイアウトでコメントパネルだけが表示される
- **コメントパネル自体にパディングがないため、`pl-5`が不要になる可能性**

**現状:**

```
[外側 pl-5] → [3パネルコンテナ] → [コメントパネル(パディングなし)]
```

→ 外側の`pl-5`が余計？

**希望:**

- コメントのみ表示時は `md:pl-5` を削除
- または、3パネルレイアウト全体で統一的なパディング設計

---

## 💡 解決策の選択肢

### 案A: ボード詳細のコメントのみ表示時に pl-5 を削除（最小限の変更）

**変更箇所:** `board-detail-screen-3panel.tsx` line 954

**変更前:**

```typescript
} pl-2 pr-0 md:pl-5 md:pr-4 ${...
```

**変更後:**

```typescript
} pl-2 pr-0 ${!showMemo && !showTask && showComment ? '' : 'md:pl-5'} md:pr-4 ${...
```

**メリット:**

- 最小限の変更
- コメントのみ表示時の不要なパディングを削除

**デメリット:**

- 根本的な統一にはならない
- 条件分岐が増える

### 案B: ボード詳細のパディングをメモ・タスク画面と統一

**変更内容:**

1. `pt-2 md:pt-3` を追加
2. `pr` を `md:pr-2` に統一
3. コメントのみ表示時の条件分岐も追加

**変更前:**

```typescript
} pl-2 pr-0 md:pl-5 md:pr-4 ${selectedMemo || selectedTask || rightPanelMode ? "md:pr-2" : "md:pr-4"} flex flex-col ${...
```

**変更後:**

```typescript
} pt-2 md:pt-3 pl-2 md:pr-2 ${!showMemo && !showTask && showComment ? '' : 'md:pl-5'} flex flex-col ${...
```

**メリット:**

- 全画面で統一されたパディング
- 見た目の一貫性

**デメリット:**

- 既存のレイアウトが変わる可能性
- テストが必要

### 案C: 3パネル内部のパネルにパディングを追加（抜本的）

**変更内容:**

- 外側コンテナのパディングを削除
- 各パネル内部に適切なパディングを追加

**例:**

```typescript
// 外側
} flex flex-col ${...  // パディングなし

// 内部パネル
<div className="flex flex-col h-full relative pt-2 md:pt-3 pl-2 md:pl-5 pr-2">
```

**メリット:**

- パネル単位で独立したパディング管理
- 柔軟性が高い

**デメリット:**

- 変更範囲が大きい
- 3パネルすべてを修正する必要

---

## 🎯 推奨案

**案A: コメントのみ表示時に pl-5 を削除（最小限の変更）**

理由:

1. 影響範囲が最小
2. 問題の本質（コメントのみ表示時の余計なパディング）を解決
3. テストが簡単
4. 後から案Bに移行することも可能

---

## 📝 実装内容（案A）

### 修正ファイル

**`apps/web/components/screens/board-detail-screen-3panel.tsx`**

**変更箇所 (line 954):**

```typescript
// 変更前
} pl-2 pr-0 md:pl-5 md:pr-4 ${selectedMemo || selectedTask || rightPanelMode ? "md:pr-2" : "md:pr-4"} flex flex-col ${teamMode ? "" : "transition-all duration-300"} relative`}

// 変更後
} pl-2 pr-0 ${!showMemo && !showTask && showComment ? '' : 'md:pl-5'} md:pr-4 ${selectedMemo || selectedTask || rightPanelMode ? "md:pr-2" : "md:pr-4"} flex flex-col ${teamMode ? "" : "transition-all duration-300"} relative`}
```

**条件:**

- `!showMemo && !showTask && showComment` = コメントのみ表示
- この時だけ `md:pl-5` を削除

---

## ✅ テスト項目

1. **通常時（メモ・タスクあり）**
   - [ ] 左パディング `md:pl-5` が表示される
   - [ ] レイアウトが崩れない

2. **コメントのみ表示時**
   - [ ] 左パディング `md:pl-5` が削除される
   - [ ] コメントが画面左端に適切に配置される
   - [ ] 見た目が自然

3. **2パネル表示**
   - [ ] メモ + コメント
   - [ ] タスク + コメント
   - [ ] メモ + タスク
   - [ ] すべてで左パディングが適切

4. **型エラー**
   - [ ] `npm run check:wsl` でエラーなし

---

## 🔮 将来の改善（オプション）

案Aで問題解決後、余裕があれば案Bへの統一を検討：

1. ボード詳細に `pt-2 md:pt-3` を追加
2. `pr` を `md:pr-2` に統一
3. 全画面で同じパディングパターン

これにより、メンテナンス性と一貫性が向上する。

---

## 📅 完了条件

- [x] 現状調査完了
- [ ] 実装（案A）
- [ ] すべてのテスト項目がパス
- [ ] 型エラーなし
- [ ] 計画書を `.claude/fixed-plans/` に移動
