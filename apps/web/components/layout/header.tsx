"use client";

import { useApiConnection } from "@/src/hooks/use-api-connection";


function Header() {
  // API接続状況管理
  const { isOnline, toggleOnlineMode } = useApiConnection();


  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-gray-200 bg-white flex items-center pl-[14px] pr-8 z-10">
      <div className="flex items-center gap-5 flex-1">
        <div className="flex items-center gap-4">
          {/* ロゴ */}
          <div className="w-9 h-9 bg-Green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>

          {/* タイトル */}
          <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
        </div>


        {/* オンライン/オフライン状態表示と切り替え */}
        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{isOnline ? 'オンライン' : 'オフライン'}</span>
          </div>
          <button
            onClick={toggleOnlineMode}
            className={`p-2 rounded-lg transition-colors ${
              isOnline
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            {isOnline ? (
              // WiFiアイコン
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 20L8.4 16.2C9.8 15.1 11.8 15.1 13.2 16.2L12 20M6.8 14C9.2 12.2 11.8 12.2 14.2 14L15.6 12.4C12.8 10.2 9.2 10.2 6.4 12.4L6.8 14M4.4 11.6C8.4 8.4 13.6 8.4 17.6 11.6L19 10C13.8 6 8.2 6 3 10L4.4 11.6M2 8.2C8.8 3.4 15.2 3.4 22 8.2L20.6 9.8C14.8 5.8 9.2 5.8 3.4 9.8L2 8.2Z"/>
              </svg>
            ) : (
              // WiFi無効アイコン
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.36 18l1.64 1.64L24 17.64 6.36 0 4.72 1.64 8.11 5.03L2 12v2l5.5-1.5L10 16v2l2-1.5 2 1.5v-2l2.5-3.5L18.36 15l2 2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
