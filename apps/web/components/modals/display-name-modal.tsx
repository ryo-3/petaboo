"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUpdateDisplayName } from "@/src/hooks/use-update-display-name";

interface DisplayNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName?: string | null;
}

export function DisplayNameModal({
  isOpen,
  onClose,
  currentDisplayName,
}: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName || "");
  const [error, setError] = useState<string | null>(null);

  const { mutate: updateDisplayName, isPending } = useUpdateDisplayName();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("表示名を入力してください");
      return;
    }

    if (displayName.length > 50) {
      setError("表示名は50文字以内で入力してください");
      return;
    }

    updateDisplayName(displayName.trim(), {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        setError(
          error instanceof Error ? error.message : "表示名の更新に失敗しました",
        );
      },
    });
  };

  const handleClose = () => {
    if (isPending) return; // 処理中は閉じられない
    onClose();
    setError(null);
    setDisplayName(currentDisplayName || "");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">表示名設定</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              表示名
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="表示名を入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={50}
              disabled={isPending}
              autoFocus
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {displayName.length}/50文字
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending || !displayName.trim()}>
              {isPending ? "更新中..." : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
