"use client";

import HomeIcon from "@/components/icons/home-icon";

interface HomeButtonProps {
  onClick: () => void;
}

export default function HomeButton({ onClick }: HomeButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
      title="ホーム"
    >
      <HomeIcon className="w-4 h-4" />
    </button>
  );
}