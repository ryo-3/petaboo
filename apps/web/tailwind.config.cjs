/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}", // Next.js appディレクトリ対応
    "./components/**/*.{ts,tsx}", // コンポーネント
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        Green: "#00873f",
        Emerald: "#249a84",
        "Emerald-dark": "#3f8b7d",
        Yellow: "#7b9237",
      },
    },
  },
  plugins: [],
};

module.exports = config;
