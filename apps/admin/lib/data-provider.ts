import dataProvider from "@refinedev/simple-rest";

// 環境に応じてAPIベースURLを切り替え
// 本番環境でもNext.js APIルートを経由してプロキシする
const API_URL = "/api";

console.log("🔧 Data Provider Configuration:", {
  API_URL,
  isProd: !!process.env.NEXT_PUBLIC_API_URL,
  env: process.env.NODE_ENV,
});

// 管理者用の認証ヘッダーを追加するカスタムデータプロバイダー
export const customDataProvider = {
  ...dataProvider(API_URL),

  // getListメソッドをオーバーライド（リトライ機能付き）
  getList: async (params: any) => {
    const { resource, pagination, sorters, filters, meta } = params;

    const url = `${API_URL}/${resource}`;
    console.log("🔍 Data Provider - getList:", {
      resource,
      url,
      API_URL,
      isClient: typeof window !== "undefined",
      env: process.env.NEXT_PUBLIC_API_URL,
    });

    // リトライ機能の実装
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "x-admin-token": "petaboo_admin_dev_token_2025",
            "Content-Type": "application/json",
          },
          mode: "cors",
          credentials: "omit",
          cache: "no-cache",
        });

        console.log(
          `📡 Response status (attempt ${attempt}/${maxRetries}):`,
          response.status,
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `❌ API Error (attempt ${attempt}):`,
            response.status,
            errorText,
          );

          // 404や401など回復不可能なエラーの場合は即座に失敗
          if (
            response.status === 404 ||
            response.status === 401 ||
            response.status === 403
          ) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // 500番台エラーの場合はリトライ
          if (attempt < maxRetries && response.status >= 500) {
            console.log(`⏳ Retrying in ${attempt} second(s)...`);
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            continue;
          }

          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Data received:", data);
        return {
          data: data,
          total: data.length,
        };
      } catch (error) {
        console.error(`🚨 Fetch error (attempt ${attempt}):`, error);
        lastError = error;

        // ネットワークエラーの場合はリトライ
        if (
          attempt < maxRetries &&
          (error instanceof TypeError || (error as any).code === "ECONNREFUSED")
        ) {
          console.log(`⏳ Network error. Retrying in ${attempt} second(s)...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  },

  // getOneメソッドをオーバーライド
  getOne: async (params: any) => {
    const { resource, id } = params;

    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-admin-token": "petaboo_admin_dev_token_2025",
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "omit",
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  },

  // updateメソッドをオーバーライド
  update: async (params: any) => {
    const { resource, id, variables } = params;

    // 日付フィールドをUnixタイムスタンプに変換
    const processedVariables = { ...variables };
    if (resource === "users") {
      if (variables.premiumStartDate) {
        processedVariables.premiumStartDate = Math.floor(
          new Date(variables.premiumStartDate).getTime() / 1000,
        );
      }
      if (variables.nextBillingDate) {
        processedVariables.nextBillingDate = Math.floor(
          new Date(variables.nextBillingDate).getTime() / 1000,
        );
      }
    }

    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "petaboo_admin_dev_token_2025",
      },
      mode: "cors",
      credentials: "omit",
      cache: "no-cache",
      body: JSON.stringify(processedVariables),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update failed:", response.status, errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`,
      );
    }

    const data = await response.json();
    return { data };
  },
};
