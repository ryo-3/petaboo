/**
 * 3パネルレイアウトのロジックを管理するヘルパー関数
 */

export interface PanelVisibility {
  left: boolean;
  center: boolean;
  right: boolean;
}

export interface PanelSizes {
  left: number;
  center: number;
  right: number;
}

export interface PanelOrders {
  left: number;
  center: number;
  right: number;
}

/**
 * 表示中のパネルのorderを計算
 * orderは表示されているパネルのみカウントされる（1, 2, 3...）
 * 非表示のパネルは0
 */
export function calculatePanelOrders(visibility: PanelVisibility): PanelOrders {
  let currentOrder = 0;
  return {
    left: visibility.left ? ++currentOrder : 0,
    center: visibility.center ? ++currentOrder : 0,
    right: visibility.right ? ++currentOrder : 0,
  };
}

/**
 * 表示されているパネルの数を計算
 */
export function countVisiblePanels(visibility: PanelVisibility): number {
  return Object.values(visibility).filter(Boolean).length;
}

/**
 * パネルサイズを計算
 * - 3パネル時: localStorageの保存値を使用
 * - 2パネル時: 固定値（30:70）
 * - 1パネル時: 100%
 */
export function calculatePanelSizes(
  visibleCount: number,
  savedSizes: PanelSizes,
  orders: PanelOrders,
): PanelSizes {
  if (visibleCount === 3) {
    // 3パネル時は保存された値を使用
    return savedSizes;
  }

  if (visibleCount === 2) {
    // 2パネル時は固定値（左30%、右70%）
    return {
      left: orders.left === 1 ? 30 : orders.left === 2 ? 70 : 0,
      center: orders.center === 1 ? 30 : orders.center === 2 ? 70 : 0,
      right: orders.right === 1 ? 30 : orders.right === 2 ? 70 : 0,
    };
  }

  // 1パネル時は100%
  return {
    left: orders.left === 1 ? 100 : 0,
    center: orders.center === 1 ? 100 : 0,
    right: orders.right === 1 ? 100 : 0,
  };
}

/**
 * orderに基づいてパネルサイズを取得
 * ResizablePanelのdefaultSizeに渡す値を計算
 */
export function getPanelSizeByOrder(
  order: number,
  sizes: PanelSizes,
  orders: PanelOrders,
): number {
  if (order === orders.left) return sizes.left;
  if (order === orders.center) return sizes.center;
  if (order === orders.right) return sizes.right;
  return 0;
}

/**
 * パネル切り替え時のバリデーション
 * 最低1つのパネルは表示されている必要がある
 */
export function validatePanelToggle(
  currentVisibility: PanelVisibility,
  targetPanel: "left" | "center" | "right",
  newValue: boolean,
): boolean {
  // 非表示にしようとしている場合のみチェック
  if (newValue) return true;

  // 他のパネルが1つ以上表示されているかチェック
  const otherPanels = Object.entries(currentVisibility)
    .filter(([key]) => key !== targetPanel)
    .map(([, value]) => value);

  return otherPanels.some((visible) => visible);
}

/**
 * パネルの組み合わせキーを取得
 * localStorage保存用のキーを生成
 */
export function getPanelCombinationKey(visibility: PanelVisibility): string {
  const visiblePanels: string[] = [];
  if (visibility.left) visiblePanels.push("left");
  if (visibility.center) visiblePanels.push("center");
  if (visibility.right) visiblePanels.push("right");

  if (visiblePanels.length === 3) return "3panel";
  if (visiblePanels.length === 2) return visiblePanels.join("-");
  if (visiblePanels.length === 1) return visiblePanels[0] || "none";
  return "none"; // 通常はありえない
}
