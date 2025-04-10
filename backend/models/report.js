const { pool } = require("../config/db");

// Get daily sales report
async function getDailyReport(date) {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        DATE(s.timestamp) as date,
        SUM(s.total) as total_sales,
        COUNT(*) as transaction_count,
        p.category,
        SUM(CASE WHEN p.category = s.product_id THEN s.total ELSE 0 END) as category_sales
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE DATE(s.timestamp) = ?
      GROUP BY DATE(s.timestamp), p.category
    `,
      [date]
    );
    return rows;
  } catch (error) {
    console.error("Error getting daily report:", error);
    throw error;
  }
}

// Get weekly sales report
async function getWeeklyReport(startDate, endDate) {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        DATE(s.timestamp) as date,
        SUM(s.total) as total_sales,
        COUNT(*) as transaction_count
      FROM sales s
      WHERE DATE(s.timestamp) BETWEEN ? AND ?
      GROUP BY DATE(s.timestamp)
      ORDER BY date
    `,
      [startDate, endDate]
    );
    return rows;
  } catch (error) {
    console.error("Error getting weekly report:", error);
    throw error;
  }
}

// Get monthly sales report
async function getMonthlyReport(year, month) {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        DATE_FORMAT(s.timestamp, '%Y-%m-%d') as date,
        SUM(s.total) as total_sales,
        COUNT(*) as transaction_count
      FROM sales s
      WHERE YEAR(s.timestamp) = ? AND MONTH(s.timestamp) = ?
      GROUP BY DATE_FORMAT(s.timestamp, '%Y-%m-%d')
      ORDER BY date
    `,
      [year, month]
    );
    return rows;
  } catch (error) {
    console.error("Error getting monthly report:", error);
    throw error;
  }
}

// Get top selling products
async function getTopProducts(limit = 10) {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        p.id,
        p.name,
        p.category,
        SUM(s.quantity) as total_quantity,
        SUM(s.total) as total_sales
      FROM sales s
      JOIN products p ON s.product_id = p.id
      GROUP BY p.id, p.name, p.category
      ORDER BY total_quantity DESC
      LIMIT ?
    `,
      [limit]
    );
    return rows;
  } catch (error) {
    console.error("Error getting top products:", error);
    throw error;
  }
}

// Get profit calculation
async function getProfitReport(startDate, endDate) {
  try {
    // Récupérer les ventes et coûts
    const [rows] = await pool.query(
      `
      SELECT 
        SUM(s.total) as total_sales,
        SUM(s.quantity * p.buy_price) as total_cost,
        COUNT(DISTINCT s.id) as transaction_count,
        COUNT(DISTINCT s.product_id) as products_sold
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE DATE(s.timestamp) BETWEEN ? AND ?
    `,
      [startDate, endDate]
    );

    // Get current stock value
    const [stockValue] = await pool.query(`
      SELECT SUM(buy_price * quantity) as total_stock_value
      FROM products
    `);

    // Calculer le bénéfice net et la marge
    const totalSales = rows[0].total_sales || 0;
    const totalCost = rows[0].total_cost || 0;
    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      totalCost,
      netProfit,
      profitMargin,
      transactionCount: rows[0].transaction_count || 0,
      productsSold: rows[0].products_sold || 0,
      stockValue: stockValue[0].total_stock_value || 0,
    };
  } catch (error) {
    console.error("Error getting profit report:", error);
    throw error;
  }
}

// Get inventory status report
async function getInventoryReport() {
  try {
    const [rows] = await pool.query(`
      SELECT 
        category,
        COUNT(*) as product_count,
        SUM(quantity) as total_quantity,
        SUM(price * quantity) as total_value
      FROM products
      GROUP BY category
    `);
    return rows;
  } catch (error) {
    console.error("Error getting inventory report:", error);
    throw error;
  }
}

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getTopProducts,
  getProfitReport,
  getInventoryReport,
};
