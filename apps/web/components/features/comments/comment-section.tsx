import { useRef, useEffect, useState } from "react";
import {
  useTeamComments,
  useCreateTeamComment,
} from "@/src/hooks/use-team-comments";
import { useAuth } from "@clerk/nextjs";
import type { TeamMember } from "@/src/hooks/use-team-detail";

// メンションをハイライト表示するヘルパー関数
function renderCommentWithMentions(
  content: string,
  currentUserId?: string,
): JSX.Element[] {
  const mentionPattern = /(@[\p{L}\p{N}_]+)/gu;
  const parts = content.split(mentionPattern);

  return parts.map((part, index) => {
    if (part.match(mentionPattern)) {
      // メンション部分
      const isSelfMention = false; // TODO: 自分へのメンションかチェック
      return (
        <span
          key={index}
          className={`font-medium ${isSelfMention ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-800"} px-1 rounded`}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

interface CommentSectionProps {
  title: string;
  placeholder: string;
  teamId?: number;
  targetType?: "memo" | "task" | "board";
  targetOriginalId?: string;
  targetTitle?: string;
  teamMembers?: TeamMember[];
}

export default function CommentSection({
  title,
  placeholder,
  teamId,
  targetType = "memo",
  targetOriginalId,
  targetTitle,
  teamMembers = [],
}: CommentSectionProps) {
  const commentListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [newComment, setNewComment] = useState("");
  const { userId: currentUserId } = useAuth();

  // オートコンプリート用のstate
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const { data: comments = [], isLoading } = useTeamComments(
    teamId,
    targetType,
    targetOriginalId,
  );
  const createComment = useCreateTeamComment(teamId);

  // メンションサジェストのフィルタリング
  const filteredSuggestions = teamMembers.filter((member) => {
    const name = member.displayName || `ユーザー${member.userId.slice(-4)}`;
    return name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  // コメントリスト初回表示時に最下部へスクロール
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  // テキスト変更時の処理
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);
    setCursorPosition(cursorPos);

    // カーソル位置の前の文字列を取得
    const textBeforeCursor = value.slice(0, cursorPos);
    // 最後の@を探す
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // @の後の文字列を取得
      const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // スペースや改行が含まれていない場合のみサジェスト表示
      if (!/\s/.test(afterAt)) {
        setMentionQuery(afterAt);
        setShowMentionSuggestions(true);
        setSelectedSuggestionIndex(0);
        return;
      }
    }

    // @がない、またはスペース・改行が含まれる場合はサジェストを閉じる
    setShowMentionSuggestions(false);
  };

  // メンション選択時の処理
  const selectMention = (member: TeamMember) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition);
    const textAfterCursor = newComment.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const displayName =
        member.displayName || `ユーザー${member.userId.slice(-4)}`;
      const before = textBeforeCursor.slice(0, lastAtIndex);
      const newText = `${before}@${displayName} ${textAfterCursor}`;
      setNewComment(newText);
      setShowMentionSuggestions(false);

      // フォーカスを戻す
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = before.length + displayName.length + 2; // +2 for @ and space
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !targetOriginalId) return;

    try {
      await createComment.mutateAsync({
        targetType,
        targetOriginalId,
        content: newComment.trim(),
      });
      setNewComment("");
      setShowMentionSuggestions(false);
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
                        {renderCommentWithMentions(
                          comment.content,
                          currentUserId || undefined,
                        )}
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
          <div className="flex flex-col gap-2 relative">
            <textarea
              ref={textareaRef}
              placeholder={placeholder}
              className="w-full p-2.5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 border border-gray-200"
              rows={2}
              value={newComment}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (showMentionSuggestions) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSuggestionIndex((prev) =>
                      prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedSuggestionIndex((prev) =>
                      prev > 0 ? prev - 1 : prev,
                    );
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (filteredSuggestions[selectedSuggestionIndex]) {
                      selectMention(
                        filteredSuggestions[selectedSuggestionIndex],
                      );
                    }
                  } else if (e.key === "Escape") {
                    setShowMentionSuggestions(false);
                  }
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            {/* メンションサジェスト */}
            {showMentionSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                {filteredSuggestions.map((member, index) => {
                  const displayName =
                    member.displayName || `ユーザー${member.userId.slice(-4)}`;
                  const avatarColor = member.avatarColor || "bg-blue-500";
                  const avatarInitial = member.displayName
                    ? member.displayName.charAt(0).toUpperCase()
                    : member.userId.charAt(10).toUpperCase();

                  return (
                    <button
                      key={member.userId}
                      type="button"
                      onClick={() => selectMention(member)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        index === selectedSuggestionIndex ? "bg-gray-100" : ""
                      }`}
                    >
                      <div
                        className={`size-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${avatarColor}`}
                      >
                        {avatarInitial}
                      </div>
                      <span className="font-medium text-gray-800">
                        {displayName}
                      </span>
                      {member.role === "admin" && (
                        <span className="text-xs text-gray-500 ml-auto">
                          管理者
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  // @を挿入してサジェストを表示
                  const textarea = textareaRef.current;
                  if (!textarea) return;

                  const cursorPos = textarea.selectionStart;
                  const textBefore = newComment.slice(0, cursorPos);
                  const textAfter = newComment.slice(cursorPos);
                  const newText = `${textBefore}@${textAfter}`;

                  setNewComment(newText);
                  setCursorPosition(cursorPos + 1);

                  // フォーカスを戻す
                  setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                  }, 0);

                  // サジェストを表示
                  setMentionQuery("");
                  setShowMentionSuggestions(true);
                  setSelectedSuggestionIndex(0);
                }}
                className="flex items-center justify-center size-7 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded text-base font-medium transition-colors"
              >
                @
              </button>
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
