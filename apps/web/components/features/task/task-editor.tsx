"use client";

import BaseViewer from "@/components/shared/base-viewer";
import DeleteButton from "@/components/ui/buttons/delete-button";
import SaveButton from "@/components/ui/buttons/save-button";
import PhotoButton from "@/components/ui/buttons/photo-button";
import DateInput from "@/components/ui/inputs/date-input";
import { SingleDeleteConfirmation } from "@/components/ui/modals";
import CustomSelector from "@/components/ui/selectors/custom-selector";
import { useUpdateTask } from "@/src/hooks/use-tasks";
import type { Task } from "@/src/types/task";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTaskDelete } from "./use-task-delete";

interface TaskEditorProps {
  task: Task;
  onClose: () => void;
  onSelectTask?: (task: Task | null, fromFullList?: boolean) => void;
  onClosePanel?: () => void;
  onDeleteAndSelectNext?: (deletedTask: Task) => void;
}

function TaskEditor({
  task,
  onClose,
  onSelectTask,
  onClosePanel,
  onDeleteAndSelectNext,
}: TaskEditorProps) {
  const updateTask = useUpdateTask();
  const {
    handleDelete,
    showDeleteConfirmation,
    hideDeleteConfirmation,
    showDeleteModal,
    isDeleting,
  } = useTaskDelete({
    task,
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
  const [category, setCategory] = useState<string>(""); // カテゴリーを追加（未選択で開始）
  const [dueDate, setDueDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // textareaのrefを追加
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 変更検知用のstate
  const [originalData, setOriginalData] = useState<{
    title: string;
    description: string;
    status: "todo" | "in_progress" | "completed";
    priority: "low" | "medium" | "high";
    category: string;
    dueDate: string;
  } | null>(null);

  // 変更があるかチェック
  const hasChanges = originalData ? (
    title !== originalData.title ||
    description !== originalData.description ||
    status !== originalData.status ||
    priority !== originalData.priority ||
    category !== originalData.category ||
    dueDate !== originalData.dueDate
  ) : true; // データがない場合は常に保存可能にする


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
      
      setTitle(taskTitle);
      setDescription(taskDescription);
      setStatus(taskStatus);
      setPriority(taskPriority);
      setDueDate(taskDueDate || "");
      setError(null);
      
      // 元データを保存
      setOriginalData({
        title: taskTitle,
        description: taskDescription,
        status: taskStatus,
        priority: taskPriority,
        category: "", // カテゴリーは常に空で開始
        dueDate: taskDueDate || ""
      });
    }
  }, [task]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !task) return;

    setIsSaving(true);
    setError(null);
    // setSavedSuccessfully(false);
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate
          ? Math.floor(new Date(dueDate).getTime() / 1000)
          : undefined,
      };

      await updateTask.mutateAsync({
        id: task.id,
        data: taskData,
      });
      setIsSaving(false);


      // 保存成功時にoriginalDataも更新
      setOriginalData({
        title: taskData.title,
        description: taskData.description || "",
        status: taskData.status,
        priority: taskData.priority,
        category: category, // カテゴリーも現在の値で更新
        dueDate: dueDate
      });

    } catch (error) {
      console.error("保存に失敗しました:", error);
      setError(
        "保存に失敗しました。APIサーバーが起動していることを確認してください。"
      );
      setIsSaving(false);
    }
  }, [
    title,
    description,
    status,
    priority,
    dueDate,
    category,
    task,
    updateTask,
  ]);

  // Ctrl+Sショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  const statusOptions = [
    { value: "todo", label: "未着手", color: "bg-zinc-500" },
    {
      value: "in_progress",
      label: "進行中",
      color: "bg-blue-600",
    },
    { value: "completed", label: "完了", color: "bg-green-600" },
  ];

  const priorityOptions = [
    { value: "low", label: "低", color: "bg-green-500" },
    { value: "medium", label: "中", color: "bg-yellow-500" },
    { value: "high", label: "高", color: "bg-red-500" },
  ];

  const categoryOptions = [
    { value: "", label: "未選択", color: "bg-gray-400" },
    { value: "work", label: "仕事", color: "bg-blue-500" },
    { value: "personal", label: "個人", color: "bg-purple-500" },
    { value: "study", label: "勉強", color: "bg-indigo-500" },
    { value: "health", label: "健康", color: "bg-pink-500" },
    { value: "hobby", label: "趣味", color: "bg-orange-500" },
  ];

  return (
    <>
      <BaseViewer
        item={task}
        onClose={onClose}
        error={error ? "エラー" : null}
        headerActions={null}
      >
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="タスクタイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-lg font-medium border-b border-Yellow outline-none pb-2 focus:border-Yellow"
          />
        </div>

        {/* インライン編集式のUI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CustomSelector
            label="ステータス"
            options={statusOptions}
            value={status}
            onChange={(value) => setStatus(value as "todo" | "in_progress" | "completed")}
            fullWidth
          />

          <CustomSelector
            label="優先度"
            options={priorityOptions}
            value={priority}
            onChange={(value) => setPriority(value as "low" | "medium" | "high")}
            fullWidth
          />

          <CustomSelector
            label="カテゴリー"
            options={categoryOptions}
            value={category}
            onChange={setCategory}
            fullWidth
          />

          <DateInput
            label="期限日"
            value={dueDate}
            onChange={setDueDate}
            fullWidth
          />
        </div>

        <div className="mt-2">
          <textarea
            ref={descriptionTextareaRef}
            placeholder="入力..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-[calc(100vh-400px)] p-3 border border-gray-400 rounded-lg resize-none outline-none text-gray-700 leading-relaxed focus:border-Yellow"
          />
        </div>
        
        {/* 入力欄の外側左下に保存ボタンと画像ボタンを配置 */}
        <div className="mt-2 flex justify-start gap-2">
          <SaveButton
            onClick={handleSave}
            disabled={!hasChanges}
            isSaving={isSaving}
          />
          <PhotoButton />
        </div>
      </BaseViewer>
      <DeleteButton
        className="fixed bottom-6 right-6"
        onDelete={showDeleteConfirmation}
      />

      {/* 削除確認モーダル */}
      <SingleDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={hideDeleteConfirmation}
        onConfirm={handleDelete}
        itemTitle={task.title}
        itemType="task"
        deleteType="normal"
        isLoading={isDeleting}
      />
    </>
  );
}

export default TaskEditor;
