interface DashboardIconProps {
  className?: string
}

function DashboardIcon({ className = "w-5 h-5" }: DashboardIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className}
    >
      <rect 
        x="2" 
        y="2" 
        width="20" 
        height="20" 
        rx="1" 
        fill="currentColor"
        opacity="0.1"
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <rect 
        x="2" 
        y="2" 
        width="20" 
        height="20" 
        rx="1" 
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <line 
        x1="2" 
        y1="8.5" 
        x2="22" 
        y2="8.5" 
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line 
        x1="2" 
        y1="15.5" 
        x2="22" 
        y2="15.5" 
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line 
        x1="8.5" 
        y1="2" 
        x2="8.5" 
        y2="22" 
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line 
        x1="15.5" 
        y1="2" 
        x2="15.5" 
        y2="22" 
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default DashboardIcon