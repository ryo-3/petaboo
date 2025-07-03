import PhotoIcon from "@/components/icons/photo-icon";

interface PhotoButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

function PhotoButton({ 
  onClick, 
  className = "",
  disabled = false 
}: PhotoButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // デフォルトの動作
      alert("画像添付機能は今後実装予定です");
    }
  };

  return (
    <button
      className={`p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      title="画像を添付（今後対応予定）"
      onClick={handleClick}
      disabled={disabled}
    >
      <PhotoIcon className="w-4 h-4" />
    </button>
  );
}

export default PhotoButton;