# SelectorContext → NavigationContext 統合計画

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 📋 目的

Context数を削減し、Provider階層をシンプルにする。
SelectorContextは単一状態（`activeSelector`）のみを管理しており、同じくUI状態を管理するNavigationContextに統合することで設計を整理する。

## 🎯 期待成果

- ✅ Provider階層が1つ減り、layout.tsxがシンプルになる
- ✅ UI状態管理がNavigationContextに統一される
- ✅ Context管理の複雑さが軽減される

## 📊 現状分析

### SelectorContext の状態

- **ファイル**: `apps/web/src/contexts/selector-context.tsx`
- **管理状態**: `activeSelector: string | null` のみ
- **使用箇所**: `custom-selector.tsx` の1ファイルのみ
- **用途**: 複数セレクター開閉時の排他制御

### NavigationContext の状態

- **ファイル**: `apps/web/src/contexts/navigation-context.tsx`
- **管理状態**: screenMode, currentMode, iconStates, showTeamList, isCreatingMemo など多数
- **使用箇所**: 14ファイル、29箇所
- **用途**: 画面遷移・モード管理・UI状態管理

### Provider階層（現状）

```tsx
<PageVisibilityProvider>
  <UserPreferencesProvider>
    <ViewSettingsProvider>
      <ToastProvider>
        <SelectorProvider>
          {" "}
          ← これを削除
          {children}
        </SelectorProvider>
      </ToastProvider>
    </ViewSettingsProvider>
  </UserPreferencesProvider>
</PageVisibilityProvider>
```

## 🔧 変更範囲

### 修正対象ファイル（4ファイル）

1. **apps/web/src/contexts/navigation-context.tsx**
   - `activeSelector` / `setActiveSelector` を追加

2. **apps/web/components/ui/selectors/custom-selector.tsx**
   - `useContext(SelectorContext)` → `useNavigation()` に変更

3. **apps/web/app/layout.tsx**
   - `SelectorProvider` のimportと使用を削除

4. **apps/web/src/contexts/selector-context.tsx**
   - ファイル削除

## 📝 実装手順

### Step 1: NavigationContext に activeSelector を追加

**ファイル**: `apps/web/src/contexts/navigation-context.tsx`

**変更箇所①**: インターフェースに追加（40-71行目付近）

```tsx
interface NavigationContextType {
  screenMode: ScreenMode;
  currentMode: "memo" | "task" | "board";
  // ... 既存のプロパティ ...

  // セレクター制御（SelectorContextから移行）
  activeSelector: string | null;
  setActiveSelector: (id: string | null) => void;
}
```

**変更箇所②**: Provider内で状態を追加（84-121行目付近）

```tsx
export function NavigationProvider({ ... }: NavigationProviderProps) {
  // ... 既存のstate ...

  // セレクター制御（SelectorContextから移行）
  const [activeSelector, setActiveSelectorInternal] = useState<string | null>(null);

  const setActiveSelector = useCallback((id: string | null) => {
    setActiveSelectorInternal(id);
  }, []);

  // ... 既存のロジック ...
```

**変更箇所③**: Provider の value に追加（280-305行目付近）

```tsx
return (
  <NavigationContext.Provider
    value={{
      // ... 既存のプロパティ ...
      activeSelector,
      setActiveSelector,
    }}
  >
    {children}
  </NavigationContext.Provider>
);
```

### Step 2: custom-selector.tsx を修正

**ファイル**: `apps/web/components/ui/selectors/custom-selector.tsx`

**変更箇所①**: import文を変更（1-13行目）

```diff
- import { SelectorContext } from "@/src/contexts/selector-context";
+ import { useNavigation } from "@/src/contexts/navigation-context";
```

**変更箇所②**: useContext を useNavigation に変更（57-67行目）

```diff
-  // セレクターコンテキストの安全な使用
-  const selectorContext = useContext(SelectorContext);
-  const activeSelector = selectorContext?.activeSelector;
-  const setActiveSelector = useCallback(
-    (id: string | null) => {
-      if (selectorContext?.setActiveSelector) {
-        selectorContext.setActiveSelector(id);
-      }
-    },
-    [selectorContext],
-  );
+  // NavigationContextからセレクター状態を取得
+  const { activeSelector, setActiveSelector } = useNavigation();
```

**変更箇所③**: 不要なimportを削除（1-8行目）

```diff
  import React, {
    useState,
    useEffect,
    useRef,
    useId,
-   useContext,
-   useCallback,
  } from "react";
```

### Step 3: layout.tsx から SelectorProvider を削除

**ファイル**: `apps/web/app/layout.tsx`

**変更箇所①**: import削除（1-14行目）

```diff
  import { ToastProvider } from "@/src/contexts/toast-context";
- import { SelectorProvider } from "@/src/contexts/selector-context";
  import { ViewSettingsProvider } from "@/src/contexts/view-settings-context";
```

**変更箇所②**: Provider削除（59-75行目）

```diff
  <QueryProvider>
    <PageVisibilityProvider>
      <UserPreferencesProvider initialPreferences={initialPreferences}>
        <ViewSettingsProvider userId={1}>
          <ToastProvider>
-           <SelectorProvider>
              {clerkPublishableKey && <UserInitializer />}
              <LogCleaner />
              {children}
              <ToastContainer />
-           </SelectorProvider>
          </ToastProvider>
        </ViewSettingsProvider>
      </UserPreferencesProvider>
    </PageVisibilityProvider>
  </QueryProvider>
```

### Step 4: selector-context.tsx を削除

**ファイル**: `apps/web/src/contexts/selector-context.tsx`

ファイル全体を削除（37行）

## 🧪 テスト計画

### 動作確認項目

1. **セレクター開閉**
   - カテゴリーセレクターが正常に開く
   - 選択が正常に機能する

2. **排他制御**
   - 複数セレクターがある場合、1つを開くと他が閉じる
   - 外部クリックで閉じる

3. **新規作成**
   - allowCreate=true の場合、新規作成UIが表示される
   - 新規作成が正常に機能する

### 確認画面

- メモ一覧（カテゴリーセレクター）
- タスク一覧（カテゴリーセレクター）
- 各種設定画面でセレクターを使用している箇所

## ⚠️ 影響範囲・懸念点

### 影響範囲

- **小**: custom-selector.tsx の1コンポーネントのみ

### 懸念点

- **NavigationContext が肥大化**: ただし1状態追加程度で許容範囲
- **セレクター制御とナビゲーション制御の責務混在**: UI状態管理という観点では同一ドメインのため問題なし

### リスク評価

- **リスク**: 低
- **影響範囲**: 限定的
- **ロールバック**: 容易（git restore可能）

## 📚 関連ドキュメント

- `.claude/構造マップ.md` - Context一覧セクションを更新必要

## ✅ Codex用 ToDoリスト

### 実装タスク（差分修正のみ）

- [ ] **navigation-context.tsx**: インターフェースに `activeSelector`, `setActiveSelector` を追加
- [ ] **navigation-context.tsx**: Provider内で `activeSelector` 状態を追加（useCallback使用）
- [ ] **navigation-context.tsx**: Provider の value に `activeSelector`, `setActiveSelector` を追加
- [ ] **custom-selector.tsx**: import文を `SelectorContext` から `useNavigation` に変更
- [ ] **custom-selector.tsx**: `useContext(SelectorContext)` を `useNavigation()` に変更
- [ ] **custom-selector.tsx**: 不要な `useContext`, `useCallback` importを削除
- [ ] **layout.tsx**: `SelectorProvider` のimportを削除
- [ ] **layout.tsx**: `<SelectorProvider>` タグを削除
- [ ] **selector-context.tsx**: ファイル削除

### 確認タスク

- [ ] TypeScriptエラーがないことを確認
- [ ] custom-selector.tsx でセレクター開閉が正常動作
- [ ] 複数セレクターの排他制御が正常動作
- [ ] `.claude/構造マップ.md` の更新

---

**作成日**: 2025-11-08
**ステータス**: 承認待ち
