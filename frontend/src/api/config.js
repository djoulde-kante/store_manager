// API base URL
export const API_URL = "http://localhost:5000/api"; //https://store-manager-wl0o.onrender.com http://localhost:5000/api

// Helper function to handle API responses
export const handleResponse = async (response) => {
  if (!response.ok) {
    // Try to get error message from response
    let errorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.msg || "Une erreur est survenue";
    } catch (e) {
      errorMessage = `Erreur ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

// Default fetch options to include credentials
export const fetchOptions = {
  credentials: "include",
};

// Get auth token from local storage
export const getToken = () => {
  return localStorage.getItem("token");
};

// Set auth token in local storage
export const setToken = (token) => {
  localStorage.setItem("token", token);
};

// Remove auth token from local storage
export const removeToken = () => {
  localStorage.removeItem("token");
};

// Get user info from local storage
export const getUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

// Set user info in local storage
export const setUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

// Remove user info from local storage
export const removeUser = () => {
  localStorage.removeItem("user");
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getToken();
};

// Check if user is admin
export const isAdmin = () => {
  const user = getUser();
  return user && user.role === "admin";
};
