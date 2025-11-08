# 表示設定Context統合＆Props削減実装計画

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 🎯 目的

DesktopUpper、ControlPanelなどの大量のPropsを削減し、状態管理を一元化する。
`ViewSettingsContext`を新規作成し、**localStorage**で永続化される設定とセッション限りの状態を統合管理する。

**重要**: UI表示設定はlocalStorageで管理し、API/DBは使用しない（UserPreferencesContextと併用）。

## 📋 現在の問題点

### Props地獄

```typescript
<DesktopUpper
  showEditDate={showEditDate}
  onShowEditDateChange={setShowEditDate}
  showTagDisplay={showTagDisplay}
  onShowTagDisplayChange={setShowTagDisplay}
  tags={tags}
  selectedTagIds={selectedTagIds}
  onTagFilterChange={setSelectedTagIds}
  tagFilterMode={tagFilterMode}
  onTagFilterModeChange={setTagFilterMode}
  columnCount={columnCount}
  onColumnCountChange={setColumnCount}
  // ... さらに15個のProps
/>
```

### 状態管理の分散

- 各画面コンポーネントで`useState`を多数宣言
- Propsのバケツリレー（3～4階層）
- 同じ設定が複数箇所に散らばる

---

## 🏗️ 解決策：ViewSettingsContext

### 設計思想

1. **localStorage永続化される設定** - `viewSettings`
   - カラム数、表示/非表示設定など
   - ページリロードしても保持
   - キー: `petaboo_view_settings_{userId}`

2. **セッション限りの状態** - `sessionState`
   - フィルター、ソート設定など
   - ページリロードでリセット（メモリのみ）

3. **画面モード別の設定** - `mode: "memo" | "task" | "board"`
   - 各画面で適切なデフォルト値を使用

---

## 📐 新しい型定義

### ViewSettings (localStorage永続化)

```typescript
export interface ViewSettings {
  // カラム数
  memoColumnCount: number;
  taskColumnCount: number;
  boardColumnCount: number;

  // コントロールパネル表示/非表示
  memoHideControls: boolean;
  taskHideControls: boolean;
  hideHeader: boolean;

  // 表示切り替え
  showTagDisplay: boolean; // タグ表示（ボード詳細用）

  // 注: showEditDate は削除済み（常時表示に変更）
}
```

### SessionState (メモリのみ)

```typescript
interface SessionState {
  // タグフィルター
  selectedTagIds: number[];
  tagFilterMode: "include" | "exclude";

  // ボードフィルター
  selectedBoardIds: number[];
  boardFilterMode: "include" | "exclude";

  // ソート設定
  sortOptions: Array<{
    id: "createdAt" | "updatedAt" | "priority" | "deletedAt" | "dueDate";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;
}
```

### Context型

```typescript
interface ViewSettingsContextType {
  // localStorage永続化設定
  settings: ViewSettings;
  updateSettings: (updates: Partial<ViewSettings>) => void;

  // セッション状態
  sessionState: SessionState;
  updateSessionState: (updates: Partial<SessionState>) => void;

  // ユーティリティ
  resetFilters: () => void;
  resetAllSettings: () => void; // localStorage含めて全リセット
}
```

**注**: `loading`と`error`は不要（localStorageは同期処理）

---

## 🔄 実装手順

### フェーズ1: Context作成

#### 1. 新しいContext作成

**ファイル**: `apps/web/src/contexts/view-settings-context.tsx`

**実装内容**:

- `ViewSettings`型を定義
- `SessionState`を追加
- localStorageの読み書き処理（`petaboo_view_settings_{userId}`）
- `updateSettings()`: settingsを更新してlocalStorageに保存
- `updateSessionState()`: sessionStateのみ更新（メモリ）
- `resetFilters()`: sessionStateをリセット
- `resetAllSettings()`: 全てリセット

**デフォルト値**:

```typescript
const DEFAULT_SETTINGS: ViewSettings = {
  memoColumnCount: 4,
  taskColumnCount: 2,
  boardColumnCount: 3,
  memoHideControls: false,
  taskHideControls: false,
  hideHeader: false,
  showTagDisplay: true,
};

const DEFAULT_SESSION_STATE: SessionState = {
  selectedTagIds: [],
  tagFilterMode: "include",
  selectedBoardIds: [],
  boardFilterMode: "include",
  sortOptions: [],
};
```

#### 2. Providerをアプリに追加

**ファイル**: `apps/web/app/layout.tsx` または各画面

```typescript
import { ViewSettingsProvider } from "@/src/contexts/view-settings-context";

export default function Layout({ children }) {
  return (
    <ViewSettingsProvider userId={userId}>
      {children}
    </ViewSettingsProvider>
  );
}
```

---

### フェーズ2: 各画面の移行

#### 3. board-detail-screen.tsx を移行

**削除するstate**:

```typescript
// Before
const [showTagDisplay, setShowTagDisplay] = useState(true);
const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
const [tagFilterMode, setTagFilterMode] = useState<"include" | "exclude">(
  "include",
);
const [columnCount, setColumnCount] = useState(3);
// 注: showEditDate は既に削除済み
```

**Contextから取得**:

```typescript
// After
const { settings, sessionState, updateSettings, updateSessionState } =
  useViewSettings();
```

**DesktopUpperのProps削減**:

```typescript
// Before (20個のProps)
<DesktopUpper
  showTagDisplay={showTagDisplay}
  onShowTagDisplayChange={setShowTagDisplay}
  columnCount={columnCount}
  onColumnCountChange={setColumnCount}
  selectedTagIds={selectedTagIds}
  onTagFilterChange={setSelectedTagIds}
  tagFilterMode={tagFilterMode}
  onTagFilterModeChange={setTagFilterMode}
  // ... 以下省略
/>

// After (Contextから直接取得するのでProps不要)
<DesktopUpper
  currentMode="board"
  customTitle={boardName}
  // 表示設定はContext経由で取得
/>
```

#### 4. board-detail-screen-3panel.tsx を移行

同様の対応

#### 5. memo-screen.tsx を移行

同様の対応（カラム数、フィルター、ソート設定をContextに移行）

#### 6. task-screen.tsx を移行

同様の対応（カラム数、フィルター、ソート設定をContextに移行）

---

### フェーズ3: コンポーネント内部の修正

#### 7. DesktopUpper を修正

**ファイル**: `apps/web/components/layout/desktop-upper.tsx`

**Props削除**:

- `showTagDisplay`, `onShowTagDisplayChange`
- `columnCount`, `onColumnCountChange`
- `selectedTagIds`, `onTagFilterChange`, `tagFilterMode`, `onTagFilterModeChange`
- `selectedBoardIds`, `onBoardFilterChange`, `boardFilterMode`, `onBoardFilterModeChange`
- `sortOptions`, `onSortChange`

**Contextから取得**:

```typescript
import { useViewSettings } from "@/src/contexts/view-settings-context";

function DesktopUpper({ currentMode, customTitle, ... }) {
  const { settings, sessionState, updateSettings, updateSessionState } = useViewSettings();

  // Contextから直接値を取得
  const columnCount =
    currentMode === "memo" ? settings.memoColumnCount :
    currentMode === "task" ? settings.taskColumnCount :
    settings.boardColumnCount;

  const selectedTagIds = sessionState.selectedTagIds;
  const sortOptions = sessionState.sortOptions;

  return (
    <ControlPanel
      currentMode={currentMode}
      // Propsは最小限に
    />
  );
}
```

#### 8. ControlPanel を修正

**ファイル**: `apps/web/components/ui/controls/control-panel.tsx`

同様にPropsを削減し、Contextから取得

#### 9. 各Toggle/Selectorコンポーネント修正

- TagDisplayToggle
- ColumnCountSelector
- SortToggle
  など、全てContextから値を取得

---

### フェーズ4: クリーンアップ

#### 10. 不要なPropsインターフェースを削除

- `DesktopUpperProps`を大幅に簡素化
- `ControlPanelProps`を簡素化

**注**: `UserPreferencesContext`は引き続き使用（DB永続化が必要な設定用）

---

### フェーズ5: 品質チェック

#### 11. 型チェック＆lint

```bash
npm run check:wsl
npm run check:api
```

#### 12. 動作確認

- [ ] メモ一覧でカラム数変更がlocalStorageに保存される
- [ ] タスク一覧でカラム数変更がlocalStorageに保存される
- [ ] ボード詳細でタグフィルターが動作する（セッション限り）
- [ ] ページリロード後も設定（カラム数等）が保持される
- [ ] ページリロード後、フィルターはリセットされる
- [ ] localStorageキーが正しい（`petaboo_view_settings_{userId}`）

---

## ✅ 完了条件

- ✅ ViewSettingsContextが作成され、アプリ全体で使用可能
- ✅ localStorageで設定が永続化される（DBは使用しない）
- ✅ DesktopUpper、ControlPanelのPropsが80%削減
- ✅ 各画面のuseStateが削除され、Contextから取得
- ✅ 型エラー・lintエラーがゼロ
- ✅ 全画面で表示設定が正常に動作

---

## 📊 影響範囲

### 修正ファイル数（予測）

- **新規作成**: 1ファイル（view-settings-context.tsx）
- **画面コンポーネント**: 4ファイル（memo, task, board, board-3panel）
- **共通コンポーネント**: 10ファイル（DesktopUpper, ControlPanel, 各Toggle等）
- **合計**: 約15ファイル

### Props削減効果

| コンポーネント | Before      | After | 削減率   |
| -------------- | ----------- | ----- | -------- |
| DesktopUpper   | 25個        | 5個   | **80%**  |
| ControlPanel   | 30個        | 3個   | **90%**  |
| 各画面         | 15個のstate | 0個   | **100%** |

---

## ⚠️ 注意点

1. **段階的な移行**
   - 一度に全画面を変更せず、1画面ずつ移行
   - 最初にboard-detail-screenで試す

2. **既存コードとの互換性**
   - 移行中は古いpropsも残しておく
   - 全画面移行後に削除

3. **パフォーマンス**
   - Context更新時の再レンダリングに注意
   - 必要に応じてuseMemoを使用

4. **localStorage管理**
   - ユーザーごとにキーを分ける（`petaboo_view_settings_{userId}`）
   - チームモード用の設定は別途検討（必要に応じてteamIdも含める）

5. **UserPreferencesContextとの併用**
   - DB永続化が必要な設定: UserPreferencesContext（既存）
   - UI表示設定: ViewSettingsContext（新規、localStorage）
   - 将来的に統合する可能性あり

---

## 📝 Codex用ToDoリスト

### Context作成

- [ ] view-settings-context.tsx作成
- [ ] ViewSettings型定義（showEditDate削除済み）
- [ ] SessionState型定義
- [ ] localStorage読み書き処理実装（`petaboo_view_settings_{userId}`）
- [ ] updateSettings、updateSessionState実装
- [ ] resetFilters、resetAllSettings実装

### 画面移行

- [ ] board-detail-screen.tsx移行（showTagDisplay、columnCount、フィルター）
- [ ] board-detail-screen-3panel.tsx移行
- [ ] memo-screen.tsx移行（columnCount、フィルター、ソート）
- [ ] task-screen.tsx移行（columnCount、フィルター、ソート）

### コンポーネント修正

- [ ] desktop-upper.tsx修正（Props削減、Context使用）
- [ ] control-panel.tsx修正（Props削減、Context使用）
- [ ] TagDisplayToggle修正
- [ ] ColumnCountSelector修正
- [ ] SortToggle修正
- [ ] その他Toggleコンポーネント修正

### クリーンアップ

- [ ] 不要なPropsインターフェース削除
- [ ] 型チェック（`npm run check:wsl`）
- [ ] 動作確認（カラム数、フィルター、localStorage）

---

**作成日**: 2025-01-07
**最終更新**: 2025-01-08（localStorage方式に変更）
