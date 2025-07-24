"use client";

import { useState, useRef } from "react";
import { useImportTasks } from "@/src/hooks/use-tasks";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CSVImportModal({ isOpen, onClose }: CSVImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ title: string; description?: string; status?: string; priority?: string }[]>([]);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const importTasks = useImportTasks();

  const parseCSVPreview = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const header = lines[0]?.toLowerCase() || '';
    if (!header.includes('title')) return [];
    
    const results: { title: string; description?: string; status?: string; priority?: string }[] = [];
    
    for (let i = 1; i < Math.min(lines.length, 6); i++) { // 最初の5行のみプレビュー
      const line = lines[i]?.trim() || '';
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 1 && values[0]) {
        results.push({
          title: values[0],
          description: values[1] || undefined,
          status: values[2] || undefined,
          priority: values[3] || undefined,
        });
      }
    }
    
    return results;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('CSVファイルを選択してください');
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
      const result = await importTasks.mutateAsync(selectedFile);
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: ['インポート中にエラーが発生しました']
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
      case 'todo': return '未着手';
      case 'in_progress': return '進行中';
      case 'completed': return '完了';
      default: return status || '未着手';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      default: return priority || '中';
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-gray-600 mb-2">
                {selectedFile?.name || 'CSVファイルをドラッグ&ドロップまたはクリックして選択'}
              </p>
              <p className="text-sm text-gray-500">
                形式: title,description,status,priority
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
                    <div className="grid grid-cols-4 gap-4">
                      <span>Title</span>
                      <span>Description</span>
                      <span>Status</span>
                      <span>Priority</span>
                    </div>
                  </div>
                  {previewData.map((item, index) => (
                    <div key={index} className="px-3 py-2 border-b last:border-b-0 text-sm min-w-max">
                      <div className="grid grid-cols-4 gap-4">
                        <span className="font-medium truncate">{item.title}</span>
                        <span className="text-gray-600 truncate">
                          {item.description ? 
                            `${item.description.substring(0, 30)}${item.description.length > 30 ? '...' : ''}` : 
                            '-'
                          }
                        </span>
                        <span className="text-gray-600">{getStatusLabel(item.status)}</span>
                        <span className="text-gray-600">{getPriorityLabel(item.priority)}</span>
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
                disabled={!selectedFile || importTasks.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importTasks.isPending ? 'インポート中...' : 'インポート'}
              </button>
            </div>
          </>
        ) : (
          /* 結果表示 */
          <div>
            <div className={`p-4 rounded-lg mb-4 ${
              importResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <div className="font-semibold mb-2">
                {importResult.success ? '✓ インポート完了' : '✗ インポートエラー'}
              </div>
              <p>{importResult.imported}件のタスクがインポートされました</p>
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