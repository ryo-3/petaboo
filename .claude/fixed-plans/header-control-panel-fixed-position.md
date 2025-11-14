# ヘッダーコントロールパネル位置固定化 & ボード名文字数統一

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

### 背景

- ヘッダーコントロールパネルに位置移動機能（left/center/right切り替え）が実装されている
- 長いボード名と位置移動可能なコントロールパネルが競合し、UIが被る問題が発生
- ボード名の文字数制限がフロント（50文字）とAPI（100文字）で不一致

### 解決方針

1. **位置移動機能を削除し、右固定にする**
   - シンプルで予測可能な動作
   - ボード名との競合を回避
   - コードの簡素化

2. **ボード名の文字数制限を50文字で統一**
   - フロント・APIの一貫性確保
   - UIに最適な長さ（英語・日本語共に十分）

---

## 📂 変更範囲

### 修正ファイル

1. **`apps/web/components/ui/controls/header-control-panel.tsx`**
   - 位置移動機能の削除（約100行）
   - 右固定スタイルに変更
   - UI改善（モバイル用ボード名の幅拡大）

2. **`apps/api/src/routes/boards/api.ts`**
   - バリデーション変更: `max(100)` → `max(50)`

---

## 🔧 実装手順

### Step 1: header-control-panel.tsx の簡素化

#### 削除する要素

**State管理（lines 165-178）:**

```typescript
// ❌ 削除
const [controlPosition, setControlPosition] = useState<
  "left" | "center" | "right"
>(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("control-panel-position");
    if (
      saved &&
      (saved === "left" || saved === "center" || saved === "right")
    ) {
      return saved;
    }
  }
  return "right";
});
```

**State管理（lines 160-162）:**

```typescript
// ❌ 削除
const [windowWidth, setWindowWidth] = useState(
  typeof window !== "undefined" ? window.innerWidth : 0,
);
const [controlWidth, setControlWidth] = useState(0);
```

**ResizeObserver useEffect（lines 189-206）:**

```typescript
// ❌ 削除
useEffect(() => {
  if (!floatControls || !controlRef.current) return;

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width;
      if (width > 0) {
        setControlWidth(width);
      }
    }
  });

  resizeObserver.observe(controlRef.current);

  return () => {
    resizeObserver.disconnect();
  };
}, [floatControls]);
```

**リサイズハンドラー useEffect（lines 209-218）:**

```typescript
// ❌ 削除
useEffect(() => {
  if (typeof window === "undefined" || !floatControls) return;

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, [floatControls]);
```

**座標計算ロジック（lines 221-246）:**

```typescript
// ❌ 削除
const pixelPosition = useMemo(() => {
  if (typeof window === "undefined") return { x: 0, y: 0 };

  const headerHeight = 64;
  const controlHeight = 28;
  const y = (headerHeight - controlHeight) / 2;
  let x = 0;

  if (controlWidth === 0) {
    return { x: -9999, y };
  }

  switch (controlPosition) {
    case "left":
      x = 220;
      break;
    case "center":
      x = windowWidth / 2 - controlWidth / 2;
      break;
    case "right":
      x = Math.max(0, windowWidth - controlWidth - 128);
      break;
  }

  return { x, y };
}, [controlPosition, windowWidth, controlWidth]);
```

**位置切り替え関数（lines 248-261）:**

```typescript
// ❌ 削除
const togglePosition = () => {
  if (!floatControls) return;

  const nextPosition =
    controlPosition === "left"
      ? "center"
      : controlPosition === "center"
        ? "right"
        : "left";

  setControlPosition(nextPosition);
  localStorage.setItem("control-panel-position", nextPosition);
};
```

**位置切り替えハンドルUI（lines 279-297）:**

```typescript
// ❌ 削除
{floatControls && (
  <button
    onClick={togglePosition}
    className="hidden md:flex items-center mr-1 opacity-40 hover:opacity-70 transition-opacity cursor-pointer"
  >
    <div className="flex items-center gap-0.5">
      <div
        className={`${controlPosition === "left" ? "w-1.5 h-1.5 bg-gray-800" : "w-1 h-1 bg-gray-500"} rounded-full transition-all`}
      ></div>
      <div
        className={`${controlPosition === "center" ? "w-1.5 h-1.5 bg-gray-800" : "w-1 h-1 bg-gray-500"} rounded-full transition-all`}
      ></div>
      <div
        className={`${controlPosition === "right" ? "w-1.5 h-1.5 bg-gray-800" : "w-1 h-1 bg-gray-500"} rounded-full transition-all`}
      ></div>
    </div>
  </button>
)}
```

#### 変更する要素

**メインdiv（lines 267-278）:**

```typescript
// 変更前
<div
  ref={floatControls ? controlRef : null}
  className={`flex items-center gap-2 h-7 ${floatControls ? `md:fixed z-20 md:bg-white/95 md:backdrop-blur-sm md:px-3 md:py-1.5 md:rounded-lg ${!isInitialRender ? "md:transition-all md:duration-300" : ""} mb-1.5` : "mb-1.5"}`}
  style={
    floatControls
      ? {
          left: `${pixelPosition.x}px`,
          top: `${pixelPosition.y}px`,
        }
      : undefined
  }
>

// 変更後
<div
  className={`flex items-center gap-2 h-7 ${floatControls ? "md:fixed md:right-32 md:top-[18px] z-20 md:bg-white/95 md:backdrop-blur-sm md:px-3 md:py-1.5 md:rounded-lg mb-1.5" : "mb-1.5"}`}
>
```

**モバイル用ボード名の幅拡大（lines 300-306）:**

```typescript
// 変更前
{customTitle && (
  <div className="md:hidden flex-shrink-0 mr-2">
    <h2 className="text-sm font-bold text-gray-800 truncate max-w-[120px]">
      {customTitle}
    </h2>
  </div>
)}

// 変更後
{customTitle && (
  <div className="md:hidden flex-shrink-0 mr-2">
    <h2 className="text-sm font-bold text-gray-800 truncate max-w-[180px]">
      {customTitle}
    </h2>
  </div>
)}
```

#### 削除されるimport/依存

```typescript
// useMemoが他で使われていなければ削除
import { useRef, useState, useEffect, useMemo } from "react";
// ↓
import { useRef, useState, useEffect } from "react";
```

**注意:** `useMemo`が他の箇所で使われている場合は削除しない

---

### Step 2: API側のバリデーション統一

**ファイル:** `apps/api/src/routes/boards/api.ts`

**変更箇所 1（line 125）:**

```typescript
// 変更前
const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

// 変更後
const CreateBoardSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
});
```

**変更箇所 2（line 130）:**

```typescript
// 変更前
const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// 変更後
const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
});
```

---

## 🧪 影響範囲

### 影響を受ける画面

**すべて右固定表示に統一される:**

1. 3パネル版ボード詳細（8箇所の `floatControls={true}`）
2. メモ画面（左パネル）
3. タスク画面（左パネル）

### 破壊的変更

1. **ユーザー設定の無効化**
   - localStorageに保存された位置情報は使用されなくなる
   - エラーは発生しないが、設定は無視される

2. **APIバリデーション**
   - 既存のボード名が50文字を超えている場合、更新時にエラー
   - **対策:** DBに50文字超のボード名が存在するか事前確認

---

## 📋 事前確認事項（Codex実装前）

### DB確認コマンド

```bash
# 50文字を超えるボード名が存在するか確認
npx wrangler d1 execute DB --local --command "SELECT id, name, LENGTH(name) as len FROM boards WHERE LENGTH(name) > 50;"
npx wrangler d1 execute DB --local --command "SELECT id, name, LENGTH(name) as len FROM team_boards WHERE LENGTH(name) > 50;"
npx wrangler d1 execute DB --local --command "SELECT id, name, LENGTH(name) as len FROM deleted_boards WHERE LENGTH(name) > 50;"
npx wrangler d1 execute DB --local --command "SELECT id, name, LENGTH(name) as len FROM team_deleted_boards WHERE LENGTH(name) > 50;"
```

**結果が0件の場合:** 安全に変更可能
**結果が1件以上の場合:** 該当データを50文字以内に修正してから実装

---

## ✅ テスト確認項目

### 動作確認

1. **デスクトップ表示**
   - [ ] コントロールパネルが右側に固定表示される
   - [ ] ボード名が左側に適切に表示される
   - [ ] ボード名とコントロールが被らない

2. **モバイル表示**
   - [ ] モバイルでボード名が180pxまで表示される
   - [ ] 長いボード名が`truncate`で省略される
   - [ ] コントロールが正常に動作する

3. **機能確認**
   - [ ] カラム数変更が動作する
   - [ ] 選択モード切り替えが動作する
   - [ ] ボードレイアウト切り替えが動作する
   - [ ] コンテンツフィルターが動作する
   - [ ] その他のコントロールが正常に動作する

4. **APIバリデーション**
   - [ ] ボード作成時、50文字以内で正常に作成できる
   - [ ] ボード作成時、51文字以上でエラーが出る
   - [ ] ボード更新時、50文字以内で正常に更新できる
   - [ ] ボード更新時、51文字以上でエラーが出る
   - [ ] エラーメッセージが適切に表示される

5. **既存データ**
   - [ ] 既存のボードが正常に表示される
   - [ ] 既存のボードが編集できる
   - [ ] localStorage の古い設定が悪影響を与えない

---

## 🎯 期待される成果

### 改善点

1. **コードの簡素化**
   - 約100行のロジック削除
   - 状態管理がシンプルに
   - メンテナンス性向上

2. **予測可能な動作**
   - 常に右側に表示
   - ユーザーが迷わない
   - 一貫したUX

3. **ボード名スペース確保**
   - 左側に確実なスペース
   - モバイルで180pxまで表示（120px→180px）
   - 競合リスク低減

4. **パフォーマンス改善**
   - ResizeObserver不要
   - リサイズイベント不要
   - 計算処理の削減

5. **一貫性向上**
   - フロント・APIでボード名50文字統一
   - バリデーションエラーの解消
   - データ整合性の確保

---

## 📝 Codex用実装指示

### header-control-panel.tsx の変更

**差分形式で以下を実行:**

1. **State削除:**
   - `controlPosition` state削除
   - `windowWidth` state削除
   - `controlWidth` state削除

2. **useEffect削除:**
   - ResizeObserver の useEffect削除
   - リサイズハンドラーの useEffect削除

3. **関数削除:**
   - `pixelPosition` useMemo削除
   - `togglePosition` 関数削除

4. **UI削除:**
   - 位置切り替えハンドル（3つのドット）削除

5. **スタイル変更:**
   - メインdivを右固定に変更
   - `ref={floatControls ? controlRef : null}` を削除
   - `style` プロパティを削除
   - `className` を右固定スタイルに変更

6. **ボード名幅拡大:**
   - モバイル用ボード名の `max-w-[120px]` を `max-w-[180px]` に変更

7. **import整理:**
   - `useMemo` が他で使われていなければimportから削除

### boards/api.ts の変更

**差分形式で以下を実行:**

1. `CreateBoardSchema` の `max(100)` を `max(50)` に変更
2. `UpdateBoardSchema` の `max(100)` を `max(50)` に変更

---

## 🚨 注意事項

1. **UTF-8エンディング必須**
   - すべてのファイルはUTF-8で保存
   - 日本語コメントあり

2. **差分形式で実装**
   - ファイル全体を再生成しない
   - 必要な箇所のみ変更

3. **DB事前確認必須**
   - 50文字超のボード名がないか確認
   - 存在する場合は事前に修正

4. **テスト必須**
   - すべてのテスト確認項目を実施
   - 特にモバイル表示を確認

---

## 📅 実装後の作業

1. **動作確認**
   - すべてのテスト項目を確認
   - 特にボード名の表示を重点的に

2. **品質チェック**

   ```bash
   npm run check:wsl
   npm run check:api
   ```

3. **計画書の移動**
   - 完了後、このファイルを `.claude/fixed-plans/` に移動
