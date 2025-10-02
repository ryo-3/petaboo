import { useRef, useEffect } from "react";

interface CommentSectionProps {
  title: string;
  placeholder: string;
  targetTitle?: string;
  commentCount?: number;
}

export default function CommentSection({
  title,
  placeholder,
  targetTitle,
  commentCount = 20,
}: CommentSectionProps) {
  const commentListRef = useRef<HTMLDivElement>(null);

  // コメントリスト初回表示時に最下部へスクロール
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, []);

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
          {Array.from({ length: commentCount }, (_, i) => {
            const commentNumber = i + 1;
            return (
              <div
                key={i}
                className="bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    U{commentNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        ユーザー{commentNumber}
                      </span>
                      <span className="text-xs text-gray-500">
                        {commentNumber === commentCount
                          ? "2分前"
                          : `${commentCount - commentNumber + 1}時間前`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {targetTitle
                        ? `${targetTitle}に関するコメント${commentNumber}です。`
                        : `コメント${commentNumber}です。ボード全体に関する議論や情報共有に使用します。`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 新規コメント入力 */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <textarea
              placeholder={placeholder}
              className="w-full p-2.5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 border border-gray-200"
              rows={2}
            />
            <div className="flex justify-end">
              <button className="px-3 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                送信
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
