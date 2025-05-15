import { API_URL, handleResponse, getToken, fetchOptions } from "./config";

// Get performance for a specific user
export const getUserPerformance = async (userId, periodType = "all_time") => {
  const response = await fetch(
    `${API_URL}/performance/users/${userId}?period_type=${periodType}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Get performance trend for a user
export const getUserPerformanceTrend = async (
  userId,
  periodType = "monthly",
  limit = 6
) => {
  const response = await fetch(
    `${API_URL}/performance/users/${userId}/trend?period_type=${periodType}&limit=${limit}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Get performance for all users (admin only)
export const getAllUsersPerformance = async (periodType = "all_time") => {
  const response = await fetch(
    `${API_URL}/performance/users?period_type=${periodType}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Get users ranked by performance (admin only)
export const getUsersRankedByPerformance = async (
  periodType = "monthly",
  metric = "sales_total",
  limit = 10
) => {
  const response = await fetch(
    `${API_URL}/performance/ranking?period_type=${periodType}&metric=${metric}&limit=${limit}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Get team performance (admin only)
export const getTeamPerformance = async (periodType = "monthly") => {
  const response = await fetch(
    `${API_URL}/performance/team?period_type=${periodType}`,
    {
      headers: {
        "x-auth-token": getToken(),
      },
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};

// Manually trigger performance update for a user (admin only)
export const updateUserPerformance = async (
  userId,
  periodType = "all_time"
) => {
  const response = await fetch(
    `${API_URL}/performance/users/${userId}/update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": getToken(),
      },
      body: JSON.stringify({ period_type: periodType }),
      ...fetchOptions,
    }
  );

  return handleResponse(response);
};
