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

      // 成功後はホーム画面に戻る
      router.push("/");
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
        <div className="flex-1 overflow-y-auto pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
            {/* 左側: メインフォーム */}
            <div className="lg:col-span-3 flex flex-col">
              <Card className="p-4 flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  基本情報
                </h2>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-3 flex-1 flex flex-col"
                >
                  {/* チーム名 */}
                  <div>
                    <label
                      htmlFor="teamName"
                      className="block text-base font-semibold text-gray-800 mb-2"
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
                        className={`text-sm ${fieldErrors.name ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.name ||
                          "プロジェクトや部署など、わかりやすい名前を付けましょう"}
                      </span>
                      <span className="text-sm text-gray-400">
                        {name.length}/50
                      </span>
                    </div>
                  </div>

                  {/* 管理者名 */}
                  <div>
                    <label
                      htmlFor="adminDisplayName"
                      className="block text-base font-semibold text-gray-800 mb-2"
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
                        className={`text-sm ${fieldErrors.adminDisplayName ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.adminDisplayName ||
                          "チーム内で表示される管理者の名前を入力してください"}
                      </span>
                      <span className="text-sm text-gray-400">
                        {adminDisplayName.length}/30
                      </span>
                    </div>
                  </div>

                  {/* チームURL */}
                  <div>
                    <label
                      htmlFor="teamUrl"
                      className="block text-base font-semibold text-gray-800 mb-2"
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
                        className={`text-sm ${fieldErrors.customUrl ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.customUrl ||
                          "英小文字・数字・ハイフンのみ使用可能です"}
                      </span>
                      <span className="text-sm text-gray-400">
                        {customUrl.length}/30
                      </span>
                    </div>
                  </div>

                  {/* チーム説明 */}
                  <div>
                    <label
                      htmlFor="teamDescription"
                      className="block text-base font-semibold text-gray-800 mb-2"
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
                        className={`text-sm ${fieldErrors.description ? "text-red-500" : "text-gray-500"}`}
                      >
                        {fieldErrors.description ||
                          "チームの目的や役割を簡潔に説明しましょう"}
                      </span>
                      <span className="text-sm text-gray-400">
                        {description.length}/200
                      </span>
                    </div>
                  </div>

                  {/* フォーム内容の余白を調整するスペーサー */}
                  <div className="flex-1"></div>

                  {/* エラー表示 */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 mt-auto">
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
                      className="px-8 bg-Green hover:bg-Green/90 text-white border-Green hover:border-Green/90"
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
            <div className="lg:col-span-2 flex flex-col">
              <Card className="p-6 shadow-sm flex-1 flex flex-col bg-gradient-to-b from-slate-50 to-white">
                {/* プラン情報セクション */}
                {teamStats && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      プラン情報
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg font-bold">
                            ★
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            プレミアムプラン
                          </p>
                          <p className="text-xs text-gray-500">
                            チーム機能利用可能
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                        <span className="text-sm font-medium text-gray-600">
                          作成可能チーム数
                        </span>
                        <span className="text-xl font-bold text-blue-600">
                          {teamStats.ownedTeams}/{teamStats.maxOwnedTeams}
                        </span>
                      </div>
                      {!canCreateTeam && (
                        <div className="mt-3 text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-md">
                          ⚠️ 作成上限に達しています
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* チーム作成後の流れセクション */}
                <div className="mb-8">
                  <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    作成後の流れ
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-1">
                        1
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium text-gray-900 mb-1">
                          管理者権限を取得
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          チームが作成され、あなたが管理者になります
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-1">
                        2
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium text-gray-900 mb-1">
                          メンバーを招待
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          招待コードが生成され、メンバーを招待できます
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-1">
                        3
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium text-gray-900 mb-1">
                          コンテンツを共有
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          チーム専用のメモ・タスク・ボードを共有できます
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ヒントセクション */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    注意事項
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 text-xs mt-1.5">●</span>
                      <span>チームURLは作成後に変更できません</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 text-xs mt-1.5">●</span>
                      <span>管理者名はチーム内での表示名になります</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 text-xs mt-1.5">●</span>
                      <span>チーム説明は後から編集可能です</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
