# チームアクティビティフィード改善 仕様書

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと**
>   → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
>   → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイル名の冒頭に `fixed-` をつける**
>   → 例: `activity-feed-improvement.md` → `fixed-activity-feed-improvement.md`

---

## 📋 目的

チームアクティビティフィードを改善し、**通知と重複しない有意義な情報**を表示する。

### 現状の問題

- コメント通知とアクティビティが重複している
- 通知セクションがコメントを担当しているのに、アクティビティにもコメントが表示される
- 本当に重要なアクション（作成・削除・ステータス変更など）が埋もれる

### 期待成果

- 通知とアクティビティの役割分担を明確化
- チームの重要な動きが一目で分かる
- より意味のあるアクティビティフィード

---

## 🎯 アクティビティ表示対象の整理

### ✅ 表示すべきアクティビティ（提案）

#### **作成系**

- `memo_created`: メモ作成
- `task_created`: タスク作成
- `board_created`: ボード作成 ※現在未実装の可能性

#### **削除系**

- `memo_deleted`: メモ削除
- `task_deleted`: タスク削除
- `board_deleted`: ボード削除 ※現在未実装の可能性

#### **更新系（重要な変更のみ）**

- `task_status_changed`: タスクステータス変更
  - 例: 「未着手 → 進行中」「進行中 → 完了」など
  - ステータス変更は重要なマイルストーンなので表示

#### **ボード操作**

- `board_item_added`: ボードにアイテムを追加
- `board_item_removed`: ボードからアイテムを削除

#### **メンバー関連**

- `member_joined`: メンバー参加
- `member_left`: メンバー退出

### ❌ 表示しないアクティビティ

#### **コメント関連（通知が担当）**

- `comment_created`: コメント作成 → 通知で表示
- `comment_deleted`: コメント削除 → 通知で表示（不要かも）

#### **軽微な更新**

- `memo_updated`: メモ更新 → 頻度が高すぎて埋もれる
- `task_updated`: タスク更新 → 頻度が高すぎて埋もれる
  - ※ただし `task_status_changed` は別で表示

---

## 🤔 実装の複雑度分析

### **パターンA: フィルタリングのみ（簡単）**

**難易度**: ⭐️ 低い

**変更箇所**:

- `apps/api/src/routes/team-activities/api.ts`
  - WHERE句に条件追加してフィルタリング

**実装例**:

```typescript
// 除外するアクションタイプ
const excludedActions = [
  "comment_created",
  "comment_deleted",
  "memo_updated",
  "task_updated",
];

const activities = await db
  .select()
  .from(teamActivityLogs)
  .where(
    and(
      eq(teamActivityLogs.teamId, teamId),
      not(inArray(teamActivityLogs.actionType, excludedActions)), // フィルタ追加
    ),
  )
  .orderBy(desc(teamActivityLogs.createdAt))
  .limit(parseInt(limit) || 20);
```

**メリット**:

- すぐ実装できる（5分程度）
- 既存のログ構造をそのまま使える
- リスクが低い

**デメリット**:

- 既存のログに依存（ログが正しく記録されている前提）

---

### **パターンB: 新しいアクティビティタイプを追加（中程度）**

**難易度**: ⭐️⭐️ 中程度

**追加が必要なもの**:

1. **`board_created`**: ボード作成時のログ記録
2. **`board_deleted`**: ボード削除時のログ記録

**変更箇所**:

- ボード作成API: `apps/api/src/routes/boards/api.ts`
- ボード削除API: 同上
- アクティビティロガー: `apps/api/src/utils/activity-logger.ts`

**実装工数**: 1-2時間程度

---

### **パターンC: アクティビティの表示を大幅改善（大規模）**

**難易度**: ⭐️⭐️⭐️⭐️ 高い

**追加機能**:

- ステータス変更の詳細表示（「未着手 → 進行中」など）
- 変更前後の値を保存（metadata活用）
- アクティビティをクリックして該当画面に遷移
- ユーザー名の表示（現在はuserIdのみ）
- アイコン・カラーの改善

**実装工数**: 4-8時間程度

---

## 💡 推奨アプローチ

### **フェーズ1: すぐできる改善（推奨）**

**実装**: パターンA（フィルタリングのみ）

**手順**:

1. APIでコメント関連とupdated系を除外
2. フロントは変更なし（そのまま表示）
3. 動作確認

**工数**: 10-15分

---

### **フェーズ2: 中期的改善（オプション）**

**実装**: パターンB（ボード系アクティビティ追加）

**手順**:

1. ボード作成・削除時にログを記録
2. APIは既存のまま（自動で取得される）
3. フロントは変更なし

**工数**: 1-2時間

---

### **フェーズ3: 長期的改善（将来の課題）**

**実装**: パターンC（UX大幅改善）

**内容**:

- クリック遷移機能
- ステータス変更の詳細表示
- ユーザー名の表示
- アイコン・デザイン改善

**工数**: 4-8時間

---

## 📝 現在のアクティビティログ記録状況（確認必要）

### ✅ 確実に記録されているもの

- `memo_created`, `memo_updated`, `memo_deleted`
- `task_created`, `task_updated`, `task_status_changed`, `task_deleted`
- `comment_created`, `comment_deleted`
- `board_item_added`, `board_item_removed`

### ❓ 未確認・未実装の可能性

- `board_created` ← 要確認
- `board_deleted` ← 要確認
- `member_joined` ← 要確認
- `member_left` ← 要確認

---

## 🎯 提案：まずはフェーズ1から

**理由**:

1. **即効性**: 10分で効果が出る
2. **リスク低**: 既存機能を壊さない
3. **検証可能**: すぐに動作確認できる
4. **段階的改善**: 必要に応じてフェーズ2、3に進める

**実装内容**:

```typescript
// 除外リスト
const excludedActions = [
  "comment_created",
  "comment_deleted",
  "memo_updated",
  "task_updated",
];
```

これにより表示されるアクティビティ:

- ✅ メモ作成・削除
- ✅ タスク作成・削除・ステータス変更
- ✅ ボードアイテム追加・削除
- ✅ メンバー参加・退出（記録されていれば）

---

## 📅 作成日時

2025-01-07

## 📝 ステータス

- [x] 仕様書作成完了
- [ ] ユーザー承認待ち
- [ ] フェーズ1実装
- [ ] 動作確認完了

---

## 💬 ディスカッションポイント

1. **フェーズ1の実装で良いか？**
   - すぐにフィルタリングだけ実装する

2. **除外リストは妥当か？**
   - `comment_created`, `comment_deleted`, `memo_updated`, `task_updated`

3. **将来的にフェーズ2、3も進めるか？**
   - ボード作成・削除のログ記録
   - クリック遷移機能
   - ユーザー名表示

4. **現在のログ記録状況の確認が必要か？**
   - `board_created`などが記録されているか確認
