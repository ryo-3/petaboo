"use client";

import { Fragment, useRef, useState, useEffect, type ReactNode } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/base/resizable";

type PanelKey = "left" | "center" | "right";

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
  // パネルの表示制御
  visibility?: {
    left: boolean;
    center: boolean;
    right: boolean;
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
  visibility,
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

  const defaultVisibility = {
    left: true,
    center: true,
    right: !!rightPanel,
  };
  const effectiveVisibility = visibility ?? defaultVisibility;
  const isRightPanelVisible = !!rightPanel && effectiveVisibility.right;
  const hasPanelAfterLeft =
    (effectiveVisibility.center && centerPanel !== null) || isRightPanelVisible;

  const panelConfigs = [
    {
      key: "left" as PanelKey,
      visible: effectiveVisibility.left,
      content: leftPanel,
      className: `flex flex-col ${hasPanelAfterLeft ? "border-r border-gray-200" : ""}`,
      minSize: minSizes.left ?? 20,
      maxSize: maxSizes.left ?? 50,
    },
    {
      key: "center" as PanelKey,
      visible: effectiveVisibility.center,
      content: centerPanel,
      className: `flex flex-col ${isRightPanelVisible ? "border-r border-gray-200" : ""}`,
      minSize: minSizes.center ?? 30,
      maxSize: maxSizes.center,
    },
    {
      key: "right" as PanelKey,
      visible: isRightPanelVisible,
      content: rightPanel,
      className: "flex flex-col",
      minSize: minSizes.right ?? 20,
      maxSize: maxSizes.right ?? 50,
    },
  ];

  const renderedPanels = panelConfigs.filter(
    (panel) =>
      panel.visible && panel.content !== null && panel.content !== undefined,
  );
  const panelsToRender =
    renderedPanels.length > 0
      ? renderedPanels
      : panelConfigs[0]
        ? [panelConfigs[0]]
        : [];
  const panelKeys = panelsToRender.map((panel) => panel.key);

  const handleLayout = (sizes: number[]) => {
    // skipInitialSaveが有効な場合、初回マウント時はスキップ
    if (skipInitialSave) {
      mountCount.current++;
      if (mountCount.current <= 1) {
        return;
      }
    }

    if (sizes.length !== panelKeys.length) {
      return;
    }

    const newSizes = { ...panelSizes };
    panelKeys.forEach((key, index) => {
      const size = sizes[index];
      if (size !== undefined) {
        newSizes[key] = size;
      }
    });
    setPanelSizes(newSizes);

    // デバウンス：指定されたミリ秒後に保存（リサイズ中は保存しない）
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }
    resizeTimerRef.current = setTimeout(() => {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(newSizes));
    }, debounceMs);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handleLayout}
        className="h-full"
      >
        {panelsToRender.map((panel, index) => {
          if (!panel) return null;
          return (
            <Fragment key={panel.key}>
              <ResizablePanel
                defaultSize={panelSizes[panel.key]}
                minSize={panel.minSize}
                maxSize={panel.maxSize}
                className={panel.className}
              >
                {panel.content}
              </ResizablePanel>
              {index < panelsToRender.length - 1 && (
                <ResizableHandle withHandle />
              )}
            </Fragment>
          );
        })}
      </ResizablePanelGroup>
    </div>
  );
}
