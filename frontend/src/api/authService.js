import {
  API_URL,
  handleResponse,
  setToken,
  setUser,
  removeToken,
  removeUser,
  fetchOptions,
} from "./config";

// Login user
export const login = async (credentials) => {
  try {
    // Ensure we're starting with a clean state
    removeToken();
    removeUser();

    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      ...fetchOptions,
    });

    const data = await handleResponse(response);

    // Store token and user data in local storage
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      // Verify token immediately after login
      await getCurrentUser();
    }

    return data;
  } catch (error) {
    // Clean up if anything goes wrong
    removeToken();
    removeUser();
    throw error;
  }
};

// Logout user
export const logout = () => {
  // Remove token and user data from local storage
  removeToken();
  removeUser();
};

// Get current user profile
export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Non authentifié");
  }

  const response = await fetch(`${API_URL}/users/me/profile`, {
    headers: {
      "x-auth-token": token,
    },
    ...fetchOptions,
  });

  return handleResponse(response);
};
