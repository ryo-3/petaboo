interface CheckCircleIconProps {
  className?: string;
}

function CheckCircleIcon({ className = "w-5 h-5" }: CheckCircleIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#129247" />
      <path
        d="M9 12l2 2 4-4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CheckCircleIcon;