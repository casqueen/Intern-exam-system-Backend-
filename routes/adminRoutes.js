const express = require("express");
const Student = require("../models/Student");
const Result = require("../models/Result");
const AuditLog = require("../models/AuditLog");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { updateStudentValidation } = require("../validation/validations");

const router = express.Router();

// Get all students
router.get("/", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = {
      role: "student",
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
    res.json({ students, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    throw new Error("Failed to fetch students: " + error.message);
  }
});

// Update a student
router.put("/student/:id", authenticateUser, authorizeAdmin, updateStudentValidation, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.role !== "student") return res.status(404).json({ error: "Student not found" });
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("name email createdAt");
    const log = new AuditLog({
      action: "update",
      model: "Student",
      documentId: updatedStudent._id,
      changes: req.body,
      userId: req.student.id,
    });
    await log.save();
    res.json({ message: "Student updated successfully", updatedStudent });
  } catch (error) {
    throw new Error("Failed to update student: " + error.message);
  }
});

// Soft Delete a student
router.delete("/student/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!student || student.role !== "student") return res.status(404).json({ error: "Student not found" });
    await Result.updateMany({ studentId: req.params.id }, { isDeleted: true });
    const log = new AuditLog({
      action: "delete",
      model: "Student",
      documentId: student._id,
      userId: req.student.id,
    });
    await log.save();
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    throw new Error("Failed to delete student: " + error.message);
  }
});

// Get exam results for a specific exam
router.get("/exam-results/:examId", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId })
      .populate("studentId", "name email")
      .populate("examId", "title questions")
      .lean();
    if (!results.length) return res.status(404).json({ error: "No results found for this exam" });
    const formattedResults = results.map((result) => ({
      studentId: result.studentId._id,
      name: result.studentId.name,
      email: result.studentId.email,
      examTitle: result.examId.title,
      score: `${(result.score / result.examId.questions.length) * 100}%`,
      passed: result.passed ? "✅ Passed" : "❌ Failed",
      examDate: new Date(result.createdAt).toLocaleDateString(),
    }));
    res.json(formattedResults);
  } catch (error) {
    throw new Error("Failed to fetch exam results: " + error.message);
  }
});

module.exports = router;