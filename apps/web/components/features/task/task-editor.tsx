"use client";

import BaseViewer from "@/components/shared/base-viewer";
import DeleteButton from "@/components/ui/buttons/delete-button";
import { SingleDeleteConfirmation } from "@/components/ui/modals";
import TaskForm from "./task-form";
import { useUpdateTask, useCreateTask } from "@/src/hooks/use-tasks";
import { useAddItemToBoard } from "@/src/hooks/use-boards";
import type { Task } from "@/src/types/task";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useTaskDelete } from "./use-task-delete";
import { DELETE_BUTTON_POSITION } from "@/src/constants/ui";

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
  const [boardId, setBoardId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? new Date(task.dueDate * 1000).toISOString().split('T')[0] || "" : ""
  );
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
      setBoardId(null);
      setDueDate("");
      setError(null);
      setOriginalData(newData);
    }
  }, [task]);

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
        
        // ボード選択時はボードに追加
        if (boardId && newTask.id) {
          try {
            await addItemToBoard.mutateAsync({
              boardId,
              data: {
                itemType: 'task',
                itemId: newTask.id,
              },
            });
          } catch (error) {
            console.error('Failed to add task to board:', error);
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
          setBoardId(null);
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
      <div data-task-editor>
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
          boardId={boardId}
          onBoardChange={setBoardId}
          dueDate={dueDate}
          onDueDateChange={setDueDate}
          onSave={handleSave}
          isSaving={isSaving}
          hasChanges={canSave}
          savedSuccessfully={savedSuccessfully}
          isNewTask={isNewTask}
          customHeight={customHeight}
        />
        </BaseViewer>
      </div>
      
      {/* 削除ボタンは編集時のみ表示 */}
      {!isNewTask && (
        <DeleteButton
          className={`fixed ${DELETE_BUTTON_POSITION}`}
          data-right-panel-trash
          onDelete={showDeleteConfirmation}
          isAnimating={isLidOpen}
        />
      )}

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
        />
      )}
    </>
  );
}

export default TaskEditor;
