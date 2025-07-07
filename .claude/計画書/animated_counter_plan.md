# アニメーション付きカウンター実装計画書

## 概要
削除・復元処理中にバッジカウントをリアルタイムに見せかけるアニメーション機能の実装

## 目標
- 軽量でパフォーマンスの良いカウンターアニメーション
- memo・task両方で使える共通フック
- 実際の削除完了タイミングに合わせた自然なアニメーション

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

### 2. 削除処理時間の実測

#### 測定対象
1. **30件以下のアニメーション削除**
   - 個別アニメーション完了時間
   - DOM削除完了時間
   
2. **混合削除モード（30件以上）**
   - 最初30件のアニメーション時間
   - 一括削除処理時間
   - 全体完了時間

3. **100件制限削除**
   - 100件削除完了時間
   - 残りアイテム数の確定時間

#### 測定方法
```typescript
// 時間測定用ユーティリティ
const performanceLogger = {
  start: (label: string) => performance.mark(`${label}-start`),
  end: (label: string) => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
  },
  getTime: (label: string) => performance.getEntriesByName(label)[0]?.duration
};
```

### 3. アニメーション戦略

#### パターン別実装
1. **30件以下**
   - 期間: 3-4秒
   - 更新間隔: 300ms
   - カウント減少: 2-3個ずつ

2. **混合削除モード**
   - 期間: 5-6秒
   - 更新間隔: 400ms
   - カウント減少: 3-5個ずつ

3. **100件制限**
   - 期間: 実測値+0.5秒
   - 最終値: 残りアイテム数
   - 完了時に正確な値に修正

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

## 実装手順

### Phase 1: 時間測定システム構築
1. [ ] 削除処理時間測定ユーティリティ作成
2. [ ] memo側削除処理に測定コード埋め込み
3. [ ] 各パターンの実測値取得
4. [ ] 測定結果の分析・最適値決定

### Phase 2: 共通フック実装
1. [ ] `useAnimatedCounter`フック作成
2. [ ] パフォーマンステスト実施
3. [ ] イージング関数の調整
4. [ ] エラーハンドリング追加

### Phase 3: memo側統合
1. [ ] `use-memo-bulk-delete.tsx`にフック統合
2. [ ] 削除パターン別の設定適用
3. [ ] 実際の削除完了時の値修正ロジック
4. [ ] テスト・調整

### Phase 4: task側統合
1. [ ] `use-task-bulk-delete.tsx`にフック統合
2. [ ] memo側との動作同期確認
3. [ ] パフォーマンス最終調整

### Phase 5: 復元機能拡張
1. [ ] 復元用のアニメーション追加
2. [ ] 増加パターンのイージング調整
3. [ ] 全機能統合テスト

## 測定予定値（仮）

| 削除パターン | 予想時間 | 更新間隔 | 減少単位 |
|-------------|----------|----------|----------|
| 30件以下     | 3.5秒    | 300ms    | 2-3個    |
| 30-100件    | 5.0秒    | 400ms    | 3-5個    |
| 100件制限   | 実測+0.5秒| 500ms    | 5-8個    |

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

## 開発スケジュール
- Phase 1: 1-2日（測定システム）
- Phase 2: 2-3日（共通フック）
- Phase 3: 1-2日（memo統合）
- Phase 4: 1日（task統合）
- Phase 5: 1-2日（復元拡張）

**合計: 6-10日**