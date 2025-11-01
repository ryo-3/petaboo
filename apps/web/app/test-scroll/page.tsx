"use client";

export default function TestScrollPage() {
  // ダミーのメモカードを50個生成
  const dummyMemos = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    title: `テストメモ ${i + 1}`,
    content: `これはテスト用のメモです。番号: ${i + 1}`,
  }));

  return (
    <div className="bg-gray-50">
      {/* 固定ヘッダー（fixed） */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[70px] bg-white border-b border-gray-300 flex items-center justify-center">
        <h1 className="text-xl font-bold">固定ヘッダー（70px / fixed）</h1>
      </div>

      {/* スクロールコンテンツエリア（普通にスクロール） */}
      <div className="pt-[70px] pb-[60px] md:pb-0 px-2">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 py-4">
          {dummyMemos.map((memo) => (
            <div
              key={memo.id}
              className="bg-white p-4 rounded-lg border border-gray-300 min-h-[140px]"
            >
              <h3 className="font-semibold text-base mb-2">{memo.title}</h3>
              <p className="text-sm text-gray-600">{memo.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 固定ナビゲーションバー（スマホのみ / fixed） */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[60px] bg-white border-t border-gray-300 flex items-center justify-center">
        <div className="text-sm font-medium">
          固定ナビゲーション（60px / fixed）
        </div>
      </div>
    </div>
  );
}
