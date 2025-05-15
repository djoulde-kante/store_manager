import { API_URL, handleResponse, getToken, fetchOptions } from "./config";

// Get all users
export const getAllUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      "x-auth-token": getToken(),
    },
    ...fetchOptions,
  });

  return handleResponse(response);
};

// Get user by ID
export const getUserById = async (id) => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    headers: {
      "x-auth-token": getToken(),
    },
    ...fetchOptions,
  });

  return handleResponse(response);
};

// Create a new user
export const createUser = async (userData) => {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": getToken(),
    },
    body: JSON.stringify(userData),
    ...fetchOptions,
  });

  return handleResponse(response);
};

// Update a user
export const updateUser = async (id, userData) => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": getToken(),
    },
    body: JSON.stringify(userData),
    ...fetchOptions,
  });

  return handleResponse(response);
};

// Delete a user
export const deleteUser = async (id) => {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "DELETE",
    headers: {
      "x-auth-token": getToken(),
    },
    ...fetchOptions,
  });

  return handleResponse(response);
};

// Change user status (active/inactive)
export const changeUserStatus = async (id, status) => {
  const response = await fetch(`${API_URL}/users/${id}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-auth-token": getToken(),
    },
    body: JSON.stringify({ status }),
    ...fetchOptions,
  });

  return handleResponse(response);
};

// Get user activity logs
export const getUserActivityLogs = async (userId, limit = 100, offset = 0) => {
  const response = await fetch(
    `${API_URL}/users/${userId}/activity?limit=${limit}&offset=${offset}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Get all activity logs (admin only)
export const getAllActivityLogs = async (limit = 100, offset = 0) => {
  const response = await fetch(
    `${API_URL}/users/activity/all?limit=${limit}&offset=${offset}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};
