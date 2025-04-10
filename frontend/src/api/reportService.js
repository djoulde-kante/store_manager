import { API_URL, handleResponse, getToken, fetchOptions } from './config';

// Get daily report
export const getDailyReport = async (date) => {
  const response = await fetch(`${API_URL}/reports/daily/${date}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get weekly report
export const getWeeklyReport = async (startDate, endDate) => {
  const response = await fetch(`${API_URL}/reports/weekly?startDate=${startDate}&endDate=${endDate}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get monthly report
export const getMonthlyReport = async (year, month) => {
  const response = await fetch(`${API_URL}/reports/monthly/${year}/${month}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get top products
export const getTopProducts = async (limit = 10) => {
  const response = await fetch(`${API_URL}/reports/top-products/${limit}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get profit report
export const getProfitReport = async (startDate, endDate) => {
  const response = await fetch(`${API_URL}/reports/profit?startDate=${startDate}&endDate=${endDate}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get inventory report
export const getInventoryReport = async () => {
  const response = await fetch(`${API_URL}/reports/inventory`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};
