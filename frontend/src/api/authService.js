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
export const logout = async () => {
  try {
    const userId = JSON.parse(localStorage.getItem("user"))?.id;
    const token = localStorage.getItem("token");

    // Log the logout action if we have a userId and token
    if (userId && token) {
      await fetch(`${API_URL}/users/activity/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          actionType: "LOGOUT",
          actionDetails: "Déconnexion utilisateur",
        }),
        ...fetchOptions,
      }).catch((err) => console.error("Failed to log logout:", err));
    }

    // Remove token and user data from local storage
    removeToken();
    removeUser();
  } catch (error) {
    console.error("Error during logout:", error);
    // Still remove token and user even if logging failed
    removeToken();
    removeUser();
  }
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

  const userData = await handleResponse(response);

  // Update the stored user data with the latest from the server
  setUser(userData);

  return userData;
};

// Get user activity logs
export const getUserActivityLogs = async (userId, limit = 100, offset = 0) => {
  const response = await fetch(
    `${API_URL}/users/${userId}/activity?limit=${limit}&offset=${offset}`,
    {
      headers: {
        "x-auth-token": localStorage.getItem("token"),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Get all user activity logs (admin only)
export const getAllActivityLogs = async (limit = 100, offset = 0) => {
  const response = await fetch(
    `${API_URL}/users/activity/all?limit=${limit}&offset=${offset}`,
    {
      headers: {
        "x-auth-token": localStorage.getItem("token"),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};
