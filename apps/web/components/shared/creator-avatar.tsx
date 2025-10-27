import Tooltip from "@/components/ui/base/tooltip";

interface CreatorAvatarProps {
  createdBy?: string | null;
  avatarColor?: string | null;
  teamMode?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function CreatorAvatar({
  createdBy,
  avatarColor,
  teamMode = false,
  size = "sm",
  className = "",
}: CreatorAvatarProps) {
  // チーム機能でない場合、または作成者情報がない場合は表示しない
  if (!teamMode || !createdBy) {
    return null;
  }

  const sizeClasses = {
    sm: "w-4 h-4 text-xs",
    md: "w-5 h-5 text-xs",
    lg: "w-5 h-5 md:w-6 md:h-6 text-xs md:text-sm",
  };

  return (
    <Tooltip text={createdBy} position="bottom">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium ${className} ${
          avatarColor || "bg-blue-500"
        }`}
      >
        {createdBy.charAt(0).toUpperCase()}
      </div>
    </Tooltip>
  );
}
