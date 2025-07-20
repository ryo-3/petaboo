import MemoCard from "@/components/features/memo/memo-card";
import MemoEditor from "@/components/features/memo/memo-editor";
import MemoListItem from "@/components/features/memo/memo-list-item";
import TaskCard from "@/components/features/task/task-card";
import TaskEditor from "@/components/features/task/task-editor";
import TaskListItem from "@/components/features/task/task-list-item";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import TrashIcon from "@/components/icons/trash-icon";
import DesktopUpper from "@/components/layout/desktop-upper";
import Tooltip from "@/components/ui/base/tooltip";
import AddItemButton from "@/components/ui/buttons/add-item-button";
import RightPanel from "@/components/ui/layout/right-panel";
import {
  useAddItemToBoard,
  useBoardWithItems,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { useMemos } from "@/src/hooks/use-memos";
import { useTasks } from "@/src/hooks/use-tasks";
import { BoardItemWithContent } from "@/src/types/board";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useState } from "react";
import BoardHeader from "./board-header";

interface BoardDetailProps {
  boardId: number;
  onBack: () => void;
  selectedMemo?: Memo | null;
  selectedTask?: Task | null;
  onSelectMemo?: (memo: Memo | null) => void;
  onSelectTask?: (task: Task | null) => void;
  onClearSelection?: () => void;
  initialBoardName?: string;
  initialBoardDescription?: string | null;
  showBoardHeader?: boolean;
  serverInitialTitle?: string;
  boardCompleted?: boolean;
  isDeleted?: boolean;
}

interface ExportData {
  name: string;
  description: string | null;
  createdAt: string;
  memos: {
    title: string;
    content: string | null;
    createdAt: string;
  }[];
  tasks: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
    createdAt: string;
  }[];
}

function BoardDetail({
  boardId,
  onBack,
  selectedMemo: propSelectedMemo,
  selectedTask: propSelectedTask,
  onSelectMemo,
  onSelectTask,
  onClearSelection,
  initialBoardName,
  initialBoardDescription,
  showBoardHeader = true,
  serverInitialTitle,
  boardCompleted = false,
  isDeleted = false,
}: BoardDetailProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [activeTaskTab, setActiveTaskTab] = useState<
    "todo" | "in_progress" | "completed" | "deleted"
  >("todo");
  const [activeMemoTab, setActiveMemoTab] = useState<"normal" | "deleted">(
    "normal"
  );
  const [showTabText, setShowTabText] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<
    "editor" | "memo-list" | "task-list" | null
  >(null);
  const [selectedItemsFromList, setSelectedItemsFromList] = useState<
    Set<number>
  >(new Set());

  // 表示モード状態（memo-screenと同様）
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [columnCount, setColumnCount] = useState(2);
  const [showEditDate, setShowEditDate] = useState(false);
  
  // ボードレイアウト状態（横並び/縦並び + 反転）
  const [boardLayout, setBoardLayout] = useState<"horizontal" | "vertical">("horizontal");
  const [isReversed, setIsReversed] = useState(false);
  
  // コンテンツフィルター状態
  const [showMemo, setShowMemo] = useState(true);
  const [showTask, setShowTask] = useState(true);

  // propsから選択状態を使用（Fast Refresh対応）
  const selectedMemo = propSelectedMemo;
  const selectedTask = propSelectedTask;

  // 計算されたカラム数（右パネル表示時は最大2列に制限）
  const effectiveColumnCount = 
    (selectedMemo || selectedTask || rightPanelMode)
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  // ボードレイアウト変更ハンドラー（反転機能付き）
  const handleBoardLayoutChange = useCallback((newLayout: "horizontal" | "vertical") => {
    if (boardLayout === newLayout) {
      // 同じレイアウトをクリックした場合は反転
      setIsReversed(prev => !prev);
    } else {
      // 異なるレイアウトの場合は変更して反転状態をリセット
      setBoardLayout(newLayout);
      setIsReversed(false);
    }
  }, [boardLayout]);

  // 設定画面への遷移
  const handleSettings = useCallback(() => {
    const boardSlug = pathname.split("/")[2];
    router.push(`/boards/${boardSlug}/settings`);
  }, [pathname, router]);

  const { data: boardWithItems, isLoading, error } = useBoardWithItems(boardId);
  const removeItemFromBoard = useRemoveItemFromBoard();
  const addItemToBoard = useAddItemToBoard();
  const { data: allMemos } = useMemos();
  const { data: allTasks } = useTasks();

  // リストパネル表示時に選択状態をリセット
  useEffect(() => {
    if (rightPanelMode === "memo-list" || rightPanelMode === "task-list") {
      setSelectedItemsFromList(new Set());
    }
  }, [rightPanelMode]);

  // メモボタンのハンドラー（一覧表示中は切り替え）
  const handleMemoToggle = useCallback((show: boolean) => {
    if (rightPanelMode === "task-list") {
      // タスク一覧表示中にメモボタンを押したらメモ一覧に切り替え
      setRightPanelMode("memo-list");
    } else {
      // 通常の表示/非表示切り替え
      setShowMemo(show);
    }
  }, [rightPanelMode]);

  // タスクボタンのハンドラー（一覧表示中は切り替え）
  const handleTaskToggle = useCallback((show: boolean) => {
    if (rightPanelMode === "memo-list") {
      // メモ一覧表示中にタスクボタンを押したらタスク一覧に切り替え
      setRightPanelMode("task-list");
    } else {
      // 通常の表示/非表示切り替え
      setShowTask(show);
    }
  }, [rightPanelMode]);

  // 右パネルの開閉に応じてタブテキストの表示を制御
  useEffect(() => {
    if (selectedMemo || selectedTask || rightPanelMode) {
      // 右パネルが開いたらすぐにテキストを非表示
      setShowTabText(false);
    } else {
      // 右パネルが閉じたら300ms後にテキストを表示
      const timer = setTimeout(() => {
        setShowTabText(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedMemo, selectedTask, rightPanelMode]);

  // ボード名は即座に表示
  const boardName = initialBoardName || boardWithItems?.name || "ボード";
  const boardDescription =
    initialBoardDescription || boardWithItems?.description;

  // console.log('🔍 BoardDetail状態:', {
  //   initialBoardName,
  //   boardWithItemsName: boardWithItems?.name,
  //   boardName,
  //   isLoading,
  //   error: !!error
  // });

  // ページタイトル設定
  useEffect(() => {
    document.title = `${boardName} - ボード`;
    return () => {
      document.title = "メモ帳アプリ";
    };
  }, [boardName]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRemoveItem = async (item: BoardItemWithContent) => {
    if (confirm("このアイテムをボードから削除しますか？")) {
      try {
        await removeItemFromBoard.mutateAsync({
          boardId,
          itemId: item.itemId,
          itemType: item.itemType,
        });
        // 削除したアイテムが選択されていた場合、選択を解除
        if (
          item.itemType === "memo" &&
          selectedMemo &&
          selectedMemo.id === item.itemId
        ) {
          onClearSelection?.();
        } else if (
          item.itemType === "task" &&
          selectedTask &&
          selectedTask.id === item.itemId
        ) {
          onClearSelection?.();
        }
      } catch (error) {
        console.error("Failed to remove item:", error);
      }
    }
  };

  const handleSelectMemo = useCallback(
    (memo: Memo) => {
      console.log(
        "🟣 handleSelectMemo called with:",
        memo.id,
        "rightPanelMode:",
        rightPanelMode
      );
      setRightPanelMode(null); // リストモードを解除
      onSelectMemo?.(memo);
    },
    [onSelectMemo, rightPanelMode]
  );

  const handleSelectTask = useCallback(
    (task: Task) => {
      console.log(
        "🔷 handleSelectTask called with:",
        task.id,
        "rightPanelMode:",
        rightPanelMode
      );
      setRightPanelMode(null); // リストモードを解除
      onSelectTask?.(task);
    },
    [onSelectTask, rightPanelMode]
  );

  const handleCloseDetail = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  // タスクタブ切り替え時の処理
  const handleTaskTabChange = useCallback(
    (newTab: "todo" | "in_progress" | "completed" | "deleted") => {
      setActiveTaskTab(newTab);
      // 選択解除は行わない（タブ切り替えで選択状態は保持）
    },
    []
  );

  // メモタブ切り替え時の処理
  const handleMemoTabChange = useCallback((newTab: "normal" | "deleted") => {
    setActiveMemoTab(newTab);
    // 選択解除は行わない（タブ切り替えで選択状態は保持）
  }, []);

  // 新規メモ作成
  const handleCreateNewMemo = useCallback(() => {
    console.log(
      "🟢 handleCreateNewMemo called, rightPanelMode:",
      rightPanelMode
    );
    setRightPanelMode(null); // リストモードを解除
    const newMemo: Memo = {
      id: 0, // 新規作成時は0
      title: "",
      content: "",
      createdAt: Date.now() / 1000,
      updatedAt: Date.now() / 1000,
    };
    console.log("🟢 calling onSelectMemo with:", newMemo);
    onSelectMemo?.(newMemo);
  }, [onSelectMemo, rightPanelMode]);

  // 新規タスク作成
  const handleCreateNewTask = useCallback(() => {
    console.log(
      "🔵 handleCreateNewTask called, rightPanelMode:",
      rightPanelMode
    );
    setRightPanelMode(null); // リストモードを解除
    const newTask: Task = {
      id: 0, // 新規作成時は0
      title: "",
      description: null,
      status: activeTaskTab === "deleted" ? "todo" : activeTaskTab, // 削除済みタブの場合は未着手にする
      priority: "medium",
      dueDate: null,
      categoryId: null,
      createdAt: Date.now() / 1000,
      updatedAt: Date.now() / 1000,
    };
    console.log("🔵 calling onSelectTask with:", newTask);
    onSelectTask?.(newTask);
  }, [onSelectTask, activeTaskTab, rightPanelMode]);


  // 一覧からボードに追加
  const handleAddSelectedItems = useCallback(async () => {
    if (selectedItemsFromList.size === 0) return;

    try {
      const itemType = rightPanelMode === "memo-list" ? "memo" : "task";
      const existingItemIds =
        boardWithItems?.items
          .filter((item) => item.itemType === itemType)
          .map((item) => item.itemId) || [];

      // 重複していないアイテムのみを追加
      const itemsToAdd = Array.from(selectedItemsFromList).filter(
        (itemId) => !existingItemIds.includes(itemId)
      );

      if (itemsToAdd.length === 0) {
        alert("選択されたアイテムは既にボードに追加されています");
        return;
      }

      const promises = itemsToAdd.map((itemId) => {
        return addItemToBoard.mutateAsync({
          boardId,
          data: { itemType, itemId },
        });
      });

      await Promise.all(promises);
      setRightPanelMode(null);
      setSelectedItemsFromList(new Set());

      if (itemsToAdd.length < selectedItemsFromList.size) {
        alert(`${itemsToAdd.length}件のアイテムを追加しました（重複分は除外）`);
      }
    } catch (error) {
      console.error("Failed to add items to board:", error);
    }
  }, [
    selectedItemsFromList,
    rightPanelMode,
    boardId,
    addItemToBoard,
    boardWithItems,
  ]);

  // 一覧でのアイテム選択切り替え
  const handleToggleItemSelection = useCallback((itemId: number) => {
    setSelectedItemsFromList((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // 右パネルを閉じる
  const handleCloseRightPanel = useCallback(() => {
    setRightPanelMode(null);
    setSelectedItemsFromList(new Set());
    onClearSelection?.();
  }, [onClearSelection]);

  const handleExport = () => {
    if (!boardWithItems) return;

    const exportData = {
      name: boardName,
      description: boardDescription || null,
      createdAt: new Date(
        (boardWithItems.createdAt as number) * 1000
      ).toLocaleString("ja-JP"),
      memos: memoItems.map((item) => {
        const memo = item.content as Memo;
        return {
          title: memo.title,
          content: memo.content,
          createdAt: new Date((memo.createdAt as number) * 1000).toLocaleString(
            "ja-JP"
          ),
        };
      }),
      tasks: taskItems.map((item) => {
        const task = item.content as Task;
        return {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          createdAt: new Date((task.createdAt as number) * 1000).toLocaleString(
            "ja-JP"
          ),
        };
      }),
    };

    const textContent = formatAsText(exportData);
    downloadAsFile(textContent, `${boardName}.txt`);
  };

  const formatAsText = (data: ExportData) => {
    let text = `ボード名: ${data.name}\n`;
    if (data.description) {
      text += `説明: ${data.description}\n`;
    }
    text += `作成日: ${data.createdAt}\n\n`;

    if (data.memos.length > 0) {
      text += "## メモ\n";
      data.memos.forEach((memo, index: number) => {
        text += `${index + 1}. ${memo.title}\n`;
        if (memo.content) {
          text += `   ${memo.content.replace(/\n/g, "\n   ")}\n`;
        }
        text += `   作成日: ${memo.createdAt}\n\n`;
      });
    }

    if (data.tasks.length > 0) {
      text += "## タスク\n";
      data.tasks.forEach((task, index: number) => {
        const statusText =
          task.status === "completed"
            ? "完了"
            : task.status === "in_progress"
              ? "進行中"
              : "未着手";
        const priorityText =
          task.priority === "high"
            ? "高"
            : task.priority === "low"
              ? "低"
              : "中";

        text += `${index + 1}. [${statusText}] ${task.title} (優先度: ${priorityText})\n`;
        if (task.description) {
          text += `   ${task.description.replace(/\n/g, "\n   ")}\n`;
        }
        text += `   作成日: ${task.createdAt}\n\n`;
      });
    }

    return text;
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // エラー時のみエラー表示
  if (error) {
    return (
      <div className={showBoardHeader ? "p-6" : ""}>
        {showBoardHeader && (
          <BoardHeader
            boardId={boardId}
            boardName={serverInitialTitle || boardName}
            boardDescription={boardDescription}
            boardCompleted={boardCompleted}
            isDeleted={isDeleted}
            onExport={() => {}}
            isExportDisabled={true}
          />
        )}
        <div className="text-center py-8">
          <p className="text-red-500">アイテムの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  // メモとタスクのアイテムを分離（読み込み中も空配列で処理）
  const allMemoItems =
    boardWithItems?.items.filter((item) => item.itemType === "memo") || [];
  const allTaskItems =
    boardWithItems?.items.filter((item) => item.itemType === "task") || [];

  // アクティブタブに応じてメモをフィルタリング
  const memoItems = allMemoItems.filter(() => {
    if (activeMemoTab === "deleted") {
      // 削除済みは将来的に別のAPIから取得予定、現在は空配列
      return false;
    }
    return true; // normal の場合はすべて表示
  });

  // アクティブタブに応じてタスクをフィルタリング
  const taskItems = allTaskItems.filter((item) => {
    const task = item.content as Task;
    if (activeTaskTab === "deleted") {
      // 削除済みは将来的に別のAPIから取得予定、現在は空配列
      return false;
    }
    return task.status === activeTaskTab;
  });

  // 各ステータスの件数を計算
  const todoCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "todo"
  ).length;
  const inProgressCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "in_progress"
  ).length;
  const completedCount = allTaskItems.filter(
    (item) => (item.content as Task).status === "completed"
  ).length;
  const deletedCount = 0; // 削除済みタスクの件数（将来実装）

  // メモの件数を計算
  const normalMemoCount = allMemoItems.length;
  const deletedMemoCount = 0; // 削除済みメモの件数（将来実装）

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* 左側：メモ・タスク一覧 */}
      <div
        className={`${
          selectedMemo || selectedTask || rightPanelMode
            ? rightPanelMode
              ? "w-[30%] border-r border-gray-300" // リスト表示時は広め
              : "w-[47%] border-r border-gray-300" // エディター表示時
            : "w-full"
        } pt-3 pl-5 pr-4 ${selectedMemo || selectedTask || rightPanelMode ? "pr-2" : "pr-4"} flex flex-col transition-all duration-300 relative`}
      >
        {/* DesktopUpper コントロール（BoardHeaderの代わり） */}
        <div>
          <DesktopUpper
            currentMode="board"
            activeTab="normal"
            onTabChange={() => {}} // ボードではタブ切り替えは無効
            onCreateNew={() => {}} // 既存のボタンを使用
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            columnCount={columnCount}
            onColumnCountChange={setColumnCount}
            rightPanelMode={
              selectedMemo || selectedTask || rightPanelMode ? "view" : "hidden"
            }
            customTitle={boardName || "ボード詳細"}
            boardDescription={boardDescription}
            boardId={boardId}
            onBoardExport={handleExport}
            onBoardSettings={handleSettings}
            isExportDisabled={false}
            marginBottom="mb-3"
            headerMarginBottom="mb-1"
            showEditDate={showEditDate}
            onShowEditDateChange={setShowEditDate}
            boardLayout={boardLayout}
            onBoardLayoutChange={handleBoardLayoutChange}
            showMemo={rightPanelMode === "task-list" ? false : showMemo}
            showTask={rightPanelMode === "memo-list" ? false : showTask}
            onMemoToggle={handleMemoToggle}
            onTaskToggle={handleTaskToggle}
            contentFilterRightPanelMode={rightPanelMode}
            normalCount={allMemoItems.length + allTaskItems.length}
            completedCount={completedCount}
            deletedCount={deletedCount + deletedMemoCount}
          />
        </div>

        {/* メモ・タスクコンテンツ */}
        <div
          className={`${
            rightPanelMode === "memo-list" || rightPanelMode === "task-list" 
              ? "flex flex-col" 
              : (!showMemo || !showTask) || boardLayout === "vertical"
                ? isReversed ? "flex flex-col-reverse" : "flex flex-col"
                : `grid grid-cols-1 lg:grid-cols-2${isReversed ? " [&>*:nth-child(1)]:order-2 [&>*:nth-child(2)]:order-1" : ""}`
          } gap-4 flex-1 min-h-0`}
        >
          {/* メモ列 */}
          {rightPanelMode !== "task-list" && showMemo && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
                    メモ
                  </h2>
                  <span className="font-normal text-gray-500">
                    {allMemoItems.length}
                  </span>
                  <Tooltip text="新規追加" position="top">
                    <AddItemButton
                      itemType="memo"
                      onClick={handleCreateNewMemo}
                      size="small"
                      showTooltip={false}
                      customSize={{
                        padding: "p-1",
                        iconSize: "size-5",
                      }}
                      className="size-6 flex items-center justify-center"
                    />
                  </Tooltip>
                  <Tooltip text="メモ一覧表示" position="top">
                    <button
                      onClick={() => setRightPanelMode("memo-list")}
                      className="size-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <MemoIcon className="size-5 text-Green" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* メモステータスタブ */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <button
                  onClick={() => handleMemoTabChange("normal")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
                    activeMemoTab === "normal"
                      ? "bg-gray-200"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
                  {showTabText && <span>通常</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {normalMemoCount}
                  </span>
                </button>
                <button
                  onClick={() => handleMemoTabChange("deleted")}
                  className={`flex items-center px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
                    activeMemoTab === "deleted"
                      ? "bg-red-100"
                      : "bg-gray-100 hover:bg-red-100"
                  }`}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span
                    className={`text-xs transition-all overflow-hidden text-right ${
                      activeMemoTab === "deleted"
                        ? "opacity-100 w-9 translate-x-0 px-2 ml-1"
                        : "opacity-0 w-0 translate-x-2 px-0"
                    }`}
                  >
                    {deletedMemoCount}
                  </span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 pb-10 mb-2">
                {isLoading ? (
                  <div className="text-gray-500 text-center py-8">
                    メモを読み込み中...
                  </div>
                ) : memoItems.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    {activeMemoTab === "deleted"
                      ? "削除済みメモがありません"
                      : "メモがありません"}
                  </div>
                ) : (
                  <div 
                    className={`grid gap-4 ${
                      effectiveColumnCount === 1 ? "grid-cols-1" :
                      effectiveColumnCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                      effectiveColumnCount === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
                      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    }`}
                  >
                    {memoItems.map((item) => {
                      const memo = item.content as Memo;
                      const Component = viewMode === "card" ? MemoCard : MemoListItem;
                      return (
                        <Component
                          key={memo.id}
                          memo={memo}
                          isChecked={false}
                          onToggleCheck={() => {}}
                          onSelect={() => handleSelectMemo(memo)}
                          isSelected={selectedMemo?.id === memo.id}
                          showEditDate={showEditDate}
                          variant="normal"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* タスク列 */}
          {rightPanelMode !== "memo-list" && showTask && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-1">
                    タスク
                  </h2>
                  <span className="font-normal text-gray-500">
                    {allTaskItems.length}
                  </span>
                  <Tooltip text="新規追加" position="top">
                    <AddItemButton
                      itemType="task"
                      onClick={handleCreateNewTask}
                      size="small"
                      showTooltip={false}
                      customSize={{
                        padding: "p-1",
                        iconSize: "size-5",
                      }}
                      className="size-6 flex items-center justify-center"
                    />
                  </Tooltip>
                  <Tooltip text="タスク一覧表示" position="top">
                    <button
                      onClick={() => setRightPanelMode("task-list")}
                      className="size-6 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <TaskIcon className="size-5 text-DeepBlue" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* タスクステータスタブ */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <button
                  onClick={() => handleTaskTabChange("todo")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
                    activeTaskTab === "todo"
                      ? "bg-zinc-200"
                      : "bg-gray-100 hover:bg-zinc-200"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-400"></div>
                  {showTabText && <span>未着手</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {todoCount}
                  </span>
                </button>
                <button
                  onClick={() => handleTaskTabChange("in_progress")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
                    activeTaskTab === "in_progress"
                      ? "bg-blue-100"
                      : "bg-gray-100 hover:bg-blue-100"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-Blue"></div>
                  {showTabText && <span>進行中</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {inProgressCount}
                  </span>
                </button>
                <button
                  onClick={() => handleTaskTabChange("completed")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
                    activeTaskTab === "completed"
                      ? "bg-Green/20"
                      : "bg-gray-100 hover:bg-Green/20"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-Green"></div>
                  {showTabText && <span>完了</span>}
                  <span className="bg-white/20 text-[11px] px-1 py-0.5 rounded-full min-w-[20px] text-center">
                    {completedCount}
                  </span>
                </button>
                <button
                  onClick={() => handleTaskTabChange("deleted")}
                  className={`flex items-center px-2 py-1 rounded-lg font-medium transition-colors text-gray-600 text-sm h-7 ${
                    activeTaskTab === "deleted"
                      ? "bg-red-100"
                      : "bg-gray-100 hover:bg-red-100"
                  }`}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span
                    className={`text-xs transition-all overflow-hidden text-right ${
                      activeTaskTab === "deleted"
                        ? "opacity-100 w-9 translate-x-0 px-2 ml-1"
                        : "opacity-0 w-0 translate-x-2 px-0"
                    }`}
                  >
                    {deletedCount}
                  </span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 pb-10 mb-2">
                {isLoading ? (
                  <div className="text-gray-500 text-center py-8">
                    タスクを読み込み中...
                  </div>
                ) : taskItems.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    {activeTaskTab === "deleted"
                      ? "削除済みタスクがありません"
                      : "タスクがありません"}
                  </div>
                ) : (
                  <div 
                    className={`grid gap-4 ${
                      effectiveColumnCount === 1 ? "grid-cols-1" :
                      effectiveColumnCount === 2 ? "grid-cols-1 md:grid-cols-2" :
                      effectiveColumnCount === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
                      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    }`}
                  >
                    {taskItems.map((item) => {
                      const task = item.content as Task;
                      const Component = viewMode === "card" ? TaskCard : TaskListItem;
                      return (
                        <Component
                          key={task.id}
                          task={task}
                          isChecked={false}
                          onToggleCheck={() => {}}
                          onSelect={() => handleSelectTask(task)}
                          isSelected={selectedTask?.id === task.id}
                          showEditDate={showEditDate}
                          variant="normal"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フローティング：一覧へ戻るボタン */}
        <div className="fixed bottom-3 left-3 z-10">
          <Tooltip text="一覧へ戻る" position="right">
            <button
              onClick={onBack}
              className="p-1 size-9 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 rounded-lg border border-gray-200 transition-all flex items-center gap-2"
            >
              <svg
                className="size-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 右側：詳細表示 */}
      <RightPanel
        isOpen={
          selectedMemo !== null ||
          selectedTask !== null ||
          rightPanelMode !== null
        }
        onClose={rightPanelMode ? handleCloseRightPanel : handleCloseDetail}
      >
        {selectedMemo && !selectedTask && rightPanelMode === null && (
          <>
            {console.log(
              "🎯 Rendering MemoEditor - selectedMemo:",
              selectedMemo.id,
              "rightPanelMode:",
              rightPanelMode
            )}
            <MemoEditor
              key={`memo-${selectedMemo.id}`}
              memo={selectedMemo}
              onClose={() => {
                console.log("🔍 MemoEditor onClose called");
                // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
              }}
              onSaveComplete={(savedMemo) => {
                // 保存後に選択状態を更新
                console.log("🔍 MemoEditor onSaveComplete:", savedMemo.id);
                onSelectMemo?.(savedMemo);
              }}
            />
          </>
        )}

        {selectedTask && !selectedMemo && rightPanelMode === null && (
          <TaskEditor
            key={`task-${selectedTask.id}`}
            task={selectedTask}
            onClose={() => {
              console.log("🔍 TaskEditor onClose called");
              // エディター内からの閉じる操作は無視（右パネルの×ボタンのみで閉じる）
            }}
            onSaveComplete={(savedTask) => {
              // 保存後に選択状態を更新
              console.log("🔍 TaskEditor onSaveComplete:", savedTask.id);
              onSelectTask?.(savedTask);
            }}
          />
        )}

        {/* メモ一覧表示 */}
        {rightPanelMode === "memo-list" && (
          <div className="flex flex-col h-full bg-white pt-2 pl-2">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">メモ一覧から追加</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSelectedItems}
                  disabled={selectedItemsFromList.size === 0}
                  className="px-3 py-1 bg-Green text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  追加 ({selectedItemsFromList.size})
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              {allMemos?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  メモがありません
                </div>
              ) : (
                allMemos?.map((memo: Memo) => (
                  <MemoListItem
                    key={memo.id}
                    memo={memo}
                    isChecked={selectedItemsFromList.has(memo.id)}
                    onToggleCheck={() => handleToggleItemSelection(memo.id)}
                    onSelect={() => handleToggleItemSelection(memo.id)}
                    variant="normal"
                    isSelected={false}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* タスク一覧表示 */}
        {rightPanelMode === "task-list" && (
          <div className="flex flex-col h-full bg-white pt-2 pl-2">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">タスク一覧から追加</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSelectedItems}
                  disabled={selectedItemsFromList.size === 0}
                  className="px-3 py-1 bg-DeepBlue text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  追加 ({selectedItemsFromList.size})
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
              {allTasks?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  タスクがありません
                </div>
              ) : (
                allTasks?.map((task: Task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    isChecked={selectedItemsFromList.has(task.id)}
                    onToggleCheck={() => handleToggleItemSelection(task.id)}
                    onSelect={() => handleToggleItemSelection(task.id)}
                    variant="normal"
                    isSelected={false}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </RightPanel>
    </div>
  );
}

export default memo(BoardDetail);
