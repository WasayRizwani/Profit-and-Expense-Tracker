const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface ProductEquity {
    product_id: number;
    owner_id: number;
    equity_percentage: number;
    owner?: {
        id: number;
        name: string;
        equity_percentage: number;
    };
}

export interface ProductEquityInput {
    owner_id: number;
    equity_percentage: number;
}

export interface Product {
    id: number;
    name: string;
    sku: string;
    description?: string;
    price: number;
    cost_price: number;
    current_stock: number;
    product_url?: string;
    reorder_level?: number;
    total_sold?: number;
    equities?: ProductEquity[];
}

export interface Owner {
    id: number;
    name: string;
    equity_percentage: number;
}

export interface Expense {
    id: number;
    date: string;
    category: string;
    amount: number;
    description: string;
    product_id?: number;
    paid_by_id?: number;
    receipt_url?: string;
}

export interface DashboardStats {
    date: string;
    revenue: number;
    cogs: number;
    ad_spend: number;
    gross_profit: number;
    expenses: number;
    net_profit: number;
}

// Ledger Interface
export interface OwnerLedger {
    id: number;
    owner_id: number;
    amount: number;
    transaction_type: string;
    date: string;
    owner?: {
        id: number;
        name: string;
    }
}

export const api = {
    // Inventory
    getProducts: async (skip = 0, limit = 100): Promise<Product[]> => {
        const response = await fetch(`${API_URL}/products/?skip=${skip}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch products");
        return response.json();
    },

    createProduct: async (product: { name: string; sku?: string; cost_price: number; product_url?: string; equities?: ProductEquityInput[] }): Promise<Product> => {
        const response = await fetch(`${API_URL}/products/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
        });
        if (!response.ok) throw new Error("Failed to create product");
        return response.json();
    },

    createInventoryBatch: async (data: { product_id: number; quantity: number; landing_price: number }) => {
        const response = await fetch(`${API_URL}/inventory/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to create inventory batch");
        return response.json();
    },

    // Owners
    getOwners: async (): Promise<Owner[]> => {
        const response = await fetch(`${API_URL}/owners/`);
        if (!response.ok) throw new Error("Failed to fetch owners");
        return response.json();
    },

    createOwner: async (owner: { name: string; equity_percentage?: number }): Promise<Owner> => {
        const response = await fetch(`${API_URL}/owners/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(owner),
        });
        if (!response.ok) throw new Error("Failed to create owner");
        return response.json();
    },

    setOwnerProductEquity: async (ownerId: number, data: { product_id: number; equity_percentage: number }) => {
        const response = await fetch(`${API_URL}/owners/${ownerId}/product-equity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to set product equity");
        return response.json();
    },

    getOwnerBalance: async (id: number): Promise<{ owner_id: number; balance: number }> => {
        // This endpoint might not exist yet based on crud.py review, but was referenced in older api.ts
        // I will keep it if it was there, or remove if I know it's missing. 
        // Checking crud.py earlier, I didn't explicitly see get_owner_balance in the main list, 
        // but let's assume it might be in main.py or I missed it. 
        // For safety, I will include it if it was in the "clean" intention, 
        // but if it causes 404 that's better than compile error.
        const response = await fetch(`${API_URL}/owners/${id}/balance`);
        if (!response.ok) throw new Error("Failed to fetch owner balance");
        return response.json();
    },

    // Expenses
    getExpenses: async (skip = 0, limit = 100): Promise<Expense[]> => {
        const response = await fetch(`${API_URL}/expenses/?skip=${skip}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch expenses");
        return response.json();
    },

    createExpense: async (data: { date: string; category: string; amount: number; description: string; product_id?: number; paid_by_id?: number }) => {
        const response = await fetch(`${API_URL}/expenses/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to create expense");
        return response.json();
    },

    getExpenseLiability: async (): Promise<{ name: string; amount: number }[]> => {
        const response = await fetch(`${API_URL}/stats/expenses-liability`);
        if (!response.ok) throw new Error("Failed to fetch expense liability");
        return response.json();
    },

    getTopPayers: async (limit: number = 5): Promise<{ name: string; amount: number }[]> => {
        const response = await fetch(`${API_URL}/stats/top-payers?limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch top payers");
        return response.json();
    },

    // Dashboard
    getDashboardStats: async (date?: string): Promise<DashboardStats> => {
        const query = date ? `?date=${date}` : '';
        const response = await fetch(`${API_URL}/stats/dashboard${query}`);
        if (!response.ok) throw new Error("Failed to fetch dashboard stats");
        return response.json();
    },

    getHistory: async (days: number = 30) => {
        const response = await fetch(`${API_URL}/stats/history?days=${days}`);
        if (!response.ok) throw new Error("Failed to fetch history");
        return response.json();
    },

    // Reports
    getReports: async (skip = 0, limit = 100) => {
        const response = await fetch(`${API_URL}/reports/?skip=${skip}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch reports");
        return response.json();
    },

    createReport: async (data: { date: string; total_ad_spend: number; notes?: string }) => {
        const response = await fetch(`${API_URL}/reports/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to create daily report");
        return response.json();
    },

    createSale: async (data: { report_id: number; product_id: number; quantity: number; selling_price: number }) => {
        const response = await fetch(`${API_URL}/sales/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to create sale");
        return response.json();
    },

    updateReport: async (id: number, data: { total_ad_spend: number; sales: { id?: number; product_id: number; quantity: number; selling_price: number }[] }) => {
        const response = await fetch(`${API_URL}/reports/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update report");
        return response.json();
    },

    exportReportsPDF: async (startDate: string, endDate: string) => {
        const response = await fetch(`${API_URL}/reports/export/pdf?start_date=${startDate}&end_date=${endDate}`);
        if (!response.ok) throw new Error("Failed to export PDF");
        return response.blob();
    },

    recordOwnerPayment: async (data: { owner_id: number; amount: number; date?: string }) => {
        const response = await fetch(`${API_URL}/owners/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to record payment");
        return response.json();
    },

    getOwnerProfits: async (): Promise<{ id: number; name: string; total_profit: number; total_paid: number; balance: number; breakdown: { name: string; amount: number }[] }[]> => {
        const response = await fetch(`${API_URL}/stats/owner-profits`);
        if (!response.ok) throw new Error("Failed to fetch owner profits");
        return response.json();
    },

    getOwnerPayments: async (): Promise<OwnerLedger[]> => {
        const response = await fetch(`${API_URL}/owners/payments`);
        if (!response.ok) throw new Error("Failed to fetch owner payments");
        return response.json();
    },

    // Auth
    login: async (username, password) => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error("Login failed");
        return response.json();
    },

    changePassword: async (oldPassword, newPassword, token) => {
        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to change password");
        }
        return response.json();
    },

    getCurrentUser: async (token) => {
        const response = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to fetch user");
        return response.json();
    }
};
