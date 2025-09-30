"use client";

import { useState, useRef } from "react";
import Modal from "@/components/ui/modals/modal";
import { Button } from "@/components/ui/button";
import { UseMutationResult } from "@tanstack/react-query";

interface CSVImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

interface CSVImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  itemType: "memo" | "task";
  parseFunction: (csvText: string) => T[];
  importHook: () => UseMutationResult<CSVImportResult, unknown, File>;
  formatDescription: string;
  previewColumns: { key: keyof T; label: string }[];
  renderPreviewItem: (item: T, index: number) => React.ReactNode;
}

/**
 * 汎用CSVインポートモーダルコンポーネント
 * メモとタスクの両方に対応
 */
export function CSVImportModal<T>({
  isOpen,
  onClose,
  itemType,
  parseFunction,
  importHook,
  formatDescription,
  previewColumns,
  renderPreviewItem,
}: CSVImportModalProps<T>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<T[]>([]);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(
    null,
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = importHook();

  // ファイル選択処理
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsed = parseFunction(csvText);
      setPreviewData(parsed);
    };
    reader.readAsText(file, "UTF-8");
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(
      (file) => file.type === "text/csv" || file.name.endsWith(".csv"),
    );

    if (csvFile) {
      handleFileSelect(csvFile);
    }
  };

  // ファイル入力変更処理
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // インポート実行
  const handleImport = () => {
    if (!selectedFile) return;

    importMutation.mutate(selectedFile, {
      onSuccess: (result) => {
        setImportResult(result);
        if (result.success) {
          // 成功時は少し待ってからモーダルを閉じる
          setTimeout(() => {
            onClose();
            resetState();
          }, 2000);
        }
      },
      onError: (error) => {
        setImportResult({
          success: false,
          imported: 0,
          errors: [
            error instanceof Error ? error.message : "インポートに失敗しました",
          ],
        });
      },
    });
  };

  // 状態リセット
  const resetState = () => {
    setSelectedFile(null);
    setPreviewData([]);
    setImportResult(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // モーダルクローズ処理
  const handleClose = () => {
    onClose();
    resetState();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {itemType === "memo" ? "メモ" : "タスク"}のCSVインポート
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* フォーマット説明 */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-1">
            CSVフォーマット
          </h3>
          <p className="text-sm text-blue-700">{formatDescription}</p>
        </div>

        {!selectedFile ? (
          /* ファイル選択エリア */
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <svg
                className="w-12 h-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-gray-600 mb-2">
                CSVファイルをドラッグ&ドロップ、または
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                ファイルを選択
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
        ) : (
          /* プレビューエリア */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                プレビュー ({selectedFile.name})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewData([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                ファイル変更
              </Button>
            </div>

            {previewData.length > 0 ? (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {previewColumns.map((column) => (
                          <th
                            key={String(column.key)}
                            className="px-3 py-2 text-left font-medium text-gray-900"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.map((item, index) =>
                        renderPreviewItem(item, index),
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-500">
                  ※ 最初の5行のみ表示しています
                </p>

                {/* インポートボタンエリア */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="flex-1"
                  >
                    {importMutation.isPending
                      ? "インポート中..."
                      : `${previewData.length}件をインポート`}
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    キャンセル
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>有効なデータが見つかりませんでした</p>
                <p className="text-xs mt-1">
                  CSVフォーマットを確認してください
                </p>
              </div>
            )}
          </div>
        )}

        {/* インポート結果表示 */}
        {importResult && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              importResult.success
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {importResult.success ? (
              <div className="text-green-800">
                <p className="font-medium">
                  ✓ {importResult.imported}件のインポートが完了しました
                </p>
              </div>
            ) : (
              <div className="text-red-800">
                <p className="font-medium">❌ インポートに失敗しました</p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 text-sm">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CSVImportModal;
