interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
}: SwitchProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-600">{label}</span>}
      <button
        onClick={() => onCheckedChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export default Switch;
