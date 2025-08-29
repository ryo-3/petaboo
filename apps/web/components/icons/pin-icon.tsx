interface PinIconProps {
  className?: string;
}

function PinIcon({ className = "w-4 h-4" }: PinIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      transform="rotate(40)"
    >
      {/* ピンの頭部（円形） */}
      <circle
        cx="12"
        cy="8"
        r="6"
        fill="#E85A5A"
        stroke="#D44545"
        strokeWidth="0.5"
      />

      {/* ピンの頭部のハイライト */}
      <path
        d="M8 6C8 5 9.5 4 12 4C14.5 4 16 5 16 6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      {/* ピンの針部分 */}
      <path
        d="M12 14L12 20"
        stroke="#999999"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* 針の先端 */}
      <circle cx="12" cy="20" r="1" fill="#666666" />
    </svg>
  );
}

export default PinIcon;
