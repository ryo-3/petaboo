import React from 'react';

interface ChevronDownIconProps {
  className?: string;
}

function ChevronDownIcon({ className = "w-4 h-4" }: ChevronDownIconProps) {
  return (
    <svg 
      className={className}
      viewBox="0 0 12 12" 
      fill="currentColor"
    >
      <path d="M6 8L2 4h8l-4 4z"/>
    </svg>
  );
}

export default ChevronDownIcon;