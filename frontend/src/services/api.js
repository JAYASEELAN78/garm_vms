import axios from 'axios';

// API Base URL configuration:
// - Production: Use Render backend
// - Development: Use localhost backend
const API_URL = import.meta.env.PROD
    ? 'https://vms-garments.onrender.com/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect on 401 for non-auth endpoints
        // Auth endpoints (login, register, etc.) should handle their own errors
        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
    loginPhone: (phone, otp) => api.post('/auth/login-phone', { phone, otp }),
    getProfile: () => api.get('/auth/profile'),
    googleLogin: (credential) => api.post('/auth/google', { credential }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (email, code, newPassword) => api.post('/auth/reset-password', { email, code, newPassword }),
};

// Products API
export const productsAPI = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    updateStock: (id, data) => api.post(`/products/${id}/stock`, data),
    getLowStock: () => api.get('/products/low-stock'),
};

// Categories API
export const categoriesAPI = {
    getAll: () => api.get('/categories'),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// Bills API
export const billsAPI = {
    getAll: (params) => api.get('/bills', { params }),
    getById: (id) => api.get(`/bills/${id}`),
    create: (data) => api.post('/bills', data),
    update: (id, data) => api.put(`/bills/${id}`, data),
    delete: (id) => api.delete(`/bills/${id}`),
    getStats: (params) => api.get('/bills/stats', { params }),
};

// Inventory API
export const inventoryAPI = {
    getMovements: (params) => api.get('/inventory/movements', { params }),
    addMovement: (data) => api.post('/inventory/movements', data),
    getStats: () => api.get('/inventory/stats'),
};

// Reports API
export const reportsAPI = {
    getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
    getSalesTrend: (params) => api.get('/reports/sales-trend', { params }),
    getTopProducts: (params) => api.get('/reports/top-products', { params }),
    getCategoryPerformance: (params) => api.get('/reports/category-performance', { params }),
    getPaymentMethods: (params) => api.get('/reports/payment-methods', { params }),
    getStock: (params) => api.get('/reports/stock', { params }),
    // New report endpoints
    getSalesReport: (params) => api.get('/reports/sales-report', { params }),
    getPurchaseReport: (params) => api.get('/reports/purchase-report', { params }),
    getStockReport: (params) => api.get('/reports/stock-report', { params }),
    getAuditorSales: (params) => api.get('/reports/auditor-sales', { params }),
    getAuditorPurchase: (params) => api.get('/reports/auditor-purchase', { params }),
};

// Settings API
export const settingsAPI = {
    get: () => api.get('/settings'),
    update: (data) => api.put('/settings', data),
    uploadLogo: (formData) => api.post('/settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getRecentBills: (limit) => api.get('/dashboard/recent-bills', { params: { limit } }),
    getRevenueChart: (period) => api.get('/dashboard/revenue-chart', { params: { period } }),
    getLowStockAlerts: () => api.get('/dashboard/low-stock-alerts'),
};

// Customers API
export const customersAPI = {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
};

// HSN API
export const hsnAPI = {
    getAll: (params) => api.get('/hsn', { params }),
    getById: (id) => api.get(`/hsn/${id}`),
    create: (data) => api.post('/hsn', data),
    update: (id, data) => api.put(`/hsn/${id}`, data),
    delete: (id) => api.delete(`/hsn/${id}`),
};

// Suppliers API
export const suppliersAPI = {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
};

// Payments API
export const paymentsAPI = {
    getAll: (params) => api.get('/payments', { params }),
    getById: (id) => api.get(`/payments/${id}`),
    create: (data) => api.post('/payments', data),
    update: (id, data) => api.put(`/payments/${id}`, data),
    delete: (id) => api.delete(`/payments/${id}`),
};

// Sales Entries API
export const salesEntriesAPI = {
    getAll: (params) => api.get('/sales-entries', { params }),
    getById: (id) => api.get(`/sales-entries/${id}`),
    create: (data) => api.post('/sales-entries', data),
    update: (id, data) => api.put(`/sales-entries/${id}`, data),
    delete: (id) => api.delete(`/sales-entries/${id}`),
    generateBill: (id) => api.post(`/sales-entries/${id}/generate-bill`),
};

// Purchase Entries API
export const purchaseEntriesAPI = {
    getAll: (params) => api.get('/purchase-entries', { params }),
    getById: (id) => api.get(`/purchase-entries/${id}`),
    create: (data) => api.post('/purchase-entries', data),
    update: (id, data) => api.put(`/purchase-entries/${id}`, data),
    delete: (id) => api.delete(`/purchase-entries/${id}`),
};

// AI API
export const aiAPI = {
    chat: (message) => api.post('/ai/chat', { message }),
    getInsights: () => api.get('/ai/insights'),
    getInventoryPredictions: () => api.get('/ai/inventory-predictions'),
    smartSearch: (query) => api.post('/ai/search', { query }),
    healthCheck: () => api.get('/ai/health'),
};

// Email API
export const emailAPI = {
    getStatus: () => api.get('/email/status'),
    sendTest: (to) => api.post('/email/test', { to }),
    sendBill: (billId, to) => api.post(`/email/send-bill/${billId}`, { to }),
    sendDailySummary: () => api.post('/email/daily-summary'),
    sendReport: (data) => api.post('/email/send-report', data),
};

// V.M.S GARMENTS API
export const companiesAPI = {
    getAll: () => api.get('/companies'),
    create: (data) => api.post('/companies', data),
    update: (id, data) => api.put(`/companies/${id}`, data),
    delete: (id) => api.delete(`/companies/${id}`),
};

export const ordersAPI = {
    getAll: () => api.get('/orders'),
    create: (data) => api.post('/orders', data),
    update: (id, data) => api.put(`/orders/${id}`, data),
};

export const rawMaterialsAPI = {
    getAll: () => api.get('/raw-materials'),
    getByOrder: (orderId) => api.get(`/raw-materials/${orderId}`),
    add: (data) => api.post('/raw-materials', data),
};

export const productionAPI = {
    getAll: () => api.get('/production'),
    start: (data) => api.post('/production', data),
    updateProgress: (id, data) => api.put(`/production/${id}`, data),
    delete: (id) => api.delete(`/production/${id}`),
};

export const finishedGoodsAPI = {
    getAll: () => api.get('/finished-goods'),
    add: (data) => api.post('/finished-goods', data),
};

export const dispatchAPI = {
    getAll: () => api.get('/dispatches'),
    create: (data) => api.post('/dispatches', data),
};

export default api;
