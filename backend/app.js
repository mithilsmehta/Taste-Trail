const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./utils/db.js");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// ROUTES
const authRoutes = require("./routes/authRoutes.js");
app.use("/api/auth", authRoutes);

app.listen(5000, () => console.log("Server running on 5000"));