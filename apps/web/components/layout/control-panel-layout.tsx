"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
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
  // 右パネル（nullの場合は2パネル表示）
  rightPanel?: ReactNode | null;
  // ローカルストレージのキー名（文字列または動的取得関数）
  storageKey: string | { getKey: () => string };
  // デフォルトサイズ
  defaultSizes?: {
    left: number;
    center: number;
    right: number;
  };
  // 初回マウント時の保存をスキップするか（デフォルト: false）
  skipInitialSave?: boolean;
  // 状態変化の監視キー（選択状態などの変化を検知してリセット）
  stateKey?: string;
  // デバウンス時間（ミリ秒、デフォルト: 300）
  debounceMs?: number;
  // パネルの最小サイズ設定
  minSizes?: {
    left?: number;
    center?: number;
    right?: number;
  };
  // パネルの最大サイズ設定
  maxSizes?: {
    left?: number;
    center?: number;
    right?: number;
  };
}

export function ControlPanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  storageKey,
  defaultSizes = { left: 25, center: 50, right: 25 },
  skipInitialSave = false,
  stateKey,
  debounceMs = 300,
  minSizes = { left: 20, center: 30, right: 20 },
  maxSizes = { left: 50, center: undefined, right: 50 },
}: ControlPanelLayoutProps) {
  // ストレージキーを取得するヘルパー関数
  const getStorageKey = (): string => {
    if (typeof storageKey === "string") {
      return storageKey;
    }
    return storageKey.getKey();
  };

  // ローカルストレージから保存済みサイズを取得
  const getSavedSizes = () => {
    if (typeof window === "undefined") return defaultSizes;
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
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
  const mountCount = useRef(0);

  // stateKeyが変更されたらマウントカウントをリセット
  useEffect(() => {
    mountCount.current = 0;
  }, [stateKey]);

  const handleLayout = (sizes: number[]) => {
    // skipInitialSaveが有効な場合、初回マウント時はスキップ
    if (skipInitialSave) {
      mountCount.current++;
      if (mountCount.current <= 1) {
        return;
      }
    }

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

      // デバウンス：指定されたミリ秒後に保存（リサイズ中は保存しない）
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        const key = getStorageKey();
        localStorage.setItem(key, JSON.stringify(newSizes));
      }, debounceMs);
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
          minSize={minSizes.left ?? 20}
          maxSize={maxSizes.left ?? 50}
          className="flex flex-col border-r border-gray-200"
        >
          {leftPanel}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 中央パネル */}
        <ResizablePanel
          defaultSize={panelSizes.center}
          minSize={minSizes.center ?? 30}
          maxSize={maxSizes.center}
          className={`flex flex-col ${rightPanel ? "border-r border-gray-200" : ""}`}
        >
          {centerPanel}
        </ResizablePanel>

        {/* 右パネル（rightPanelがある場合のみ表示） */}
        {rightPanel && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={panelSizes.right}
              minSize={minSizes.right ?? 20}
              maxSize={maxSizes.right ?? 50}
              className="flex flex-col"
            >
              {rightPanel}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
