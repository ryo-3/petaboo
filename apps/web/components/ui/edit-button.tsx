import PenIcon from "@/components/icons/pen-icon";

interface EditButtonProps {
  isEditing?: boolean;
  onEdit?: () => void;
  onExitEdit?: () => void;
  className?: string;
}

function EditButton({
  isEditing = false,
  onEdit,
  onExitEdit,
  className = "",
}: EditButtonProps) {
  const handleClick = () => {
    if (isEditing && onExitEdit) {
      onExitEdit();
    } else if (!isEditing && onEdit) {
      onEdit();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-1.5 rounded-full transition-colors
        ${
          isEditing
            ? "bg-Green text-white hover:bg-Green/90 transform duration-200"
            : "bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800"
        }
        ${className}`}
    >
      <PenIcon className="w-4 h-4" />
    </button>
  );
}

export default EditButton;
