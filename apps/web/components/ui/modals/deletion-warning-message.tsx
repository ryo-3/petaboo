import React from 'react';

interface StatusBreakdownItem {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface DeletionWarningMessageProps {
  hasOtherTabItems: boolean;
  isLimited: boolean;
  statusBreakdown: StatusBreakdownItem[];
  showStatusBreakdown?: boolean;
  isPermanentDelete?: boolean;
}

export function DeletionWarningMessage({
  hasOtherTabItems,
  isLimited,
  statusBreakdown,
  showStatusBreakdown = true,
  isPermanentDelete = false
}: DeletionWarningMessageProps) {

  return (
    <div className="text-center">
      {hasOtherTabItems && (
        <>
          <p className="text-sm text-amber-600 mb-3 font-medium">
            削除されるのは現在のタブアイテムのみです
          </p>
          
          
          {showStatusBreakdown && (
            <div className="w-32 mx-auto space-y-2 mb-4">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm text-gray-700">{item.count}件</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {!hasOtherTabItems && showStatusBreakdown && (
        <div className="w-32 mx-auto space-y-2 mb-4 pt-1">
          {statusBreakdown.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <span className="text-sm text-gray-700">{item.count}件</span>
            </div>
          ))}
        </div>
      )}
      
      {isPermanentDelete && (
        <div className="mt-3 p-3 bg-red-50 rounded-md">
          <p className="text-sm text-red-800 font-medium">この操作は取り消せません</p>
          <p className="text-xs text-red-700 mt-1">データは永久に失われます</p>
        </div>
      )}
      
      {isLimited && (
        <p className="text-xs text-gray-500 mt-2">
          ※一度に削除できる上限は100件です
        </p>
      )}
      
      {!isPermanentDelete && (
        <p className="text-xs text-gray-500 mt-2">
          ※削除したアイテムは削除済アイテムに移動します
        </p>
      )}
    </div>
  );
}