import { useEffect } from 'react';
import { useToast } from '@/src/contexts/toast-context';

/**
 * 一括処理の中断通知を監視するhook
 */
export function useBulkProcessNotifications() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleProcessCancelled = (event: CustomEvent) => {
      const { type, processType, reason } = event.detail;
      
      const itemTypeName = type === 'memo' ? 'メモ' : 'タスク';
      const processTypeName = processType === 'delete' ? '削除' : '復元';
      
      let message = `${itemTypeName}の${processTypeName}処理をキャンセルしました`;
      if (reason === 'element_not_found') {
        message += '（タブ切り替えまたはページ移動のため）';
      }
      
      showToast(message, 'info', 5000);
      
      console.log(`📢 処理キャンセル通知を表示: ${itemTypeName}${processTypeName} (理由: ${reason})`);
    };

    // グローバルイベントリスナーを登録
    window.addEventListener('bulkProcessCancelled', handleProcessCancelled as EventListener);

    return () => {
      window.removeEventListener('bulkProcessCancelled', handleProcessCancelled as EventListener);
    };
  }, [showToast]);
}