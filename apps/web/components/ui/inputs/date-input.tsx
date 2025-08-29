import { FORM_STYLES } from "@/src/styles/form-styles";

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  disabled?: boolean;
}

function DateInput({
  label,
  value,
  onChange,
  fullWidth = false,
  disabled = false,
}: DateInputProps) {
  return (
    <div>
      <label className={FORM_STYLES.label}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${FORM_STYLES.input} ${
          fullWidth ? "w-full" : ""
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      />
    </div>
  );
}

export default DateInput;
