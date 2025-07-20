interface DashboardEditIconProps {
  className?: string
}

function DashboardEditIcon({ className = "w-5 h-5" }: DashboardEditIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="-2 0 30 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className}
    >
      <defs>
        <mask id="dashboardMask">
          <rect width="30" height="24" fill="white"/>
          {/* ペンと重なる部分を黒で塗って透明にする */}
          <path
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={4}
            stroke="black"
            fill="none"
            d="M27 9l-10 10H13v-4l10-10 4 4z"
          />
        </mask>
      </defs>
      
      {/* ベースのダッシュボードアイコン（マスク適用） */}
      <g mask="url(#dashboardMask)">
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
          y1="12" 
          x2="22" 
          y2="12" 
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line 
          x1="12" 
          y1="2" 
          x2="12" 
          y2="22" 
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
      
      {/* 右上に鉛筆アイコン */}
      <path
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2}
        stroke="currentColor"
        fill="none"
        d="M27 9l-10 10H13v-4l10-10 4 4z"
      />
    </svg>
  )
}

export default DashboardEditIcon