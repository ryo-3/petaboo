interface TeamIconProps {
  className?: string;
}

function TeamIcon({ className = "w-4 h-4" }: TeamIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 01 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 01 9.288 0M15 7a3 3 0 11-6 0 3 3 0 01 6 0zm6 3a2 2 0 11-4 0 2 2 0 01 4 0zM7 10a2 2 0 11-4 0 2 2 0 01 4 0z"
      />
    </svg>
  );
}

export default TeamIcon;
