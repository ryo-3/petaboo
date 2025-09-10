"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeamIcon from "@/components/icons/team-icon";
import ArrowLeftIcon from "@/components/icons/arrow-left-icon";
import { useTeamStats } from "@/src/hooks/use-team-stats";
import { useCreateTeam } from "@/src/hooks/use-create-team";

export function TeamCreate() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    adminDisplayName?: string;
    customUrl?: string;
    description?: string;
  }>({});
  const router = useRouter();
  const { data: teamStats } = useTeamStats();
  const createTeamMutation = useCreateTeam();

  const canCreateTeam = teamStats
    ? teamStats.ownedTeams < teamStats.maxOwnedTeams
    : false;

  // バリデーション関数
  const validateForm = () => {
    if (!canCreateTeam) {
      return "チーム作成数の上限に達しています";
    }

    if (!name.trim()) {
      return "チーム名を入力してください";
    }

    if (name.trim().length > 50) {
      return "チーム名は50文字以内で入力してください";
    }

    if (!adminDisplayName.trim()) {
      return "管理者名を入力してください";
    }

    if (adminDisplayName.trim().length > 30) {
      return "管理者名は30文字以内で入力してください";
    }

    if (!customUrl.trim()) {
      return "チームURLを入力してください";
    }

    if (customUrl.trim().length > 30) {
      return "チームURLは30文字以内で入力してください";
    }

    if (customUrl !== customUrl.toLowerCase()) {
      return "チームURLに大文字は使用できません。小文字に変換してください";
    }

    if (!/^[a-z0-9-]+$/.test(customUrl.trim())) {
      return "チームURLは英小文字・数字・ハイフンのみ使用できます";
    }

    const reservedUrls = [
      "admin",
      "api",
      "auth",
      "team",
      "teams",
      "user",
      "users",
      "settings",
      "help",
      "about",
      "contact",
    ];
    if (reservedUrls.includes(customUrl.trim().toLowerCase())) {
      return "このURLは予約されているため使用できません";
    }

    if (description.length > 200) {
      return "チーム説明は200文字以内で入力してください";
    }

    return null;
  };

  // フィールド別バリデーション
  const validateField = (field: string, value: string) => {
    switch (field) {
      case "name":
        if (!value.trim()) return "チーム名を入力してください";
        if (value.trim().length > 50)
          return "チーム名は50文字以内で入力してください";
        break;

      case "adminDisplayName":
        if (!value.trim()) return "管理者名を入力してください";
        if (value.trim().length > 30)
          return "管理者名は30文字以内で入力してください";
        break;

      case "customUrl":
        if (!value.trim()) return "チームURLを入力してください";
        if (value.trim().length > 30)
          return "チームURLは30文字以内で入力してください";
        if (value !== value.toLowerCase())
          return "大文字は使用できません。小文字に変換してください";
        if (!/^[a-z0-9-]+$/.test(value.trim()))
          return "英小文字・数字・ハイフンのみ使用できます";
        const reservedUrls = [
          "admin",
          "api",
          "auth",
          "team",
          "teams",
          "user",
          "users",
          "settings",
          "help",
          "about",
          "contact",
        ];
        if (reservedUrls.includes(value.trim().toLowerCase()))
          return "このURLは予約されています";
        break;

      case "description":
        if (value.length > 200)
          return "チーム説明は200文字以内で入力してください";
        break;
    }
    return null;
  };

  // フィールドの変更ハンドラー
  const handleFieldChange = (
    field: string,
    value: string,
    setter: (value: string) => void,
  ) => {
    setter(value);
    const fieldError = validateField(field, value);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: fieldError,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    try {
      const team = await createTeamMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        customUrl: customUrl.trim(),
        adminDisplayName: adminDisplayName.trim(),
      });

      // 成功後は作成したチームの詳細ページに移動
      router.push(`/team/${team.customUrl}`);
    } catch (error) {
      console.error("チーム作成エラー:", error);
      setError(
        error instanceof Error ? error.message : "チーム作成に失敗しました",
      );
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <div className="w-full pt-3 pl-5 pr-5 flex flex-col">
        {/* ヘッダー */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors rounded-md hover:bg-gray-100"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-gray-800">
              新しいチームを作成
            </h1>
            <TeamIcon className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* フォームエリア */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl">
            {/* 左側: メインフォーム */}
            <div className="lg:col-span-2">
              <Card className="p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  基本情報
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* チーム名 */}
                  <div>
                    <label
                      htmlFor="teamName"
                      className="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      チーム名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={name}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value, setName)
                      }
                      placeholder="例: マーケティングチーム"
                      className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.name ? "border-red-300" : "border-gray-300"
                      }`}
                      required
                      disabled={!canCreateTeam}
                    />
                    <div className="flex justify-between mt-1">
                      <span
                        className={`text-xs ${fieldErrors.name ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.name ||
                          "プロジェクトや部署など、わかりやすい名前を付けましょう"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {name.length}/50
                      </span>
                    </div>
                  </div>

                  {/* 管理者名 */}
                  <div>
                    <label
                      htmlFor="adminDisplayName"
                      className="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      管理者名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="adminDisplayName"
                      type="text"
                      value={adminDisplayName}
                      onChange={(e) =>
                        handleFieldChange(
                          "adminDisplayName",
                          e.target.value,
                          setAdminDisplayName,
                        )
                      }
                      placeholder="例: 田中太郎"
                      className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        fieldErrors.adminDisplayName
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      required
                      disabled={!canCreateTeam}
                    />
                    <div className="flex justify-between mt-1">
                      <span
                        className={`text-xs ${fieldErrors.adminDisplayName ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.adminDisplayName ||
                          "チーム内で表示される管理者の名前を入力してください"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {adminDisplayName.length}/30
                      </span>
                    </div>
                  </div>

                  {/* チームURL */}
                  <div>
                    <label
                      htmlFor="teamUrl"
                      className="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      チームURL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">/team/</span>
                      </div>
                      <input
                        id="teamUrl"
                        type="text"
                        value={customUrl}
                        onChange={(e) => {
                          handleFieldChange(
                            "customUrl",
                            e.target.value,
                            setCustomUrl,
                          );
                        }}
                        placeholder="my-team"
                        className={`w-full pl-14 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          fieldErrors.customUrl
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        required
                        disabled={!canCreateTeam}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span
                        className={`text-xs ${fieldErrors.customUrl ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.customUrl ||
                          "英小文字・数字・ハイフンのみ使用可能です"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {customUrl.length}/30
                      </span>
                    </div>
                  </div>

                  {/* チーム説明 */}
                  <div>
                    <label
                      htmlFor="teamDescription"
                      className="block text-sm font-semibold text-gray-700 mb-1"
                    >
                      チーム説明（任意）
                    </label>
                    <textarea
                      id="teamDescription"
                      value={description}
                      onChange={(e) =>
                        handleFieldChange(
                          "description",
                          e.target.value,
                          setDescription,
                        )
                      }
                      placeholder="例: マーケティング戦略の企画・実行を行うチームです"
                      rows={3}
                      className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                        fieldErrors.description
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      disabled={!canCreateTeam}
                    />
                    <div className="flex justify-between mt-1">
                      <span
                        className={`text-xs ${fieldErrors.description ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.description ||
                          "チームの目的や役割を簡潔に説明しましょう"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {description.length}/200
                      </span>
                    </div>
                  </div>

                  {/* エラー表示 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={createTeamMutation.isPending}
                      className="px-6"
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        !canCreateTeam ||
                        !name.trim() ||
                        !customUrl.trim() ||
                        !adminDisplayName.trim() ||
                        createTeamMutation.isPending
                      }
                      className="px-8"
                    >
                      {createTeamMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          作成中...
                        </>
                      ) : (
                        "チームを作成"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* 右側: 補助情報 */}
            <div className="space-y-4">
              {/* プラン情報カード */}
              {teamStats && (
                <Card className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                    プラン情報
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-blue-800">
                        プレミアムプラン特典
                      </span>
                    </div>
                    <div className="text-sm text-blue-700">
                      作成可能なチーム: {teamStats.ownedTeams}/
                      {teamStats.maxOwnedTeams}
                    </div>
                    {!canCreateTeam && (
                      <div className="text-sm text-red-600 mt-1">
                        チーム作成数の上限に達しています
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* チーム作成後の流れ */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                  チーム作成後の流れ
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-xs text-gray-800">
                        管理者権限を取得
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        チームが作成され、あなたが管理者になります
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-xs text-gray-800">
                        メンバーを招待
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        招待コードが生成され、メンバーを招待できます
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-xs text-gray-800">
                        コンテンツを共有
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        チーム専用のメモ・タスク・ボードを共有できます
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ヒントカード */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">
                  💡 ヒント
                </h3>
                <ul className="space-y-1.5 text-xs text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>チームURLは後から変更できません</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>管理者名はチーム内で表示されます</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500">•</span>
                    <span>チーム説明は後から編集可能です</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
