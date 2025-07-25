interface CsvExportIconProps {
  className?: string;
}

function CsvExportIcon({ className = "w-5 h-5" }: CsvExportIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* フォルダー */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 7v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-7L10 5H5c-1.1 0-2 .9-2 2z"
      />
      {/* エクスポート矢印（上向き） */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
        d="M12 17V11m0 0l-2 2m2-2l2 2"
      />
    </svg>
  );
}

export default CsvExportIcon;