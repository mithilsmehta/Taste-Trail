const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./utils/db.js");

dotenv.config({ path: path.join(__dirname, ".env") });

const { startMealReminderService } = require("./services/mealReminderService");

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "TasteTrail API" });
});

// ROUTES
const authRoutes = require("./routes/authRoutes.js");
app.use("/api/auth", authRoutes);

const recipeRoutes = require("./routes/recipeRoutes");
app.use("/api/recipes", recipeRoutes);

const mealPlanRoutes = require("./routes/mealPlanRoutes");
app.use("/api/meal-plans", mealPlanRoutes);

const groceryRoutes = require("./routes/groceryRoutes");
app.use("/api/grocery", groceryRoutes);

const settingsRoutes = require("./routes/settingsRoutes");
app.use("/api/settings", settingsRoutes);

const visionRoutes = require("./routes/visionRoutes");
app.use("/api/vision", visionRoutes);

// Admin dashboard is disabled for now.
// Uncomment these lines when you want to enable the admin API again.
// const adminRoutes = require("./routes/adminRoutes");
// app.use("/api/admin", adminRoutes);

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(port, () => {
    console.log(`Server running on ${port}`);
    startMealReminderService();
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
