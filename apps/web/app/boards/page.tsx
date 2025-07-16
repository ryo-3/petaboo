import Main from "@/app/main";

export default async function BoardsPage() {
  console.log('🔍 BoardsPage開始 - ボード一覧');
  
  return (
    <Main 
      initialCurrentMode="board"
    />
  );
}