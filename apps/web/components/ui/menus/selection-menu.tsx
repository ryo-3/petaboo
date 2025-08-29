import React from "react";

interface SelectionMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface SelectionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: SelectionMenuItem[];
  anchorRef: React.RefObject<HTMLElement | null>;
}

/**
 * 複数選択時のアクションメニュー
 * ボード紐付け、エクスポート、タグ付けなどの操作を提供
 */
export default function SelectionMenu({
  isOpen,
  onClose,
  items,
  anchorRef,
}: SelectionMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // ESCキーで閉じる
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-16 left-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50"
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          disabled={item.disabled}
          className={`
            w-full px-3 py-2 text-left flex items-center gap-3 
            ${
              item.disabled
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            }
            transition-colors
          `}
        >
          <span className="w-5 h-5 flex items-center justify-center text-gray-500">
            {item.icon}
          </span>
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
