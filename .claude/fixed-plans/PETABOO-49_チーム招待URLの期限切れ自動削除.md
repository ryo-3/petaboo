# PETABOO-49: チーム招待URLの期限切れURLの自動削除

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：

- **既存ファイルを丸ごと再生成させないこと**
  → Codexへの依頼は必ず **差分（patch形式）** で行う
- **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること**
  → 文字化け防止のため明記する
- **Codexに git add / git commit を実行させないこと**
- **完了した場合ファイルを`.claude/fixed-plans` に移動する**

---

## 目的

チーム設定画面で期限切れの招待URLが表示され続ける問題を解決する。
有効期限が切れている招待URLは自動で削除し、ユーザーに新しいURLの生成を促す。

## 問題の原因

### 現状の動作

1. `getInviteUrl` API（`apps/api/src/routes/teams/api.ts:1261-1324`）は `status: "active"` のレコードを取得
2. **有効期限（`expiresAt`）のチェックを行っていない**
3. 期限切れでも `status` は `active` のまま残るため、期限切れURLが表示される

### 期待する動作

1. 招待URL取得時に有効期限をチェック
2. 期限切れの場合は自動削除して `null` を返す
3. フロント側では「招待URLを生成」ボタンが表示される

## 変更範囲

### 変更ファイル

- `apps/api/src/routes/teams/api.ts` - `getInviteUrl` 関数のみ

### 変更なし

- フロント側の変更は不要（既に `null` の場合は「生成」ボタンを表示する実装済み）
- データベーススキーマの変更なし

## 実装手順

### 1. `getInviteUrl` 関数の修正（`apps/api/src/routes/teams/api.ts`）

**変更箇所: 行1298-1319付近**

現在:

```typescript
// 既存のアクティブな招待URLを取得
const invitation = await db
  .select()
  .from(teamInvitations)
  .where(
    and(
      eq(teamInvitations.teamId, team.id),
      eq(teamInvitations.email, "URL_INVITE"),
      eq(teamInvitations.status, "active"),
    ),
  )
  .get();

if (!invitation) {
  return c.json(null);
}

return c.json({
  token: invitation.token,
  expiresAt: new Date(invitation.expiresAt * 1000).toISOString(),
  createdAt: new Date(invitation.createdAt * 1000).toISOString(),
});
```

修正後:

```typescript
// 既存のアクティブな招待URLを取得
const invitation = await db
  .select()
  .from(teamInvitations)
  .where(
    and(
      eq(teamInvitations.teamId, team.id),
      eq(teamInvitations.email, "URL_INVITE"),
      eq(teamInvitations.status, "active"),
    ),
  )
  .get();

if (!invitation) {
  return c.json(null);
}

// 有効期限チェック（秒単位で比較）
const currentTime = Math.floor(Date.now() / 1000);
if (invitation.expiresAt < currentTime) {
  // 期限切れの場合は削除してnullを返す
  await db.delete(teamInvitations).where(eq(teamInvitations.id, invitation.id));
  return c.json(null);
}

return c.json({
  token: invitation.token,
  expiresAt: new Date(invitation.expiresAt * 1000).toISOString(),
  createdAt: new Date(invitation.createdAt * 1000).toISOString(),
});
```

## 影響範囲・懸念点

### 影響範囲

- チーム設定画面の招待URL表示のみ
- 期限切れURLは取得時に自動削除される

### 懸念点

- なし（期限切れURLは元々使用不可なので、削除しても問題ない）

### テスト観点

1. 有効期限内のURLは正常に表示される
2. 有効期限切れのURLは表示されず、「生成」ボタンが表示される
3. 期限切れURL取得後、DBから削除されている

---

## Codex用ToDoリスト

- [ ] `apps/api/src/routes/teams/api.ts` の `getInviteUrl` 関数（行1298-1319付近）に有効期限チェックと自動削除処理を追加
- [ ] `npm run check:api` でエラーがないことを確認
