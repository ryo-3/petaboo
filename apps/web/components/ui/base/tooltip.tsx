import { ReactNode } from "react";

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
  const getPositionClasses = () => {
    switch (position) {
      case "top":
        return "bottom-full left-1/2 transform -translate-x-1/2 mb-2";
      case "left":
        return "right-full top-1/2 transform -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 transform -translate-y-1/2 ml-2";
      case "bottom-right":
        return "top-full left-0 mt-2";
      case "bottom-left":
        return "top-full right-0 mt-2";
      case "bottom":
      default:
        return "top-full left-1/2 transform -translate-x-1/2 mt-2";
    }
  };

  return (
    <div className={`relative inline-block tooltip-wrapper ${className}`}>
      {children}
      <div
        className={`absolute ${getPositionClasses()} px-2 py-1 ${bgColor} ${textColor} text-xs rounded whitespace-nowrap opacity-0 transition-opacity pointer-events-none z-[999999] tooltip-content`}
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
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .tooltip-wrapper:hover .tooltip-content {
            opacity: 1;
          }
        `,
        }}
      />
    </div>
  );
}

export default Tooltip;
