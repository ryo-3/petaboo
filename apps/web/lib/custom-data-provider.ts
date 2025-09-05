import { DataProvider } from "@refinedev/core";

const API_URL = "http://localhost:7594";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

export const customDataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, pagination, sorters, filters, meta }) => {
    const { current = 1, pageSize = 10 } = pagination ?? {};
    
    const url = new URL(`${API_URL}/${resource}`);
    url.searchParams.append("_start", ((current - 1) * pageSize).toString());
    url.searchParams.append("_end", (current * pageSize).toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        "x-admin-token": ADMIN_TOKEN || "",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const total = response.headers.get("X-Total-Count") || data.length.toString();

    return {
      data,
      total: parseInt(total),
    };
  },

  getOne: async ({ resource, id, meta }) => {
    const response = await fetch(`${API_URL}/${resource}/${id}`, {
      headers: {
        "x-admin-token": ADMIN_TOKEN || "",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  },

  create: async ({ resource, variables, meta }) => {
    const response = await fetch(`${API_URL}/${resource}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN || "",
      },
      body: JSON.stringify(variables),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  },

  update: async ({ resource, id, variables, meta }) => {
    const response = await fetch(`${API_URL}/${resource}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN || "",
      },
      body: JSON.stringify(variables),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const response = await fetch(`${API_URL}/${resource}/${id}`, {
      method: "DELETE",
      headers: {
        "x-admin-token": ADMIN_TOKEN || "",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { data: { id } };
  },

  // その他の必要なメソッド
  getMany: async ({ resource, ids, meta }) => {
    const promises = ids.map(id => 
      fetch(`${API_URL}/${resource}/${id}`, {
        headers: { "x-admin-token": ADMIN_TOKEN || "" }
      }).then(res => res.json())
    );
    
    const data = await Promise.all(promises);
    return { data };
  },

  custom: async ({ url, method = "GET", payload, headers = {} }) => {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN || "",
        ...headers,
      },
      ...(payload && { body: JSON.stringify(payload) }),
    });

    const data = await response.json();
    return { data };
  },
};