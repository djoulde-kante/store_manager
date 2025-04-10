import { API_URL, handleResponse, getToken, fetchOptions } from './config';

// Get all orders
export const getAllOrders = async () => {
  const response = await fetch(`${API_URL}/orders`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get orders by status
export const getOrdersByStatus = async (status) => {
  const response = await fetch(`${API_URL}/orders/status/${status}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get order by ID
export const getOrderById = async (id) => {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Create a new order
export const createOrder = async (orderData) => {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': getToken(),
    },
    body: JSON.stringify(orderData),
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Update order status
export const updateOrderStatus = async (id, status) => {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': getToken(),
    },
    body: JSON.stringify({ status }),
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Delete an order
export const deleteOrder = async (id) => {
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'DELETE',
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get order status translations
export const getOrderStatusTranslation = (status) => {
  const translations = {
    'pending': 'En attente',
    'confirmed': 'Confirmu00e9e',
    'shipped': 'Expu00e9diu00e9e',
    'cancelled': 'Annulu00e9e'
  };
  
  return translations[status] || status;
};
