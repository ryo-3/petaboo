interface BoardTitleHeaderProps {
  boardName: string;
  boardDescription?: string | null;
}

export default function BoardTitleHeader({ boardName, boardDescription }: BoardTitleHeaderProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {boardName}
        </h1>
        {boardDescription && (
          <p className="text-gray-600">{boardDescription}</p>
        )}
      </div>
    </div>
  );
}