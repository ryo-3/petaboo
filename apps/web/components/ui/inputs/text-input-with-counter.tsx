import { forwardRef } from "react";

interface TextInputWithCounterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength: number;
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

const TextInputWithCounter = forwardRef<
  HTMLInputElement,
  TextInputWithCounterProps
>(
  (
    {
      value,
      onChange,
      placeholder,
      maxLength,
      label,
      required = false,
      className = "",
      id,
    },
    ref,
  ) => {
    const trimmedLength = value.trim().length;
    const isOverLimit = trimmedLength > maxLength;

    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label} {required && "*"}
          </label>
        )}
        <input
          ref={ref}
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            isOverLimit
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300"
          } ${className}`}
          required={required}
        />
        <div className="mt-1 flex justify-between">
          <div>
            {isOverLimit && (
              <p className="text-sm text-red-600">
                {label || "入力内容"}は{maxLength}文字以内で入力してください
              </p>
            )}
          </div>
          <p
            className={`text-sm ${isOverLimit ? "text-red-600" : "text-gray-500"}`}
          >
            {trimmedLength}/{maxLength}文字
          </p>
        </div>
      </div>
    );
  },
);

TextInputWithCounter.displayName = "TextInputWithCounter";

export default TextInputWithCounter;
