const express = require("express");
const router = express.Router();
const userPerformanceModel = require("../models/userPerformance");
const { auth, adminAuth } = require("../middleware/auth");

// @route   GET /api/performance/users/:id
// @desc    Get performance for a specific user
// @access  Admin or Self
router.get("/users/:id", auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user is requesting their own data or is an admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Accès non autorisé" });
    }

    const { period_type = "all_time" } = req.query;

    // Validate period_type
    const validPeriodTypes = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "all_time",
    ];
    if (!validPeriodTypes.includes(period_type)) {
      return res.status(400).json({ msg: "Type de période invalide" });
    }

    const performance = await userPerformanceModel.getUserPerformance(
      userId,
      period_type
    );

    res.json(performance);
  } catch (error) {
    console.error(`Error in GET /performance/users/${req.params.id}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/performance/users/:id/trend
// @desc    Get performance trend for a user
// @access  Admin or Self
router.get("/users/:id/trend", auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user is requesting their own data or is an admin
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Accès non autorisé" });
    }

    const { period_type = "monthly", limit = 6 } = req.query;

    // Validate period_type
    const validPeriodTypes = ["daily", "weekly", "monthly", "yearly"];
    if (!validPeriodTypes.includes(period_type)) {
      return res.status(400).json({ msg: "Type de période invalide" });
    }

    const trend = await userPerformanceModel.getUserPerformanceTrend(
      userId,
      period_type,
      parseInt(limit)
    );

    res.json(trend);
  } catch (error) {
    console.error(
      `Error in GET /performance/users/${req.params.id}/trend:`,
      error
    );
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/performance/users
// @desc    Get performance for all users
// @access  Admin
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { period_type = "all_time" } = req.query;

    // Validate period_type
    const validPeriodTypes = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "all_time",
    ];
    if (!validPeriodTypes.includes(period_type)) {
      return res.status(400).json({ msg: "Type de période invalide" });
    }

    const performances = await userPerformanceModel.getAllUsersPerformance(
      period_type
    );

    res.json(performances);
  } catch (error) {
    console.error("Error in GET /performance/users:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/performance/ranking
// @desc    Get users ranked by performance
// @access  Admin
router.get("/ranking", adminAuth, async (req, res) => {
  try {
    const {
      period_type = "monthly",
      metric = "sales_total",
      limit = 10,
    } = req.query;

    // Validate period_type
    const validPeriodTypes = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "all_time",
    ];
    if (!validPeriodTypes.includes(period_type)) {
      return res.status(400).json({ msg: "Type de période invalide" });
    }

    // Validate metric (validation is also done in the model)
    const validMetrics = [
      "sales_count",
      "sales_total",
      "avg_sale_value",
      "products_added",
      "orders_processed",
    ];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ msg: "Métrique invalide" });
    }

    const ranking = await userPerformanceModel.getUsersRankedByPerformance(
      period_type,
      metric,
      parseInt(limit)
    );

    res.json(ranking);
  } catch (error) {
    console.error("Error in GET /performance/ranking:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/performance/team
// @desc    Get team performance (aggregate)
// @access  Admin
router.get("/team", adminAuth, async (req, res) => {
  try {
    const { period_type = "monthly" } = req.query;

    // Validate period_type
    const validPeriodTypes = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "all_time",
    ];
    if (!validPeriodTypes.includes(period_type)) {
      return res.status(400).json({ msg: "Type de période invalide" });
    }

    const teamPerformance = await userPerformanceModel.getTeamPerformance(
      period_type
    );

    res.json(teamPerformance);
  } catch (error) {
    console.error("Error in GET /performance/team:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   POST /api/performance/users/:id/update
// @desc    Manually trigger performance update for a user
// @access  Admin
router.post("/users/:id/update", adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { period_type = "all_time" } = req.body;

    // Validate period_type
    const validPeriodTypes = [
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "all_time",
    ];
    if (!validPeriodTypes.includes(period_type)) {
      return res.status(400).json({ msg: "Type de période invalide" });
    }

    const result = await userPerformanceModel.updateUserPerformance(
      userId,
      period_type
    );

    res.json(result);
  } catch (error) {
    console.error(
      `Error in POST /performance/users/${req.params.id}/update:`,
      error
    );
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
