const { pool } = require('../config/db');

// Get all orders
async function getAllOrders() {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, u.username as user_name 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    return rows;
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
}

// Get order by ID with items
async function getOrderById(id) {
  const connection = await pool.getConnection();
  try {
    // Get order details
    const [orderRows] = await connection.query(`
      SELECT o.*, u.username as user_name 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [id]);
    
    if (orderRows.length === 0) {
      return null;
    }
    
    const order = orderRows[0];
    
    // Get order items
    const [itemRows] = await connection.query(`
      SELECT oi.*, p.name as product_name, p.barcode 
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id]);
    
    order.items = itemRows;
    
    return order;
  } catch (error) {
    console.error(`Error getting order with id ${id}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

// Create a new order
async function createOrder(order) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { user_id, items, total } = order;
    
    // Insert order record
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, status, total) VALUES (?, "pending", ?)',
      [user_id, total]
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order items
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }
    
    await connection.commit();
    return { id: orderId, ...order };
  } catch (error) {
    await connection.rollback();
    console.error('Error creating order:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Update order status
async function updateOrderStatus(id, status) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Update order status
    await connection.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    // If status is "shipped", update product quantities
    if (status === 'shipped') {
      // Get order items
      const [items] = await connection.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      );
      
      // Update product quantities - AUGMENTER les quantités pour les commandes entrantes
      for (const item of items) {
        await connection.query(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }
    
    await connection.commit();
    return { id, status };
  } catch (error) {
    await connection.rollback();
    console.error(`Error updating order status for order ${id}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

// Delete an order
async function deleteOrder(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Check if order is in pending status
    const [orderRows] = await connection.query(
      'SELECT status FROM orders WHERE id = ?',
      [id]
    );
    
    if (orderRows.length === 0) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    if (orderRows[0].status !== 'pending') {
      throw new Error(`Cannot delete order with status ${orderRows[0].status}`);
    }
    
    // Delete order items
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
    
    // Delete order
    await connection.query('DELETE FROM orders WHERE id = ?', [id]);
    
    await connection.commit();
    return { id };
  } catch (error) {
    await connection.rollback();
    console.error(`Error deleting order with id ${id}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

// Get orders by status
async function getOrdersByStatus(status) {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, u.username as user_name 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status = ?
      ORDER BY o.created_at DESC
    `, [status]);
    return rows;
  } catch (error) {
    console.error(`Error getting orders with status ${status}:`, error);
    throw error;
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getOrdersByStatus
};
