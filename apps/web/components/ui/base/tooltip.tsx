import { ReactNode, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "bottom-right"
    | "bottom-left";
  bgColor?: string;
  textColor?: string;
  className?: string;
}

function Tooltip({
  children,
  text,
  position = "bottom",
  bgColor = "bg-gray-800",
  textColor = "text-white",
  className = "",
}: TooltipProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // クリック時にツールチップを非表示にする
  const handleClick = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    if (isHovered && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
          break;
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
        case "bottom-right":
          top = rect.bottom + 8;
          left = rect.left;
          break;
        case "bottom-left":
          top = rect.bottom + 8;
          left = rect.right;
          break;
        case "bottom":
        default:
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
      }

      setTooltipPosition({ top, left });
    }
  }, [isHovered, position]);

  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "-translate-x-1/2 -translate-y-full";
      case "left":
        return "-translate-x-full -translate-y-1/2";
      case "right":
        return "-translate-y-1/2";
      case "bottom-right":
        return "";
      case "bottom-left":
        return "-translate-x-full";
      case "bottom":
      default:
        return "-translate-x-1/2";
    }
  };

  // 位置が計算されていない場合は表示しない（左上(0,0)に表示されるのを防ぐ）
  const hasValidPosition =
    tooltipPosition.top !== 0 || tooltipPosition.left !== 0;

  const tooltipContent =
    isHovered && hasValidPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            className={`hidden md:block fixed px-2 py-1 ${bgColor} ${textColor} text-xs rounded whitespace-nowrap transition-opacity pointer-events-none z-[999999] ${getPositionClasses()}`}
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
            }}
          >
            {text}
            <div
              className={`absolute ${
                position === "top"
                  ? "top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                  : position === "left"
                    ? "left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent"
                    : position === "right"
                      ? "right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent"
                      : position === "bottom-right"
                        ? "bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent"
                        : position === "bottom-left"
                          ? "bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent"
                          : "bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent"
              } ${
                bgColor === "bg-gray-800"
                  ? position === "left"
                    ? "border-l-gray-800"
                    : position === "right"
                      ? "border-r-gray-800"
                      : "border-t-gray-800 border-b-gray-800"
                  : bgColor === "bg-black"
                    ? position === "left"
                      ? "border-l-black"
                      : position === "right"
                        ? "border-r-black"
                        : "border-t-black border-b-black"
                    : bgColor === "bg-blue-600"
                      ? position === "left"
                        ? "border-l-blue-600"
                        : position === "right"
                          ? "border-r-blue-600"
                          : "border-t-blue-600 border-b-blue-600"
                      : position === "left"
                        ? "border-l-gray-800"
                        : position === "right"
                          ? "border-r-gray-800"
                          : "border-t-gray-800 border-b-gray-800"
              }`}
            ></div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {children}
      {tooltipContent}
    </div>
  );
}

export default Tooltip;
