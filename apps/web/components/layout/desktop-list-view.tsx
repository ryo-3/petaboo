"use client";

import DeletedMemoViewer from "@/components/features/memo/deleted-memo-viewer";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import MemoEditor from "@/components/features/memo/memo-editor";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import ColumnCountSelector from "@/components/ui/layout/column-count-selector";
import MemoCard from "@/components/features/memo/memo-card";
import MemoListItem from "@/components/features/memo/memo-list-item";
import TaskCard from "@/components/features/task/task-card";
import TaskListItem from "@/components/features/task/task-list-item";
import ViewModeToggle from "@/components/ui/layout/view-mode-toggle";
import {
  useDeletedNotes,
  useDeleteNote,
  useNotes,
  usePermanentDeleteNote,
} from "@/src/hooks/use-notes";
import {
  useDeletedTasks,
  useDeleteTask,
  usePermanentDeleteTask,
  useTasks,
} from "@/src/hooks/use-tasks";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useEffect, useState } from "react";
import TaskStatusDisplay from "@/components/features/task/task-status-display";
import MemoCreator from "@/components/features/memo/memo-creator";
import TaskCreator from "@/components/features/task/task-creator";
import TaskEditor from "@/components/features/task/task-editor";
import EmptyState from "@/components/ui/feedback/empty-state";
import ItemGrid from "@/components/ui/layout/item-grid";

interface DesktopListViewProps {
  onSelectMemo: (memo: Memo, fromFullList?: boolean) => void;
  onSelectDeletedMemo: (memo: DeletedMemo, fromFullList?: boolean) => void;
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void;
  onSelectDeletedTask?: (task: DeletedTask, fromFullList?: boolean) => void;
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  currentMode?: "memo" | "task";
  selectedMemo?: Memo | null;
  selectedDeletedMemo?: DeletedMemo | null;
  selectedTask?: Task | null;
  selectedDeletedTask?: DeletedTask | null;
}

function DesktopListView({
  onSelectMemo,
  onSelectDeletedMemo,
  onSelectTask,
  onSelectDeletedTask,
  onDeleteAndSelectNext,
  currentMode = "memo",
  selectedMemo,
  selectedDeletedMemo,
  selectedTask,
  selectedDeletedTask,
  // Removed unused props: onEditMemo, onEditTask
}: DesktopListViewProps) {
  const { data: notes, isLoading: memoLoading, error: memoError } = useNotes();
  const [localMemos, setLocalMemos] = useState<Memo[]>([]);
  const { data: deletedNotes } = useDeletedNotes();
  const { data: tasks, isLoading: taskLoading, error: taskError } = useTasks();
  const { data: deletedTasks } = useDeletedTasks();
  const [activeTab, setActiveTab] = useState<
    "normal" | "deleted" | "todo" | "in_progress" | "completed"
  >(currentMode === "task" ? "todo" : "normal");
  const [rightPanelMode, setRightPanelMode] = useState<
    "hidden" | "view" | "create"
  >("hidden");

  // currentModeが変更された時にactiveTabとrightPanelModeを適切にリセット
  useEffect(() => {
    if (currentMode === "task") {
      setActiveTab("todo");
    } else {
      setActiveTab("normal");
    }
    setRightPanelMode("hidden");
  }, [currentMode]);
  const [checkedMemos, setCheckedMemos] = useState<Set<number>>(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<Set<number>>(
    new Set()
  );
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [checkedDeletedTasks, setCheckedDeletedTasks] = useState<Set<number>>(
    new Set()
  );
  const { preferences } = useUserPreferences(1);

  // ローカル状態（初期値をlocalStorageから取得）
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`${currentMode}_viewMode`);
      if (saved === "card" || saved === "list") {
        return saved;
      }
    }
    return currentMode === "task" ? "list" : "list";
  });

  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`${currentMode}_columnCount`);
      if (saved) {
        const num = parseInt(saved, 10);
        if (num >= 1 && num <= 6) {
          return num;
        }
      }
    }
    return currentMode === "task" ? 2 : 4;
  });

  // currentMode変更時にlocalStorageから設定を読み込み
  useEffect(() => {
    // localStorageから現在のモードの設定を取得
    const savedViewMode = localStorage.getItem(`${currentMode}_viewMode`);
    const savedColumnCount = localStorage.getItem(`${currentMode}_columnCount`);

    if (savedViewMode === "card" || savedViewMode === "list") {
      setViewMode(savedViewMode);
    } else {
      setViewMode(currentMode === "task" ? "list" : "list");
    }

    if (savedColumnCount) {
      const num = parseInt(savedColumnCount, 10);
      if (num >= 1 && num <= 6) {
        setColumnCount(num);
      } else {
        setColumnCount(currentMode === "task" ? 2 : 4);
      }
    } else {
      setColumnCount(currentMode === "task" ? 2 : 4);
    }
  }, [currentMode]);

  // 設定値が変更されたらローカル状態を更新
  useEffect(() => {
    if (preferences) {
      const newViewMode =
        currentMode === "task"
          ? preferences.taskViewMode || "list"
          : preferences.memoViewMode || "list";
      const newColumnCount =
        currentMode === "task"
          ? preferences.taskColumnCount || 2
          : preferences.memoColumnCount || 4;

      setViewMode(newViewMode);
      setColumnCount(newColumnCount);

      // localStorageにも保存（次回の初期値用）
      localStorage.setItem(`${currentMode}_viewMode`, newViewMode);
      localStorage.setItem(
        `${currentMode}_columnCount`,
        newColumnCount.toString()
      );
    }
  }, [preferences, currentMode]);

  // ローカル設定変更時にlocalStorageを更新
  const handleViewModeChange = (newViewMode: "card" | "list") => {
    setViewMode(newViewMode);
    localStorage.setItem(`${currentMode}_viewMode`, newViewMode);
  };

  const handleColumnCountChange = (newColumnCount: number) => {
    setColumnCount(newColumnCount);
    localStorage.setItem(
      `${currentMode}_columnCount`,
      newColumnCount.toString()
    );
  };

  // ローカルストレージから新規作成メモを取得
  useEffect(() => {
    let monitoringInterval: NodeJS.Timeout | null = null;

    const updateLocalMemos = () => {
      const localMemosList: Memo[] = [];

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("memo_draft_")) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || "{}");
            // 新規作成のメモ（IDが文字列で'new'で始まる場合）のみを対象
            if (
              typeof data.id === "string" &&
              data.id.startsWith("new_") &&
              (data.title?.trim() || data.content?.trim())
            ) {
              const now = Math.floor(Date.now() / 1000);

              // データの時間がミリ秒形式の場合は秒に変換、すでに秒の場合はそのまま
              const normalizeTime = (timestamp: number) => {
                if (!timestamp) return now;
                // 13桁（ミリ秒）なら10桁（秒）に変換
                return timestamp > 9999999999
                  ? Math.floor(timestamp / 1000)
                  : Math.floor(timestamp);
              };

              // 一意のIDを生成（文字列IDをハッシュ化して負の数にする）
              const hashId = -Math.abs(
                data.id.split("").reduce((a: number, b: string) => {
                  a = (a << 5) - a + b.charCodeAt(0);
                  return a & a;
                }, 0)
              );

              localMemosList.push({
                id: hashId, // ユニークな負のID
                title: data.title || "無題",
                content: data.content || "",
                createdAt: normalizeTime(data.lastModified),
                updatedAt: normalizeTime(
                  data.lastEditedAt || data.lastModified
                ),
                tempId: data.id, // 元のtempIdを保持
              });
            }
          } catch (error) {
            console.error("ローカルメモの解析エラー:", key, error);
          }
        }
      });

      setLocalMemos(localMemosList);
      return localMemosList.length > 0;
    };

    const startMonitoring = () => {
      if (monitoringInterval) return; // 既に監視中の場合は何もしない

      monitoringInterval = setInterval(() => {
        const hasNewMemos = updateLocalMemos();
        if (!hasNewMemos && monitoringInterval) {
          clearInterval(monitoringInterval);
          monitoringInterval = null;
        }
      }, 1000);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith("memo_draft_new_")) {
        const hasNewMemos = updateLocalMemos();
        if (hasNewMemos && !monitoringInterval) {
          startMonitoring();
        }
      }
    };

    // 初回チェック
    const hasNewMemos = updateLocalMemos();
    if (hasNewMemos) {
      startMonitoring();
    }

    // localStorage変更イベントリスナー
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const deleteNote = useDeleteNote();
  const permanentDeleteNote = usePermanentDeleteNote();
  const deleteTask = useDeleteTask();
  const permanentDeleteTask = usePermanentDeleteTask();

  // 表示順序でソートされたメモリストを取得する関数
  const getSortedMemos = () => {
    return [...(notes || []), ...localMemos]
      .sort((a, b) => {
        // ローカル編集時間も考慮してソート
        const getLatestTime = (memo: Memo) => {
          // 新規作成メモ（ID: -1）の場合
          if (memo.id === -1) {
            return memo.updatedAt || memo.createdAt;
          }

          const localData = localStorage.getItem(
            `memo_draft_${memo.id}`
          );
          let localEditTime = 0;
          if (localData) {
            try {
              const parsed = JSON.parse(localData);
              if (parsed.id === memo.id && parsed.lastEditedAt) {
                localEditTime = parsed.lastEditedAt;
              }
            } catch {
              // パースエラーは無視
            }
          }
          return Math.max(
            localEditTime,
            memo.updatedAt || 0,
            memo.createdAt
          );
        };

        return getLatestTime(b) - getLatestTime(a);
      });
  };

  // 表示順序での次のメモを選択するハンドラー
  const handleDeleteAndSelectNextInOrder = (deletedMemo: Memo) => {
    // console.log('=== DesktopListView: handleDeleteAndSelectNextInOrder ===');
    // console.log('削除されたメモ:', deletedMemo);
    
    const sortedMemos = getSortedMemos();
    // console.log('ソート済みメモリスト:', sortedMemos.map(m => ({ id: m.id, title: m.title })));
    
    const deletedIndex = sortedMemos.findIndex(m => m.id === deletedMemo.id);
    // console.log('削除されたメモの表示順インデックス:', deletedIndex);
    
    let nextMemo: Memo | null = null;
    
    if (deletedIndex !== -1) {
      // 削除されたメモの次のメモを選択
      if (deletedIndex < sortedMemos.length - 1) {
        nextMemo = sortedMemos[deletedIndex + 1] || null;
        // console.log('次のメモを選択:', nextMemo);
      }
      // 最後のメモが削除された場合は前のメモを選択
      else if (deletedIndex > 0) {
        nextMemo = sortedMemos[deletedIndex - 1] || null;
        // console.log('前のメモを選択:', nextMemo);
      }
    }
    
    if (nextMemo) {
      // console.log('次のメモに切り替え実行');
      // 次のメモを選択してビューモードに切り替え
      onSelectMemo(nextMemo, true);
      setRightPanelMode("view");
    } else {
      // console.log('次のメモが見つからない - パネルを閉じる');
      setRightPanelMode("hidden");
    }
  };

  // 右側パネル表示時は列数を調整（3,4列→2列、1,2列→そのまま）
  const effectiveColumnCount =
    rightPanelMode !== "hidden"
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  const handleBulkDelete = async () => {
    try {
      if (activeTab !== "deleted") {
        if (currentMode === "memo") {
          // APIメモとローカルメモを分離
          const apiMemoIds = Array.from(checkedMemos).filter((id) => id > 0);
          const localMemoIds = Array.from(checkedMemos).filter((id) => id < 0);

          // APIメモの削除
          if (apiMemoIds.length > 0) {
            const deletePromises = apiMemoIds.map((id) =>
              deleteNote.mutateAsync(id)
            );
            await Promise.all(deletePromises);
          }

          // ローカルメモの削除（localStorageから削除）
          if (localMemoIds.length > 0) {
            localMemoIds.forEach((id) => {
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
                      console.log("ローカルメモを削除:", key);
                    }
                  } catch (error) {
                    console.error("ローカルメモ削除エラー:", error);
                  }
                }
              });
            });
          }

          setCheckedMemos(new Set());
        } else {
          // 通常タスクの一括削除
          const deletePromises = Array.from(checkedTasks).map((id) =>
            deleteTask.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedTasks(new Set());
        }
      } else {
        if (currentMode === "memo") {
          // 削除済みメモの完全削除
          const deletePromises = Array.from(checkedDeletedMemos).map((id) =>
            permanentDeleteNote.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedDeletedMemos(new Set());
        } else {
          // 削除済みタスクの完全削除
          const deletePromises = Array.from(checkedDeletedTasks).map((id) =>
            permanentDeleteTask.mutateAsync(id)
          );
          await Promise.all(deletePromises);
          setCheckedDeletedTasks(new Set());
        }
      }
    } catch (error) {
      console.error("一括削除に失敗しました:", error);
      alert("一括削除に失敗しました。");
    }
  };

  const tabs =
    currentMode === "task"
      ? [
          {
            id: "todo",
            label: "未着手",
            count: tasks?.filter((task) => task.status === "todo").length || 0,
          },
          {
            id: "in_progress",
            label: "進行中",
            count:
              tasks?.filter((task) => task.status === "in_progress").length ||
              0,
          },
          {
            id: "completed",
            label: "完了",
            count:
              tasks?.filter((task) => task.status === "completed").length || 0,
          },
          {
            id: "deleted",
            label: "削除済み",
            icon: <TrashIcon className="w-3 h-3" />,
            count: deletedTasks?.length || 0,
          },
        ]
      : [
          {
            id: "normal",
            label: "通常",
            count: (notes?.length || 0) + localMemos.length,
          },
          {
            id: "deleted",
            label: "削除済み",
            icon: <TrashIcon className="w-3 h-3" />,
            count: deletedNotes?.length || 0,
          },
        ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">
      {/* 左側：一覧表示 */}
      <div
        className={`${rightPanelMode !== "hidden" ? "w-1/2" : "w-full"} ${rightPanelMode !== "hidden" ? "border-r border-gray-300" : ""} pt-6 pl-6 pr-2 flex flex-col transition-all duration-300 relative`}
      >
        <div className="mb-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {currentMode === "memo" ? (
                  <MemoIcon className="w-6 h-6 text-gray-600" />
                ) : (
                  <TaskIcon className="w-6 h-6 text-gray-600" />
                )}
                <h1 className="text-2xl font-bold text-gray-800 w-[105px]">
                  {currentMode === "memo" ? "メモ一覧" : "タスク一覧"}
                </h1>
              </div>
              
              {/* 新規追加ボタン */}
              <AddItemButton
                itemType={currentMode}
                onClick={() => {
                  setRightPanelMode("create");
                }}
                position="bottom"
                size="small"
                showTooltip={false}
              />

              {/* タブ */}
              <div className="flex items-center gap-2">
                {tabs.map((tab) => {
                  const getTabColors = () => {
                    if (activeTab === tab.id) {
                      switch (tab.id) {
                        case "todo":
                          return "bg-zinc-500 text-white";
                        case "in_progress":
                          return "bg-blue-600 text-white";
                        case "completed":
                          return "bg-green-600 text-white";
                        case "deleted":
                          return "bg-red-600 text-white";
                        case "normal":
                          return "bg-zinc-500 text-white";
                        default:
                          return "bg-gray-500 text-white";
                      }
                    } else {
                      switch (tab.id) {
                        case "todo":
                          return "bg-gray-100 text-gray-600 hover:bg-gray-300";
                        case "in_progress":
                          return "bg-gray-100 text-gray-600 hover:bg-blue-200";
                        case "completed":
                          return "bg-gray-100 text-gray-600 hover:bg-green-200";
                        case "deleted":
                          return "bg-gray-100 text-gray-600 hover:bg-red-200";
                        case "normal":
                          return "bg-gray-100 text-gray-600 hover:bg-gray-300";
                        default:
                          return "bg-gray-100 text-gray-600 hover:bg-gray-300";
                      }
                    }
                  };

                  return (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setActiveTab(
                          tab.id as
                            | "normal"
                            | "deleted"
                            | "todo"
                            | "in_progress"
                            | "completed"
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${getTabColors()}`}
                    >
                      {tab.icon && tab.icon}
                      <span>{tab.label}</span>
                      <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* コントロール */}
          {!(
            (currentMode === "memo" && preferences?.memoHideControls) ||
            (currentMode === "task" && preferences?.taskHideControls)
          ) && (
            <div className="flex items-center gap-2">
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
              <ColumnCountSelector
                columnCount={columnCount}
                onColumnCountChange={handleColumnCountChange}
                isRightPanelShown={rightPanelMode !== "hidden"}
              />
            </div>
          )}
        </div>

        {(currentMode === "memo" ? memoLoading : taskLoading) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">読み込み中...</div>
          </div>
        )}

        {(currentMode === "memo" ? memoError : taskError) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-500">エラーが発生しました</div>
          </div>
        )}

        {/* メモの通常タブ */}
        {activeTab === "normal" && currentMode === "memo" && (
          <>
            {(notes && notes.length > 0) || localMemos.length > 0 ? (
              <ItemGrid
                viewMode={viewMode}
                effectiveColumnCount={effectiveColumnCount}
              >
                {[...(notes || []), ...localMemos]
                  .sort((a, b) => {
                    // ローカル編集時間も考慮してソート
                    const getLatestTime = (memo: Memo) => {
                      // 新規作成メモ（ID: -1）の場合
                      if (memo.id === -1) {
                        return memo.updatedAt || memo.createdAt;
                      }

                      const localData = localStorage.getItem(
                        `memo_draft_${memo.id}`
                      );
                      let localEditTime = 0;
                      if (localData) {
                        try {
                          const parsed = JSON.parse(localData);
                          if (parsed.id === memo.id && parsed.lastEditedAt) {
                            localEditTime = parsed.lastEditedAt;
                          }
                        } catch {
                          // パースエラーは無視
                        }
                      }
                      return Math.max(
                        localEditTime,
                        memo.updatedAt || 0,
                        memo.createdAt
                      );
                    };

                    return getLatestTime(b) - getLatestTime(a);
                  })
                  .map((memo: Memo) => {
                    const Component =
                      viewMode === "card" ? MemoCard : MemoListItem;
                    return (
                      <Component
                        key={memo.id < 0 ? `local-new-${memo.id}` : memo.id}
                        memo={memo}
                        isChecked={checkedMemos.has(memo.id)}
                        onToggleCheck={() => {
                          const newChecked = new Set(checkedMemos);
                          if (checkedMemos.has(memo.id)) {
                            newChecked.delete(memo.id);
                          } else {
                            newChecked.add(memo.id);
                          }
                          setCheckedMemos(newChecked);
                        }}
                        onSelect={() => {
                          onSelectMemo(memo, true);
                          setRightPanelMode("view");
                        }}
                        variant="normal"
                        isSelected={selectedMemo?.id === memo.id}
                      />
                    );
                  })}
              </ItemGrid>
            ) : (
              <EmptyState message="メモがありません" />
            )}
          </>
        )}

        {/* タスクタブ（未着手、進行中、完了） */}
        {(activeTab === "todo" ||
          activeTab === "in_progress" ||
          activeTab === "completed") &&
          currentMode === "task" && (
            <TaskStatusDisplay
              activeTab={activeTab}
              tasks={tasks}
              viewMode={viewMode}
              effectiveColumnCount={effectiveColumnCount}
              checkedTasks={checkedTasks}
              onToggleCheck={(taskId) => {
                const newChecked = new Set(checkedTasks);
                if (checkedTasks.has(taskId)) {
                  newChecked.delete(taskId);
                } else {
                  newChecked.add(taskId);
                }
                setCheckedTasks(newChecked);
              }}
              onSelectTask={(task) => {
                onSelectTask!(task, true);
                setRightPanelMode("view");
              }}
              selectedTaskId={selectedTask?.id}
            />
          )}

        {/* 削除済みタブ */}
        {activeTab === "deleted" && (
          <>
            {currentMode === "memo" ? (
              deletedNotes && deletedNotes.length > 0 ? (
                <ItemGrid
                  viewMode={viewMode}
                  effectiveColumnCount={effectiveColumnCount}
                >
                  {deletedNotes
                    .sort((a, b) => b.deletedAt - a.deletedAt) // 削除時刻順（新しい順）
                    .map((memo: DeletedMemo) => {
                      const Component =
                        viewMode === "card" ? MemoCard : MemoListItem;
                      return (
                        <Component
                          key={memo.id}
                          memo={memo}
                          isChecked={checkedDeletedMemos.has(memo.id)}
                          onToggleCheck={() => {
                            const newChecked = new Set(checkedDeletedMemos);
                            if (checkedDeletedMemos.has(memo.id)) {
                              newChecked.delete(memo.id);
                            } else {
                              newChecked.add(memo.id);
                            }
                            setCheckedDeletedMemos(newChecked);
                          }}
                          onSelect={() => {
                            onSelectDeletedMemo(memo, true);
                            setRightPanelMode("view");
                          }}
                          variant="deleted"
                          isSelected={selectedDeletedMemo?.id === memo.id}
                        />
                      );
                    })}
                </ItemGrid>
              ) : (
                <EmptyState message="削除済みメモはありません" />
              )
            ) : deletedTasks && deletedTasks.length > 0 ? (
              <ItemGrid
                viewMode={viewMode}
                effectiveColumnCount={effectiveColumnCount}
              >
                {deletedTasks.map((task: DeletedTask) => {
                  const Component =
                    viewMode === "card" ? TaskCard : TaskListItem;
                  return (
                    <Component
                      key={task.id}
                      task={task}
                      isChecked={checkedDeletedTasks.has(task.id)}
                      onToggleCheck={() => {
                        const newChecked = new Set(checkedDeletedTasks);
                        if (checkedDeletedTasks.has(task.id)) {
                          newChecked.delete(task.id);
                        } else {
                          newChecked.add(task.id);
                        }
                        setCheckedDeletedTasks(newChecked);
                      }}
                      onSelect={() => {
                        onSelectDeletedTask!(task, true);
                        setRightPanelMode("view");
                      }}
                      variant="deleted"
                      isSelected={selectedDeletedTask?.id === task.id}
                    />
                  );
                })}
              </ItemGrid>
            ) : (
              <EmptyState message="削除済みタスクはありません" />
            )}
          </>
        )}

        {/* 一括削除ボタン */}
        {(() => {
          const shouldShow =
            currentMode === "memo"
              ? (activeTab === "normal" && checkedMemos.size > 0) ||
                (activeTab === "deleted" && checkedDeletedMemos.size > 0)
              : ((activeTab === "todo" || activeTab === "in_progress" || activeTab === "completed") && checkedTasks.size > 0) ||
                (activeTab === "deleted" && checkedDeletedTasks.size > 0);
          return shouldShow;
        })() && (
          <button
            onClick={handleBulkDelete}
            className={`${
              rightPanelMode !== "hidden" 
                ? "absolute bottom-6 right-6" 
                : "fixed bottom-6 right-6"
            } bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors z-50`}
            title={
              activeTab === "deleted"
                ? `${currentMode === "memo" ? checkedDeletedMemos.size : checkedDeletedTasks.size}件の${currentMode === "memo" ? "メモ" : "タスク"}を完全削除`
                : `${currentMode === "memo" ? checkedMemos.size : checkedTasks.size}件の${currentMode === "memo" ? "メモ" : "タスク"}を削除`
            }
          >
            <TrashIcon />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {currentMode === "memo"
                ? activeTab === "deleted"
                  ? checkedDeletedMemos.size
                  : checkedMemos.size
                : activeTab === "deleted"
                  ? checkedDeletedTasks.size
                  : checkedTasks.size}
            </span>
          </button>
        )}
      </div>

      {/* 右側：詳細表示（選択時のみ表示） */}
      {rightPanelMode !== "hidden" && (
        <div className="w-1/2 h-full overflow-y-auto animate-slide-in-right relative">
          {/* 区切り線の閉じるボタン */}
          <button
            onClick={() => {
              setRightPanelMode("hidden");
              if (selectedMemo) {
                onSelectMemo(null as unknown as Memo, true);
              } else if (selectedDeletedMemo) {
                onSelectDeletedMemo(null as unknown as DeletedMemo, true);
              } else if (selectedTask) {
                onSelectTask!(null, true);
              } else if (selectedDeletedTask) {
                onSelectDeletedTask!(null as unknown as DeletedTask, true);
              }
            }}
            className="absolute -left-3 top-[40%] transform -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors z-10"
          >
            <svg
              className="w-4 h-4"
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
          </button>
          {rightPanelMode === "create" ? (
            currentMode === "task" ? (
              <TaskCreator onClose={() => setRightPanelMode("hidden")} />
            ) : (
              <MemoCreator onClose={() => setRightPanelMode("hidden")} />
            )
          ) : rightPanelMode === "view" ? (
            <div className="p-6">
              {selectedMemo ? (
                <MemoEditor memo={selectedMemo} onClose={() => {}} onDeleteAndSelectNext={handleDeleteAndSelectNextInOrder} />
              ) : selectedTask ? (
                <TaskEditor 
                  task={selectedTask} 
                  onClose={() => {}} 
                  onSelectTask={onSelectTask}
                  onClosePanel={() => setRightPanelMode("hidden")}
                />
              ) : selectedDeletedMemo ? (
                <DeletedMemoViewer memo={selectedDeletedMemo} onClose={() => {}} />
              ) : selectedDeletedTask ? (
                <div>削除済みタスクビューアー（未実装）</div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default DesktopListView;
