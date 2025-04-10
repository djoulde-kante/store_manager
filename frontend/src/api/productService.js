import { API_URL, handleResponse, getToken, fetchOptions } from './config';

// Get all products
export const getAllProducts = async () => {
  const response = await fetch(`${API_URL}/products`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get product by ID
export const getProductById = async (id) => {
  const response = await fetch(`${API_URL}/products/${id}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get product by barcode
export const getProductByBarcode = async (barcode) => {
  const response = await fetch(`${API_URL}/products/barcode/${barcode}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Create a new product
export const createProduct = async (productData) => {
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': getToken(),
    },
    body: JSON.stringify(productData),
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Update a product
export const updateProduct = async (id, productData) => {
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': getToken(),
    },
    body: JSON.stringify(productData),
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Delete a product
export const deleteProduct = async (id) => {
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Get low stock products
export const getLowStockProducts = async (threshold) => {
  const response = await fetch(`${API_URL}/products/low-stock/${threshold}`, {
    headers: {
      'x-auth-token': getToken(),
    },
    ...fetchOptions,
  });
  
  return handleResponse(response);
};

// Export products to CSV
export const exportProductsToCSV = () => {
  window.location.href = `${API_URL}/products/export/csv?token=${getToken()}`;
};

// Import products from CSV
export const importProductsFromCSV = async (formData) => {
  const response = await fetch(`${API_URL}/products/import`, {
    method: 'POST',
    headers: {
      'x-auth-token': getToken(),
    },
    body: formData, // FormData object with the CSV file
    ...fetchOptions,
  });
  
  return handleResponse(response);
};
