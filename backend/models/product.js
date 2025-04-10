const { pool } = require('../config/db');

// Get all products
async function getAllProducts() {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    return rows;
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

// Get product by ID
async function getProductById(id) {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.error(`Error getting product with id ${id}:`, error);
    throw error;
  }
}

// Get product by barcode
async function getProductByBarcode(barcode) {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE barcode = ?', [barcode]);
    return rows[0];
  } catch (error) {
    console.error(`Error getting product with barcode ${barcode}:`, error);
    throw error;
  }
}

// Create a new product
async function createProduct(product) {
  try {
    const { name, category, buy_price, sell_price, quantity, barcode, description } = product;
    const [result] = await pool.query(
      'INSERT INTO products (name, category, buy_price, sell_price, quantity, barcode, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, buy_price, sell_price, quantity, barcode, description]
    );
    return { id: result.insertId, ...product };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

// Update a product
async function updateProduct(id, product) {
  try {
    const { name, category, buy_price, sell_price, quantity, barcode, description } = product;
    await pool.query(
      'UPDATE products SET name = ?, category = ?, buy_price = ?, sell_price = ?, quantity = ?, barcode = ?, description = ? WHERE id = ?',
      [name, category, buy_price, sell_price, quantity, barcode, description, id]
    );
    return { id, ...product };
  } catch (error) {
    console.error(`Error updating product with id ${id}:`, error);
    throw error;
  }
}

// Delete a product
async function deleteProduct(id) {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return { id };
  } catch (error) {
    console.error(`Error deleting product with id ${id}:`, error);
    throw error;
  }
}

// Update product quantity
async function updateProductQuantity(id, quantity) {
  try {
    await pool.query('UPDATE products SET quantity = ? WHERE id = ?', [quantity, id]);
    return { id, quantity };
  } catch (error) {
    console.error(`Error updating quantity for product with id ${id}:`, error);
    throw error;
  }
}

// Get products with low stock
async function getLowStockProducts(threshold) {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE quantity < ?', [threshold]);
    return rows;
  } catch (error) {
    console.error('Error getting low stock products:', error);
    throw error;
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductQuantity,
  getLowStockProducts
};
