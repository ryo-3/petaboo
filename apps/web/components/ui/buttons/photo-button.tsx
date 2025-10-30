import { useRef } from "react";
import { Image } from "lucide-react";

interface PhotoButtonProps {
  onFileSelect?: (file: File) => void;
  className?: string;
  disabled?: boolean;
  buttonSize?: string;
  iconSize?: string;
  accept?: string;
}

function PhotoButton({
  onFileSelect,
  className = "",
  disabled = false,
  buttonSize = "size-7",
  iconSize = "size-4",
  accept = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv",
}: PhotoButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        className={`${buttonSize} rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-200"
        } ${className}`}
        onClick={handleClick}
        disabled={disabled}
      >
        <Image className={iconSize} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}

export default PhotoButton;
