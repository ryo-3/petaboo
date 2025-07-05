# deleteAnimation.ts CSS化 段階的計画

## 現状分析（553行）

### 主要機能
1. **単体アイテム削除** - `animateItemToTrash`
2. **エディター削除** - `animateEditorContentToTrash`
3. **複数アイテム削除** - `animateMultipleItemsToTrash`
4. **ゴミ箱の蓋制御** - `--lid-open`変数
5. **DOM操作** - クローン作成、位置計算

## ✅ 完了済み - Phase 1: エディター削除アニメーションのCSS化

### 実装完了
- **CSS keyframes**: `@keyframes editor-to-trash` (1秒、3段階アニメーション)
- **関数**: `animateEditorContentToTrashCSS` 
- **位置計算**: 画面右下16pxへの正確な移動距離算出
- **CSSアニメーション**: `translate`→`scale`の順序で正しい動作確認

### 現在の適用状況
✅ **メモ通常削除**: `use-right-editor-delete.ts` でCSS版使用  
✅ **タスク通常削除**: `use-right-editor-delete.ts` でCSS版使用  
❌ **メモ削除済み完全削除**: `use-deleted-memo-actions.ts` でJS版使用  
❌ **タスク削除済み完全削除**: `use-deleted-task-actions.ts` でJS版使用  

### 技術的発見
- **CSS transform順序**: `translate(...) scale(...)`でないと移動距離が正しくない
- **位置計算**: 相対移動距離 = `ゴミ箱位置 - 開始位置中心` で正確
- **固定サイズ**: 400x200pxのクローンで元JS版と同じ動作

## 🔄 次回作業予定

### 即座に実行可能
1. **削除済み完全削除のCSS化** (2ファイル)
   - `use-deleted-memo-actions.ts` 54行目
   - `use-deleted-task-actions.ts` 54行目
   - `animateEditorContentToTrash` → `animateEditorContentToTrashCSS`

### Phase 2: 複数アイテムの順次アニメーション
**対象:** `animateMultipleItemsToTrash`系関数のCSS化
- 左側一括削除で使用されている
- `animation-delay`を使った順次実行
- JavaScript側は最小限のindex設定のみ

### Phase 3: ゴミ箱の蓋開閉アニメーション
**対象:** `--lid-open`変数をCSS変数に置き換え
- 現在: `trashIcon.style.setProperty('--lid-open', '1')`
- 移行後: CSS classで制御

### Phase 4: DOM操作の削減
**対象:** クローン作成、位置計算の削減
- CSS `transform-origin`の活用
- 元素材のアニメーション（クローン不要）

## 実装順序
1. ✅ Phase 1（完了）
2. 🔄 削除済み完全削除のCSS化（次回最初）
3. Phase 2（複数アイテム順次）
4. Phase 3（蓋開閉）
5. Phase 4（DOM操作削減）

## 期待効果
- JavaScript実行量: 70%削減
- DOM操作: 50%削減
- アニメーションパフォーマンス: 大幅向上