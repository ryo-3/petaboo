# PETABOO-44: タブ切り替え時の挙動安定化 実装計画書

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

チーム画面のタブ切り替えを安定化させる。特に本番でのみ発生する「ボード詳細→タスク一覧に戻れない」バグを解消。

---

## 設計方針

**2層構造で責務を分離:**

| 層         | 役割                          | 管理方法            | 速度      |
| ---------- | ----------------------------- | ------------------- | --------- |
| **見た目** | ヘッダー/サイドバーのアイコン | state（楽観的更新） | 即時      |
| **実体**   | 画面表示・選択状態            | URL駆動 + 逆流防止  | URL更新後 |

```
ユーザー操作
  ↓
① optimisticMode 更新 → ヘッダー/サイドバー即時反映
② pendingTabRef に期待値を記録
③ setActiveTab(tab) → 画面切り替え
④ router.replace() → URL更新（非同期）
  ↓
URL更新完了
  ↓
⑤ useEffect([searchParams]) 発火
⑥ pendingTabRef と一致 → クリアして終了（逆流しない）
⑦ optimisticMode クリア
```

---

## 問題の根本原因

### 本番バグの原因

```typescript
// useEffect([searchParams]) 内（L562-569）
const newTab = getTabFromURL();
if (newTab !== activeTab) {
  setActiveTab(newTab); // ← 古いURLで上書きしてしまう！
}
```

**フロー:**

1. `handleTabChange("tasks")` で `setActiveTab("tasks")` → 画面切り替え ✅
2. `router.replace()` でURL更新開始（非同期）
3. `searchParams` はまだ古いURL（ボード詳細）
4. `useEffect` 発火 → `getTabFromURL()` = "board"
5. `setActiveTab("board")` で上書き ❌ ← **ここで戻される**
6. URL更新完了後に再発火 → 正しい値に戻るが、一瞬戻っていた

**本番で顕著な理由**: ネットワーク遅延で②→⑥の間隔が広がる

---

## 変更範囲

| ファイル                  | 変更内容                               |
| ------------------------- | -------------------------------------- |
| `team-detail.tsx`         | pendingTabRef追加、逆流防止ロジック    |
| `navigation-context.tsx`  | 変更なし（既存のoptimisticModeを活用） |
| `team-detail-context.tsx` | 変更なし                               |

---

## 実装手順

### Phase 1: 本番バグ修正（pendingTabRefで逆流防止）

**ファイル**: `apps/web/components/features/team/team-detail.tsx`

#### Step 1-1: pendingTabRef を追加

```typescript
// L420付近（prevActiveTabRef の近く）
const prevActiveTabRef = useRef(activeTab);
const pendingTabRef = useRef<string | null>(null); // ← 追加
```

#### Step 1-2: handleTabChange で期待値を記録

```typescript
// L614付近（handleTabChange の先頭）
const handleTabChange = useCallback(
  (tab: ..., options?: ...) => {
    // 🚀 楽観的更新：期待値を記録して逆流を防止
    pendingTabRef.current = tab;

    // 既存のコード...
    if (tab === "board") {
      setOptimisticMode("board");
    } else if (tab === "memos") {
      // ...
```

#### Step 1-3: useEffect で逆流防止

```typescript
// L559付近のuseEffect([searchParams])を修正
useEffect(() => {
  // ... 旧形式URL変換の処理 ...

  const newTab = getTabFromURL();

  // 🛡️ 逆流防止: pendingTabRef がある場合
  if (pendingTabRef.current !== null) {
    if (pendingTabRef.current === newTab) {
      // URL更新完了 → フラグクリア
      pendingTabRef.current = null;
    }
    // URL更新中は上書きしない
    return;
  }

  // ブラウザ戻る/進むによる変更時のみ更新
  if (newTab !== activeTab) {
    setActiveTab(newTab);
    setActiveTabContext(newTab);
  }

  // ... メモID/タスクID処理 ...
}, [searchParams]);
```

---

### Phase 2: 選択状態クリアの統一（オプション）

3箇所に分散しているクリア処理を1箇所に集約:

```typescript
const clearSelections = useCallback(
  (options: { memo?: boolean; task?: boolean; all?: boolean }) => {
    if (options.all || options.memo) {
      setSelectedMemo(null);
      setSelectedDeletedMemo(null);
    }
    if (options.all || options.task) {
      setSelectedTask(null);
      setSelectedDeletedTask(null);
    }
  },
  [],
);
```

---

## 実装優先度

| Phase   | 内容                  | 優先度 | 効果           |
| ------- | --------------------- | ------ | -------------- |
| Phase 1 | pendingTabRef逆流防止 | 🔴 高  | 本番バグ解消   |
| Phase 2 | 選択状態クリア統一    | 🟡 中  | コード品質向上 |

---

## Codex用ToDoリスト

### Phase 1（必須）

- [ ] `team-detail.tsx` L420付近: `pendingTabRef` を追加
- [ ] `team-detail.tsx` L614付近: `handleTabChange` 先頭で `pendingTabRef.current = tab`
- [ ] `team-detail.tsx` L559付近: `useEffect([searchParams])` に逆流防止ロジック追加
- [ ] 型チェック: `npm run check:wsl`

### Phase 2（オプション）

- [ ] `clearSelections` 関数作成
- [ ] 3箇所のクリア処理を統一

---

## 確認事項

- [ ] ボード詳細 → タスク一覧 遷移が正常動作（本番）
- [ ] ブラウザ戻る/進むが正常動作
- [ ] ヘッダー/サイドバーのアイコンが即時切り替わる
