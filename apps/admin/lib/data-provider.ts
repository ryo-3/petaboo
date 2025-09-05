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

  // getListメソッドをオーバーライド
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

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        console.error("❌ API Error:", response.status, await response.text());
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Data received:", data);
      return {
        data: data,
        total: data.length,
      };
    } catch (error) {
      console.error("🚨 Fetch error:", error);
      throw error;
    }
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
