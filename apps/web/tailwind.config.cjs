/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}", // Next.js appディレクトリ対応
    "./components/**/*.{ts,tsx}", // コンポーネント
    "./src/**/*.{ts,tsx}", // src配下のファイル（utilsを含む）
  ],
  safelist: [
    'bg-slate-200',
    'hover:bg-slate-300', 
    'text-slate-600',
    'bg-slate-500',
    'bg-slate-600',
    'text-white',
    // 動的に生成されるカラークラス（タスク・優先度・カテゴリーのセレクター用）
    'bg-Green',
    'bg-Green/10',
    'bg-Green/20',
    'bg-Green/70',
    'bg-blue-600',
    'bg-blue-200',
    'bg-gray-400',
    'bg-gray-500',
    'bg-gray-100',
    'bg-yellow-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-orange-500',
  ],
  theme: {
    extend: {
      colors: {
        Green: "#00873f",
        Emerald: "#249a84",
        DeepBlue: "#2C6994",
        "Emerald-dark": "#3f8b7d",
        Yellow: "#7b9237",
        Blue: "#426dd0",
        "light-Blue": "#2caaf3",
        "tag-bg": "#e8dcc0",
        "tag-text": "#4a3018",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

module.exports = config;
