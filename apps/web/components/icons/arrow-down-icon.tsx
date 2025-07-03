interface ArrowDownIconProps {
  className?: string;
}

function ArrowDownIcon({ className = "w-2.5 h-3" }: ArrowDownIconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
    </svg>
  );
}

export default ArrowDownIcon;