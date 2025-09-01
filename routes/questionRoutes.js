const express = require("express");
const Question = require("../models/Question");
const AuditLog = require("../models/AuditLog");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { createQuestionValidation } = require("../validation/validations");
const router = express.Router();

// Create Question
router.post("/", authenticateUser, authorizeAdmin, createQuestionValidation, async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();
    const log = new AuditLog({
      action: "create",
      model: "Question",
      documentId: question._id,
      changes: req.body,
      userId: req.student.id,
    });
    await log.save();
    res.status(201).json({ message: "Question created successfully", question });
  } catch (error) {
    res.status(500).json({ error: "Failed to create question: " + error.message });
  }
});

// Get All Questions
router.get("/", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = { question: { $regex: search, $options: "i" } };
    const questions = await Question.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Question.countDocuments(query);
    res.json({ questions, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions: " + error.message });
  }
});

// Get Single Question
router.get("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: "Question not found" });
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question: " + error.message });
  }
});

// Update Question
router.put("/:id", authenticateUser, authorizeAdmin, createQuestionValidation, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!question) return res.status(404).json({ error: "Question not found" });
    const log = new AuditLog({
      action: "update",
      model: "Question",
      documentId: question._id,
      changes: req.body,
      userId: req.student.id,
    });
    await log.save();
    res.json({ message: "Question updated successfully", question });
  } catch (error) {
    res.status(500).json({ error: "Failed to update question: " + error.message });
  }
});

// Soft Delete Question
router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!question) return res.status(404).json({ error: "Question not found" });
    const log = new AuditLog({
      action: "delete",
      model: "Question",
      documentId: question._id,
      userId: req.student.id,
    });
    await log.save();
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question: " + error.message });
  }
});

// Get question count (public)
router.get("/count", async (req, res) => {
  try {
    const count = await Question.countDocuments({ isDeleted: { $ne: true } });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question count: " + error.message });
  }
});

module.exports = router;