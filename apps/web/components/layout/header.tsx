"use client";

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center pl-[14px] pr-8 z-10">
      <div className="flex items-center gap-5 flex-1">
        <div className="flex items-center gap-4">
          {/* ロゴ */}
          <div className="w-10 h-10 bg-Green rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">ぺ</span>
          </div>

          {/* タイトルとキャッチコピー */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-800 tracking-wide">
                ぺたぼー
              </h1>
              <span className="text-lg font-medium text-gray-600">PETABoo</span>
            </div>
            <span className="text-sm text-gray-600 mt-0.5">
              - 日々のメモやタスクをひとまとめに
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
