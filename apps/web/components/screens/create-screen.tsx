"use client";

import MemoEditor from "@/components/features/memo/memo-editor";
import TaskEditor from "@/components/features/task/task-editor";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import { useState } from "react";

type CreateMode = "memo" | "task";

interface CreateScreenProps {
  initialMode?: CreateMode;
  onClose: () => void;
  onModeChange?: (mode: CreateMode) => void;
  onShowMemoList?: () => void;
  onShowTaskList?: () => void;
}

function CreateScreen({
  initialMode = "memo",
  onClose,
  onModeChange,
  onShowMemoList,
  onShowTaskList,
}: CreateScreenProps) {
  const { preferences } = useUserPreferences(1);
  const [createMode, setCreateMode] = useState<CreateMode>(initialMode);

  const handleModeChange = (mode: CreateMode) => {
    setCreateMode(mode);
    onModeChange?.(mode);
  };

  return (
    <div className={`${preferences?.hideHeader ? 'h-screen' : 'h-[calc(100vh-64px)]'} bg-white`}>
      {/* 上部：モード切り替えタブ */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => handleModeChange("memo")}
          className={`flex-1 border-b-2 transition-all duration-200 ${
            createMode === "memo"
              ? "border-Green"
              : "border-transparent hover:border-Green/30"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
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
          <div className="flex items-center gap-3 px-4 py-3">
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
      </div>

      {/* メイン：作成エリア */}
      <div className="h-[calc(100%-65px)] p-5">
        {createMode === "memo" ? (
          <MemoEditor memo={null} onClose={onClose} />
        ) : (
          <TaskEditor task={null} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

export default CreateScreen;
