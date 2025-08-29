interface TrashIconProps {
  className?: string;
  isLidOpen?: boolean;
}

function TrashIcon({
  className = "w-5 h-5",
  isLidOpen = false,
}: TrashIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      style={{ overflow: "visible" }}
      data-trash-icon
    >
      {/* ゴミ箱本体（蓋以外）- 青色 */}
      <g>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 10v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-9"
        />

        {/* ゴミ箱の中の線 */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 13v4m4-4v4" />
      </g>

      {/* 蓋の部分（ハンドル含む） - 赤色 */}
      <g
        className={`trash-icon-lid transition-transform duration-300 ${isLidOpen ? "open" : ""}`}
        style={{ transformOrigin: "16px 14px" }}
      >
        {/* 蓋の横線 */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 7h16"
          strokeWidth="1.5"
        />
        {/* ハンドル部分も蓋と一緒に動く */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
}

export default TrashIcon;
