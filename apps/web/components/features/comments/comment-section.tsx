import { useRef, useEffect, useState } from "react";
import {
  useTeamComments,
  useCreateTeamComment,
} from "@/src/hooks/use-team-comments";

interface CommentSectionProps {
  title: string;
  placeholder: string;
  teamId?: number;
  targetType?: "memo" | "task" | "board";
  targetOriginalId?: string;
  targetTitle?: string;
}

export default function CommentSection({
  title,
  placeholder,
  teamId,
  targetType = "memo",
  targetOriginalId,
  targetTitle,
}: CommentSectionProps) {
  const commentListRef = useRef<HTMLDivElement>(null);
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useTeamComments(
    teamId,
    targetType,
    targetOriginalId,
  );
  const createComment = useCreateTeamComment(teamId);

  // コメントリスト初回表示時に最下部へスクロール
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !targetOriginalId) return;

    try {
      await createComment.mutateAsync({
        targetType,
        targetOriginalId,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  };

  if (!teamId || !targetOriginalId) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">コメント機能は個人ボードでは使用できません</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        {/* コメントリスト */}
        <div
          ref={commentListRef}
          className="flex-1 px-4 py-3 space-y-3 overflow-y-auto hover-scrollbar"
        >
          {isLoading ? (
            <div className="text-center text-gray-500 text-sm py-4">
              読み込み中...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              まだコメントがありません
            </div>
          ) : (
            comments.map((comment) => {
              const displayName =
                comment.displayName || `ユーザー${comment.userId.slice(-4)}`;
              const avatarColor = comment.avatarColor || "bg-blue-500";
              const avatarInitial = comment.displayName
                ? comment.displayName.charAt(0).toUpperCase()
                : comment.userId.charAt(10).toUpperCase();

              return (
                <div
                  key={comment.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${avatarColor}`}
                    >
                      {avatarInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">
                          {displayName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 新規コメント入力 */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <textarea
              placeholder={placeholder}
              className="w-full p-2.5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 border border-gray-200"
              rows={2}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || createComment.isPending}
                className="px-3 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createComment.isPending ? "送信中..." : "送信"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
