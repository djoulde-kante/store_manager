const { pool } = require("../config/db");

// Get performance for a specific user
async function getUserPerformance(userId, periodType = "all_time") {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM user_performance WHERE user_id = ? AND period_type = ? ORDER BY updated_at DESC LIMIT 1",
      [userId, periodType]
    );
    return (
      rows[0] || {
        user_id: userId,
        sales_count: 0,
        sales_total: 0,
        avg_sale_value: 0,
        products_added: 0,
        orders_processed: 0,
        period_type: periodType,
        period_start: null,
        period_end: null,
      }
    );
  } catch (error) {
    console.error(`Error getting performance for user ${userId}:`, error);
    throw error;
  }
}

// Get performance for all users
async function getAllUsersPerformance(periodType = "all_time") {
  try {
    const [rows] = await pool.query(
      `SELECT up.*, u.username, u.first_name, u.last_name
       FROM user_performance up
       JOIN users u ON up.user_id = u.id
       WHERE period_type = ?
       ORDER BY sales_total DESC`,
      [periodType]
    );
    return rows;
  } catch (error) {
    console.error(`Error getting performance for all users:`, error);
    throw error;
  }
}

// Get performance trend for a user
async function getUserPerformanceTrend(
  userId,
  periodType = "monthly",
  limit = 6
) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM user_performance 
       WHERE user_id = ? AND period_type = ? 
       ORDER BY period_start DESC 
       LIMIT ?`,
      [userId, periodType, limit]
    );
    return rows;
  } catch (error) {
    console.error(`Error getting performance trend for user ${userId}:`, error);
    throw error;
  }
}

// Get all users ranked by performance
async function getUsersRankedByPerformance(
  periodType = "monthly",
  metric = "sales_total",
  limit = 10
) {
  try {
    // Validate metric to prevent SQL injection
    const validMetrics = [
      "sales_count",
      "sales_total",
      "avg_sale_value",
      "products_added",
      "orders_processed",
    ];
    if (!validMetrics.includes(metric)) {
      throw new Error("Invalid metric specified");
    }

    const [rows] = await pool.query(
      `SELECT up.*, u.username, u.first_name, u.last_name, u.role
       FROM user_performance up
       JOIN users u ON up.user_id = u.id
       WHERE period_type = ?
       ORDER BY ${metric} DESC
       LIMIT ?`,
      [periodType, limit]
    );
    return rows;
  } catch (error) {
    console.error(`Error getting ranked users:`, error);
    throw error;
  }
}

// Manually trigger performance update for a user
async function updateUserPerformance(userId, periodType = "all_time") {
  try {
    await pool.query("CALL update_user_performance(?, ?)", [
      userId,
      periodType,
    ]);
    return { success: true, userId, periodType };
  } catch (error) {
    console.error(`Error updating performance for user ${userId}:`, error);
    throw error;
  }
}

// Get team performance (aggregate performance of multiple users)
async function getTeamPerformance(periodType = "monthly") {
  try {
    const [rows] = await pool.query(
      `SELECT 
         COUNT(DISTINCT user_id) as user_count,
         SUM(sales_count) as total_sales_count,
         SUM(sales_total) as total_sales_value,
         AVG(avg_sale_value) as avg_sale_value,
         SUM(products_added) as total_products_added,
         SUM(orders_processed) as total_orders_processed,
         MIN(period_start) as period_start,
         MAX(period_end) as period_end
       FROM user_performance
       WHERE period_type = ?`,
      [periodType]
    );
    return rows[0];
  } catch (error) {
    console.error(`Error getting team performance:`, error);
    throw error;
  }
}

module.exports = {
  getUserPerformance,
  getAllUsersPerformance,
  getUserPerformanceTrend,
  getUsersRankedByPerformance,
  updateUserPerformance,
  getTeamPerformance,
};
