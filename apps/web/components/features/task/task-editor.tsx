"use client";

import BaseViewer from "@/components/shared/base-viewer";
import { SingleDeleteConfirmation } from "@/components/ui/modals";
import TaskForm from "./task-form";
import { useUpdateTask, useCreateTask } from "@/src/hooks/use-tasks";
import { useAddItemToBoard, useBoards, useItemBoards, useRemoveItemFromBoard } from "@/src/hooks/use-boards";
import BoardChangeModal from "@/components/ui/modals/board-change-modal";
import type { Task } from "@/src/types/task";
import { useCallback, useEffect, useState, useMemo, memo } from "react";
import { useTaskDelete } from "./use-task-delete";

interface TaskEditorProps {
  task?: Task | null;
  onClose: () => void;
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void;
  onClosePanel?: () => void;
  onDeleteAndSelectNext?: (deletedTask: Task, preDeleteDisplayOrder?: number[]) => void;
  onSaveComplete?: (savedTask: Task, isNewTask: boolean) => void;
  customHeight?: string;
}

function TaskEditor({
  task,
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
  const isNewTask = !task;
  
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

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<"todo" | "in_progress" | "completed">(
    task?.status || "todo"
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    task?.priority || "medium"
  );
  const [categoryId, setCategoryId] = useState<number | null>(task?.categoryId ?? null);
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] || "" : ""
  );
  
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
  } | null>(null);

  // 変更があるかチェック（useMemoで最適化）
  const hasChanges = useMemo(() => {
    if (!originalData) return false; // originalDataがない間は保存ボタンを無効に
    
    return title.trim() !== originalData.title.trim() ||
      description.trim() !== originalData.description.trim() ||
      status !== originalData.status ||
      priority !== originalData.priority ||
      categoryId !== originalData.categoryId ||
      dueDate !== originalData.dueDate;
  }, [title, description, status, priority, categoryId, dueDate, originalData]);

  // 新規作成時の保存可能性チェック
  const canSave = isNewTask ? !!title.trim() : hasChanges;


  // taskプロパティが変更された時にstateを更新
  useEffect(() => {
    if (task) {
      const taskTitle = task.title || "";
      const taskDescription = task.description || "";
      const taskStatus = task.status || "todo";
      const taskPriority = task.priority || "medium";
      const taskDueDate = task.dueDate
        ? new Date(task.dueDate * 1000).toISOString().split("T")[0]
        : "";
      
      const newData = {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        status: taskStatus,
        priority: taskPriority,
        categoryId: task.categoryId || null,
        dueDate: taskDueDate || ""
      };
      
      // stateと元データを同時に更新して変更検知のずれを防ぐ
      setTitle(taskTitle);
      setDescription(taskDescription);
      setStatus(taskStatus);
      setPriority(taskPriority);
      setCategoryId(task.categoryId || null);
      setDueDate(taskDueDate || "");
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
        dueDate: ""
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
  }, [task]);

  // ボード選択の初期化
  useEffect(() => {
    const currentBoardIds = itemBoards.map(board => board.id.toString());
    console.log('🔍 TaskEditor ボード初期化:', {
      taskId: task?.id,
      itemBoards: itemBoards.length,
      currentBoardIds,
      selectedBoardIds: selectedBoardIds.length,
      availableBoards: boards.length,
      boardsData: boards.map(b => ({ id: b.id, name: b.name }))
    });
    setSelectedBoardIds(currentBoardIds);
  }, [itemBoards, boards]);

  // ボード変更ハンドラー
  const handleBoardChange = (newBoardIds: string | string[]) => {
    console.log('🔍 TaskEditor ボード変更開始:', {
      newBoardIds,
      type: Array.isArray(newBoardIds) ? 'array' : 'string',
      currentSelectedBoardIds: selectedBoardIds
    });
    
    const newIds = Array.isArray(newBoardIds) ? newBoardIds : [newBoardIds];
    const currentIds = selectedBoardIds;

    const toAdd = newIds.filter(id => id !== "" && !currentIds.includes(id));
    const toRemove = currentIds.filter(id => !newIds.includes(id));

    console.log('🔍 TaskEditor ボード変更計算:', {
      newIds,
      currentIds, 
      toAdd,
      toRemove
    });

    if (toAdd.length > 0 || toRemove.length > 0) {
      setPendingBoardChanges({ toAdd, toRemove });
      setShowBoardChangeModal(true);
    }
  };

  const handleConfirmBoardChange = () => {
    setSelectedBoardIds(prev => {
      const filtered = prev.filter(id => !pendingBoardChanges.toRemove.includes(id));
      return [...filtered, ...pendingBoardChanges.toAdd];
    });
    setShowBoardChangeModal(false);
    setPendingBoardChanges({ toAdd: [], toRemove: [] });
  };

  const handleCancelBoardChange = () => {
    setShowBoardChangeModal(false);
    setPendingBoardChanges({ toAdd: [], toRemove: [] });
  };

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

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
                  itemId: newTask.id,
                },
              });
            }
          } catch (error) {
            console.error('Failed to add task to boards:', error);
          }
        }
        
        onSaveComplete?.(newTask, true);
        
        // 新規作成後はフォームをリセット
        setTimeout(() => {
          const resetData = {
            title: "",
            description: "",
            status: "todo" as const,
            priority: "medium" as const,
            categoryId: null,
            dueDate: ""
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
        }, 400);
      } else {
        // 編集
        const updatedTask = await updateTask.mutateAsync({
          id: task!.id,
          data: taskData,
        });
        
        // ボード変更処理
        const currentBoardIds = itemBoards.map(board => board.id.toString());
        const toAdd = selectedBoardIds.filter(id => !currentBoardIds.includes(id));
        const toRemove = currentBoardIds.filter(id => !selectedBoardIds.includes(id));

        // ボードから削除
        for (const boardId of toRemove) {
          try {
            await removeItemFromBoard.mutateAsync({
              boardId: parseInt(boardId),
              itemId: task!.id,
              itemType: 'task'
            });
          } catch (error) {
            console.error('Failed to remove task from board:', error);
          }
        }

        // ボードに追加
        for (const boardId of toAdd) {
          try {
            await addItemToBoard.mutateAsync({
              boardId: parseInt(boardId),
              data: {
                itemType: 'task',
                itemId: task!.id,
              },
            });
          } catch (error) {
            console.error('Failed to add task to board:', error);
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
          dueDate: dueDate
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
          onDelete={showDeleteConfirmation}
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
          itemTitle={task?.title || ""}
          itemType="task"
          deleteType="normal"
          isLoading={isDeleting}
          position="right-panel"
        />
      )}

      {/* ボード変更確認モーダル */}
      <BoardChangeModal
        isOpen={showBoardChangeModal}
        onClose={handleCancelBoardChange}
        onConfirm={handleConfirmBoardChange}
        boardsToAdd={pendingBoardChanges.toAdd}
        boardsToRemove={pendingBoardChanges.toRemove}
      />
    </>
  );
}

export default memo(TaskEditor);
