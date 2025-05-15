const { pool } = require("../config/db");
const bcrypt = require("bcrypt");

// Get all users
async function getAllUsers() {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, first_name, last_name, email, phone, role, status, last_login, created_at, updated_at FROM users"
    );
    return rows;
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
}

// Get user by ID
async function getUserById(id) {
  try {
    const [rows] = await pool.query(
      "SELECT id, username, first_name, last_name, email, phone, role, status, last_login, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );
    return rows[0];
  } catch (error) {
    console.error(`Error getting user with id ${id}:`, error);
    throw error;
  }
}

// Get user by username
async function getUserByUsername(username) {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return rows[0];
  } catch (error) {
    console.error(`Error getting user with username ${username}:`, error);
    throw error;
  }
}

// Create a new user
async function createUser(user) {
  try {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
    } = user;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (username, password_hash, first_name, last_name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        hashedPassword,
        first_name || null,
        last_name || null,
        email || null,
        phone || null,
        role,
        status || "active",
      ]
    );

    return {
      id: result.insertId,
      username,
      first_name,
      last_name,
      email,
      phone,
      role,
      status: status || "active",
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Update a user
async function updateUser(id, user) {
  try {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
    } = user;

    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await pool.query(
        "UPDATE users SET username = ?, password_hash = ?, first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?",
        [
          username,
          hashedPassword,
          first_name || null,
          last_name || null,
          email || null,
          phone || null,
          role,
          status || "active",
          id,
        ]
      );
    } else {
      // Update without changing password
      await pool.query(
        "UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?",
        [
          username,
          first_name || null,
          last_name || null,
          email || null,
          phone || null,
          role,
          status || "active",
          id,
        ]
      );
    }

    return {
      id,
      username,
      first_name,
      last_name,
      email,
      phone,
      role,
      status: status || "active",
    };
  } catch (error) {
    console.error(`Error updating user with id ${id}:`, error);
    throw error;
  }
}

// Delete a user
async function deleteUser(id) {
  try {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return { id };
  } catch (error) {
    console.error(`Error deleting user with id ${id}:`, error);
    throw error;
  }
}

// Authenticate user and update last_login
async function authenticateUser(username, password, ipAddress = null) {
  try {
    const user = await getUserByUsername(username);

    if (!user) {
      return null;
    }

    // Check if user is inactive
    if (user.status === "inactive") {
      throw new Error("Compte désactivé");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      // Log failed login attempt
      await logUserActivity(
        user.id,
        "LOGIN_FAILED",
        "Échec de la tentative de connexion",
        ipAddress
      );
      return null;
    }

    // Update last login time
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    // Log successful login
    await logUserActivity(user.id, "LOGIN", "Connexion réussie", ipAddress);

    return {
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    throw error;
  }
}

// Log user activity
async function logUserActivity(
  userId,
  actionType,
  actionDetails,
  ipAddress = null
) {
  try {
    await pool.query(
      "INSERT INTO user_activity_log (user_id, action_type, action_details, ip_address) VALUES (?, ?, ?, ?)",
      [userId, actionType, actionDetails, ipAddress]
    );
  } catch (error) {
    console.error("Error logging user activity:", error);
    // Don't throw error to avoid interrupting the main operation
  }
}

// Get user activity logs
async function getUserActivityLogs(userId, limit = 100, offset = 0) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM user_activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [userId, limit, offset]
    );
    return rows;
  } catch (error) {
    console.error(`Error getting activity logs for user ${userId}:`, error);
    throw error;
  }
}

// Get all activity logs (admin only)
async function getAllActivityLogs(limit = 100, offset = 0) {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, u.username 
       FROM user_activity_log l
       JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    console.error("Error getting all activity logs:", error);
    throw error;
  }
}

// Set user status (active/inactive)
async function setUserStatus(id, status, modifiedBy) {
  try {
    if (status !== "active" && status !== "inactive") {
      throw new Error("Statut invalide");
    }

    await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, id]);

    // Log status change
    await logUserActivity(
      modifiedBy,
      "USER_STATUS_CHANGE",
      `Statut de l'utilisateur (ID: ${id}) changé en ${status}`,
      null
    );

    return { id, status };
  } catch (error) {
    console.error(`Error setting status for user ${id}:`, error);
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
  authenticateUser,
  logUserActivity,
  getUserActivityLogs,
  getAllActivityLogs,
  setUserStatus,
};
