const jwt = require("jsonwebtoken");
const Student = require("../models/Student"); // Assumes Student model exists

/**
 * Middleware to authenticate users via JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication token required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Find student by ID from token payload
    const student = await Student.findById(decoded.id).select("-password");
    if (!student || student.isDeleted) {
      return res.status(401).json({ error: "User not found or deleted" });
    }

    // Attach student to request object
    req.student = student;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Authentication failed: " + error.message });
  }
};

/**
 * Middleware to authorize admin users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authorizeAdmin = (req, res, next) => {
  try {
    if (req.student.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
  } catch (error) {
    console.error("Authorization error:", error.message);
    res.status(403).json({ error: "Authorization failed: " + error.message });
  }
};

module.exports = { authenticateUser, authorizeAdmin };