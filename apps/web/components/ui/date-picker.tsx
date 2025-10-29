"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ja } from "date-fns/locale";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  compactMode?: boolean;
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "日付を選択",
  compactMode = false,
}: DatePickerProps) {
  const date = value ? new Date(value) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // YYYY-MM-DD形式に変換
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center justify-between w-full px-1.5 border border-gray-400 rounded-lg focus:border-DeepBlue outline-none bg-white ${
            compactMode ? "h-7 md:h-8 text-xs md:text-sm" : "h-8 text-sm"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-gray-50"}`}
        >
          <span className={`truncate ${!date ? "text-gray-600" : ""}`}>
            {date ? format(date, "yyyy/MM/dd", { locale: ja }) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 opacity-50 flex-shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          locale={ja}
        />
      </PopoverContent>
    </Popover>
  );
}
