import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import SettingsIcon from "@/components/icons/settings-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { usePathname, useRouter } from "next/navigation";

interface BoardHeaderProps {
  boardId?: number;
  boardName: string;
  boardDescription?: string | null;
  boardCompleted?: boolean;
  isDeleted?: boolean;
  onBack: () => void;
  onExport: () => void;
  isExportDisabled?: boolean;
}

export default function BoardHeader({ 
  boardId,
  boardName, 
  boardDescription, 
  boardCompleted = false,
  isDeleted = false,
  onBack, 
  onExport,
  isExportDisabled = false
}: BoardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleSettings = () => {
    // 現在のパスから設定画面へ遷移
    const boardSlug = pathname.split('/')[2];
    router.push(`/boards/${boardSlug}/settings`);
  };
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {boardName}
          </h1>
          {/* 設定ボタン（ボード名の横） */}
          {boardId && (
            <Tooltip text="ボード設定" position="bottom">
              <button
                onClick={handleSettings}
                className="p-1 text-gray-600"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
        {boardDescription && (
          <p className="text-gray-600 mt-1">{boardDescription}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        
        {/* エクスポートボタン */}
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
        
        {/* 一覧へボタン */}
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