import ArrowLeftIcon from "@/components/icons/arrow-left-icon";

interface BoardHeaderProps {
  boardName: string;
  boardDescription?: string | null;
  itemCount: number;
  onBack: () => void;
  onExport: () => void;
  isExportDisabled?: boolean;
}

export default function BoardHeader({ 
  boardName, 
  boardDescription, 
  itemCount, 
  onBack, 
  onExport,
  isExportDisabled = false
}: BoardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {boardName}
        </h1>
        {boardDescription && (
          <p className="text-gray-600 mt-1">{boardDescription}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-500">
          {itemCount} 個のアイテム
        </div>
        <button
          onClick={onExport}
          disabled={isExportDisabled}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            isExportDisabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700'
          }`}
          title="テキストファイルとしてエクスポート"
        >
          📄 エクスポート
        </button>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          一覧へ
        </button>
      </div>
    </div>
  );
}