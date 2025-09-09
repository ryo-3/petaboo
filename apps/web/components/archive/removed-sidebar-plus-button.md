# サイドバー+ボタン削除アーカイブ

## 削除日時

2025-09-09

## 削除理由

- 各画面（メモ一覧、タスク一覧、ボード画面）に専用の新規作成ボタンがあり、サイドバーの+ボタンは冗長
- サイドバーをシンプルにしてUXを向上させるため
- アイコンの競合や複雑な状態管理を減らすため

## 削除されたコンポーネント

### 1. PlusIcon コンポーネント

ファイル: `components/icons/plus-icon.tsx`

```typescript
interface PlusIconProps {
  className?: string;
}

function PlusIcon({ className = "w-5 h-5" }: PlusIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default PlusIcon;
```

### 2. AddItemButton コンポーネント

ファイル: `components/ui/buttons/add-item-button.tsx`

```typescript
"use client";

import CreateButton from "@/components/ui/buttons/create-button";

type ItemType = "memo" | "task" | "board";

interface AddItemButtonProps {
  itemType: ItemType;
  onClick: () => void;
  position?: "right" | "top" | "bottom";
  className?: string;
  disabled?: boolean;
  size?: "small" | "normal";
  showTooltip?: boolean;
  customSize?: {
    padding?: string;
    iconSize?: string;
  };
  isGray?: boolean;
}

function AddItemButton({
  itemType,
  onClick,
  position = "right",
  className = "",
  disabled = false,
  size = "normal",
  showTooltip = true,
  customSize,
  isGray = false,
}: AddItemButtonProps) {
  const typeConfig = {
    memo: {
      label: "新規メモ作成",
      color: "green" as const,
    },
    task: {
      label: "新規タスク作成",
      color: "yellow" as const,
    },
    board: {
      label: "新規ボード作成",
      color: "blue" as const,
    },
  };

  const config = typeConfig[itemType];

  return (
    <CreateButton
      onClick={onClick}
      color={isGray ? "bg-gray-200 hover:bg-gray-300" : config.color}
      label={config.label}
      position={position}
      className={className}
      disabled={disabled}
      size={size}
      showTooltip={showTooltip}
      customSize={customSize}
    />
  );
}

export default AddItemButton;
```

## サイドバーから削除されたコード部分

### デスクトップ版（コンパクトモード）

```typescript
// 削除されたインポート
import AddItemButton from "@/components/ui/buttons/add-item-button";

// 削除された+ボタン
<AddItemButton
  itemType={isBoardActive ? "board" : currentMode}
  onClick={
    isBoardActive
      ? onNewBoard!
      : currentMode === "memo"
        ? onNewMemo
        : onNewTask!
  }
  position="right"
  isGray={
    isHomePage ||
    isTeamOverview ||
    isNormalTeamPage ||
    screenMode === "search" ||
    screenMode === "settings"
  }
/>
```

### モバイル版

```typescript
// 削除されたインポート
import PlusIcon from "@/components/icons/plus-icon";

// 削除された+ボタン
<button
  onClick={
    isBoardActive
      ? onNewBoard!
      : currentMode === "memo"
        ? onNewMemo
        : onNewTask
  }
  className={`flex-1 text-center rounded-lg py-2 transition-colors flex items-center justify-center gap-1 ${
    isTeamListPage || isTeamDetailPage
      ? "bg-gray-100 hover:bg-gray-200"
      : isBoardActive
        ? "bg-light-Blue hover:bg-light-Blue/85"
        : currentMode === "memo"
          ? "bg-Green hover:bg-Green/85"
          : "bg-DeepBlue hover:bg-DeepBlue/85"
  }`}
>
  <PlusIcon
    className={`w-4 h-4 ${isTeamListPage || isTeamDetailPage ? "text-gray-600" : "text-gray-100"}`}
  />
  <span
    className={`font-medium text-sm ${isTeamListPage || isTeamDetailPage ? "text-gray-600" : "text-gray-100"}`}
  >
    追加
  </span>
</button>
```

## 削除されたプロパティ

### SidebarPropsから削除

```typescript
// これらのプロパティが不要になる
onNewMemo: () => void;
onNewTask?: () => void;
onNewBoard?: () => void;
```

### 親コンポーネント（main-client.tsx等）から削除が必要

```typescript
// これらのハンドラー関数の受け渡しが不要になる
handleNewMemo = { handleNewMemo };
handleNewTask = { handleNewTask };
handleNewBoard = { handleNewBoard };
```

## 復元方法

もし将来的に+ボタンを復元したい場合は：

1. このアーカイブファイルからコードをコピー
2. PlusIcon コンポーネントを復元
3. AddItemButton コンポーネントを復元
4. サイドバーに+ボタンのコードを追加
5. 関連するプロパティとハンドラーを復元
