import DeleteButton from "./delete-button";
import { DELETE_BUTTON_POSITION } from "@/src/constants/ui";

interface RightPanelDeleteButtonProps {
  viewerRef: React.RefObject<{ showDeleteConfirmation: () => void } | null>;
  setIsRightLidOpen: (open: boolean) => void;
  isRightLidOpen: boolean;
}

/**
 * 右パネル用の削除ボタン（削除済みアイテムviewer用）
 * memo・task両方で共通使用
 */
export function RightPanelDeleteButton({ 
  viewerRef, 
  setIsRightLidOpen, 
  isRightLidOpen 
}: RightPanelDeleteButtonProps) {
  return (
    <div className={`${DELETE_BUTTON_POSITION} z-10`}>
      <DeleteButton
        data-right-panel-trash
        onDelete={() => {
          // ボタンクリック時に即座に蓋を開く
          setIsRightLidOpen(true);
          // 削除済みビューアーの削除確認を呼び出す
          viewerRef.current?.showDeleteConfirmation();
        }}
        isAnimating={isRightLidOpen}
        variant="danger"
      />
    </div>
  );
}