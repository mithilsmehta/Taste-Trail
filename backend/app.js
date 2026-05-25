const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db.js");

dotenv.config();

const { startMealReminderService } = require("./services/mealReminderService");

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

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

app.listen(5000, () => {
  console.log("Server running on 5000");
  startMealReminderService();
});
