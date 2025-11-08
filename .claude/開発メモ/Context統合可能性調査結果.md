# Context統合可能性調査結果

**調査日**: 2025-11-08

## 📊 現在のContext一覧（8個）

| #   | Context名              | 配置場所                    | 管理内容                   | 使用箇所   |
| --- | ---------------------- | --------------------------- | -------------------------- | ---------- |
| 1   | PageVisibilityContext  | app/layout.tsx              | ページ可視性・マウス活動   | -          |
| 2   | UserPreferencesContext | app/layout.tsx              | ユーザー設定（API/DB連携） | 8ファイル  |
| 3   | ViewSettingsContext    | app/layout.tsx              | 表示設定（LocalStorage）   | 9ファイル  |
| 4   | ToastContext           | app/layout.tsx              | トースト通知               | -          |
| 5   | SelectorContext        | app/layout.tsx              | セレクター開閉排他制御     | 1ファイル  |
| 6   | TeamContext            | team/[customUrl]/layout.tsx | チーム情報（URL/API）      | 18ファイル |
| 7   | TeamDetailContext      | team/[customUrl]/layout.tsx | チーム詳細タブ状態         | 13ファイル |
| 8   | NavigationContext      | team/[customUrl]/layout.tsx | 画面遷移・モード・UI状態   | 14ファイル |

## ✅ 統合推奨

### 1. SelectorContext → NavigationContext

**統合理由**:

- ✅ SelectorContextは単一状態（`activeSelector`）のみ
- ✅ 両方とも「UI状態管理」という同一ドメイン
- ✅ 使用箇所が1ファイルのみで影響範囲が小さい
- ✅ Provider階層が1つ減る

**統合後の構成**:

```tsx
NavigationContext {
  // 既存のプロパティ...
  activeSelector: string | null;
  setActiveSelector: (id: string | null) => void;
}
```

**影響範囲**:

- custom-selector.tsx（1ファイル）のみ修正

**リスク**: 低

**Plan作成済み**: `.claude/plans/selector-context-integration.md`

---

## ⚠️ 統合検討が必要（慎重判断）

### 2. TeamContext + TeamDetailContext

**類似点**:

- 両方ともチーム関連の状態管理
- 同じ配置場所（team/[customUrl]/layout.tsx）

**相違点**:

| 項目             | TeamContext                         | TeamDetailContext      |
| ---------------- | ----------------------------------- | ---------------------- |
| **責務**         | チーム基本情報（ID, Slug, API取得） | チーム詳細画面のUI状態 |
| **データソース** | API（useTeamDetail）                | ローカルstate          |
| **スコープ**     | チーム全体                          | チーム詳細画面のみ     |
| **状態数**       | 4個                                 | 14個                   |
| **使用箇所**     | 18ファイル                          | 13ファイル             |

**TeamDetailContext が管理している内容**:

```typescript
-selectedMemoId / selectedTaskId -
  isCreatingMemo / isCreatingTask -
  memoEditorHasUnsavedChangesRef / taskEditorHasUnsavedChangesRef -
  imageCount / commentCount / taskImageCount / taskCommentCount -
  activeTab / setActiveTab;
```

**統合した場合のメリット**:

- ✅ Provider階層が1つ減る
- ✅ チーム関連の状態が1箇所に集約

**統合した場合のデメリット**:

- ❌ TeamContextが肥大化（4個 → 18個の状態）
- ❌ 「チーム情報」と「UI状態」という異なる責務が混在
- ❌ TeamContextSafeの判定が複雑になる

**結論**: ❌ **統合しない方が良い**

- 責務が明確に異なる（チーム情報 vs UI状態）
- 単一責任の原則に反する
- 現状の分離が適切

---

## ❌ 統合不可

### 3. ViewSettingsContext + UserPreferencesContext

**類似点**:

- 両方とも設定系
- 同じ配置場所（app/layout.tsx）
- 管理項目が一部重複（memoColumnCount, taskColumnCount など）

**相違点**:

| 項目             | ViewSettingsContext       | UserPreferencesContext |
| ---------------- | ------------------------- | ---------------------- |
| **データソース** | LocalStorage              | API（SQLite DB）       |
| **スコープ**     | 画面単位（個人/チーム別） | ユーザー全体           |
| **永続化**       | ブラウザローカル          | サーバーDB             |
| **更新頻度**     | 高頻度（即座反映）        | 低頻度（API経由）      |
| **状態管理**     | localStorage直接          | API + キャッシュ       |

**ViewSettingsContext が管理している内容**:

```typescript
// 永続化設定（localStorage）
settings: ViewSettings {
  memoColumnCount, taskColumnCount, boardColumnCount,
  memoHideControls, taskHideControls, hideHeader,
  showTagDisplay
}

// セッション状態（メモリのみ）
sessionState: SessionState {
  selectedTagIds, tagFilterMode,
  selectedBoardIds, boardFilterMode,
  sortOptions,
  filterModalOpen, activeFilterTab
}
```

**UserPreferencesContext が管理している内容**:

```typescript
preferences: UserPreferences {
  userId,
  memoColumnCount, taskColumnCount,
  memoHideControls, taskHideControls, hideHeader,
  createdAt, updatedAt
}
loading, error
updatePreferences(), refreshPreferences()
```

**統合できない理由**:

1. ❌ **データソースが根本的に異なる**
   - ViewSettings: LocalStorage（即座反映）
   - UserPreferences: API/DB（非同期）

2. ❌ **スコープが異なる**
   - ViewSettings: 個人画面/チーム画面で独立管理
   - UserPreferences: ユーザー全体で統一

3. ❌ **セッション状態の扱いが違う**
   - ViewSettings: セッション状態も管理（フィルター、ソートなど）
   - UserPreferences: 永続化のみ

4. ❌ **チーム対応**
   - ViewSettings: チームIDごとに設定を分離
   - UserPreferences: チーム非対応

**現在の重複についての考察**:

- 重複項目（memoColumnCount など）は意図的
- ViewSettings: 即座反映用の高速キャッシュ
- UserPreferences: サーバー同期用の永続化

**結論**: ❌ **統合すべきでない**

- データソース・スコープ・用途が異なる
- 統合すると設計が複雑化し、バグの温床になる

---

## 🔒 独立維持が適切

### 4. PageVisibilityContext

**理由**:

- ✅ 単一責任（ページ可視性監視）
- ✅ 全体で最上位に配置（適切）
- ✅ 統合の必要性なし

### 5. ToastContext

**理由**:

- ✅ 単一責任（トースト表示）
- ✅ 独立したUI機能
- ✅ 統合の必要性なし

### 6. NavigationContext

**理由**:

- ✅ すでに大量の状態を管理（統合先候補）
- ✅ UI状態の中央管理所として機能
- ⚠️ これ以上の肥大化は避けるべき（SelectorContext統合後）

---

## 📋 最終推奨アクション

### 即実行推奨

1. ✅ **SelectorContext → NavigationContext に統合**
   - Plan作成済み（`.claude/plans/selector-context-integration.md`）
   - 影響範囲小、リスク低
   - Provider階層削減

### 検討不要（現状維持）

2. ❌ TeamContext + TeamDetailContext → 統合しない
3. ❌ ViewSettingsContext + UserPreferencesContext → 統合しない
4. ✅ PageVisibilityContext → 独立維持
5. ✅ ToastContext → 独立維持
6. ✅ NavigationContext → 独立維持

---

## 📈 統合後のContext構成（7個）

| #   | Context名              | 配置場所                    | 管理内容                             |
| --- | ---------------------- | --------------------------- | ------------------------------------ |
| 1   | PageVisibilityContext  | app/layout.tsx              | ページ可視性・マウス活動             |
| 2   | UserPreferencesContext | app/layout.tsx              | ユーザー設定（API/DB連携）           |
| 3   | ViewSettingsContext    | app/layout.tsx              | 表示設定（LocalStorage）             |
| 4   | ToastContext           | app/layout.tsx              | トースト通知                         |
| 5   | ~~SelectorContext~~    | ~~削除~~                    | ~~→ NavigationContextに統合~~        |
| 6   | NavigationContext      | team/[customUrl]/layout.tsx | 画面遷移・モード・UI状態・セレクター |
| 7   | TeamContext            | team/[customUrl]/layout.tsx | チーム情報（URL/API）                |
| 8   | TeamDetailContext      | team/[customUrl]/layout.tsx | チーム詳細タブ状態                   |

**削減数**: 8個 → 7個（-1）

---

## 🎯 設計思想のまとめ

### Context化が適切な場合

- ✅ 複数コンポーネント間で共有する状態
- ✅ グローバルな設定・状態
- ✅ 親子関係が深く Props Drilling が発生する

### Hook化が適切な場合

- ✅ 各画面ごとに独立した状態
- ✅ 画面間で競合・混乱する可能性がある状態
- ✅ ローカルな状態管理

### 統合が適切な場合

- ✅ 同一ドメインの状態管理
- ✅ 使用箇所が限定的
- ✅ 単一責任の範囲内

### 統合すべきでない場合

- ❌ データソースが異なる
- ❌ スコープが異なる
- ❌ 責務が明確に異なる
- ❌ 統合すると複雑化する

---

**作成者**: Claude Code
**レビュー**: 承認待ち
