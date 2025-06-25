/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./app/**/*.{ts,tsx}", // Next.js appディレクトリ対応
    "./components/**/*.{ts,tsx}", // コンポーネント
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

module.exports = config;
