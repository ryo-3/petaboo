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
`UserPreferencesContext`を`ViewSettingsContext`に改名・拡張し、DB永続化される設定とセッション限りの状態を統合管理する。

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

1. **DB永続化される設定** - `preferences`
   - カラム数、表示/非表示設定など
   - ページリロードしても保持

2. **セッション限りの状態** - `sessionState`
   - フィルター、ソート設定など
   - ページリロードでリセット

3. **画面モード別の設定** - `mode: "memo" | "task" | "board"`
   - 各画面で適切なデフォルト値を使用

---

## 📐 新しい型定義

### ViewSettings (DB永続化)

```typescript
export interface ViewSettings {
  userId: number;

  // カラム数
  memoColumnCount: number;
  taskColumnCount: number;
  boardColumnCount: number;

  // コントロールパネル表示/非表示
  memoHideControls: boolean;
  taskHideControls: boolean;
  hideHeader: boolean;

  // 表示切り替え
  showEditDate: boolean; // 編集日表示
  showTagDisplay: boolean; // タグ表示（ボード詳細用）

  createdAt: number;
  updatedAt: number;
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
  // DB永続化設定
  settings: ViewSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<ViewSettings>) => Promise<void>;

  // セッション状態
  sessionState: SessionState;
  updateSessionState: (updates: Partial<SessionState>) => void;

  // ユーティリティ
  resetFilters: () => void;
  refreshSettings: () => Promise<void>;
}
```

---

## 🔄 実装手順

### フェーズ1: DB・スキーマ変更

#### 1. API側スキーマ更新

**ファイル**: `apps/api/src/db/schema/user-preferences.ts`

```typescript
export const userPreferences = sqliteTable("user_preferences", {
  userId: integer("user_id").primaryKey(),
  memoColumnCount: integer("memo_column_count").default(4).notNull(),
  taskColumnCount: integer("task_column_count").default(2).notNull(),
  boardColumnCount: integer("board_column_count").default(3).notNull(), // 🆕
  memoHideControls: integer("memo_hide_controls", { mode: "boolean" })
    .default(false)
    .notNull(),
  taskHideControls: integer("task_hide_controls", { mode: "boolean" })
    .default(false)
    .notNull(),
  hideHeader: integer("hide_header", { mode: "boolean" })
    .default(false)
    .notNull(),
  showEditDate: integer("show_edit_date", { mode: "boolean" })
    .default(false)
    .notNull(), // 🆕
  showTagDisplay: integer("show_tag_display", { mode: "boolean" })
    .default(true)
    .notNull(), // 🆕
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

#### 2. マイグレーション生成

```bash
npm run db:generate
```

生成されるマイグレーション例：

```sql
ALTER TABLE `user_preferences` ADD COLUMN `board_column_count` integer DEFAULT 3 NOT NULL;
ALTER TABLE `user_preferences` ADD COLUMN `show_edit_date` integer DEFAULT 0 NOT NULL;
ALTER TABLE `user_preferences` ADD COLUMN `show_tag_display` integer DEFAULT 1 NOT NULL;
```

#### 3. API Routes更新

**ファイル**: `apps/api/src/routes/user-preferences/route.ts`

- 新しいカラムをPUT/GETに追加

---

### フェーズ2: Context作成・移行

#### 4. 新しいContext作成

**ファイル**: `apps/web/src/contexts/view-settings-context.tsx`

- `UserPreferencesContext`をコピーして改名
- `ViewSettings`型を定義
- `SessionState`を追加
- `updateSessionState()`メソッド追加
- デフォルト値を設定

#### 5. Providerをアプリに追加

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

### フェーズ3: 各画面の移行

#### 6. board-detail-screen.tsx を移行

**削除するstate**:

```typescript
// Before
const [showEditDate, setShowEditDate] = useState(false);
const [showTagDisplay, setShowTagDisplay] = useState(true);
const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
const [tagFilterMode, setTagFilterMode] = useState<"include" | "exclude">(
  "include",
);
const [columnCount, setColumnCount] = useState(3);
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
  showEditDate={showEditDate}
  onShowEditDateChange={setShowEditDate}
  showTagDisplay={showTagDisplay}
  onShowTagDisplayChange={setShowTagDisplay}
  columnCount={columnCount}
  onColumnCountChange={setColumnCount}
  // ... 以下省略
/>

// After (Contextから直接取得するのでProps不要)
<DesktopUpper
  currentMode="board"
  customTitle={boardName}
  // 表示設定はContext経由で取得
/>
```

#### 7. board-detail-screen-3panel.tsx を移行

同様の対応

#### 8. memo-screen.tsx を移行

同様の対応

#### 9. task-screen.tsx を移行

同様の対応

---

### フェーズ4: コンポーネント内部の修正

#### 10. DesktopUpper を修正

**ファイル**: `apps/web/components/layout/desktop-upper.tsx`

**Props削除**:

- `showEditDate`, `onShowEditDateChange`
- `showTagDisplay`, `onShowTagDisplayChange`
- `columnCount`, `onColumnCountChange`
- `selectedTagIds`, `onTagFilterChange`, `tagFilterMode`, `onTagFilterModeChange`
- `selectedBoardIds`, `onBoardFilterChange`, `boardFilterMode`, `onBoardFilterModeChange`

**Contextから取得**:

```typescript
import { useViewSettings } from "@/src/contexts/view-settings-context";

function DesktopUpper({ currentMode, customTitle, ... }) {
  const { settings, sessionState, updateSettings, updateSessionState } = useViewSettings();

  // Contextから直接値を取得
  const showEditDate = settings?.showEditDate ?? false;
  const columnCount = settings?.memoColumnCount ?? 4; // modeに応じて切り替え
  const selectedTagIds = sessionState.selectedTagIds;

  return (
    <ControlPanel
      currentMode={currentMode}
      // Propsは最小限に
    />
  );
}
```

#### 11. ControlPanel を修正

**ファイル**: `apps/web/components/ui/controls/control-panel.tsx`

同様にPropsを削減し、Contextから取得

#### 12. 各Toggle/Selectorコンポーネント修正

- EditDateToggle
- TagDisplayToggle
- ColumnCountSelector
- SortToggle
  など、全てContextから値を取得

---

### フェーズ5: クリーンアップ

#### 13. 古いContextを削除

**ファイル**: `apps/web/src/contexts/user-preferences-context.tsx`

削除または非推奨マークを付ける

#### 14. 不要なPropsインターフェースを削除

- `DesktopUpperProps`を大幅に簡素化
- `ControlPanelProps`を簡素化

---

### フェーズ6: 品質チェック

#### 15. 型チェック＆lint

```bash
npm run check:wsl
npm run check:api
```

#### 16. 動作確認

- [ ] メモ一覧でカラム数変更が保存される
- [ ] タスク一覧で編集日表示切り替えが保存される
- [ ] ボード詳細でタグフィルターが動作する（セッション限り）
- [ ] ページリロード後も設定が保持される
- [ ] フィルターはリセットされる

---

## ✅ 完了条件

- ✅ ViewSettingsContextが作成され、アプリ全体で使用可能
- ✅ DBスキーマにshowEditDate、showTagDisplay、boardColumnCountが追加
- ✅ DesktopUpper、ControlPanelのPropsが80%削減
- ✅ 各画面のuseStateが削除され、Contextから取得
- ✅ 型エラー・lintエラーがゼロ
- ✅ 全画面で表示設定が正常に動作

---

## 📊 影響範囲

### 修正ファイル数（予測）

- **新規作成**: 1ファイル（view-settings-context.tsx）
- **DB関連**: 2ファイル（スキーマ、マイグレーション）
- **画面コンポーネント**: 4ファイル（memo, task, board, board-3panel）
- **共通コンポーネント**: 10ファイル（DesktopUpper, ControlPanel, 各Toggle等）
- **合計**: 約17ファイル

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

4. **チーム機能との統合**
   - チームモードでも同じContextを使用
   - teamIdによる設定の切り替え対応

---

## 📝 Codex用ToDoリスト

### DB・スキーマ

- [ ] user-preferencesスキーマにboardColumnCount、showEditDate、showTagDisplay追加
- [ ] マイグレーション生成・確認
- [ ] API Routesに新しいカラムを追加

### Context作成

- [ ] view-settings-context.tsx作成
- [ ] ViewSettings型定義
- [ ] SessionState型定義
- [ ] updateSettings、updateSessionState実装

### 画面移行

- [ ] board-detail-screen.tsx移行
- [ ] board-detail-screen-3panel.tsx移行
- [ ] memo-screen.tsx移行
- [ ] task-screen.tsx移行

### コンポーネント修正

- [ ] desktop-upper.tsx修正（Props削減、Context使用）
- [ ] control-panel.tsx修正（Props削減、Context使用）
- [ ] EditDateToggle修正
- [ ] TagDisplayToggle修正
- [ ] ColumnCountSelector修正
- [ ] その他Toggleコンポーネント修正

### クリーンアップ

- [ ] 旧user-preferences-context.tsx削除または非推奨化
- [ ] 不要なPropsインターフェース削除
- [ ] 型チェック
- [ ] 動作確認

---

**作成日**: 2025-01-07
**最終更新**: 2025-01-07
