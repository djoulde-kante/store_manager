const express = require('express');
const router = express.Router();
const userModel = require('../models/user');
const { auth, adminAuth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate request
    if (!username || !password) {
      return res.status(400).json({ msg: 'Veuillez remplir tous les champs' });
    }
    
    // Authenticate user
    const user = await userModel.authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ msg: 'Identifiants invalides' });
    }
    
    // Create and sign JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );
  } catch (error) {
    console.error('Error in POST /users/login:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error in GET /users:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const user = await userModel.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    console.error(`Error in GET /users/${req.params.id}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ msg: 'Veuillez remplir tous les champs obligatoires' });
    }
    
    // Check if username already exists
    const existingUser = await userModel.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ msg: 'Ce nom d\'utilisateur existe déjà' });
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'employee') {
      return res.status(400).json({ msg: 'Rôle invalide' });
    }
    
    const user = await userModel.createUser({
      username,
      password,
      role
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error in POST /users:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Validate required fields
    if (!username || !role) {
      return res.status(400).json({ msg: 'Veuillez remplir tous les champs obligatoires' });
    }
    
    // Check if user exists
    const existingUser = await userModel.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    }
    
    // Check if username is already taken by another user
    if (username !== existingUser.username) {
      const userWithSameUsername = await userModel.getUserByUsername(username);
      if (userWithSameUsername) {
        return res.status(400).json({ msg: 'Ce nom d\'utilisateur existe déjà' });
      }
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'employee') {
      return res.status(400).json({ msg: 'Rôle invalide' });
    }
    
    const user = await userModel.updateUser(req.params.id, {
      username,
      password, // If password is empty, it won't be updated
      role
    });
    
    res.json(user);
  } catch (error) {
    console.error(`Error in PUT /users/${req.params.id}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    // Check if user exists
    const existingUser = await userModel.getUserById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    }
    
    // Prevent deleting yourself
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ msg: 'Vous ne pouvez pas supprimer votre propre compte' });
    }
    
    await userModel.deleteUser(req.params.id);
    
    res.json({ msg: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error(`Error in DELETE /users/${req.params.id}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user
// @access  Private
router.get('/me/profile', auth, async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error in GET /users/me:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

module.exports = router;
