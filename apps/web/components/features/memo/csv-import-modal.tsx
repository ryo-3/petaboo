"use client";

import { useState, useRef } from "react";
import { useImportMemos } from "@/src/hooks/use-memos";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CSVImportModal({ isOpen, onClose }: CSVImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<
    { title: string; content?: string }[]
  >([]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMemos = useImportMemos();

  const parseCSVPreview = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const header = lines[0]?.toLowerCase() || "";
    if (!header.includes("title")) return [];

    const results: { title: string; content?: string }[] = [];

    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      // 最初の5行のみプレビュー
      const line = lines[i]?.trim() || "";
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

      if (values.length >= 1 && values[0]) {
        // 2番目以降のすべての値をcontentとして結合
        const content = values
          .slice(1)
          .filter((v) => v)
          .join("、");
        results.push({
          title: values[0],
          content: content || undefined,
        });
      }
    }

    return results;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("CSVファイルを選択してください");
      return;
    }

    setSelectedFile(file);
    const csvText = await file.text();
    const preview = parseCSVPreview(csvText);
    setPreviewData(preview);
    setImportResult(null);
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

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const result = await importMemos.mutateAsync(selectedFile);
      setImportResult(result);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
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
              <p className="text-sm text-gray-500">形式: title,content</p>
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
                <div className="border rounded-lg">
                  <div className="bg-gray-50 px-3 py-2 border-b font-semibold text-sm">
                    Title | Content
                  </div>
                  {previewData.map((item, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 border-b last:border-b-0 text-sm"
                    >
                      <span className="font-medium">{item.title}</span>
                      {item.content && (
                        <>
                          <span className="text-gray-400 mx-2">|</span>
                          <span className="text-gray-600">
                            {item.content.substring(0, 50)}
                            {item.content.length > 50 ? "..." : ""}
                          </span>
                        </>
                      )}
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
                disabled={!selectedFile || importMemos.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importMemos.isPending ? "インポート中..." : "インポート"}
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
              <p>{importResult.imported}件のメモがインポートされました</p>
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
