// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const Student = require("../models/Student");
// const {
//   registerValidation,
//   loginValidation,
// } = require("../validation/validations");
// const router = express.Router();


// // Register Student (Admin or Student)
// router.post("/register", registerValidation, async (req, res) => {
//   try {
//     let { name, email, password, role } = req.body;

//     //  Removed default role assignment (now required via validation)
//     if (role === "admin") {
//       const adminExists = await Student.findOne({ role: "admin" });
//       if (adminExists) {
//         return res.status(400).json({ error: "Admin already exists." });
//       }
//     }
//     const studentExists = await Student.findOne({ email });
//     if (studentExists) {
//       return res.status(400).json({ error: "Email already in use." });
//     }
//     const hashedPassword = await bcrypt.hash(password, 10);
//     const student = new Student({
//       name,
//       email,
//       password: hashedPassword,
//       role,
//     });
//     await student.save();
//     res.json({
//       message: `${
//         role.charAt(0).toUpperCase() + role.slice(1)
//       } registered successfully, Please login your account`,
//       data: student,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error });
//   }
// });


// // Login
// router.post("/login", loginValidation, async (req, res) => {


//   // Added role to destructuring and query
//   const { email, password, role } = req.body;
//   const student = await Student.findOne({ email, role }).select('-__v -updatedAt');
//   if (!student) 
//     return res.status(400).json({ error: "Invalid email or role" });
//   const isMatch = await bcrypt.compare(password, student.password);
//   if (!isMatch) 
//     return res.status(400).json({ error: "Invalid credentials" });
//   const token = jwt.sign(
//     { id: student._id, role: student.role },
//     process.env.JWT_SECRET,
//     { expiresIn: "1d" }
//   );

//   res.json({ token, student });
// });


// module.exports = router;



const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student"); // Assumes Student model exists
const { registerValidation, loginValidation } = require("../validation/validations"); // Assumes validation file exists
const router = express.Router();

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new student
 * @access Public
 */
router.post("/register", registerValidation, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if email already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new student
    const student = new Student({
      name,
      email,
      password: hashedPassword,
      role: role || "student", // Default to student if role not provided
    });

    await student.save();

    // Generate JWT
    const token = jwt.sign({ id: student._id, role: student.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      message: "Student registered successfully",
      student: { id: student._id, name, email, role: student.role },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ error: "Registration failed: " + error.message });
  }
});

/**
 * @route POST /api/v1/auth/login
 * @desc Login a student and return JWT
 * @access Public
 */
router.post("/login", loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if student exists
    const student = await Student.findOne({ email, isDeleted: false });
    if (!student) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT
    const token = jwt.sign({ id: student._id, role: student.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      message: "Login successful",
      student: { id: student._id, name: student.name, email: student.email, role: student.role },
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Login failed: " + error.message });
  }
});

module.exports = router;