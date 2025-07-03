interface PlusIconProps {
  className?: string
}

function PlusIcon({ className = "w-5 h-5" }: PlusIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2.5} 
      stroke="currentColor" 
      className={className}
    >
      <path d="M12 4v16m8-8H4" />
    </svg>
  )
}

export default PlusIcon