// フォーム要素の統一スタイル定数
export const FORM_STYLES = {
  // ラベル
  label: "block text-xs font-medium text-gray-600 mb-1 mt-1",

  // セレクター（ボタン部分）
  selector:
    "flex items-center cursor-pointer bg-white border border-gray-400 h-8",

  // セレクター内のテキスト
  selectorText:
    "px-1.5 text-sm hover:opacity-80 flex items-center gap-2 flex-1 truncate min-w-0",

  // インプット（date, text等）
  input:
    "px-1.5 border border-gray-400 rounded-lg focus:border-DeepBlue outline-none h-8",

  // チェブロンアイコン
  chevron: "w-3 h-3 mr-1 transition-transform",
} as const;
