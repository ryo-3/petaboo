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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-1 py-1 border border-gray-400 rounded-lg focus:border-DeepBlue outline-none ${
          fullWidth ? "w-full" : ""
        }`}
      />
    </div>
  );
}

export default DateInput;
