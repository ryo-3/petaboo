import SettingsIcon from "@/components/icons/settings-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { usePathname, useRouter } from "next/navigation";

interface BoardHeaderProps {
  boardId?: number;
  boardName: string;
  boardDescription?: string | null;
  boardCompleted?: boolean;
  isDeleted?: boolean;
  onExport: () => void;
  isExportDisabled?: boolean;
}

export default function BoardHeader({
  boardId,
  boardName,
  boardDescription,
  onExport,
  isExportDisabled = false,
}: BoardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSettings = () => {
    // 現在のパスから設定画面へ遷移
    const boardSlug = pathname.split("/")[2];
    router.push(`/boards/${boardSlug}/settings`);
  };
  return (
    <div className="flex items-start justify-between mb-1">
      <div>
        <div className="flex items-start gap-3">
          <h1 className="text-xl font-bold text-gray-900 leading-tight max-w-[400px] line-clamp-2">{boardName}</h1>
          {/* 設定ボタン（ボード名の横） */}
          {boardId && (
            <Tooltip text="ボード設定" position="bottom-left">
              <button onClick={handleSettings} className="p-1 text-gray-600 flex-shrink-0">
                <SettingsIcon className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
        {boardDescription && (
          <p className="text-gray-600 text-sm">{boardDescription}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        
        {/* エクスポートボタン */}
        <button
          onClick={onExport}
          disabled={isExportDisabled}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            isExportDisabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700"
          }`}
        >
          📄 エクスポート
        </button>
      </div>
    </div>
  );
}
