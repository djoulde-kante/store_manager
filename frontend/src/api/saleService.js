import { API_URL, handleResponse, getToken, fetchOptions } from './config';

// Get all sales
export const getAllSales = async () => {
  const response = await fetch(`${API_URL}/sales`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get sales by date range
export const getSalesByDateRange = async (startDate, endDate) => {
  const response = await fetch(`${API_URL}/sales/date-range?startDate=${startDate}&endDate=${endDate}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Create a new sale
export const createSale = async (saleData) => {
  const response = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': getToken(),
    },
    body: JSON.stringify(saleData),
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Create multiple sales (batch for POS checkout)
export const createBatchSales = async (salesData) => {
  const response = await fetch(`${API_URL}/sales/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': getToken(),
    },
    body: JSON.stringify(salesData),
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get sales by product
export const getSalesByProduct = async (productId) => {
  const response = await fetch(`${API_URL}/sales/product/${productId}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get daily sales summary
export const getDailySalesSummary = async (date) => {
  const response = await fetch(`${API_URL}/sales/daily/${date}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};
