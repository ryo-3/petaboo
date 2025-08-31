import { useState } from "react";
import { CreateBoardData, UpdateBoardData } from "@/src/types/board";
import TextInputWithCounter from "@/components/ui/inputs/text-input-with-counter";
import TextareaWithCounter from "@/components/ui/inputs/textarea-with-counter";

interface BoardFormProps {
  initialData?: UpdateBoardData;
  onSubmit: (data: CreateBoardData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BoardForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: BoardFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      name.trim() &&
      name.trim().length <= 50 &&
      description.trim().length <= 200
    ) {
      // slugを自動生成（name -> slug変換）
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // 特殊文字除去
        .replace(/\s+/g, "-") // スペースをハイフンに
        .replace(/--+/g, "-") // 連続ハイフンを単一に
        .trim();

      onSubmit({
        name: name.trim(),
        slug: slug || `board-${Date.now()}`, // slugが空の場合はタイムスタンプ
        description: description.trim() || undefined,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initialData ? "ボードを編集" : "新しいボード"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInputWithCounter
          id="name"
          value={name}
          onChange={setName}
          placeholder="例: プロジェクト名、学習テーマなど（50文字以内）"
          maxLength={50}
          label="ボード名"
          required
        />

        <TextareaWithCounter
          id="description"
          value={description}
          onChange={setDescription}
          placeholder="例: このボードはWebアプリケーション開発プロジェクトの進行管理を目的としています。主な機能としてユーザー認証、データベース設計、API開発、フロントエンド実装、テスト作業、デプロイメント準備などのタスクを段階的に管理し、チーム全体の進捗状況を可視化します。週次ミーティングでの報告資料作成や課題の早期発見にも活用予定です。（200文字以内）"
          maxLength={200}
          label="説明（任意）"
          rows={3}
        />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={
              !name.trim() ||
              name.trim().length > 50 ||
              description.trim().length > 200 ||
              isLoading
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "保存中..." : initialData ? "更新" : "作成"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
