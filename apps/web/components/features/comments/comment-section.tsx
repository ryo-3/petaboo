import { useRef, useEffect, useState, useCallback } from "react";
import {
  useTeamComments,
  useAllTeamBoardComments,
  useBoardItemComments,
  useCreateTeamComment,
  useUpdateTeamComment,
  useDeleteTeamComment,
} from "@/src/hooks/use-team-comments";
import { useAttachments } from "@/src/hooks/use-attachments";
import { useAuth } from "@clerk/nextjs";
import type { TeamMember } from "@/src/hooks/use-team-detail";
import { MoreVertical, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/src/contexts/toast-context";
import CommentScopeToggle from "@/components/ui/buttons/comment-scope-toggle";
import AttachmentGallery from "@/components/features/attachments/attachment-gallery";
import { useQueryClient } from "@tanstack/react-query";
import { linkifyLine } from "@/src/utils/url-detector";
import { validateFile, MAX_ATTACHMENTS_PER_ITEM } from "@/src/utils/file-validator";
import { compressImage, formatBytes } from "@/src/utils/image-compressor";

// コメント添付ファイル表示用コンポーネント（AttachmentGalleryを使用）
function CommentAttachmentGallery({
  teamId,
  commentId,
}: {
  teamId: number | undefined;
  commentId: number;
}) {
  const { data: attachments = [] } = useAttachments(
    teamId,
    "comment",
    commentId.toString(),
  );

  if (attachments.length === 0) return null;

  return (
    <div className="mt-2">
      <AttachmentGallery attachments={attachments} />
    </div>
  );
}

// コメント本文をレンダリングするヘルパー関数（メンション・引用・コードブロック対応）
function renderCommentContent(
  content: string,
  currentUserId?: string,
  teamMembers: TeamMember[] = [],
): JSX.Element[] {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    // コードブロック判定
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++; // 開始```をスキップ

      // 終了```まで収集
      while (i < lines.length) {
        const codeLine = lines[i];
        if (!codeLine) {
          i++;
          continue;
        }
        if (codeLine.trim().startsWith("```")) break;
        codeLines.push(codeLine);
        i++;
      }
      i++; // 終了```をスキップ

      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-gray-100 border border-gray-300 rounded p-2 my-1 text-xs overflow-x-auto"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // 引用判定（連続する引用行をまとめる）
    if (line.trim().startsWith(">")) {
      const quoteLines: JSX.Element[] = [];

      // 連続する引用行を収集
      while (i < lines.length && lines[i]?.trim().startsWith(">")) {
        const currentLine = lines[i];
        if (currentLine) {
          const quotedText = currentLine.replace(/^>\s*/, "");
          quoteLines.push(
            <div key={`quote-line-${i}`}>
              {renderLineWithMentions(quotedText, currentUserId, teamMembers)}
            </div>,
          );
        }
        i++;
      }

      elements.push(
        <div
          key={`quote-${elements.length}`}
          className="border-l-4 border-gray-300 pl-3 my-1 text-gray-600 italic"
        >
          {quoteLines}
        </div>,
      );
      continue;
    }

    // 通常の行（メンション対応）
    elements.push(
      <div key={`line-${elements.length}`}>
        {renderLineWithMentions(line, currentUserId, teamMembers)}
      </div>,
    );
    i++;
  }

  return elements;
}

// 1行内のメンション・インラインコード・URLをハイライト表示
function renderLineWithMentions(
  line: string,
  currentUserId?: string,
  teamMembers: TeamMember[] = [],
): JSX.Element[] {
  // インラインコードとメンションの両方に対応
  const pattern = /(`[^`]+`)|(@[\p{L}\p{N}_]+)/gu;
  const parts = line.split(pattern);

  return parts
    .flatMap((part, index) => {
      if (!part) return [];

      // インラインコード判定
      if (part.startsWith("`") && part.endsWith("`")) {
        const codeContent = part.slice(1, -1);
        return [
          <code
            key={`code-${index}`}
            className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono"
          >
            {codeContent}
          </code>,
        ];
      }

      // メンション判定
      const mentionPattern = /^@[\p{L}\p{N}_]+$/u;
      if (part.match(mentionPattern)) {
        // メンション名から@を除いて比較
        const mentionName = part.slice(1);

        // 現在のユーザーのdisplayNameを取得
        const currentUserMember = teamMembers.find(
          (member) => member.userId === currentUserId,
        );
        const currentUserDisplayName = currentUserMember?.displayName || "";

        // 自分へのメンションかチェック
        const isSelfMention = currentUserDisplayName === mentionName;

        return [
          <span
            key={`mention-${index}`}
            className={`font-medium ${isSelfMention ? "bg-blue-200 text-blue-800" : "bg-gray-200 text-gray-800"} px-1 rounded`}
          >
            {part}
          </span>,
        ];
      }

      // 通常のテキスト: URLを検出してリンク化
      const linkedParts = linkifyLine(part);
      return linkedParts.map((linkedPart, linkedIndex) =>
        typeof linkedPart === "string" ? (
          <span key={`text-${index}-${linkedIndex}`}>{linkedPart}</span>
        ) : (
          <span key={`link-${index}-${linkedIndex}`}>{linkedPart}</span>
        ),
      );
    })
    .filter((element): element is JSX.Element => element !== null);
}

interface CommentSectionProps {
  title: string;
  placeholder: string;
  teamId?: number;
  targetType?: "memo" | "task" | "board";
  targetOriginalId?: string;
  targetTitle?: string;
  teamMembers?: TeamMember[];
  boardId?: number; // ボードIDを追加
  onItemClick?: (itemType: "memo" | "task", originalId: string) => void; // アイテムクリックハンドラー
}

export default function CommentSection({
  title,
  placeholder,
  teamId,
  targetType = "memo",
  targetOriginalId,
  targetTitle,
  teamMembers = [],
  boardId,
  onItemClick,
}: CommentSectionProps) {
  const commentListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newComment, setNewComment] = useState("");
  const { userId: currentUserId, getToken } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // 画像添付用の状態
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  // 折りたたみ状態（モバイルでは常に展開）
  const [isExpanded, setIsExpanded] = useState(true);

  // オートコンプリート用のstate
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  // コメント表示範囲の状態
  const [commentScope, setCommentScope] = useState<"board" | "items">(() => {
    if (typeof window !== "undefined" && targetType === "board") {
      const saved = localStorage.getItem("comment-scope");
      return (saved === "items" ? "items" : "board") as "board" | "items";
    }
    return "board";
  });

  // ボードコメント取得（ボードタイプの場合のみ）
  const { data: boardComments = [], isLoading: isLoadingBoard } =
    useTeamComments(teamId, targetType, targetOriginalId);

  // ボード内アイテムのコメント取得（ボードタイプの場合のみ）
  const { data: itemComments = [], isLoading: isLoadingItems } =
    useBoardItemComments(
      targetType === "board" ? teamId : undefined,
      targetType === "board" ? boardId : undefined,
    );

  // 表示するコメントを決定
  const comments =
    targetType === "board" && commentScope === "items"
      ? itemComments
      : boardComments;
  const isLoading =
    targetType === "board" && commentScope === "items"
      ? isLoadingItems
      : isLoadingBoard;

  // コメントがある場合は自動展開
  useEffect(() => {
    if (comments.length > 0) {
      setIsExpanded(true);
    }
  }, [comments.length]);

  const createComment = useCreateTeamComment(teamId);
  const updateComment = useUpdateTeamComment(
    teamId,
    targetType,
    targetOriginalId,
  );
  const deleteComment = useDeleteTeamComment(
    teamId,
    targetType,
    targetOriginalId,
  );

  // 編集・削除メニュー用のstate
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // コメント表示範囲変更時にlocalStorageに保存
  const handleScopeChange = (scope: "board" | "items") => {
    setCommentScope(scope);
    if (typeof window !== "undefined") {
      localStorage.setItem("comment-scope", scope);
    }
  };

  // メンションサジェストのフィルタリング（自分自身を除外）
  const filteredSuggestions = teamMembers.filter((member) => {
    if (member.userId === currentUserId) return false; // 自分を除外
    const name = member.displayName || `ユーザー${member.userId.slice(-4)}`;
    return name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  // コメントリスト初回表示時に最下部へスクロール
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [comments]);

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    // 親要素の高さを取得
    const parentHeight =
      textarea.closest(".flex.flex-col.min-h-0")?.clientHeight || 0;
    const maxHeight = parentHeight * 0.5; // 50%

    textarea.style.height = "auto";
    const newHeight = textarea.scrollHeight;

    if (newHeight <= maxHeight) {
      // 最大高さ以下の場合: スクロールバーなしで高さを設定
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = "hidden";
    } else {
      // 最大高さを超える場合: 最大高さに固定してスクロールバー表示
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "auto";
    }
  };

  // テキスト変更時の処理
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewComment(value);
    setCursorPosition(cursorPos);

    // テキストエリアの高さを自動調整
    adjustTextareaHeight(e.target);

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

  // ファイル処理（バリデーション + 圧縮）
  const processFile = useCallback(
    async (file: File): Promise<{ success: boolean; file?: File }> => {
      // バリデーション
      const validation = validateFile(file);
      if (!validation.valid) {
        showToast(validation.error!, "error");
        return { success: false };
      }

      // 圧縮が必要な場合
      if (validation.needsCompression) {
        try {
          const result = await compressImage(file);
          if (result.wasCompressed) {
            const saved = formatBytes(result.originalSize - result.compressedSize);
            showToast(`画像を圧縮しました（${saved}削減）`, "info", 3000);
          }
          // 圧縮後も5MB超の場合はエラー
          if (result.file.size > 5 * 1024 * 1024) {
            showToast("圧縮後も5MB以下にできませんでした", "error");
            return { success: false };
          }
          return { success: true, file: result.file };
        } catch (error) {
          console.error("画像圧縮エラー:", error);
          showToast("画像の圧縮に失敗しました", "error");
          return { success: false };
        }
      }

      return { success: true, file };
    },
    [showToast],
  );

  // ファイル選択処理（複数選択対応）
  const handleFileSelect = useCallback(
    async (files: File[]) => {
      const totalCount = pendingImages.length + files.length;
      if (totalCount > MAX_ATTACHMENTS_PER_ITEM) {
        showToast(`ファイルは最大${MAX_ATTACHMENTS_PER_ITEM}個までです`, "error");
        return;
      }

      const processedFiles: File[] = [];

      for (const file of files) {
        // バリデーション + 圧縮
        const result = await processFile(file);
        if (result.success && result.file) {
          processedFiles.push(result.file);
        }
      }

      if (processedFiles.length > 0) {
        setPendingImages((prev) => [...prev, ...processedFiles]);
      }
    },
    [pendingImages.length, showToast, processFile],
  );

  // ペンディング画像削除
  const handleDeletePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // クリップボードからの画像ペースト処理
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // クリップボード内の画像を探す
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith("image/")) {
          e.preventDefault(); // デフォルトのペースト動作を防止

          const file = item.getAsFile();
          if (file) {
            handleFileSelect([file]);
          }
          break; // 最初のファイルのみ処理
        }
      }
    },
    [handleFileSelect],
  );

  const handleSubmit = async () => {
    if ((!newComment.trim() && pendingImages.length === 0) || !targetOriginalId)
      return;

    try {
      // コメントを作成
      const createdComment = await createComment.mutateAsync({
        targetType,
        targetOriginalId,
        boardId, // ボードIDを追加
        content: newComment.trim() || " ", // 画像のみの場合は空白を入れる
      });

      // 画像をアップロード（コメントIDをoriginalIdとして使用）
      if (pendingImages.length > 0 && createdComment?.id) {
        const commentOriginalId = createdComment.id.toString();
        const token = await getToken();

        for (const file of pendingImages) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("attachedTo", "comment");
            formData.append("attachedOriginalId", commentOriginalId);

            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/attachments/upload?teamId=${teamId}`,
              {
                method: "POST",
                headers: {
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: formData,
              },
            );

            if (!response.ok) {
              throw new Error("画像のアップロードに失敗しました");
            }
          } catch (error) {
            console.error("画像アップロードエラー:", error);
            showToast(
              error instanceof Error
                ? error.message
                : "画像アップロードに失敗しました",
              "error",
            );
          }
        }

        // 画像アップロード完了後、キャッシュを更新して即座に反映
        queryClient.invalidateQueries({
          queryKey: ["attachments", teamId, "comment", commentOriginalId],
        });

        setPendingImages([]);
      }

      setNewComment("");
      setShowMentionSuggestions(false);

      // テキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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

  // タイトルを動的に変更
  const displayTitle =
    targetType === "board"
      ? commentScope === "board"
        ? "ボードコメント"
        : "アイテムコメント"
      : title;

  return (
    <div className="flex flex-col h-full">
      {/* デスクトップ: トグルボタン表示 / モバイル: 非表示 */}
      <div className="p-4 flex-shrink-0 items-center justify-between hidden md:flex">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          <svg
            className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span>{displayTitle}</span>
          {comments.length > 0 && (
            <span className="text-xs text-gray-500">({comments.length})</span>
          )}
        </button>
        {targetType === "board" && (
          <div className="mr-2">
            <CommentScopeToggle
              scope={commentScope}
              onScopeChange={handleScopeChange}
              buttonSize="size-6"
              iconSize="size-3.5"
            />
          </div>
        )}
      </div>
      {isExpanded && (
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

                const isOwner = comment.userId === currentUserId;

                // アイテムコメントの場合はクリック可能にする
                const isItemComment =
                  targetType === "board" &&
                  commentScope === "items" &&
                  (comment.targetType === "memo" ||
                    comment.targetType === "task");

                const handleCommentClick = () => {
                  if (isItemComment && onItemClick) {
                    onItemClick(
                      comment.targetType as "memo" | "task",
                      comment.targetOriginalId,
                    );
                  }
                };

                return (
                  <div
                    key={comment.id}
                    className={`bg-gray-50 rounded-lg p-3 border border-gray-100 group relative ${
                      isItemComment
                        ? "cursor-pointer hover:bg-gray-100 transition-colors"
                        : ""
                    }`}
                    onClick={handleCommentClick}
                  >
                    {isOwner && (
                      <div
                        className="absolute top-2 right-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === comment.id ? null : comment.id,
                            );
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                        >
                          <MoreVertical className="size-4 text-gray-600" />
                        </button>
                        {openMenuId === comment.id && (
                          <div className="absolute right-full top-0 mr-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCommentId(comment.id);
                                setEditContent(comment.content);
                                setOpenMenuId(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors rounded-t-lg"
                            >
                              <Edit2 className="size-4" />
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm("このコメントを削除しますか？")
                                ) {
                                  await deleteComment.mutateAsync(comment.id);
                                }
                                setOpenMenuId(null);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
                            >
                              <Trash2 className="size-4" />
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    )}

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
                            {new Date(comment.createdAt).toLocaleString(
                              "ja-JP",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                          {comment.updatedAt &&
                            comment.updatedAt !== comment.createdAt && (
                              <span className="text-xs text-gray-400">
                                (編集済み)
                              </span>
                            )}
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white border border-gray-200 min-h-[60px]"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateComment.mutateAsync({
                                    commentId: comment.id,
                                    content: editContent,
                                  });
                                  setEditingCommentId(null);
                                }}
                                disabled={
                                  !editContent.trim() || updateComment.isPending
                                }
                                className="px-3 h-7 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {updateComment.isPending ? "保存中..." : "保存"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditContent("");
                                }}
                                className="px-3 h-7 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs font-medium transition-colors"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-gray-700 leading-relaxed">
                              {renderCommentContent(
                                comment.content,
                                currentUserId || undefined,
                                teamMembers,
                              )}
                            </div>
                            {/* コメントの画像表示 */}
                            <CommentAttachmentGallery
                              teamId={teamId}
                              commentId={comment.id}
                            />
                          </>
                        )}
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
                className="w-full p-2.5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 border border-gray-200 min-h-[60px]"
                rows={2}
                value={newComment}
                onChange={handleTextChange}
                onPaste={handlePaste}
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
                  } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    // Cmd+Enter (Mac) または Ctrl+Enter (Win/Linux) で送信
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
                      member.displayName ||
                      `ユーザー${member.userId.slice(-4)}`;
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

              {/* 画像プレビュー */}
              {pendingImages.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-2">
                  {pendingImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`プレビュー ${index + 1}`}
                        className="w-32 h-32 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePendingImage(index)}
                        className="absolute -top-2 -right-2 size-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  {/* ファイル選択ボタン（画像・PDF・Office文書対応・複数選択可） */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileSelect(Array.from(files));
                        // ファイル入力をリセット（同じファイルを再選択可能にする）
                        e.target.value = "";
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center size-7 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="ファイルを添付（画像・PDF・Office文書）"
                  >
                    <ImageIcon className="size-4" />
                  </button>

                  {/* @メンションボタン */}
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
                        textarea.setSelectionRange(
                          cursorPos + 1,
                          cursorPos + 1,
                        );
                      }, 0);

                      // サジェストを表示
                      setMentionQuery("");
                      setShowMentionSuggestions(true);
                      setSelectedSuggestionIndex(0);
                    }}
                    className="flex items-center justify-center size-7 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded text-base font-medium transition-colors"
                    title="メンション"
                  >
                    @
                  </button>

                  {/* 引用ボタン */}
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = textareaRef.current;
                      if (!textarea) return;

                      const cursorPos = textarea.selectionStart;
                      const selectionStart = textarea.selectionStart;
                      const selectionEnd = textarea.selectionEnd;

                      if (selectionStart !== selectionEnd) {
                        // テキストが選択されている場合: 各行の先頭に> を追加
                        const selectedText = newComment.slice(
                          selectionStart,
                          selectionEnd,
                        );
                        const quotedText = selectedText
                          .split("\n")
                          .map((line) => `> ${line}`)
                          .join("\n");
                        const newText =
                          newComment.slice(0, selectionStart) +
                          quotedText +
                          newComment.slice(selectionEnd);
                        setNewComment(newText);

                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(
                            selectionStart + quotedText.length,
                            selectionStart + quotedText.length,
                          );
                          adjustTextareaHeight(textarea);
                        }, 0);
                      } else {
                        // テキストが選択されていない場合: カーソル位置に> を挿入
                        const textBefore = newComment.slice(0, cursorPos);
                        const textAfter = newComment.slice(cursorPos);
                        const newText = `${textBefore}> ${textAfter}`;
                        setNewComment(newText);

                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(
                            cursorPos + 2,
                            cursorPos + 2,
                          );
                          adjustTextareaHeight(textarea);
                        }, 0);
                      }
                    }}
                    className="flex items-center justify-center size-7 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded text-sm font-medium transition-colors"
                    title="引用"
                  >
                    "
                  </button>

                  {/* コードブロックボタン */}
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = textareaRef.current;
                      if (!textarea) return;

                      const selectionStart = textarea.selectionStart;
                      const selectionEnd = textarea.selectionEnd;

                      if (selectionStart !== selectionEnd) {
                        // テキストが選択されている場合: ```で囲む
                        const selectedText = newComment.slice(
                          selectionStart,
                          selectionEnd,
                        );
                        const wrappedText = `\`\`\`\n${selectedText}\n\`\`\``;
                        const newText =
                          newComment.slice(0, selectionStart) +
                          wrappedText +
                          newComment.slice(selectionEnd);
                        setNewComment(newText);

                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(
                            selectionStart + 4,
                            selectionStart + 4 + selectedText.length,
                          );
                          adjustTextareaHeight(textarea);
                        }, 0);
                      } else {
                        // テキストが選択されていない場合: 空のコードブロックを挿入
                        const cursorPos = textarea.selectionStart;
                        const textBefore = newComment.slice(0, cursorPos);
                        const textAfter = newComment.slice(cursorPos);
                        const newText = `${textBefore}\`\`\`\n\n\`\`\`${textAfter}`;
                        setNewComment(newText);

                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(
                            cursorPos + 4,
                            cursorPos + 4,
                          );
                          adjustTextareaHeight(textarea);
                        }, 0);
                      }
                    }}
                    className="flex items-center justify-center size-7 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded text-xs font-medium transition-colors"
                    title="コードブロック"
                  >
                    &lt;&gt;
                  </button>
                </div>

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
      )}
    </div>
  );
}
