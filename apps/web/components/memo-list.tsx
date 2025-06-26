import LogoutButton from "./logout-button";

function MemoList() {
  return (
    <div className="flex flex-col justify-between h-[97vh]">
      <div>
        <div className="bg-emerald-200 text-center mx-2 rounded-lg mt-4">
          <span className="text-slate-600 font-medium text-lg">新規追加</span>
        </div>
        <ul className="mx-2 mt-2">
          <li>メモ一覧表</li>
        </ul>
      </div>
      <LogoutButton />
    </div>
  );
}

export default MemoList;
