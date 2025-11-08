# フィルター統合モーダル実装計画

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

タグフィルターとボードフィルターを1つのモーダルに統合し、タブで切り替えられるようにする。
ViewSettingsContext実装後に行うことで、Props削減のメリットを最大化する。

---

## 📋 現在の問題点

### 別々のUIコンポーネント

現状、タグフィルターとボードフィルターは別々のボタン・別々のUIで実装されている可能性が高い：

```typescript
// 現状（推測）
<ControlPanel>
  {/* タグフィルターボタン */}
  <TagFilterButton
    selectedTagIds={selectedTagIds}
    onTagFilterChange={setSelectedTagIds}
    tagFilterMode={tagFilterMode}
    onTagFilterModeChange={setTagFilterMode}
  />

  {/* ボードフィルターボタン */}
  <BoardFilterButton
    selectedBoardIds={selectedBoardIds}
    onBoardFilterChange={setSelectedBoardIds}
    boardFilterMode={boardFilterMode}
    onBoardFilterModeChange={setBoardFilterMode}
  />
</ControlPanel>
```

### Props地獄

- 8個以上のPropsが必要
- 各画面で状態管理が必要
- コンポーネント間のバケツリレー

---

## 🏗️ 解決策：統合フィルターモーダル

### UI設計

```
┌─────────────────────────────────────┐
│  フィルター設定                        │
├─────────────────────────────────────┤
│  [ タグ ]  [ ボード ]  ← タブ切り替え    │
├─────────────────────────────────────┤
│                                     │
│  ● タグタブの場合：                    │
│    ○ 含む  ○ 除外                    │
│    □ デザイン                         │
│    □ 開発                            │
│    □ バグ                            │
│                                     │
│  ● ボードタブの場合：                   │
│    ○ 含む  ○ 除外                    │
│    □ プロジェクトA                     │
│    □ プロジェクトB                     │
│    □ アイデア                         │
│                                     │
├─────────────────────────────────────┤
│  [ クリア ]  [ 適用して閉じる ]         │
└─────────────────────────────────────┘
```

### トリガーボタン

```
┌──────────────────────┐
│  🏷️ フィルター (2)    │  ← 選択中の件数を表示
└──────────────────────┘
```

---

## 📐 型定義（ViewSettingsContextに追加）

### SessionState拡張

```typescript
interface SessionState {
  // フィルター設定
  selectedTagIds: number[];
  tagFilterMode: "include" | "exclude";
  selectedBoardIds: number[];
  boardFilterMode: "include" | "exclude";

  // 統合モーダル用（🆕）
  filterModalOpen: boolean;
  activeFilterTab: "tag" | "board"; // モーダル内のタブ
}
```

### デフォルト値

```typescript
const DEFAULT_SESSION_STATE: SessionState = {
  selectedTagIds: [],
  tagFilterMode: "include",
  selectedBoardIds: [],
  boardFilterMode: "include",

  filterModalOpen: false,
  activeFilterTab: "tag", // デフォルトはタグタブ
};
```

---

## 🔄 実装手順

### フェーズ1: Context拡張

#### 1. ViewSettingsContextに状態追加

**ファイル**: `apps/web/src/contexts/view-settings-context.tsx`

**追加内容**:

```typescript
interface SessionState {
  // 既存
  selectedTagIds: number[];
  tagFilterMode: "include" | "exclude";
  selectedBoardIds: number[];
  boardFilterMode: "include" | "exclude";
  sortOptions: Array<{...}>;

  // 🆕 追加
  filterModalOpen: boolean;
  activeFilterTab: "tag" | "board";
}
```

**ヘルパー関数追加**:

```typescript
interface ViewSettingsContextType {
  // 既存
  settings: ViewSettings;
  sessionState: SessionState;
  updateSettings: (updates: Partial<ViewSettings>) => void;
  updateSessionState: (updates: Partial<SessionState>) => void;
  resetFilters: () => void;
  resetAllSettings: () => void;

  // 🆕 フィルター専用ヘルパー
  openFilterModal: (tab?: "tag" | "board") => void;
  closeFilterModal: () => void;
  clearCurrentFilter: () => void; // 現在のタブのフィルターをクリア
  getActiveFilterCount: () => number; // 選択中のフィルター件数
}
```

---

### フェーズ2: モーダルコンポーネント作成

#### 2. UnifiedFilterModal作成

**ファイル**: `apps/web/components/ui/modals/unified-filter-modal.tsx`

**実装内容**:

```typescript
"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { Modal } from "@/components/ui/modal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export function UnifiedFilterModal() {
  const {
    sessionState,
    updateSessionState,
    closeFilterModal,
    clearCurrentFilter,
  } = useViewSettings();

  const handleClear = () => {
    clearCurrentFilter();
  };

  const handleClose = () => {
    closeFilterModal();
  };

  return (
    <Modal
      open={sessionState.filterModalOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">フィルター設定</h2>

        <Tabs
          value={sessionState.activeFilterTab}
          onValueChange={(tab) =>
            updateSessionState({ activeFilterTab: tab as "tag" | "board" })
          }
        >
          <TabsList>
            <TabsTrigger value="tag">タグ</TabsTrigger>
            <TabsTrigger value="board">ボード</TabsTrigger>
          </TabsList>

          {/* タグフィルタータブ */}
          <TabsContent value="tag">
            <TagFilterContent />
          </TabsContent>

          {/* ボードフィルタータブ */}
          <TabsContent value="board">
            <BoardFilterContent />
          </TabsContent>
        </Tabs>

        {/* アクションボタン */}
        <div className="flex gap-2 mt-6">
          <button onClick={handleClear}>クリア</button>
          <button onClick={handleClose}>適用して閉じる</button>
        </div>
      </div>
    </Modal>
  );
}
```

#### 3. TagFilterContent作成

**ファイル**: `apps/web/components/ui/modals/tag-filter-content.tsx`

**実装内容**:

```typescript
"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { useTags } from "@/src/hooks/use-tags";

export function TagFilterContent() {
  const { sessionState, updateSessionState } = useViewSettings();
  const { tags } = useTags();

  const handleModeChange = (mode: "include" | "exclude") => {
    updateSessionState({ tagFilterMode: mode });
  };

  const handleTagToggle = (tagId: number) => {
    const newSelectedTagIds = sessionState.selectedTagIds.includes(tagId)
      ? sessionState.selectedTagIds.filter((id) => id !== tagId)
      : [...sessionState.selectedTagIds, tagId];

    updateSessionState({ selectedTagIds: newSelectedTagIds });
  };

  return (
    <div className="space-y-4">
      {/* モード選択 */}
      <RadioGroup value={sessionState.tagFilterMode} onValueChange={handleModeChange}>
        <div className="flex gap-4">
          <label>
            <RadioGroupItem value="include" />
            含む
          </label>
          <label>
            <RadioGroupItem value="exclude" />
            除外
          </label>
        </div>
      </RadioGroup>

      {/* タグ一覧 */}
      <div className="space-y-2">
        {tags.map((tag) => (
          <label key={tag.id} className="flex items-center gap-2">
            <Checkbox
              checked={sessionState.selectedTagIds.includes(tag.id)}
              onCheckedChange={() => handleTagToggle(tag.id)}
            />
            <span>{tag.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

#### 4. BoardFilterContent作成

**ファイル**: `apps/web/components/ui/modals/board-filter-content.tsx`

**実装内容**: TagFilterContentと同様の構造（ボード版）

---

### フェーズ3: トリガーボタン作成

#### 5. UnifiedFilterButton作成

**ファイル**: `apps/web/components/ui/buttons/unified-filter-button.tsx`

**実装内容**:

```typescript
"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { FilterIcon } from "lucide-react";

export function UnifiedFilterButton() {
  const { openFilterModal, getActiveFilterCount } = useViewSettings();
  const count = getActiveFilterCount();

  return (
    <button
      onClick={() => openFilterModal()}
      className="relative"
    >
      <FilterIcon className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
```

---

### フェーズ4: ControlPanelに統合

#### 6. ControlPanel修正

**ファイル**: `apps/web/components/ui/controls/control-panel.tsx`

**変更内容**:

```typescript
// Before（既存のタグ・ボードフィルターボタンを削除）
<TagFilterButton ... />
<BoardFilterButton ... />

// After（統合ボタンに置き換え）
<UnifiedFilterButton />
<UnifiedFilterModal />  {/* モーダルコンポーネント配置 */}
```

**削除するProps**:

- `selectedTagIds`, `onTagFilterChange`
- `tagFilterMode`, `onTagFilterModeChange`
- `selectedBoardIds`, `onBoardFilterChange`
- `boardFilterMode`, `onBoardFilterModeChange`

→ **8個のProps削減！**

---

### フェーズ5: 既存フィルターコンポーネント削除

#### 7. 不要なコンポーネント削除

削除対象ファイル（存在する場合）:

- `apps/web/components/ui/buttons/tag-filter-button.tsx`
- `apps/web/components/ui/buttons/board-filter-button.tsx`
- 関連するモーダル・ポップオーバーコンポーネント

---

### フェーズ6: 品質チェック

#### 8. 型チェック＆動作確認

```bash
npm run check:wsl
```

**動作確認項目**:

- [ ] フィルターボタンクリックでモーダルが開く
- [ ] タブ切り替えが動作する
- [ ] タグ選択が反映される
- [ ] ボード選択が反映される
- [ ] モード（含む/除外）切り替えが動作する
- [ ] クリアボタンで現在のタブのフィルターがリセットされる
- [ ] 適用して閉じるでモーダルが閉じる
- [ ] バッジに選択件数が正しく表示される
- [ ] フィルターがリストに正しく適用される

---

## ✅ 完了条件

- ✅ ViewSettingsContextにフィルターモーダル状態追加
- ✅ UnifiedFilterModalコンポーネント作成
- ✅ タグ・ボードのフィルターコンテンツ作成
- ✅ トリガーボタン作成（選択件数バッジ付き）
- ✅ ControlPanelに統合
- ✅ 既存のフィルターコンポーネント削除
- ✅ Props削減完了（8個削減）
- ✅ 型エラーゼロ
- ✅ 動作確認完了

---

## 📊 影響範囲

### 修正ファイル数（予測）

- **Context**: 1ファイル（view-settings-context.tsx）
- **新規作成**: 4ファイル（モーダル、コンテンツ×2、ボタン）
- **修正**: 1ファイル（control-panel.tsx）
- **削除**: 2〜3ファイル（既存フィルターボタン等）
- **合計**: 約8ファイル

### Props削減効果

| コンポーネント | 削減Props数    |
| -------------- | -------------- |
| ControlPanel   | 8個            |
| DesktopUpper   | 8個（間接的）  |
| 各画面         | 8個のstate削除 |

---

## ⚠️ 注意点

1. **ViewSettingsContext実装後に着手**
   - Context化完了後でないとメリットが薄い
   - Props削減の恩恵を最大化するため

2. **既存フィルター機能との互換性**
   - 現在のフィルターロジックを壊さない
   - 同じデータ構造を使用

3. **UI/UXの改善**
   - モーダル内で完結するUI
   - タブ切り替えで迷わない設計
   - 選択件数をバッジで視覚化

4. **パフォーマンス**
   - タグ・ボード一覧の取得は既存hookを利用
   - 不要な再レンダリングを避ける

---

## 📝 実装順序（全体像）

1. ✅ showEditDate削除（完了）
2. ✅ ViewSettingsContext計画書修正（完了）
3. → **ViewSettingsContext実装**
4. → 全画面をContext移行
5. → **この計画を実装**（フィルター統合モーダル）

---

## 🎯 期待される効果

- **Props削減**: 8個のProps削除
- **コード統一**: フィルターUIが1箇所に集約
- **UX向上**: タブ切り替えで直感的な操作
- **保守性向上**: フィルター関連の修正が容易に

---

**作成日**: 2025-01-08
**最終更新**: 2025-01-08
**前提条件**: ViewSettingsContext実装完了後
