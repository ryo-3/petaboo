# Plan: チームボードカテゴリーAPI実装

> ⚠️ Codexに実装依頼する際は、以下を厳守すること：
>
> - **既存ファイルを丸ごと再生成させないこと** → Codexへの依頼は必ず **差分（patch形式）** で行う
> - **日本語コメント・文字列を扱う場合はUTF-8前提で依頼すること** → 文字化け防止のため明記する
> - **Codexに git add / git commit を実行させないこと**
> - **完了した場合ファイルを `.claude/fixed-plans` に移動する**

## 🎯 目的

チームのタスクエディターでボードカテゴリーを追加できるようにする。

## 📋 現状の問題

- チームのタスクエディターでボードカテゴリー追加時にエラー発生
- エラー内容: `Error: [object Object]` (use-board-categories.ts:7906)
- 原因: チーム用のboard-categoriesAPIエンドポイントが存在しない
- 既存のAPIは個人用のみ（`boardCategories`テーブル）
- チーム用テーブル（`teamBoardCategories`）は存在するが、APIエンドポイントがない

## 🔧 実装内容

### 1. API側: チームボードカテゴリーエンドポイント追加

**ファイル**: `apps/api/src/routes/teams/board-categories.ts`（新規作成）

#### 実装するエンドポイント

1. `GET /teams/:teamId/board-categories` - 一覧取得
2. `POST /teams/:teamId/board-categories` - 作成
3. `PUT /teams/:teamId/board-categories/:id` - 更新
4. `DELETE /teams/:teamId/board-categories/:id` - 削除
5. `PUT /teams/:teamId/board-categories/reorder` - 並び替え

#### 主要な違い（個人版との比較）

| 項目     | 個人版              | チーム版                          |
| -------- | ------------------- | --------------------------------- |
| テーブル | `boardCategories`   | `teamBoardCategories`             |
| 認証     | `userId` で確認     | `teamId` + メンバー確認           |
| パス     | `/board-categories` | `/teams/:teamId/board-categories` |

#### スキーマ定義

```typescript
const TeamBoardCategorySchema = z.object({
  id: z.number(),
  teamId: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CreateTeamBoardCategorySchema = z.object({
  name: z.string().min(1).max(50),
  boardId: z.number(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().optional(),
});
```

#### メンバー確認ヘルパー

```typescript
async function checkTeamMember(teamId: number, userId: string, db: any) {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return member.length > 0 ? member[0] : null;
}
```

### 2. API側: ルート登録

**ファイル**: `apps/api/src/routes/teams/api.ts`

```typescript
import { createTeamBoardCategoriesAPI } from "./board-categories";

// 既存のルート登録の後に追加
createTeamBoardCategoriesAPI(app);
```

### 3. フロント側: チーム用フック作成

**ファイル**: `apps/web/src/hooks/use-team-board-categories.ts`（新規作成）

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type {
  BoardCategory,
  NewBoardCategory,
  UpdateBoardCategory,
} from "@/src/types/board-categories";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

export function useTeamBoardCategories(teamId: number, boardId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // 一覧取得
  const {
    data: categories,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["teamBoardCategories", teamId, boardId],
    queryFn: async (): Promise<BoardCategory[]> => {
      const token = await getToken();
      const url = boardId
        ? `${API_BASE_URL}/teams/${teamId}/board-categories?boardId=${boardId}`
        : `${API_BASE_URL}/teams/${teamId}/board-categories`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("チームボードカテゴリーの取得に失敗しました");
      }

      const data = await response.json();
      return data.map(
        (
          category: BoardCategory & { createdAt: number; updatedAt?: number },
        ) => ({
          ...category,
          createdAt: new Date(category.createdAt * 1000),
          updatedAt: category.updatedAt
            ? new Date(category.updatedAt * 1000)
            : undefined,
        }),
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  // 作成
  const createCategory = useMutation({
    mutationFn: async (
      newCategory: NewBoardCategory,
    ): Promise<BoardCategory> => {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/board-categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(newCategory),
        },
      );

      if (!response.ok) {
        let errorMessage = "チームボードカテゴリーの作成に失敗しました";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        ...data,
        createdAt: new Date(data.createdAt * 1000),
        updatedAt: data.updatedAt ? new Date(data.updatedAt * 1000) : undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teamBoardCategories", teamId],
      });
    },
  });

  // 更新・削除・並び替えも同様に実装...

  return {
    categories: categories || [],
    isLoading,
    error,
    createCategory: createCategory.mutateAsync,
    isCreating: createCategory.isPending,
  };
}
```

### 4. フロント側: BoardCategorySelectorの修正

**ファイル**: `apps/web/components/ui/selectors/board-category-selector.tsx`

チームモード時に `useTeamBoardCategories` を使用するように分岐を追加。

```typescript
// 修正前
const { categories, createCategory } = useBoardCategories(boardId);

// 修正後
const { categories, createCategory } = teamMode
  ? useTeamBoardCategories(teamId!, boardId)
  : useBoardCategories(boardId);
```

## 📝 実装手順

1. **API側: チームボードカテゴリーエンドポイント作成**
   - `apps/api/src/routes/teams/board-categories.ts` 新規作成
   - 個人版の `apps/api/src/routes/board-categories/api.ts` を参考に実装
   - `teamBoardCategories` テーブルを使用
   - チームメンバー確認を追加

2. **API側: ルート登録**
   - `apps/api/src/routes/teams/api.ts` に追加

3. **フロント側: チーム用フック作成**
   - `apps/web/src/hooks/use-team-board-categories.ts` 新規作成
   - 個人版の `use-board-categories.ts` をベースに実装

4. **フロント側: BoardCategorySelectorの修正**
   - チームモード判定を追加
   - 適切なフックを使い分け

5. **動作確認**
   - チームのタスクエディターでボードカテゴリー追加
   - 個人モードでも動作確認（既存機能が壊れていないか）

## ✅ 完了条件

- [ ] チームのタスクエディターでボードカテゴリーを追加できる
- [ ] 個人モードでも従来通り動作する
- [ ] エラーが発生しない
- [ ] 型エラー・Lintエラーがない

## 🔍 影響範囲

### API

- `apps/api/src/routes/teams/board-categories.ts`（新規）
- `apps/api/src/routes/teams/api.ts`（ルート登録）

### フロント

- `apps/web/src/hooks/use-team-board-categories.ts`（新規）
- `apps/web/components/ui/selectors/board-category-selector.tsx`（修正）

## 💡 懸念点

- BoardCategorySelectorに `teamMode` と `teamId` のPropsが渡されているか確認が必要
- 既存の個人版機能が壊れないようにテストが必要
- チームメンバーの権限（誰でもカテゴリー作成できるか、オーナーのみか）

## 📚 参考ファイル

- 個人版API: `apps/api/src/routes/board-categories/api.ts`
- 個人版フック: `apps/web/src/hooks/use-board-categories.ts`
- チームテーブル定義: `apps/api/src/db/schema/team/board-categories.ts`
- チームメンバー確認: 他のチームAPIエンドポイント（tags, tasksなど）

---

**作成日**: 2025-11-09
**ステータス**: 承認待ち
