import { useEffect } from "react";
import DeleteButton from "../buttons/delete-button";
import RestoreButton from "../buttons/restore-button";
import { ButtonContainer } from "./button-container";

interface BulkActionButtonsProps {
  // 削除ボタン
  showDeleteButton: boolean;
  deleteButtonCount: number;
  onDelete: () => void;
  deleteButtonRef: React.RefObject<HTMLButtonElement | null>;
  isDeleting: boolean;
  deleteVariant?: "default" | "danger";
  
  // 復元ボタン
  showRestoreButton: boolean;
  restoreCount: number;
  onRestore: () => void;
  restoreButtonRef?: React.RefObject<HTMLButtonElement | null>;
  isRestoring: boolean;
  
  // アニメーション付きカウンター用
  animatedDeleteCount?: number;
  useAnimatedDeleteCount?: boolean;
  animatedRestoreCount?: number;
  useAnimatedRestoreCount?: boolean;
}

/**
 * 一括操作用のボタンコンテナ（削除・復元）
 * memo・task両方で共通使用
 */
export function BulkActionButtons({
  showDeleteButton,
  deleteButtonCount,
  onDelete,
  deleteButtonRef,
  isDeleting,
  deleteVariant,
  showRestoreButton,
  restoreCount,
  onRestore,
  restoreButtonRef,
  isRestoring,
  animatedDeleteCount,
  useAnimatedDeleteCount = false,
  animatedRestoreCount,
  useAnimatedRestoreCount = false,
}: BulkActionButtonsProps) {
  
  // デバッグ用: showDeleteButtonの変化を監視
  useEffect(() => {
    console.log('🔘 BulkActionButtons showDeleteButton変化:', { 
      showDeleteButton, 
      isDeleting,
      timestamp: new Date().toISOString()
    });
  }, [showDeleteButton, isDeleting]);
  return (
    <>
      {/* 一括削除ボタン */}
      <ButtonContainer show={showDeleteButton} position="bottom-right">
        <DeleteButton
          ref={deleteButtonRef}
          onDelete={onDelete}
          count={deleteButtonCount}
          isAnimating={isDeleting}
          variant={deleteVariant}
          animatedCount={animatedDeleteCount}
          useAnimatedCount={useAnimatedDeleteCount}
        />
      </ButtonContainer>

      {/* 一括復元ボタン */}
      <ButtonContainer show={showRestoreButton} position="bottom-left">
        <RestoreButton
          buttonRef={restoreButtonRef}
          onRestore={onRestore}
          isRestoring={isRestoring}
          count={restoreCount}
          buttonSize="size-9"
          iconSize="size-5"
          tooltipPosition="top"
          animatedCount={animatedRestoreCount}
          useAnimatedCount={useAnimatedRestoreCount}
        />
      </ButtonContainer>
    </>
  );
}