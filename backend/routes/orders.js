const express = require("express");
const router = express.Router();
const orderModel = require("../models/order");
const productModel = require("../models/product");
const { auth, adminAuth } = require("../middleware/auth");

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    // Filter by status if provided
    if (req.query.status) {
      const orders = await orderModel.getOrdersByStatus(req.query.status);
      return res.json(orders);
    }

    const orders = await orderModel.getAllOrders();
    res.json(orders);
  } catch (error) {
    console.error("Error in GET /orders:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID with items
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const order = await orderModel.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: "Commande non trouvée" });
    }
    res.json(order);
  } catch (error) {
    console.error(`Error in GET /orders/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { items, total } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0 || !total) {
      return res.status(400).json({ msg: "Données de commande invalides" });
    }

    // Validate each item
    for (const item of items) {
      const { product_id, quantity, price } = item;
      if (!product_id || !quantity || !price) {
        return res.status(400).json({ msg: "Données d'article invalides" });
      }

      // Check if product exists
      const product = await productModel.getProductById(product_id);
      if (!product) {
        return res
          .status(404)
          .json({ msg: `Produit avec ID ${product_id} non trouvé` });
      }
    }

    const order = await orderModel.createOrder({
      user_id: req.user.id,
      items,
      total,
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Error in POST /orders:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!status) {
      return res.status(400).json({ msg: "Le statut est requis" });
    }

    // Validate status value
    const validStatuses = ["pending", "confirmed", "shipped", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ msg: "Statut invalide" });
    }

    // Check if order exists
    const existingOrder = await orderModel.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ msg: "Commande non trouvée" });
    }

    // Admin can update any order, regular users can only update their own orders
    if (req.user.role !== "admin" && existingOrder.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Non autorisé à modifier cette commande" });
    }

    const result = await orderModel.updateOrderStatus(req.params.id, status);

    res.json(result);
  } catch (error) {
    console.error(`Error in PUT /orders/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete an order (only if pending)
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    // Check if order exists
    const existingOrder = await orderModel.getOrderById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ msg: "Commande non trouvée" });
    }

    // Admin can delete any order, regular users can only delete their own orders
    if (req.user.role !== "admin" && existingOrder.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Non autorisé à supprimer cette commande" });
    }

    // Check if order is in pending status
    if (existingOrder.status !== "pending") {
      return res.status(400).json({
        msg: "Seules les commandes en attente peuvent être supprimées",
      });
    }

    await orderModel.deleteOrder(req.params.id);

    res.json({ msg: "Commande supprimée avec succès" });
  } catch (error) {
    console.error(`Error in DELETE /orders/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/orders/status/:status
// @desc    Get orders by status
// @access  Private
router.get("/status/:status", auth, async (req, res) => {
  try {
    const validStatuses = ["pending", "confirmed", "shipped", "cancelled"];
    if (!validStatuses.includes(req.params.status)) {
      return res.status(400).json({ msg: "Statut invalide" });
    }

    const orders = await orderModel.getOrdersByStatus(req.params.status);
    res.json(orders);
  } catch (error) {
    console.error(`Error in GET /orders/status/${req.params.status}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
