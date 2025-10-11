"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/base/resizable";

interface ControlPanelLayoutProps {
  // 左パネル
  leftPanel: ReactNode;
  // 中央パネル
  centerPanel: ReactNode;
  // 右パネル
  rightPanel: ReactNode;
  // ローカルストレージのキー名
  storageKey: string;
  // デフォルトサイズ
  defaultSizes?: {
    left: number;
    center: number;
    right: number;
  };
}

export function ControlPanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  storageKey,
  defaultSizes = { left: 25, center: 50, right: 25 },
}: ControlPanelLayoutProps) {
  // ローカルストレージから保存済みサイズを取得
  const getSavedSizes = () => {
    if (typeof window === "undefined") return defaultSizes;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultSizes;
      }
    }
    return defaultSizes;
  };

  const [panelSizes, setPanelSizes] = useState(getSavedSizes);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLayout = (sizes: number[]) => {
    if (
      sizes.length === 3 &&
      sizes[0] !== undefined &&
      sizes[1] !== undefined &&
      sizes[2] !== undefined
    ) {
      const newSizes = {
        left: sizes[0],
        center: sizes[1],
        right: sizes[2],
      };
      setPanelSizes(newSizes);

      // デバウンス：300ms後に保存（リサイズ中は保存しない）
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(newSizes));
      }, 300);
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handleLayout}
        className="h-full"
      >
        {/* 左パネル */}
        <ResizablePanel
          defaultSize={panelSizes.left}
          minSize={20}
          maxSize={50}
          className="flex flex-col border-r border-gray-200"
        >
          {leftPanel}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 中央パネル */}
        <ResizablePanel
          defaultSize={panelSizes.center}
          minSize={30}
          className="flex flex-col border-r border-gray-200"
        >
          {centerPanel}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 右パネル */}
        <ResizablePanel
          defaultSize={panelSizes.right}
          minSize={20}
          maxSize={50}
          className="flex flex-col"
        >
          {rightPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
