const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

// Get all users
async function getAllUsers() {
  try {
    const [rows] = await pool.query('SELECT id, username, role FROM users');
    return rows;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

// Get user by ID
async function getUserById(id) {
  try {
    const [rows] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [id]);
    return rows[0];
  } catch (error) {
    console.error(`Error getting user with id ${id}:`, error);
    throw error;
  }
}

// Get user by username
async function getUserByUsername(username) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  } catch (error) {
    console.error(`Error getting user with username ${username}:`, error);
    throw error;
  }
}

// Create a new user
async function createUser(user) {
  try {
    const { username, password, role } = user;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    
    return { id: result.insertId, username, role };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Update a user
async function updateUser(id, user) {
  try {
    const { username, password, role } = user;
    
    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await pool.query(
        'UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?',
        [username, hashedPassword, role, id]
      );
    } else {
      // Update without changing password
      await pool.query(
        'UPDATE users SET username = ?, role = ? WHERE id = ?',
        [username, role, id]
      );
    }
    
    return { id, username, role };
  } catch (error) {
    console.error(`Error updating user with id ${id}:`, error);
    throw error;
  }
}

// Delete a user
async function deleteUser(id) {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return { id };
  } catch (error) {
    console.error(`Error deleting user with id ${id}:`, error);
    throw error;
  }
}

// Authenticate user
async function authenticateUser(username, password) {
  try {
    const user = await getUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return null;
    }
    
    return { id: user.id, username: user.username, role: user.role };
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  authenticateUser
};
