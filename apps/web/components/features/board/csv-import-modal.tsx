"use client";

import { useState, useRef } from "react";
import { useAddItemToBoard } from "@/src/hooks/use-boards";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8794";

// セキュリティ設定
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 100; // 最大行数

// 入力値のサニタイゼーション
const sanitizeInput = (input: string, isTitle: boolean = false): string => {
  if (!input) return "";
  const maxLength = isTitle ? 200 : 10000;
  return input
    .replace(/[<>'"&]/g, (match) => {
      const map: { [key: string]: string } = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "&": "&amp;",
      };
      return map[match] || match;
    })
    .trim()
    .slice(0, maxLength);
};

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: number;
}

export function CSVImportModal({
  isOpen,
  onClose,
  boardId,
}: CSVImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<
    {
      title: string;
      content?: string;
      itemType: "memo" | "task";
      description?: string;
      status?: string;
      priority?: string;
    }[]
  >([]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItemToBoard = useAddItemToBoard();
  const { getToken } = useAuth();

  const parseCSVPreview = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const header = lines[0]?.toLowerCase() || "";
    if (!header.includes("title")) return [];

    const results: {
      title: string;
      content?: string;
      itemType: "memo" | "task";
      description?: string;
      status?: string;
      priority?: string;
    }[] = [];

    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      // 最初の5行のみプレビュー
      const line = lines[i]?.trim() || "";
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

      if (values.length >= 1 && values[0]) {
        // メモかタスクかを判定（3列目または4列目に値があればタスク）
        const hasTaskFields = values.length > 2 && (values[2] || values[3]);

        if (hasTaskFields) {
          results.push({
            itemType: "task",
            title: sanitizeInput(values[0], true),
            description: sanitizeInput(values[1] || ""),
            status: sanitizeInput(values[2] || ""),
            priority: sanitizeInput(values[3] || ""),
          });
        } else {
          // 2番目以降のすべての値をcontentとして結合
          const content = values
            .slice(1)
            .filter((v) => v)
            .map((v) => sanitizeInput(v))
            .join("、");
          results.push({
            itemType: "memo",
            title: sanitizeInput(values[0], true),
            content: content || undefined,
          });
        }
      }
    }

    return results;
  };

  const handleFileSelect = async (file: File) => {
    // ファイル形式チェック
    if (!file.name.endsWith(".csv")) {
      alert("CSVファイルを選択してください");
      return;
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      alert(
        `ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以下にしてください`,
      );
      return;
    }

    try {
      setSelectedFile(file);
      const csvText = await file.text();

      // ファイル内容の基本検証
      if (csvText.length > MAX_FILE_SIZE) {
        alert("ファイル内容が大きすぎます");
        return;
      }

      const preview = parseCSVPreview(csvText);
      setPreviewData(preview);
      setImportResult(null);
    } catch (error) {
      alert("ファイルの読み込みに失敗しました");
      console.error("File read error:", error);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const parseFullCSV = (csvText: string) => {
    const lines = csvText.trim().split("\n");

    if (lines.length < 2) {
      return [];
    }

    // 行数制限
    if (lines.length > MAX_ROWS + 1) {
      // +1 for header
      alert(`CSVファイルの行数は${MAX_ROWS}行以下にしてください`);
      return [];
    }

    const header = lines[0]?.toLowerCase() || "";

    if (!header.includes("title")) {
      return [];
    }

    const results: {
      title: string;
      content?: string;
      itemType: "memo" | "task";
      description?: string;
      status?: string;
      priority?: string;
    }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim() || "";
      if (!line) {
        continue;
      }

      // より厳密なCSVパース（カンマが値の中にある場合も考慮）
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

      if (values.length >= 1 && values[0]) {
        // メモかタスクかを判定（3列目または4列目に値があればタスク）
        const hasTaskFields = values.length > 2 && (values[2] || values[3]);

        if (hasTaskFields) {
          const taskItem = {
            itemType: "task" as const,
            title: sanitizeInput(values[0], true),
            description: sanitizeInput(values[1] || ""),
            status: sanitizeInput(values[2] || ""),
            priority: sanitizeInput(values[3] || ""),
          };
          results.push(taskItem);
        } else {
          // 2番目以降のすべての値をcontentとして結合
          const content = values
            .slice(1)
            .filter((v) => v)
            .map((v) => sanitizeInput(v))
            .join("、");
          const memoItem = {
            itemType: "memo" as const,
            title: sanitizeInput(values[0], true),
            content: content || undefined,
          };
          results.push(memoItem);
        }
      }
    }

    return results;
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const csvText = await selectedFile.text();
      const items = parseFullCSV(csvText);

      let imported = 0;
      const errors: string[] = [];

      const token = await getToken();

      for (const item of items) {
        try {
          if (!item.title || item.title.trim() === "") {
            errors.push("タイトルが空のアイテムをスキップしました");
            continue;
          }

          if (item.itemType === "memo") {
            // まずメモAPIで作成してからボードに追加
            const memoResponse = await fetch(`${API_BASE_URL}/memos`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                title: item.title,
                content: item.title + (item.content ? "\n" + item.content : ""),
              }),
            });

            if (memoResponse.ok) {
              const newMemo = await memoResponse.json();

              await addItemToBoard.mutateAsync({
                boardId,
                data: {
                  itemType: "memo",
                  itemId: newMemo.originalId,
                },
              });
              imported++;
            } else {
              const errorText = await memoResponse.text();
              errors.push(
                `メモ「${item.title}」の作成に失敗しました: ${errorText}`,
              );
            }
          } else if (item.itemType === "task") {
            // まずタスクAPIで作成してからボードに追加
            const taskResponse = await fetch(`${API_BASE_URL}/tasks`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({
                title: item.title,
                description: item.description || "",
                status: item.status || "todo",
                priority: item.priority || "medium",
              }),
            });

            if (taskResponse.ok) {
              const newTask = await taskResponse.json();

              await addItemToBoard.mutateAsync({
                boardId,
                data: {
                  itemType: "task",
                  itemId: newTask.originalId,
                },
              });
              imported++;
            } else {
              const errorText = await taskResponse.text();
              errors.push(
                `タスク「${item.title}」の作成に失敗しました: ${errorText}`,
              );
            }
          } else {
            errors.push(`「${item.title}」の種別が不明です`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push(
            `「${item.title || "不明"}」のインポートに失敗しました: ${errorMessage}`,
          );
        }
      }

      setImportResult({
        success: errors.length === 0,
        imported,
        errors,
      });
    } catch {
      setImportResult({
        success: false,
        imported: 0,
        errors: ["インポート中にエラーが発生しました"],
      });
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setImportResult(null);
    setIsDragOver(false);
    onClose();
  };

  if (!isOpen) return null;

  const getStatusLabel = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "todo":
        return "未着手";
      case "in_progress":
        return "進行中";
      case "completed":
        return "完了";
      default:
        return status || "未着手";
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "low":
        return "低";
      case "medium":
        return "中";
      case "high":
        return "高";
      default:
        return priority || "中";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">CSVインポート</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {!importResult ? (
          <>
            {/* ファイル選択エリア */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-600 mb-2">
                {selectedFile?.name ||
                  "CSVファイルをドラッグ&ドロップまたはクリックして選択"}
              </p>
              <p className="text-sm text-gray-500">メモ形式: title,content</p>
              <p className="text-sm text-gray-500">
                タスク形式: title,description,status,priority
              </p>
              <p className="text-xs text-gray-400 mt-1">
                status: todo/in_progress/completed, priority: low/medium/high
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* プレビュー */}
            {previewData.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">プレビュー（最初の5行）</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <div className="bg-gray-50 px-3 py-2 border-b font-semibold text-sm min-w-max">
                    <div className="grid grid-cols-5 gap-4">
                      <span>Type</span>
                      <span>Title</span>
                      <span>Content/Description</span>
                      <span>Status</span>
                      <span>Priority</span>
                    </div>
                  </div>
                  {previewData.map((item, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 border-b last:border-b-0 text-sm min-w-max"
                    >
                      <div className="grid grid-cols-5 gap-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            item.itemType === "memo"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {item.itemType === "memo" ? "メモ" : "タスク"}
                        </span>
                        <span className="font-medium truncate">
                          {item.title}
                        </span>
                        <span className="text-gray-600 truncate">
                          {item.itemType === "memo"
                            ? item.content
                              ? `${item.content.substring(0, 30)}${item.content.length > 30 ? "..." : ""}`
                              : "-"
                            : item.description
                              ? `${item.description.substring(0, 30)}${item.description.length > 30 ? "..." : ""}`
                              : "-"}
                        </span>
                        <span className="text-gray-600">
                          {item.itemType === "task"
                            ? getStatusLabel(item.status)
                            : "-"}
                        </span>
                        <span className="text-gray-600">
                          {item.itemType === "task"
                            ? getPriorityLabel(item.priority)
                            : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || addItemToBoard.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addItemToBoard.isPending ? "インポート中..." : "インポート"}
              </button>
            </div>
          </>
        ) : (
          /* 結果表示 */
          <div>
            <div
              className={`p-4 rounded-lg mb-4 ${
                importResult.success
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              <div className="font-semibold mb-2">
                {importResult.success
                  ? "✓ インポート完了"
                  : "✗ インポートエラー"}
              </div>
              <p>{importResult.imported}件のアイテムがボードに追加されました</p>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">エラー詳細</h3>
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
