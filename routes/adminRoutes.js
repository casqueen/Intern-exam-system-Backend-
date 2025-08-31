// const express = require("express");
// const Student = require("../models/Student");
// const Result = require("../models/Result");
// const {
//   authenticateUser,
//   authorizeAdmin,
// } = require("../middleware/authMiddleware");
// const { updateStudentValidation } = require("../validation/validations");      // Added validation import
// const router = express.Router();


// // Get all students with pagination and search
// router.get("/", authenticateUser, authorizeAdmin, async (req, res) => {
//   try {
//     //  Added pagination and search
//     const { search = "", page = 1, limit = 10 } = req.query;
//     const query = {
//       role: "student", // Exclude admins
//       $or: [
//         { name: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//       ],
//     };
//     const students = await Student.find(query)
//       .select("name email createdAt") // Exclude sensitive fields
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit))
//       .lean();
//     const total = await Student.countDocuments(query);
//     res.json({
//       students,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//       },
//     });
//   } catch (error) {
//     throw new Error("Failed to fetch students: " + error.message);
//   }
// });


// // Update a student
// router.put(
//   "/student/:id",
//   authenticateUser,
//   authorizeAdmin,
//   updateStudentValidation,            // Added validation
//   async (req, res) => {
//     try {
//       const student = await Student.findById(req.params.id);
//       if (!student) {
//         return res.status(404).json({ error: "Student not found" });
//       }
//       if (student.role !== "student") {
//         return res.status(403).json({ error: "Cannot update admin accounts" });
//       }
//       const updatedStudent = await Student.findByIdAndUpdate(
//         req.params.id,
//         { name: req.body.name, email: req.body.email },
//         { new: true, runValidators: true }
//       ).select("name email role createdAt");
//       res.json({
//         message: "Student updated successfully",
//         updatedStudent,
//       });
//     } catch (error) {
//       throw new Error("Failed to update student: " + error.message);
//     }
//   }
// );


// // Delete a student
// router.delete("/student/:id", authenticateUser, authorizeAdmin, async (req, res) => {
//   try {
//     const student = await Student.findById(req.params.id);
//     if (!student) {
//       return res.status(404).json({ error: "Student not found" });
//     }
//     if (student.role !== "student") {
//       return res.status(403).json({ error: "Cannot delete admin accounts" });
//     }
//     const deletedStudent = await Student.findByIdAndDelete(req.params.id).select("name email");
//     await Result.deleteMany({ studentId: req.params.id });                                 //  Cascade delete results
//     res.json({
//       message: "Student deleted successfully",
//       deletedStudent,
//     });
//   } catch (error) {
//     throw new Error("Failed to delete student: " + error.message);
//   }
// });


// // Get exam results for a specific exam
// router.get("/exam-results/:examId", authenticateUser, authorizeAdmin, async (req, res) => {
//   try {
//     const results = await Result.find({ examId: req.params.examId })
//       .populate("studentId", "name email")
//       .populate("examId", "title")
//       .lean();
//     if (!results.length) {
//       return res.status(404).json({ error: "No results found for this exam" });
//     }
//     const formattedResults = results.map((result) => ({
//       studentId: result.studentId._id,
//       name: result.studentId.name,
//       email: result.studentId.email,
//       examTitle: result.examId.title,
//       score: `${(result.score / result.examId.questions.length) * 100}%`,
//       passed: result.passed ? "✅ Passed" : "❌ Failed",
//       examDate: new Date(result.createdAt).toLocaleDateString(),
//     }));
//     res.json(formattedResults);
//   } catch (error) {
//     throw new Error("Failed to fetch exam results: " + error.message);
//   }
// });

// module.exports = router;

const express = require("express");
const Student = require("../models/Student");
const Result = require("../models/Result");
const Exam = require("../models/Exam");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { updateStudentValidation } = require("../validation/validations");
const router = express.Router();

/**
 * @route GET /api/v1/admin
 * @desc Get all students with pagination and search
 * @access Admin
 */
router.get("/", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = {
      role: "student",
      isDeleted: false,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
    const students = await Student.find(query)
      .select("name email createdAt")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    const total = await Student.countDocuments(query);
    res.json({
      students,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students: " + error.message });
  }
});

/**
 * @route PUT /api/v1/admin/student/:id
 * @desc Update a student
 * @access Admin
 */
router.put("/student/:id", authenticateUser, authorizeAdmin, updateStudentValidation, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.isDeleted) {
      return res.status(404).json({ error: "Student not found" });
    }
    if (student.role !== "student") {
      return res.status(403).json({ error: "Cannot update admin accounts" });
    }
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, email: req.body.email },
      { new: true, runValidators: true }
    ).select("name email role createdAt");
    res.json({ message: "Student updated successfully", updatedStudent });
  } catch (error) {
    res.status(500).json({ error: "Failed to update student: " + error.message });
  }
});

/**
 * @route DELETE /api/v1/admin/student/:id
 * @desc Soft delete a student
 * @access Admin
 */
router.delete("/student/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.isDeleted) {
      return res.status(404).json({ error: "Student not found" });
    }
    if (student.role !== "student") {
      return res.status(403).json({ error: "Cannot delete admin accounts" });
    }
    await Student.findByIdAndUpdate(req.params.id, { isDeleted: true });
    await Result.updateMany({ studentId: req.params.id }, { isDeleted: true });
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete student: " + error.message });
  }
});

/**
 * @route GET /api/v1/admin/exam-results/:examId
 * @desc Get exam results for a specific exam
 * @access Admin
 */
router.get("/exam-results/:examId", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId, isDeleted: false })
      .populate("studentId", "name email")
      .populate("examId", "title")
      .lean();
    if (!results.length) {
      return res.status(404).json({ error: "No results found for this exam" });
    }
    const formattedResults = results.map((result) => ({
      studentId: result.studentId._id,
      name: result.studentId.name,
      email: result.studentId.email,
      examTitle: result.examId.title,
      score: `${(result.totalScore / result.answers.reduce((sum, a) => sum + a.score, 0) * 100).toFixed(2)}%`,
      passed: result.passed ? "✅ Passed" : "❌ Failed",
      examDate: new Date(result.createdAt).toLocaleDateString(),
    }));
    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exam results: " + error.message });
  }
});

module.exports = router;