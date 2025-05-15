const express = require("express");
const router = express.Router();
const saleModel = require("../models/sale");
const productModel = require("../models/product");
const { auth } = require("../middleware/auth");

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const sales = await saleModel.getAllSales();
    res.json(sales);
  } catch (error) {
    console.error("Error in GET /sales:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/sales/date-range
// @desc    Get sales by date range
// @access  Private
router.get("/date-range", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ msg: "Les dates de début et de fin sont requises" });
    }

    const sales = await saleModel.getSalesByDateRange(startDate, endDate);
    res.json(sales);
  } catch (error) {
    console.error("Error in GET /sales/date-range:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   POST /api/sales
// @desc    Create a new sale
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { product_id, quantity, payment_method } = req.body;

    // Validate required fields
    if (!product_id || !quantity || !payment_method) {
      return res
        .status(400)
        .json({ msg: "Veuillez remplir tous les champs obligatoires" });
    }

    // Get product to calculate total
    const product = await productModel.getProductById(product_id);

    if (!product) {
      return res.status(404).json({ msg: "Produit non trouvé" });
    }

    // Check stock availability
    if (product.quantity < quantity) {
      return res.status(400).json({ msg: "Stock insuffisant" });
    }

    // Calculate total
    const total = product.sell_price * quantity;

    // Add user_id from authenticated user
    const user_id = req.user.id;

    const sale = await saleModel.createSale({
      product_id,
      user_id,
      quantity,
      total,
      payment_method,
    });

    // Log sale activity
    try {
      const userModel = require("../models/user");
      await userModel.logUserActivity(
        user_id,
        "SALE_CREATE",
        `Vente de ${quantity} ${product.name} pour ${total}`,
        req.headers["x-forwarded-for"] || req.connection.remoteAddress
      );
    } catch (logError) {
      console.error("Error logging sale activity:", logError);
      // Continue even if logging fails
    }

    res.status(201).json(sale);
  } catch (error) {
    console.error("Error in POST /sales:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/sales/product/:productId
// @desc    Get sales by product
// @access  Private
router.get("/product/:productId", auth, async (req, res) => {
  try {
    const sales = await saleModel.getSalesByProduct(req.params.productId);
    res.json(sales);
  } catch (error) {
    console.error(
      `Error in GET /sales/product/${req.params.productId}:`,
      error
    );
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/sales/daily/:date
// @desc    Get daily sales summary
// @access  Private
router.get("/daily/:date", auth, async (req, res) => {
  try {
    const summary = await saleModel.getDailySalesSummary(req.params.date);
    res.json(summary);
  } catch (error) {
    console.error(`Error in GET /sales/daily/${req.params.date}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   POST /api/sales/batch
// @desc    Create multiple sales (for POS checkout)
// @access  Private
router.post("/batch", auth, async (req, res) => {
  try {
    const { items, payment_method } = req.body;
    const user_id = req.user.id;

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !payment_method
    ) {
      return res.status(400).json({ msg: "Données de vente invalides" });
    }

    const results = [];
    let hasError = false;

    // Process each item in the sale
    for (const item of items) {
      try {
        const { product_id, quantity } = item;

        // Check if product exists and has enough stock
        const product = await productModel.getProductById(product_id);
        if (!product) {
          results.push({
            product_id,
            status: "error",
            msg: "Produit non trouvé",
          });
          hasError = true;
          continue;
        }

        if (product.quantity < quantity) {
          results.push({
            product_id,
            status: "error",
            msg: "Stock insuffisant",
          });
          hasError = true;
          continue;
        }

        // Calculer le total
        const total = product.sell_price * quantity;

        // Create the sale
        const sale = await saleModel.createSale({
          product_id,
          user_id,
          quantity,
          total,
          payment_method,
        });

        // Log sale activity
        try {
          const userModel = require("../models/user");
          await userModel.logUserActivity(
            user_id,
            "SALE_CREATE",
            `Vente de ${quantity} ${product.name} pour ${total}`,
            req.headers["x-forwarded-for"] || req.connection.remoteAddress
          );
        } catch (logError) {
          console.error("Error logging sale activity:", logError);
          // Continue even if logging fails
        }

        results.push({ product_id, status: "success", sale_id: sale.id });
      } catch (error) {
        console.error(
          `Error processing sale item for product ${item.product_id}:`,
          error
        );
        results.push({
          product_id: item.product_id,
          status: "error",
          msg: "Erreur de traitement",
        });
        hasError = true;
      }
    }

    // Return results
    if (hasError) {
      return res.status(207).json({ results });
    }

    res.status(201).json({ results });
  } catch (error) {
    console.error("Error in POST /sales/batch:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
