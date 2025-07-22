import { notesApi } from "@/src/lib/api-client";
import type {
  CreateMemoData,
  DeletedMemo,
  Memo,
  UpdateMemoData,
} from "@/src/types/memo";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Notes取得用フック
export function useNotes() {
  const { getToken } = useAuth();

  return useQuery<Memo[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      console.log('📝 useNotes API呼び出し開始');
      const token = await getToken();
      const response = await notesApi.getNotes(token || undefined);
      if (!response.ok) {
        console.error('❌ useNotes API呼び出し失敗:', response.status, response.statusText);
      } else {
        console.log('✅ useNotes API呼び出し成功');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000,    // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,      // 10分間キャッシュを保持
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,       // マウント時の再取得を無効化
  });
}

// Note作成用フック
export function useCreateNote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Memo, Error, CreateMemoData>({
    mutationFn: async (data: CreateMemoData) => {
      const token = await getToken();
      const response = await notesApi.createNote(data, token || undefined);
      return response.json();
    },
    onSuccess: () => {
      // 作成後にnotesリストを再取得
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      // ボードキャッシュも無効化（メモが含まれる可能性）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

// Note更新用フック
export function useUpdateNote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<Memo, Error, { id: number; data: UpdateMemoData }>({
    mutationFn: async ({ id, data }: { id: number; data: UpdateMemoData }) => {
      const token = await getToken();
      const response = await notesApi.updateNote(id, data, token || undefined);
      return response.json();
    },
    onSuccess: () => {
      // 更新後にnotesリストを再取得
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      // ボードキャッシュも無効化（メモが含まれる可能性）
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

// Note削除用フック
export function useDeleteNote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      // 一時ID（13桁のタイムスタンプか負のID）の場合はローカル処理のみ
      const isTemporaryId = id < 0 || (id > 1000000000000 && id < 9999999999999);
      
      if (isTemporaryId) {
        // console.log("ローカルメモを削除:", id);

        // ハッシュIDから元のtempIdを見つけて削除
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("memo_draft_new_")) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "{}");
              const hashId = -Math.abs(
                data.id.split("").reduce((a: number, b: string) => {
                  a = (a << 5) - a + b.charCodeAt(0);
                  return a & a;
                }, 0)
              );

              if (hashId === id) {
                localStorage.removeItem(key);
                // console.log("ローカルメモ削除完了:", key);
              }
            } catch (error) {
              console.error("ローカルメモ削除エラー:", error);
            }
          }
        });

        return { success: true }; // ダミーレスポンス
      }

      // console.log('APIメモ削除実行:', id)
      const token = await getToken();
      const response = await notesApi.deleteNote(id, token || undefined);
      return response.json();
    },
    onSuccess: () => {
      // 削除後に通常メモと削除済みメモの両方を再取得
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-notes"] });
    },
  });
}

// 削除済みメモ取得用フック
export function useDeletedNotes() {
  const { getToken } = useAuth();

  return useQuery<DeletedMemo[]>({
    queryKey: ["deleted-notes"],
    queryFn: async () => {
      const token = await getToken();
      const response = await notesApi.getDeletedNotes(token || undefined);
      return response.json();
    },
    staleTime: 2 * 60 * 1000,    // 2分間は新鮮なデータとして扱う
    gcTime: 10 * 60 * 1000,      // 10分間キャッシュを保持
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    refetchOnMount: false,       // マウント時の再取得を無効化
  });
}

// 完全削除用フック
export function usePermanentDeleteNote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await notesApi.permanentDeleteNote(
        id,
        token || undefined
      );
      return response.json();
    },
    onSuccess: () => {
      // 完全削除後に削除済みメモリストを再取得
      queryClient.invalidateQueries({ queryKey: ["deleted-notes"] });
    },
  });
}

// 復元用フック
export function useRestoreNote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await notesApi.restoreNote(id, token || undefined);
      return response.json();
    },
    onSuccess: () => {
      // 復元後に通常メモと削除済みメモの両方を再取得
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-notes"] });
    },
  });
}
