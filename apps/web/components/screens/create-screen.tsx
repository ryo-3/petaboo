"use client";

import BoardForm from "@/components/features/board/board-form";
import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import DashboardIcon from "@/components/icons/dashboard-icon";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import { useCreateBoard } from "@/src/hooks/use-boards";
import { CreateBoardData } from "@/src/types/board";
import { useState, useEffect } from "react";

type CreateMode = "memo" | "task" | "board";

interface CreateScreenProps {
  initialMode?: CreateMode;
  onClose: () => void;
  onModeChange?: (mode: CreateMode) => void;
  onShowMemoList?: () => void;
  onShowTaskList?: () => void;
  onShowBoardList?: () => void;
  // 統一操作フック
  unifiedOperations: {
    memoOperations: {
      deleteItem: {
        mutateAsync: (id: number) => Promise<any>;
        isPending: boolean;
      };
      restoreItem: {
        mutateAsync: (originalId: string) => Promise<any>;
        isPending: boolean;
      };
    };
    taskOperations: {
      deleteItem: {
        mutateAsync: (id: number) => Promise<any>;
        isPending: boolean;
      };
      restoreItem: {
        mutateAsync: (originalId: string) => Promise<any>;
        isPending: boolean;
      };
    };
  };
}

function CreateScreen({
  initialMode = "memo",
  onClose,
  onModeChange,
  onShowMemoList,
  onShowTaskList,
  onShowBoardList,
  unifiedOperations,
}: CreateScreenProps) {
  const [createMode, setCreateMode] = useState<CreateMode>(initialMode);
  const createBoard = useCreateBoard();

  const handleModeChange = (mode: CreateMode) => {
    setCreateMode(mode);
    onModeChange?.(mode);
  };

  const handleBoardCreate = async (data: CreateBoardData) => {
    try {
      await createBoard.mutateAsync(data);
      onClose();
    } catch {
      // エラーはミューテーションのエラーハンドリングで処理される
    }
  };

  // モバイルフッターの戻るボタンイベントをリッスン
  useEffect(() => {
    const handleMemoBackRequest = () => {
      console.log(
        "📱 CreateScreen: memo-editor-mobile-back-requested イベント受信",
      );
      if (onShowMemoList) {
        console.log("→ onShowMemoList() を呼び出し");
        onShowMemoList();
      } else {
        console.log("→ onClose() を呼び出し");
        onClose();
      }
    };

    const handleTaskBackRequest = () => {
      console.log(
        "📱 CreateScreen: task-editor-mobile-back-requested イベント受信",
      );
      if (onShowTaskList) {
        console.log("→ onShowTaskList() を呼び出し");
        onShowTaskList();
      } else {
        console.log("→ onClose() を呼び出し");
        onClose();
      }
    };

    window.addEventListener(
      "memo-editor-mobile-back-requested",
      handleMemoBackRequest,
    );
    window.addEventListener(
      "task-editor-mobile-back-requested",
      handleTaskBackRequest,
    );

    return () => {
      window.removeEventListener(
        "memo-editor-mobile-back-requested",
        handleMemoBackRequest,
      );
      window.removeEventListener(
        "task-editor-mobile-back-requested",
        handleTaskBackRequest,
      );
    };
  }, [onShowMemoList, onShowTaskList, onClose]);

  return (
    <div className="h-full bg-white flex flex-col">
      {/* 上部：モード切り替えタブ（モバイルでは非表示） */}
      <div className="hidden md:flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => handleModeChange("memo")}
          className={`flex-1 border-b-2 transition-all duration-200 ${
            createMode === "memo"
              ? "border-Green"
              : "border-transparent hover:border-Green/30"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div
              className={`flex items-center gap-2 font-medium transition-colors ${
                createMode === "memo" ? "text-Green" : "text-gray-600"
              }`}
            >
              <MemoIcon className="w-5 h-5" />
              新規メモ
            </div>
            {onShowMemoList && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onShowMemoList();
                }}
                className="text-xs text-gray-400 hover:text-gray-500 transition-colors px-2 pt-1.5 pb-1 rounded font-bold"
              >
                一覧へ
              </div>
            )}
          </div>
        </button>
        <button
          onClick={() => handleModeChange("task")}
          className={`flex-1 border-b-2 transition-all duration-200 ${
            createMode === "task"
              ? "border-DeepBlue"
              : "border-transparent hover:border-DeepBlue/30"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div
              className={`flex items-center gap-2 font-medium transition-colors ${
                createMode === "task" ? "text-DeepBlue" : "text-gray-600"
              }`}
            >
              <TaskIcon className="w-5 h-5" />
              新規タスク
            </div>
            {onShowTaskList && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onShowTaskList();
                }}
                className="text-xs text-gray-400 hover:text-gray-500 transition-colors px-2 pt-1.5 pb-1 rounded font-bold"
              >
                一覧へ
              </div>
            )}
          </div>
        </button>
        <button
          onClick={() => handleModeChange("board")}
          className={`flex-1 border-b-2 transition-all duration-200 ${
            createMode === "board"
              ? "border-light-Blue"
              : "border-transparent hover:border-light-Blue/30"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div
              className={`flex items-center gap-2 font-medium transition-colors ${
                createMode === "board" ? "text-light-Blue" : "text-gray-600"
              }`}
            >
              <DashboardIcon className="w-5 h-5" />
              新規ボード
            </div>
            {onShowBoardList && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onShowBoardList();
                }}
                className="text-xs text-gray-400 hover:text-gray-500 transition-colors px-2 pt-1.5 pb-1 rounded font-bold"
              >
                一覧へ
              </div>
            )}
          </div>
        </button>
      </div>

      {/* メイン：作成エリア */}
      <div className="pl-3 pr-3 flex-1 min-h-0">
        {createMode === "memo" ? (
          <MemoEditor
            memo={null}
            onClose={onClose}
            customHeight="h-full"
            unifiedOperations={unifiedOperations.memoOperations}
          />
        ) : createMode === "task" ? (
          <TaskEditor
            task={null}
            onClose={onClose}
            customHeight="h-full"
            unifiedOperations={unifiedOperations.taskOperations}
          />
        ) : (
          <div className="pt-6 pb-6 flex justify-center">
            <div className="w-full max-w-2xl">
              <BoardForm
                onSubmit={handleBoardCreate}
                onCancel={onClose}
                isLoading={createBoard.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateScreen;
