"use client";

interface HeaderProps {
  currentMode: "memo" | "task";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Header({ currentMode }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center pl-[14px] pr-8 z-10">
      <div className="flex items-center gap-4">
        {/* ロゴ */}
        <div className="w-9 h-9 bg-Green rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">N</span>
        </div>

        {/* タイトル */}
        <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
      </div>
    </header>
  );
}

export default Header;
