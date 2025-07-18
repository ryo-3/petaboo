import PhotoIcon from "@/components/icons/photo-icon";

interface PhotoButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  buttonSize?: string;
  iconSize?: string;
}

function PhotoButton({ 
  onClick, 
  className = "",
  disabled = false,
  buttonSize = "size-7",
  iconSize = "size-4"
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
      className={`${buttonSize} rounded-lg bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      <PhotoIcon className={iconSize} />
    </button>
  );
}

export default PhotoButton;