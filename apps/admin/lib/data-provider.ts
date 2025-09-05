import dataProvider from "@refinedev/simple-rest";

const API_URL = "/api";

// 管理者用の認証ヘッダーを追加するカスタムデータプロバイダー
export const customDataProvider = {
  ...dataProvider(API_URL),
  
  // すべてのHTTPリクエストに管理者トークンを追加
  update: async (params: any) => {
    const { resource, id, variables } = params;
    
    // 日付フィールドをUnixタイムスタンプに変換
    let processedVariables = { ...variables };
    if (resource === 'users') {
      if (variables.premiumStartDate) {
        processedVariables.premiumStartDate = Math.floor(new Date(variables.premiumStartDate).getTime() / 1000);
      }
      if (variables.nextBillingDate) {
        processedVariables.nextBillingDate = Math.floor(new Date(variables.nextBillingDate).getTime() / 1000);
      }
    }
    
    console.log('Data provider update - original variables:', variables);
    console.log('Data provider update - processed variables:', processedVariables);
    
    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'petaboo_admin_dev_token_2025',
      },
      body: JSON.stringify(processedVariables),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update failed:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Data provider update - response:', data);
    return { data };
  },
  
  getOne: async (params: any) => {
    const { resource, id } = params;
    
    const url = `${API_URL}/${resource}/${id}`;
    const response = await fetch(url, {
      headers: {
        'x-admin-token': 'petaboo_admin_dev_token_2025',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { data };
  },
};