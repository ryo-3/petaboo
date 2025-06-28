interface PlusIconProps {
  className?: string
}

function PlusIcon({ className = "w-5 h-5" }: PlusIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8m-4-4v8" />
    </svg>
  )
}

export default PlusIcon