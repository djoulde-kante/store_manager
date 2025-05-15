const { pool } = require("../config/db");

// Get all sales
async function getAllSales() {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, p.name as product_name 
      FROM sales s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.timestamp DESC
    `);
    return rows;
  } catch (error) {
    console.error("Error getting sales:", error);
    throw error;
  }
}

// Get sales by date range
async function getSalesByDateRange(startDate, endDate) {
  try {
    const [rows] = await pool.query(
      `
      SELECT s.*, p.name as product_name 
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE DATE(s.timestamp) BETWEEN ? AND ?
      ORDER BY s.timestamp DESC
    `,
      [startDate, endDate]
    );
    return rows;
  } catch (error) {
    console.error("Error getting sales by date range:", error);
    throw error;
  }
}

// Create a new sale
async function createSale(sale) {
  try {
    const { product_id, user_id, quantity, total, payment_method } = sale;

    // Insert sale into database
    const [result] = await pool.query(
      "INSERT INTO sales (product_id, user_id, quantity, total, payment_method) VALUES (?, ?, ?, ?, ?)",
      [product_id, user_id, quantity, total, payment_method]
    );

    // Update product quantity
    await pool.query(
      "UPDATE products SET quantity = quantity - ? WHERE id = ?",
      [quantity, product_id]
    );

    return { id: result.insertId, ...sale };
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
}

// Get sales by product
async function getSalesByProduct(productId) {
  try {
    const [rows] = await pool.query(
      `
      SELECT s.*, p.name as product_name 
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.product_id = ?
      ORDER BY s.timestamp DESC
    `,
      [productId]
    );
    return rows;
  } catch (error) {
    console.error(`Error getting sales for product ${productId}:`, error);
    throw error;
  }
}

// Get sales summary by day
async function getDailySalesSummary(date) {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        DATE(timestamp) as date,
        SUM(total) as total_sales,
        COUNT(*) as transaction_count
      FROM sales
      WHERE DATE(timestamp) = ?
      GROUP BY DATE(timestamp)
    `,
      [date]
    );
    return rows[0] || { date, total_sales: 0, transaction_count: 0 };
  } catch (error) {
    console.error("Error getting daily sales summary:", error);
    throw error;
  }
}

module.exports = {
  getAllSales,
  getSalesByDateRange,
  createSale,
  getSalesByProduct,
  getDailySalesSummary,
};
