interface SaveButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isSaving: boolean;
  savedSuccessfully?: boolean;
  title?: string;
}

function SaveButton({ 
  onClick, 
  disabled = false, 
  isSaving, 
  savedSuccessfully = false,
  title = "保存 (Ctrl+S)" 
}: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isSaving || savedSuccessfully}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
        isSaving || disabled || savedSuccessfully
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-Green text-white hover:bg-Green/90"
      }`}
      title={title}
    >
      {isSaving ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          保存中...
        </>
      ) : savedSuccessfully ? (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          保存完了
        </>
      ) : (
        "保存"
      )}
    </button>
  );
}

export default SaveButton;