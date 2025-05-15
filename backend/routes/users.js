const express = require("express");
const router = express.Router();
const userModel = require("../models/user");
const { auth, adminAuth } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate request
    if (!username || !password) {
      return res.status(400).json({ msg: "Veuillez remplir tous les champs" });
    }

    // Get IP address for logging
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Authenticate user
    const user = await userModel.authenticateUser(
      username,
      password,
      ipAddress
    );

    if (!user) {
      return res.status(401).json({ msg: "Identifiants invalides" });
    }

    // Create and sign JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );
  } catch (error) {
    console.error("Error in POST /users/login:", error);
    if (error.message === "Compte désactivé") {
      return res.status(403).json({
        msg: "Compte désactivé. Veuillez contacter un administrateur.",
      });
    }
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get("/", adminAuth, async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error in GET /users:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const user = await userModel.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }
    res.json(user);
  } catch (error) {
    console.error(`Error in GET /users/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Admin
router.post("/", adminAuth, async (req, res) => {
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
    } = req.body;

    // Validate required fields
    if (!username || !password || !role) {
      return res
        .status(400)
        .json({ msg: "Veuillez remplir tous les champs obligatoires" });
    }

    // Check if username already exists
    const existingUser = await userModel.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ msg: "Ce nom d'utilisateur existe déjà" });
    }

    // Validate role
    if (role !== "admin" && role !== "employee") {
      return res.status(400).json({ msg: "Rôle invalide" });
    }

    // Validate email format if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ msg: "Format d'email invalide" });
    }

    const user = await userModel.createUser({
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
    });

    // Log user creation
    await userModel.logUserActivity(
      req.user.id,
      "USER_CREATE",
      `Création de l'utilisateur ${username} (ID: ${user.id})`,
      null
    );

    res.status(201).json(user);
  } catch (error) {
    console.error("Error in POST /users:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Admin
router.put("/:id", adminAuth, async (req, res) => {
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
    } = req.body;

    // Validate required fields
    if (!username || !role) {
      return res
        .status(400)
        .json({ msg: "Veuillez remplir tous les champs obligatoires" });
    }

    // Check if user exists
    const existingUser = await userModel.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // Check if username is already taken by another user
    if (username !== existingUser.username) {
      const userWithSameUsername = await userModel.getUserByUsername(username);
      if (userWithSameUsername) {
        return res
          .status(400)
          .json({ msg: "Ce nom d'utilisateur existe déjà" });
      }
    }

    // Validate role
    if (role !== "admin" && role !== "employee") {
      return res.status(400).json({ msg: "Rôle invalide" });
    }

    // Validate email format if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ msg: "Format d'email invalide" });
    }

    const user = await userModel.updateUser(req.params.id, {
      username,
      password, // If password is empty, it won't be updated
      first_name,
      last_name,
      email,
      phone,
      role,
      status,
    });

    // Log user update
    await userModel.logUserActivity(
      req.user.id,
      "USER_UPDATE",
      `Mise à jour de l'utilisateur ${username} (ID: ${req.params.id})`,
      null
    );

    res.json(user);
  } catch (error) {
    console.error(`Error in PUT /users/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Admin
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    // Check if user exists
    const existingUser = await userModel.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // Prevent deleting yourself
    if (req.user.id === parseInt(req.params.id)) {
      return res
        .status(400)
        .json({ msg: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    // Log user deletion before actually deleting
    await userModel.logUserActivity(
      req.user.id,
      "USER_DELETE",
      `Suppression de l'utilisateur ${existingUser.username} (ID: ${req.params.id})`,
      null
    );

    await userModel.deleteUser(req.params.id);

    res.json({ msg: "Utilisateur supprimé avec succès" });
  } catch (error) {
    console.error(`Error in DELETE /users/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/users/me/profile
// @desc    Get current user
// @access  Private
router.get("/me/profile", auth, async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error in GET /users/me/profile:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Change user status (active/inactive)
// @access  Admin
router.put("/:id/status", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || (status !== "active" && status !== "inactive")) {
      return res.status(400).json({ msg: "Statut invalide" });
    }

    // Check if user exists
    const existingUser = await userModel.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    // Prevent deactivating yourself
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({
        msg: "Vous ne pouvez pas changer le statut de votre propre compte",
      });
    }

    const result = await userModel.setUserStatus(
      req.params.id,
      status,
      req.user.id
    );

    res.json({ id: result.id, status: result.status });
  } catch (error) {
    console.error(`Error in PUT /users/${req.params.id}/status:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity logs
// @access  Admin
router.get("/:id/activity", adminAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // Check if user exists
    const existingUser = await userModel.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ msg: "Utilisateur non trouvé" });
    }

    const logs = await userModel.getUserActivityLogs(
      req.params.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json(logs);
  } catch (error) {
    console.error(`Error in GET /users/${req.params.id}/activity:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/users/activity/all
// @desc    Get all activity logs
// @access  Admin
router.get("/activity/all", adminAuth, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const logs = await userModel.getAllActivityLogs(
      parseInt(limit),
      parseInt(offset)
    );

    res.json(logs);
  } catch (error) {
    console.error("Error in GET /users/activity/all:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   POST /api/users/activity/log
// @desc    Log a user activity (like logout)
// @access  Private
router.post("/activity/log", auth, async (req, res) => {
  try {
    const { actionType, actionDetails } = req.body;

    if (!actionType) {
      return res.status(400).json({ msg: "Type d'action requis" });
    }

    // Get IP address for logging
    const ipAddress =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    await userModel.logUserActivity(
      req.user.id,
      actionType,
      actionDetails || "",
      ipAddress
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error in POST /users/activity/log:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// Helper function to validate email format
function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

module.exports = router;
