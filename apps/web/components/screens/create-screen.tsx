"use client";

import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import MemoCreator from "@/components/features/memo/memo-creator";
import TaskCreator from "@/components/features/task/task-creator";
import { useState } from "react";

type CreateMode = 'memo' | 'task';

interface CreateScreenProps {
  initialMode?: CreateMode;
  onClose: () => void;
}

function CreateScreen({ 
  initialMode = 'memo',
  onClose 
}: CreateScreenProps) {
  const [createMode, setCreateMode] = useState<CreateMode>(initialMode);

  return (
    <div className="h-[calc(100vh-64px)] bg-white">
      {/* 上部：モード切り替えタブ */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setCreateMode('memo')}
          className={`flex-1 py-3 px-4 text-center font-medium flex items-center justify-center gap-2 border-b-2 transition-all duration-200 ${
            createMode === 'memo'
              ? 'text-Green border-Green'
              : 'text-gray-600 border-transparent hover:text-Green hover:border-Green/30'
          }`}
        >
          <MemoIcon className="w-5 h-5" />
          新規メモ
        </button>
        <button
          onClick={() => setCreateMode('task')}
          className={`flex-1 py-3 px-4 text-center font-medium flex items-center justify-center gap-2 border-b-2 transition-all duration-200 ${
            createMode === 'task'
              ? 'text-Yellow border-Yellow'
              : 'text-gray-600 border-transparent hover:text-Yellow hover:border-Yellow/30'
          }`}
        >
          <TaskIcon className="w-5 h-5" />
          新規タスク
        </button>
      </div>

      {/* メイン：作成エリア */}
      <div className="h-[calc(100%-65px)]">
        {createMode === 'memo' ? (
          <MemoCreator onClose={onClose} />
        ) : (
          <TaskCreator onClose={onClose} />
        )}
      </div>
    </div>
  );
}

export default CreateScreen;