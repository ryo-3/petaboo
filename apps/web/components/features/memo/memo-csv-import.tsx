"use client";

import CSVImportModal from "@/components/shared/csv-import-modal";
import { useImportMemos } from "@/src/hooks/use-memos";

interface MemoCsvData {
  title: string;
  content?: string;
}

interface MemoCsvImportProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * メモCSVのパース関数
 */
const parseMemoCsv = (csvText: string): MemoCsvData[] => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0]?.toLowerCase() || "";
  if (!header.includes("title")) return [];

  const results: MemoCsvData[] = [];

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

/**
 * メモ用CSVインポートモーダル
 */
export function MemoCsvImport({ isOpen, onClose }: MemoCsvImportProps) {
  const columns = [
    { key: "title" as const, label: "タイトル" },
    { key: "content" as const, label: "内容" },
  ];

  const renderPreviewItem = (item: MemoCsvData, index: number) => (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-3 py-2 text-gray-900">{item.title}</td>
      <td className="px-3 py-2 text-gray-600">
        {item.content ? (
          <span className="line-clamp-2">{item.content}</span>
        ) : (
          <span className="text-gray-400 italic">内容なし</span>
        )}
      </td>
    </tr>
  );

  return (
    <CSVImportModal<MemoCsvData>
      isOpen={isOpen}
      onClose={onClose}
      itemType="memo"
      parseFunction={parseMemoCsv}
      importHook={useImportMemos}
      formatDescription="1列目: タイトル（必須）、2列目以降: 内容（オプション、複数列は結合されます）"
      previewColumns={columns}
      renderPreviewItem={renderPreviewItem}
    />
  );
}

export default MemoCsvImport;
