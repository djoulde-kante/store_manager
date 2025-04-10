const express = require("express");
const router = express.Router();
const reportModel = require("../models/report");
const { auth, adminAuth } = require("../middleware/auth");

// @route   GET /api/reports/daily/:date
// @desc    Get daily sales report
// @access  Private
router.get("/daily/:date", auth, async (req, res) => {
  try {
    const report = await reportModel.getDailyReport(req.params.date);
    res.json(report);
  } catch (error) {
    console.error(`Error in GET /reports/daily/${req.params.date}:`, error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/reports/weekly
// @desc    Get weekly sales report
// @access  Private
router.get("/weekly", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ msg: "Les dates de du00e9but et de fin sont requises" });
    }

    const report = await reportModel.getWeeklyReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error("Error in GET /reports/weekly:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/reports/monthly/:year/:month
// @desc    Get monthly sales report
// @access  Private
router.get("/monthly/:year/:month", auth, async (req, res) => {
  try {
    const { year, month } = req.params;

    if (!year || !month) {
      return res
        .status(400)
        .json({ msg: "L'annu00e9e et le mois sont requis" });
    }

    const report = await reportModel.getMonthlyReport(year, month);
    res.json(report);
  } catch (error) {
    console.error(
      `Error in GET /reports/monthly/${req.params.year}/${req.params.month}:`,
      error
    );
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/reports/top-products/:limit
// @desc    Get top selling products
// @access  Private
router.get("/top-products/:limit?", auth, async (req, res) => {
  try {
    const limit = req.params.limit ? parseInt(req.params.limit) : 10;

    if (isNaN(limit) || limit <= 0) {
      return res
        .status(400)
        .json({ msg: "La limite doit u00eatre un nombre positif" });
    }

    const report = await reportModel.getTopProducts(limit);
    res.json(report);
  } catch (error) {
    console.error("Error in GET /reports/top-products:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/reports/profit
// @desc    Get profit calculation
// @access  Private
router.get("/profit", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ msg: "Les dates de du00e9but et de fin sont requises" });
    }

    const report = await reportModel.getProfitReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    console.error("Error in GET /reports/profit:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

// @route   GET /api/reports/inventory
// @desc    Get inventory status report
// @access  Private
router.get("/inventory", auth, async (req, res) => {
  try {
    const report = await reportModel.getInventoryReport();
    res.json(report);
  } catch (error) {
    console.error("Error in GET /reports/inventory:", error);
    res.status(500).json({ msg: "Erreur serveur" });
  }
});

module.exports = router;
