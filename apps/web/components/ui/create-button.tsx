// 作成ボタンっぽく見えたため
import MemoIcon from "@/components/icons/memo-icon";

interface CreateButtonProps {
  isEditing?: boolean;
  onClick?: () => void;
  className?: string;
}

function CreateButton({
  isEditing = false,
  onClick,
  className = "",
}: CreateButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full transition-colors
        ${
          isEditing
            ? "bg-[#8dcba0] text-white hover:bg-Green/90 transform duration-200"
            : "bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 hover:opacity-80"
        }
        ${className}`}
    >
      <MemoIcon className="w-4 h-4" />
    </button>
  );
}

export default CreateButton;
