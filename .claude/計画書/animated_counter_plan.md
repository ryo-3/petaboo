# アニメーション付きカウンター実装計画書

## 概要
削除・復元処理中にバッジカウントをリアルタイムに見せかけるアニメーション機能の実装

## 目標
- 軽量でパフォーマンスの良いカウンターアニメーション
- memo・task両方で使える共通フック
- 実際の削除完了タイミングに合わせた自然なアニメーション

## 前提条件（2025年7月時点）
### 削除アニメーション最適化の完成状況
- ✅ **CSS変数同期システム**: globals.css ⇔ deleteAnimation.ts 自動連携
- ✅ **エディター削除**: `animateEditorContentToTrashCSS` 完全CSS化
- ✅ **一括削除・復元**: `animateBulkFadeOutCSS` パフォーマンス最適化済み
  - 30件以下: 全アニメーション（120ms間隔）
  - 30件以上: 混合モード（30件アニメーション + 残り瞬時処理）
  - 100件制限: カスタムメッセージ対応
- ✅ **メモ・タスク共通化**: 両方で同一ロジック適用済み
- ✅ **DOM順序対応**: タスク並び替えに対応した全選択・アニメーション

### 実測可能なアニメーション時間
- **CSS変数**: `--editor-animation-duration: 1000ms`
- **CSS変数**: `--bulk-animation-duration: 300ms`
- **JavaScript同期**: `getAnimationDuration()` 関数で自動取得

## 技術仕様

### 1. 共通フック設計

#### `useAnimatedCounter`
```typescript
interface UseAnimatedCounterOptions {
  totalItems: number;           // 全体の削除アイテム数
  remainingItems: number;       // 100削除後の残りアイテム数
  animationDuration: number;    // DOM削除完了までの実測秒数
  updateInterval?: number;      // 更新間隔（デフォルト: 300ms）
  easing?: (t: number) => number; // イージング関数
}

interface UseAnimatedCounterReturn {
  currentCount: number;         // 現在の表示カウント
  startAnimation: () => void;   // アニメーション開始
  stopAnimation: () => void;    // アニメーション停止
  isAnimating: boolean;         // アニメーション中フラグ
}
```

### 2. 削除処理時間の把握（既存システム活用）

#### 既知のアニメーション時間
1. **CSS変数から自動取得可能**
   ```typescript
   import { getAnimationDuration } from '@/src/utils/deleteAnimation';
   const editorDuration = getAnimationDuration('editor');  // 1000ms
   const bulkDuration = getAnimationDuration('bulk');      // 300ms
   ```

2. **混合削除モード（30件以上）**
   - 最初30件: `bulkDuration * 30 + (30 * 120ms)` = 約3900ms
   - 一括削除: バックグラウンド処理（UI影響なし）
   - 全体完了: 約4-5秒

3. **100件制限削除**
   - 実行時間: 約4-5秒（混合モードと同等）
   - 完了確認: React Queryキャッシュ更新タイミング

#### 時間計算ロジック
```typescript
// 削除時間の計算関数
const calculateDeleteDuration = (itemCount: number): number => {
  const bulkDuration = getAnimationDuration('bulk');
  
  if (itemCount <= 30) {
    return bulkDuration + (itemCount * 120); // 300ms + 個別遅延
  } else {
    return bulkDuration + (30 * 120) + 1000; // 混合モード + バックグラウンド処理
  }
};
```

### 3. アニメーション戦略

#### パターン別実装（実測値ベース）
1. **30件以下**
   - 期間: `calculateDeleteDuration(count)` を使用
   - 更新間隔: 200ms（なめらかさ重視）
   - カウント減少: 実際の削除タイミングに同期

2. **混合削除モード（30件以上）**
   - 期間: 約4-5秒（実測）
   - 更新間隔: 250ms
   - カウント減少パターン:
     - 最初30個: アニメーション同期（120ms間隔）
     - 残り: バックグラウンド処理を模倣

3. **100件制限**
   - 期間: 混合モードと同等
   - 最終値: `総数 - 削除数` で正確に計算
   - 完了時にReact Queryの実際値で同期

#### イージング関数
```typescript
const deleteEasing = {
  // 最初ゆっくり、徐々に加速
  easeIn: (t: number) => Math.pow(t, 1.8),
  
  // 最初速く、後半ゆっくり
  easeOut: (t: number) => 1 - Math.pow(1 - t, 1.8),
  
  // 自然な削除感
  natural: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};
```

## 実装手順（簡略化版）

### Phase 1: 共通フック実装
1. [ ] `useAnimatedCounter`フック作成
   - 既存の`getAnimationDuration()`と`calculateDeleteDuration()`活用
   - CSS変数連携で時間同期を自動化
2. [ ] パフォーマンステスト実施
3. [ ] イージング関数の調整
4. [ ] エラーハンドリング追加

### Phase 2: memo側統合
1. [ ] `use-memo-bulk-delete.tsx`にフック統合
2. [ ] 既存の`animateBulkFadeOutCSS`との連携
3. [ ] 削除パターン別の設定適用
4. [ ] 実際の削除完了時の値修正ロジック

### Phase 3: task側統合
1. [ ] `use-task-bulk-delete.tsx`にフック統合
2. [ ] memo側との動作同期確認
3. [ ] DOM順序対応の確認

### Phase 4: 復元機能拡張
1. [ ] 復元用のアニメーション追加
2. [ ] 増加パターンのイージング調整
3. [ ] 全機能統合テスト

## 実測値ベース設計値

| 削除パターン | 実測時間 | 更新間隔 | 減少パターン |
|-------------|----------|----------|----------|
| 30件以下     | `calculateDeleteDuration(count)` | 200ms | 実際削除と同期 |
| 30-100件    | 4-5秒（実測） | 250ms | 30個アニメーション + 残りバッチ |
| 100件制限   | 4-5秒 | 250ms | 正確な残数計算 |

### CSS変数連携による自動同期
- **基準時間**: `getAnimationDuration('bulk')` = 300ms
- **個別遅延**: 120ms（実装済み）
- **計算式**: 上記`calculateDeleteDuration()`を使用

## 成功指標
- [ ] カウント変化が自然に見える
- [ ] 実際の削除完了と同期している
- [ ] パフォーマンスに影響がない
- [ ] memo・task両方で動作する
- [ ] 100件制限時の値が正確

## 注意事項
- アニメーション中の実際のState更新は最小限に
- ブラウザ間での動作差異に注意
- メモリリークの防止（タイマーのクリーンアップ）
- 削除キャンセル時の処理考慮

## ファイル構成
```
src/
├── hooks/
│   └── useAnimatedCounter.ts      # 共通フック
├── utils/
│   ├── performanceLogger.ts      # 時間測定ユーティリティ
│   └── easingFunctions.ts        # イージング関数集
└── components/features/
    ├── memo/
    │   └── use-memo-bulk-delete.tsx  # memo側統合
    └── task/
        └── use-task-bulk-delete.tsx  # task側統合
```

## 開発スケジュール（簡略化）
- Phase 1: 1-2日（共通フック実装）
- Phase 2: 1日（memo統合）
- Phase 3: 1日（task統合）
- Phase 4: 1日（復元拡張）

**合計: 4-5日**

## 前提システムの活用
- ✅ **アニメーション時間**: CSS変数で一元管理済み
- ✅ **削除処理**: パフォーマンス最適化完了
- ✅ **時間取得**: `getAnimationDuration()` 関数実装済み
- ✅ **混合モード**: 30件境界の実装完了