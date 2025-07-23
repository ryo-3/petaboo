"use client";

import BaseViewer from "@/components/shared/base-viewer";
import { SingleDeleteConfirmation } from "@/components/ui/modals";
import TaskForm, { TaskFormHandle } from "./task-form";
import { useUpdateTask, useCreateTask } from "@/src/hooks/use-tasks";
import { useAddItemToBoard, useBoards, useItemBoards, useRemoveItemFromBoard } from "@/src/hooks/use-boards";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import type { Task } from "@/src/types/task";
import { useCallback, useEffect, useState, useMemo, memo, useRef } from "react";
import { useTaskDelete } from "./use-task-delete";

interface TaskEditorProps {
  task?: Task | null;
  initialBoardId?: number;
  onClose: () => void;
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void;
  onClosePanel?: () => void;
  onDeleteAndSelectNext?: (deletedTask: Task, preDeleteDisplayOrder?: number[]) => void;
  onSaveComplete?: (savedTask: Task, isNewTask: boolean) => void;
  customHeight?: string;
}

function TaskEditor({
  task,
  initialBoardId,
  onClose,
  onSelectTask,
  onClosePanel,
  onDeleteAndSelectNext,
  onSaveComplete,
  customHeight,
}: TaskEditorProps) {
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const addItemToBoard = useAddItemToBoard();
  const removeItemFromBoard = useRemoveItemFromBoard();
  const { data: boards = [] } = useBoards();
  const { data: itemBoards = [] } = useItemBoards('task', task?.id);
  const isNewTask = !task || task.id === 0;
  const taskFormRef = useRef<TaskFormHandle>(null);
  
  // 削除機能は編集時のみ
  const {
    handleDelete,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
    isLidOpen,
  } = useTaskDelete({
    task: task || null,
    onClose,
    onSelectTask,
    onClosePanel,
    onDeleteAndSelectNext,
  });

  // 削除ボタンのハンドラー（ボード紐づきチェック付き）
  const handleDeleteClick = () => {
    if (itemBoards && itemBoards.length > 0) {
      // ボードに紐づいている場合はモーダル表示
      showDeleteConfirmation();
    } else {
      // ボードに紐づいていない場合も同様にモーダル表示
      showDeleteConfirmation();
    }
  };

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<"todo" | "in_progress" | "completed">(
    task?.status || "todo"
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    task?.priority || "medium"
  );
  const [categoryId, setCategoryId] = useState<number | null>(task?.categoryId ?? null);
  const [dueDate, setDueDate] = useState<string>(() => {
    try {
      return (task?.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] : "") as string;
    } catch {
      return "";
    }
  });
  
  // ボード選択関連の状態
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [showBoardChangeModal, setShowBoardChangeModal] = useState(false);
  const [pendingBoardChanges, setPendingBoardChanges] = useState<{
    toAdd: string[];
    toRemove: string[];
  }>({ toAdd: [], toRemove: [] });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  
  // 新規作成・編集両対応の仮タスクオブジェクト
  const tempTask: Task = task || {
    id: 0,
    title: title || "新規タスク",
    description: description,
    status: status,
    priority: priority,
    categoryId: categoryId,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
    dueDate: dueDate ? Math.floor(new Date(dueDate).getTime() / 1000) : null,
  };

  // 変更検知用のstate
  const [originalData, setOriginalData] = useState<{
    title: string;
    description: string;
    status: "todo" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
    categoryId: number | null;
    dueDate: string;
    boardIds: string[];
  } | null>(null);

  // 変更があるかチェック（useMemoで最適化）
  const hasChanges = useMemo(() => {
    if (!originalData) return false; // originalDataがない間は保存ボタンを無効に
    
    // ボードの変更をチェック
    const boardsChanged = JSON.stringify(selectedBoardIds.sort()) !== JSON.stringify(originalData.boardIds.sort());
    
    return title.trim() !== originalData.title.trim() ||
      description.trim() !== originalData.description.trim() ||
      status !== originalData.status ||
      priority !== originalData.priority ||
      categoryId !== originalData.categoryId ||
      dueDate !== originalData.dueDate ||
      boardsChanged;
  }, [title, description, status, priority, categoryId, dueDate, selectedBoardIds, originalData]);

  // 新規作成時の保存可能性チェック
  const canSave = isNewTask ? !!title.trim() : hasChanges;


  // taskプロパティが変更された時にstateを更新
  useEffect(() => {
    if (task) {
      const taskTitle = task.title || "";
      const taskDescription = task.description || "";
      const taskStatus = task.status || "todo";
      const taskPriority = task.priority || "medium";
      const taskDueDate = (() => {
        try {
          return (task.dueDate ? new Date(task.dueDate * 1000).toISOString().split("T")[0] : "") as string;
        } catch {
          return "";
        }
      })();
      
      const newData = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        status: taskStatus,
        priority: taskPriority,
        categoryId: task.categoryId || null,
        dueDate: taskDueDate,
        boardIds: []  // 後でuseEffectで設定される
      };
      
      // stateと元データを同時に更新して変更検知のずれを防ぐ
      setTitle(taskTitle);
      setDescription(taskDescription);
      setStatus(taskStatus);
      setPriority(taskPriority);
      setCategoryId(task.categoryId || null);
      setDueDate(taskDueDate);
      setError(null);
      setOriginalData(newData);
    } else {
      // 新規作成時の初期化
      const newData = {
        title: "",
        description: "",
        status: "todo" as const,
        priority: "medium" as const,
        categoryId: null,
        dueDate: "",
        boardIds: initialBoardId ? [initialBoardId.toString()] : []
      };
      
      // stateと元データを同時に更新
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setCategoryId(null);
      setDueDate("");
      setError(null);
      setOriginalData(newData);
    }
  }, [task, initialBoardId]);

  // ボード選択の初期化
  useEffect(() => {
    if (task && task.id !== 0) { // 新規作成時（id: 0）は実行しない
      const currentBoardIds = itemBoards.map(board => board.id.toString());
      setSelectedBoardIds(currentBoardIds);
      // originalDataのboardIdsも更新
      setOriginalData(prev => prev ? { ...prev, boardIds: currentBoardIds } : prev);
    } else if (!task || task.id === 0) {
      // 新規作成時は初期ボードIDがあればそれを設定、なければ空
      const initialBoards = initialBoardId ? [initialBoardId.toString()] : [];
      setSelectedBoardIds(initialBoards);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, itemBoards.length, initialBoardId]); // itemBoards自体ではなくlengthを依存に

  // ボード変更ハンドラー（保存時にモーダル表示）
  const handleBoardChange = (newBoardIds: string | string[]) => {
    const newIds = Array.isArray(newBoardIds) ? newBoardIds : [newBoardIds];
    // 選択状態のみ更新（モーダルは保存時に表示）
    setSelectedBoardIds(newIds);
  };

  // ボード変更と保存を実行する関数
  const executeBoardChangesAndSave = useCallback(async () => {
    const { toAdd, toRemove } = pendingBoardChanges;
    
    try {
      // ボードから削除
      for (const boardId of toRemove) {
        try {
          await removeItemFromBoard.mutateAsync({
            boardId: parseInt(boardId),
            itemId: task!.id,
            itemType: 'task'
          });
        } catch {
          // エラーは上位でハンドリング
        }
      }

      // ボードに追加（ID=0の新規タスクはスキップ）
      if (task && task.id > 0) {
        for (const boardId of toAdd) {
          try {
            await addItemToBoard.mutateAsync({
              boardId: parseInt(boardId),
              data: {
                itemType: 'task',
                itemId: task.id.toString(),
              },
            });
          } catch {
            // エラーは上位でハンドリング
          }
        }
      }
      
      // 現在のボードから外された場合は次のアイテムを選択
      if (initialBoardId && toRemove.includes(initialBoardId.toString()) && onDeleteAndSelectNext) {
        onDeleteAndSelectNext(task!);
        return;
      }
      
      onSaveComplete?.(task!, false);
      
      // 保存成功時にoriginalDataも更新（現在のstateの値を使用）
      setOriginalData({
        title: title.trim(),
        description: description.trim(),
        status: status,
        priority: priority,
        categoryId: categoryId,
        dueDate: dueDate,
        boardIds: selectedBoardIds
      });
    } catch (error) {
      console.error("ボード変更に失敗しました:", error);
      setError(
        "ボード変更に失敗しました。APIサーバーが起動していることを確認してください。"
      );
    }
  }, [pendingBoardChanges, removeItemFromBoard, addItemToBoard, task, onSaveComplete, title, description, status, priority, categoryId, dueDate, selectedBoardIds, initialBoardId, onDeleteAndSelectNext]);

  const handleConfirmBoardChange = useCallback(async () => {
    setShowBoardChangeModal(false);
    
    // モーダル確認後に実際の保存処理を実行
    await executeBoardChangesAndSave();
    
    setPendingBoardChanges({ toAdd: [], toRemove: [] });
  }, [executeBoardChangesAndSave]);

  const handleCancelBoardChange = () => {
    // モーダルをキャンセル（変更を元に戻す必要はない、選択状態はそのまま）
    setShowBoardChangeModal(false);
    setPendingBoardChanges({ toAdd: [], toRemove: [] });
  };

  // ボードIDを名前に変換する関数
  const getBoardName = (boardId: string) => {
    const board = boards.find(b => b.id.toString() === boardId);
    return board ? board.name : `ボード${boardId}`;
  };

  const handleSave = useCallback(async () => {
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);
    setSavedSuccessfully(false);
    
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        categoryId: categoryId || undefined,
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime() / 1000)
          : undefined,
      };

      if (isNewTask) {
        // 新規作成
        const newTask = await createTask.mutateAsync(taskData);
        setSavedSuccessfully(true);
        
        // 選択されたボードに追加
        if (selectedBoardIds.length > 0 && newTask.id) {
          try {
            for (const boardId of selectedBoardIds) {
              await addItemToBoard.mutateAsync({
                boardId: parseInt(boardId),
                data: {
                  itemType: 'task',
                  itemId: newTask.id.toString(),
                },
              });
            }
          } catch {
            // エラーは上位でハンドリング
          }
        }
        
        // 新規作成時は連続作成のため onSaveComplete を呼ばない
        // ボード詳細画面のタスク一覧はReact Queryのキャッシュ無効化で自動更新される
        
        // 新規作成後はフォームをリセット
        setTimeout(() => {
          const resetData = {
            title: "",
            description: "",
            status: "todo" as const,
            priority: "medium" as const,
            categoryId: null,
            dueDate: "",
            boardIds: []
          };
          
          setTitle("");
          setDescription("");
          setStatus("todo");
          setPriority("medium");
          setCategoryId(null);
          setSelectedBoardIds([]);
          setDueDate("");
          setSavedSuccessfully(false);
          
          // originalDataもリセット
          setOriginalData(resetData);
          
          // 少し遅延してタイトル入力欄にフォーカス
          setTimeout(() => {
            taskFormRef.current?.focusTitle();
          }, 100);
        }, 400);
      } else {
        // 編集
        // タスク内容の変更があるかチェック（ボード変更は除く）
        const hasContentChanges = title.trim() !== originalData!.title.trim() ||
          description.trim() !== originalData!.description.trim() ||
          status !== originalData!.status ||
          priority !== originalData!.priority ||
          categoryId !== originalData!.categoryId ||
          dueDate !== originalData!.dueDate;
        
        let updatedTask = task!;
        
        // タスク内容に変更がある場合のみ更新
        if (hasContentChanges) {
          updatedTask = await updateTask.mutateAsync({
            id: task!.id,
            data: taskData,
          });
        }
        
        // ボード変更処理
        const currentBoardIds = itemBoards.map(board => board.id.toString());
        const toAdd = selectedBoardIds.filter(id => !currentBoardIds.includes(id));
        const toRemove = currentBoardIds.filter(id => !selectedBoardIds.includes(id));

        // ボードを外す場合はモーダル表示
        if (toRemove.length > 0) {
          setPendingBoardChanges({ toAdd, toRemove });
          setShowBoardChangeModal(true);
          return;
        }

        // ボードから削除
        for (const boardId of toRemove) {
          try {
            await removeItemFromBoard.mutateAsync({
              boardId: parseInt(boardId),
              itemId: task!.id,
              itemType: 'task'
            });
          } catch {
            // エラーは上位でハンドリング
          }
        }

        // ボードに追加（既存タスクの場合のみ）
        if (task && task.id > 0) {
          for (const boardId of toAdd) {
            try {
              await addItemToBoard.mutateAsync({
                boardId: parseInt(boardId),
                data: {
                  itemType: 'task',
                  itemId: task.id.toString(),
                },
              });
            } catch {
              // エラーは上位でハンドリング
            }
          }
        }
        
        onSaveComplete?.(updatedTask, false);
        
        // 保存成功時にoriginalDataも更新（現在のstateの値を使用）
        setOriginalData({
          title: title.trim(),
          description: description.trim(),
          status: status,
          priority: priority,
          categoryId: categoryId,
          dueDate: dueDate,
          boardIds: selectedBoardIds
        });
      }
    } catch (error) {
      console.error("保存に失敗しました:", error);
      setError(
        "保存に失敗しました。APIサーバーが起動していることを確認してください。"
      );
      setIsSaving(false);
    } finally {
      // 保存中表示をしっかり見せる
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [
    title,
    description,
    status,
    priority,
    dueDate,
    categoryId,
    task,
    isNewTask,
    updateTask,
    createTask,
    onSaveComplete,
    addItemToBoard,
    removeItemFromBoard,
    selectedBoardIds,
    itemBoards,
    isSaving,
    originalData,
  ]);

  // Ctrl+Sショートカット（変更がある場合のみ実行）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canSave) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, canSave]);

  return (
    <>
      <div data-task-editor className="flex flex-col h-full">
        <BaseViewer
          item={tempTask}
          onClose={onClose}
          error={error ? "エラー" : null}
          headerActions={null}
          isEditing={true}
        >
        <TaskForm
          ref={taskFormRef}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          status={status}
          onStatusChange={setStatus}
          priority={priority}
          onPriorityChange={setPriority}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          selectedBoardIds={selectedBoardIds}
          onBoardChange={handleBoardChange}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          onSave={handleSave}
          onDelete={handleDeleteClick}
          isLidOpen={isLidOpen}
          isSaving={isSaving}
          hasChanges={canSave}
          savedSuccessfully={savedSuccessfully}
          isNewTask={isNewTask}
          customHeight={customHeight}
          boards={boards}
        />
        </BaseViewer>
      </div>
      

      {/* 削除確認モーダル（編集時のみ） */}
      {!isNewTask && (
        <SingleDeleteConfirmation
          isOpen={showDeleteModal}
          onClose={hideDeleteConfirmation}
          onConfirm={handleDelete}
          itemType="task"
          deleteType="normal"
          isLoading={isDeleting}
          position="center"
          customMessage={
            itemBoards && itemBoards.length > 0 ? (
              <div className="text-gray-700">
                このタスクは以下のボードに紐づいています
                <ul className="mt-2 space-y-1">
                  {itemBoards.map(board => (
                    <li key={board.id} className="text-gray-700">
                      • {board.name}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-sm text-gray-600">
                  削除すると各ボードの「削除済み」タブに移動します
                </div>
              </div>
            ) : undefined
          }
        />
      )}

      {/* ボード変更確認モーダル */}
      <BoardChangeModal
        isOpen={showBoardChangeModal}
        onClose={handleCancelBoardChange}
        onConfirm={handleConfirmBoardChange}
        boardsToAdd={pendingBoardChanges.toAdd.map(getBoardName)}
        boardsToRemove={pendingBoardChanges.toRemove.map(getBoardName)}
      />
    </>
  );
}

export default memo(TaskEditor);
