# 設定コンテキスト化計画書

## 目的
現在の設定システムは各ページで個別に`use-user-preferences`フックを使用しているため、ページ読み込み時に設定が適用されるまでの間にUIのブレが発生している。設定をReactコンテキストとして管理することで、アプリケーション全体で一貫した設定状態を保持し、読み込み時のブレを解消する。

## 現在の問題点
1. **読み込み時のブレ**: 各ページで設定を個別取得するため、デフォルト値から実際の設定値への変化が見える
2. **重複API呼び出し**: 複数のコンポーネントで同じ設定データを取得している可能性
3. **設定の同期**: 設定変更時に他のページへの反映が遅れる可能性

## 実装計画

### Phase 1: 設定コンテキストの作成
- [ ] `UserPreferencesContext` の作成
- [ ] `UserPreferencesProvider` の実装
- [ ] 設定の初期化とグローバル状態管理
- [ ] エラーハンドリングとローディング状態の管理

### Phase 2: プロバイダーの配置
- [ ] `_app.tsx` または適切な親コンポーネントに `UserPreferencesProvider` を配置
- [ ] 認証状態との連携（Clerk userId取得）
- [ ] 初期読み込み時の設定取得

### Phase 3: 既存フックの更新
- [ ] `use-user-preferences.ts` をコンテキスト対応に更新
- [ ] 設定更新時のコンテキスト同期
- [ ] 既存のコンポーネントでの使用方法は変更なし（互換性維持）

### Phase 4: 各画面での適用
- [ ] `settings-screen.tsx` でコンテキスト使用
- [ ] `use-screen-state.ts` でコンテキスト使用
- [ ] メモ・タスク画面での設定適用確認

## 実装詳細

### 1. コンテキスト構造
```tsx
interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}
```

### 2. プロバイダー実装
```tsx
export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();

  // 初期化時の設定取得
  useEffect(() => {
    if (userId) {
      fetchPreferences();
    }
  }, [userId]);

  // 設定取得・更新メソッド
  const fetchPreferences = async () => { /* 実装 */ };
  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => { /* 実装 */ };
  const refreshPreferences = async () => { /* 実装 */ };

  return (
    <UserPreferencesContext.Provider
      value={{
        preferences,
        loading,
        error,
        updatePreferences,
        refreshPreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
};
```

### 3. カスタムフック更新
```tsx
export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
};
```

## 期待される効果

### パフォーマンス改善
- [ ] 読み込み時のUIブレ解消
- [ ] 重複API呼び出しの削減
- [ ] 設定変更時の即座な反映

### 開発体験向上
- [ ] 設定状態の一元管理
- [ ] デバッグしやすい設定管理
- [ ] 既存コードの互換性維持

### ユーザー体験向上
- [ ] 設定適用の待ち時間短縮
- [ ] 一貫した設定表示
- [ ] スムーズなページ遷移

## 実装時の注意点

### 1. 互換性維持
- 既存の`use-user-preferences`の使用方法は変更しない
- 段階的な移行を可能にする

### 2. エラーハンドリング
- API呼び出し失敗時のフォールバック処理
- デフォルト値の適用タイミング

### 3. 認証との連携
- ログイン状態変更時の設定リセット
- 未認証時の処理

### 4. パフォーマンス
- 不要な再レンダリングの防止
- メモ化の適切な使用

## 成功指標
- [ ] ページ読み込み時の設定ブレが解消されている
- [ ] 設定変更が即座に全画面に反映される
- [ ] API呼び出し回数が削減されている
- [ ] 既存機能に影響がない

## 実装優先度
**高**: 読み込み時のUIブレはユーザー体験に直接影響するため、優先的に実装する必要がある。

## 完了後の効果
設定のコンテキスト化により、アプリケーション全体で一貫した設定管理が実現され、ユーザー体験が大幅に向上する。