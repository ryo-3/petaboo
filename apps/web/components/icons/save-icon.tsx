interface SaveIconProps {
  className?: string;
}

function SaveIcon({ className = "w-6 h-6" }: SaveIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M1 3h9a2 2 0 0 1 2 2v16a1 1 0 0 0-1-1H1z" fill="none" />
      <path d="M23 3h-9a2 2 0 0 0-2 2v16a1 1 0 0 1 1-1h10z" fill="none" />
      <path d="M12 3v18" />
      <path d="M4 9h5m-5 3h4" />
      <path d="M15 9h5m-5 3h4" />
      <path d="M18 1l5 5-7 7-4 1 1-4z" fill="none" />
      <path d="M20 3l3 3" />
    </svg>
  );
}

export default SaveIcon;
