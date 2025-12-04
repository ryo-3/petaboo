# PETABOO-44/45: チームタブ切り替え問題 総まとめ

## 関連チケット

- **PETABOO-44**: ボード詳細→タスク一覧に戻れない（本番のみ発生）
- **PETABOO-45**: `?board=SLUG` 形式への切り戻し
- **PETABOO-41**: タブ切り替え時の選択状態クリア
- **PETABOO-4**: タスク/メモ作成時のキャッシュ更新

---

## 根本原因

**Next.js の `URLSearchParams` が値なしパラメータを変換してしまう問題**

```
入力: ?PETABOO&task=1
↓ URLSearchParams.toString() / router.replace
出力: ?PETABOO=&task=1  ← 「=」が付いてしまう
```

この「=」が付くことで:

1. URL解析ロジックがボードslugを認識できなくなる
2. タブ状態が正しく判定されない
3. 画面遷移が壊れる

---

## 解決策

### `?SLUG` 形式を廃止 → `?board=SLUG` 形式に統一

**Before (問題あり)**

```
/team/moricrew?PETABOO&task=1
↓ Next.js内部処理
/team/moricrew?PETABOO=&task=1  ← 壊れる
```

**After (解決)**

```
/team/moricrew?board=PETABOO&task=1
↓ Next.js内部処理
/team/moricrew?board=PETABOO&task=1  ← 変わらない
```

---

## 変更ファイル

| ファイル                        | 変更内容                                 |
| ------------------------------- | ---------------------------------------- |
| `teamUrlUtils.ts`               | `getBoardSlugFromParams()` を簡素化      |
| `team-detail.tsx`               | URL生成を `?board=${slug}` に変更        |
| `team-board-detail-wrapper.tsx` | 全URL生成箇所を修正、URL競合防止追加     |
| `layout.tsx`                    | ローカル関数削除、共通ユーティリティ使用 |

---

## コード変更の詳細

### 1. URL解析の簡素化 (`teamUrlUtils.ts`)

**Before**

```typescript
// 複雑なループで予約語を除外しながら値なしキーを探す
for (const [key, value] of searchParams.entries()) {
  if (value === "" && !RESERVED_KEYS.includes(key)) {
    return key.toUpperCase();
  }
}
return searchParams.get("board") || searchParams.get("slug");
```

**After**

```typescript
// 1行で終わり
const boardParam = searchParams.get("board") || searchParams.get("slug");
return boardParam ? boardParam.toUpperCase() : null;
```

### 2. URL生成の修正 (`team-detail.tsx`)

**Before**

```typescript
newUrl = `?${options.slug.toUpperCase()}`;
window.history.replaceState(null, "", finalUrl); // 危険なハック
```

**After**

```typescript
newUrl = `?board=${options.slug.toUpperCase()}`;
router.replace(finalUrl, { scroll: false }); // 正規の方法
```

---

## 学んだこと

### 1. Next.js の URLSearchParams の挙動

- `searchParams.set('key', '')` → `?key=` になる
- `router.replace` は内部で `URLSearchParams` を使用
- 値なしパラメータ(`?key`)を維持したい場合は `window.history.replaceState` が必要だが、これは危険なハック

### 2. シンプルさの重要性

| 観点        | `?SLUG` 形式               | `?board=SLUG` 形式 |
| ----------- | -------------------------- | ------------------ |
| 見た目      | カッコいい                 | 普通               |
| 実装複雑度  | 高（予約語リスト管理など） | 低                 |
| Next.js互換 | 悪い                       | 良い               |
| デバッグ    | 難しい                     | 簡単               |
| 保守性      | 低い                       | 高い               |

**結論**: 見た目より保守性を優先すべき

### 3. 本番環境でのみ発生するバグ

- 開発環境: Fast Refresh によりコンポーネントが頻繁に再マウント
- 本番環境: 状態が蓄積されやすく、競合が発生しやすい
- **対策**: URL を Single Source of Truth として、状態の重複管理を避ける

---

## 今後の指針

1. **URL形式は標準的なものを使う**: `?key=value` 形式を基本とする
2. **フレームワークの制約を理解する**: Next.js の `router` や `searchParams` の挙動を把握
3. **ハックは避ける**: `window.history.replaceState` のような回避策は最終手段
4. **共通化**: URL解析ロジックは `teamUrlUtils.ts` に集約

---

## 関連コミット

- `f0ee0663`: PETABOO-45: ?board=SLUG 形式への切り戻し
- `ce10439b`: PETABOO-44: ボード詳細アイコンからの遷移を修正
- `a8d3c7ba`: PETABOO-41: タブ切り替え時の選択状態クリアを双方向に対応
- `14b40354`: PETABOO-4: タスク/メモ作成時のキャッシュ更新処理を改善
