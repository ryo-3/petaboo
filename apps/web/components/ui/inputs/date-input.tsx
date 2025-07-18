import { FORM_STYLES } from "@/src/styles/form-styles";

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
}

function DateInput({
  label,
  value,
  onChange,
  fullWidth = false,
}: DateInputProps) {
  return (
    <div>
      <label className={FORM_STYLES.label}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FORM_STYLES.input} ${
          fullWidth ? "w-full" : ""
        }`}
      />
    </div>
  );
}

export default DateInput;
