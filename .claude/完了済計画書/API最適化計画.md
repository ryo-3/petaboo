# API最適化・パフォーマンス改善計画書

## 現在の問題点

### URL構造による非効率性
- **現在**: `/`、`/boards`、`/boards/{slug}` の3つのURL
- **問題**: URL遷移のたびにAPI再取得が発生
- **影響**: React Queryキャッシュが活用されない

### ボード一覧のAPI効率性
- **現在**: 3つのステータス別々にAPI呼び出し
  - `/boards?status=normal`
  - `/boards?status=completed` 
  - `/boards?status=deleted`
- **問題**: タブ切り替えのたびに3回のAPI呼び出し

## 解決策

### 1. URL構造の簡素化
**変更前:**
```
/          → メモ・タスクAPI取得
/boards    → ボード一覧API取得  
/boards/id → ボード詳細API取得
= 3つのURL × 各々でAPI取得
```

**変更後:**
```
/          → メモ・タスクAPI取得
/boards/id → 全データAPI取得（ボード一覧+詳細+メモ+タスク）
= 2つのURL、かつURL移動がほぼ不要
```

### 2. サイドバー統合設計
- **`/boards/{slug}` 内でボード一覧も表示**
- **サイドバーでメモ⇔タスク⇔ボード一覧切り替え**
- **全てSPA内遷移でAPI再取得不要**

### 3. API呼び出し最適化
- **ボード**: 全ステータス一括取得 → クライアント側フィルタ
- **React Query**: 適切なキャッシュ設定
  - `staleTime: 5分`
  - `cacheTime: 30分`
  - `refetchOnWindowFocus: false`

## 期待効果

### パフォーマンス向上
- **API呼び出し回数**: 3→1回に削減
- **画面遷移**: ページリロード → SPA内遷移
- **データ取得**: 毎回 → 初回のみ（以後キャッシュ）

### UX向上  
- **応答速度**: 大幅向上
- **操作性**: ワンクリックで画面切り替え
- **Clerkレート制限**: 回避

### 設計のシンプル化
- **URLパターン**: 3→2つに削減
- **画面遷移ロジック**: 簡素化
- **キャッシュ戦略**: 統一

## 実装手順

1. **`/boards` URL削除**
2. **ボードAPI統合**（全ステータス一括取得）
3. **サイドバー内ボード一覧表示**
4. **React Queryキャッシュ設定最適化**
5. **メモ・タスクにも同様の最適化適用**

## 技術的詳細

### API設計変更
```typescript
// 変更前
useBoards("normal")   // 3回の別々API呼び出し
useBoards("completed")
useBoards("deleted")

// 変更後  
useAllBoards()        // 1回のAPI呼び出しで全取得
// クライアント側でstatus別フィルタリング
```

### React Query設定
```typescript
useQuery({
  queryKey: ['boards'],
  queryFn: fetchAllBoards,
  staleTime: 5 * 60 * 1000,    // 5分
  cacheTime: 30 * 60 * 1000,   // 30分
  refetchOnWindowFocus: false,
})
```

---

**最終目標**: URL移動を最小限にしてReact Queryキャッシュを最大活用し、API呼び出しを劇的に削減する