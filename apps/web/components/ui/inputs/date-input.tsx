import { FORM_STYLES } from "@/src/styles/form-styles";

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  disabled?: boolean;
  hideLabelOnMobile?: boolean;
  hideLabel?: boolean;
  compactMode?: boolean;
}

function DateInput({
  label,
  value,
  onChange,
  fullWidth = false,
  disabled = false,
  hideLabelOnMobile = false,
  hideLabel = false,
  compactMode = false,
}: DateInputProps) {
  return (
    <div>
      {!hideLabel && (
        <label
          className={`${FORM_STYLES.label} ${hideLabelOnMobile ? "hidden md:block" : ""}`}
        >
          {label}
        </label>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${FORM_STYLES.input} ${compactMode ? "h-7 md:h-8 text-xs md:text-sm px-1 md:px-1.5" : ""} ${
          fullWidth ? "w-full" : ""
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      />
    </div>
  );
}

export default DateInput;
