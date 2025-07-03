interface SaveButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isSaving: boolean;
  title?: string;
}

function SaveButton({ 
  onClick, 
  disabled = false, 
  isSaving, 
  title = "保存 (Ctrl+S)" 
}: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isSaving}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
        isSaving || disabled
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-Green text-white hover:bg-Green/90"
      }`}
      title={title}
    >
      {isSaving ? "保存中..." : "保存"}
    </button>
  );
}

export default SaveButton;