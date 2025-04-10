require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;
const { testConnection } = require("./config/db");

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", //"https://store-manager-psi.vercel.app"
    credentials: true,
  })
);
app.use(express.json());

// Import routes
const productRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");
const userRoutes = require("./routes/users");
const reportRoutes = require("./routes/reports");
const orderRoutes = require("./routes/orders");

// Use routes
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/orders", orderRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Store Manager API is running");
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Test database connection
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error(
      "WARNING: Could not connect to the database. Please check your database configuration."
    );
  }
});
