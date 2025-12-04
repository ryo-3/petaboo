# PETABOO-50: サイドバーアイコンのホームがまれに有効になり続けてしまう

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 📋 問題概要

**現象**: サイドバーのホームアイコンが「まれに有効（アクティブ状態）になり続けてしまう」

**発生URL**: https://petaboo.vercel.app/team/moricrew?board=PETABOO&task=50

---

## 🔍 原因分析

### ホームアイコンのactive状態判定

[navigation-context.tsx:237](apps/web/src/contexts/navigation-context.tsx#L237)でホームアイコンの判定：

```typescript
const isHomeScreen = screenMode === "home" && !showTeamList;
```

**ホームアイコンがtrueになる条件:**

1. `screenMode === "home"`
2. `showTeamList === false`

### 問題の根本原因

**`handleHome()`で`currentMode`を`"memo"`に設定している**ことが問題。

[use-main-client-handlers.ts:246-250](apps/web/src/hooks/use-main-client-handlers.ts#L246-L250):

```typescript
const handleHome = useCallback(() => {
  clearAllSelections();
  setScreenMode("home");
  setCurrentMode("memo"); // ← これが問題
}, [clearAllSelections, setScreenMode, setCurrentMode]);
```

### 問題のシナリオ

**個人モードで発生するパターン:**

1. ユーザーがメモ/タスク/ボード一覧を表示中
2. ホームボタンをクリック
3. `handleHome()`が実行される
4. `setScreenMode("home")` → ホーム画面に遷移
5. `setCurrentMode("memo")` → currentModeがmemoになる
6. **ここで状態更新のバッチ処理/非同期性により:**
   - `iconStates`の計算で`screenMode`がまだ前の値（memo/task/board）の場合がある
   - または`currentMode`の更新が先に反映され、`screenMode`が遅れる

7. **結果として:**
   - `isHomeScreen = (screenMode === "home" && !showTeamList)` が一瞬`false`になる
   - しかし、`iconStates.memo/task/board`の判定で`!isHomeScreen`条件が`true`になり、
   - 両方の条件が満たされず、**すべてのアイコンがfalse**、または
   - **競合状態でhomeがtrueのまま残る**ことがある

### より詳細な競合シナリオ

```
時間軸:
T1: handleHome()呼び出し
T2: setScreenMode("home") がReact state更新キューに追加
T3: setCurrentMode("memo") がReact state更新キューに追加
T4: Reactがバッチ更新を開始
T5: iconStatesのuseMemoが再計算（この時点の状態が不安定）
```

**T5の時点で:**

- `screenMode` = "home" (更新済み)
- `currentMode` = "memo" (更新済み)

**iconStates計算:**

```typescript
const isHomeScreen = screenMode === "home" && !showTeamList;
// isHomeScreen = true (正常)

result.home = isHomeScreen; // true
result.memo = !isHomeScreen && !isExclusiveScreen && effectiveMode === "memo";
// = !true && !false && "memo" === "memo" = false (正常)
```

**しかし、実際には...**

実際の問題は、**`wrappedHandleHome`の処理順序**にある可能性が高い：

[main-client.tsx:431-436](apps/web/components/client/main-client.tsx#L431-L436):

```typescript
const wrappedHandleHome = () => {
  closeBoardSettings();
  setShowTeamList(false); // ← 1. showTeamListを先にfalseに
  setShowTeamCreate(false);
  handleHome(); // ← 2. その後screenModeを"home"に
};
```

**問題パターン:**

1. ユーザーがチーム一覧(`showTeamList=true`)を開いている
2. ホームボタンをクリック
3. `setShowTeamList(false)` が実行
4. この時点で `iconStates.home = screenMode === "home" && !showTeamList`
   - `screenMode`はまだ"team"
   - `showTeamList`はfalseになっている
   - → `isHomeScreen = "team" === "home" && !false = false`
5. `handleHome()`で`setScreenMode("home")`
6. 更新後: `isHomeScreen = "home" === "home" && !false = true`

**この間のレンダリングで不整合が見える可能性がある。**

---

## 💡 解決策

### 方針: 状態更新を一括で行い、競合を防ぐ

**Option A: handleHomeで全ての関連状態を一括更新（推奨）**

`handleHome`内で`showTeamList`と`showTeamCreate`もリセットすることで、
wrappedHandleHomeでの分離された更新を避ける。

**Option B: flushSync使用（非推奨）**

ReactのflushSyncで強制同期更新。パフォーマンス影響あり。

---

## 📝 実装計画

### 変更ファイル

1. **`apps/web/src/hooks/use-main-client-handlers.ts`**
   - `handleHome`に`setShowTeamList(false)`と`setShowTeamCreate(false)`を追加

2. **`apps/web/components/client/main-client.tsx`**
   - `wrappedHandleHome`から重複する`setShowTeamList(false)`と`setShowTeamCreate(false)`を削除

### 詳細変更

#### 1. use-main-client-handlers.ts

**Before (246-250行目):**

```typescript
const handleHome = useCallback(() => {
  clearAllSelections();
  setScreenMode("home");
  setCurrentMode("memo");
}, [clearAllSelections, setScreenMode, setCurrentMode]);
```

**After:**

```typescript
const handleHome = useCallback(() => {
  clearAllSelections();
  setShowTeamList(false); // 追加: チーム一覧を閉じる
  setShowTeamCreate(false); // 追加: チーム作成を閉じる
  setScreenMode("home");
  setCurrentMode("memo");
}, [
  clearAllSelections,
  setScreenMode,
  setCurrentMode,
  setShowTeamList,
  setShowTeamCreate,
]);
```

**注意:** `setShowTeamList`と`setShowTeamCreate`を引数/依存配列に追加する必要があるため、
フックの引数を確認して追加する。

#### 2. main-client.tsx

**Before (431-436行目):**

```typescript
const wrappedHandleHome = () => {
  closeBoardSettings();
  setShowTeamList(false);
  setShowTeamCreate(false);
  handleHome();
};
```

**After:**

```typescript
const wrappedHandleHome = () => {
  closeBoardSettings();
  // setShowTeamList/setShowTeamCreateはhandleHome内で行うため削除
  handleHome();
};
```

---

## ⚠️ 影響範囲

- **個人モード**: ホームボタンの動作（改善）
- **チームモード**: 影響なし（チームモードではホームボタンは別の動作）
- **他の画面遷移**: 影響なし

---

## ✅ Codex用ToDoリスト

1. [ ] `apps/web/src/hooks/use-main-client-handlers.ts`の43行目で、`useNavigation()`から追加で`setShowTeamList`と`setShowTeamCreate`を取得
2. [ ] `handleHome`関数内（246行目付近）で`setShowTeamList(false)`と`setShowTeamCreate(false)`を`setScreenMode`の前に追加
3. [ ] `handleHome`の依存配列に`setShowTeamList`と`setShowTeamCreate`を追加
4. [ ] `apps/web/components/client/main-client.tsx`の`wrappedHandleHome`（431行目付近）から`setShowTeamList(false)`と`setShowTeamCreate(false)`の行を削除
5. [ ] `npm run check:wsl`で型チェック通過を確認

---

## 🧪 テスト方法

1. チーム一覧画面を開く（サイドバーのチームアイコンクリック）
2. ホームボタンをクリック
3. ホームアイコンのみがアクティブになることを確認
4. メモ/タスク/ボードアイコンが非アクティブであることを確認
5. 連打テスト: 各アイコンを素早くクリックして状態が正しく切り替わることを確認
