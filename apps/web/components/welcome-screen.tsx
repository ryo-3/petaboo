'use client'

import MemoIcon from '@/components/icons/memo-icon'

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 px-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
            <MemoIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            ようこそ！
          </h1>
          <h2 className="text-xl font-semibold text-gray-800">
            メモアプリへようこそ
          </h2>
          <p className="text-gray-600 leading-relaxed">
            左側からメモを選択するか、新規追加ボタンでメモを作成してください
          </p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen