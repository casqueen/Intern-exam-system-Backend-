const express = require("express");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const compression = require("compression");           //Added for response compression
const rateLimit = require("express-rate-limit");      //Added for rate limiting
const cors = require("cors");
const mongoose = require("mongoose");

connectDB();
const app = express();

app.use(compression());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,                                       // 15 minutes
    max: 100,                                                       // Limit each IP to 100 requests per window
    message: { error: "Too many requests, please try again later." }
  })
);

app.use(
  cors({
    origin: "http://localhost:3001",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(express.json());

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: err.details || null,
  });
});


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/exams", examRoutes);
app.use("/api/v1/student", studentRoutes);

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
