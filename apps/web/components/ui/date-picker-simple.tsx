"use client";

import React from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import "@/styles/datepicker-custom.css";
import { Calendar as CalendarIcon } from "lucide-react";

// 日本語ロケールを登録
registerLocale("ja", ja);

interface DatePickerSimpleProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  compactMode?: boolean;
}

export function DatePickerSimple({
  value,
  onChange,
  disabled = false,
  placeholder = "日付を選択",
  compactMode = false,
}: DatePickerSimpleProps) {
  const date = value ? new Date(value) : null;
  const [isOpen, setIsOpen] = React.useState(false);

  const handleChange = (selectedDate: Date | null) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" onClick={() => !disabled && setIsOpen(true)}>
      <ReactDatePicker
        selected={date}
        onChange={handleChange}
        disabled={disabled}
        locale="ja"
        dateFormat="yyyy/MM/dd"
        placeholderText={placeholder}
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        onInputClick={() => {}}
        onChangeRaw={(e) => e?.preventDefault()}
        className={`flex items-center justify-between w-full px-1.5 border border-gray-400 rounded-lg outline-none bg-white placeholder:text-gray-700 pointer-events-none ${
          compactMode ? "h-7 md:h-8 text-xs md:text-sm" : "h-8 text-sm"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        calendarStartDay={0}
        popperPlacement="bottom-end"
        shouldCloseOnSelect={true}
      />
      <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  );
}
