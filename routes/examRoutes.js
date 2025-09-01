const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { createExamValidation } = require("../validation/validations");
const router = express.Router();

// Create Exam
router.post("/", authenticateUser, authorizeAdmin, createExamValidation, async (req, res) => {
  try {
    const exam = new Exam(req.body);
    await exam.save();
    res.status(201).json({
      message: "Exam created successfully",
      exam: {
        _id: exam._id,
        title: exam.title,
        questions: exam.questions,
        createdAt: exam.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create exam: " + error.message });
  }
});

// Get All Exams
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const exams = await Exam.find()
      .select("_id createdAt questions title")
      .skip(skip)
      .limit(limit);
    const total = await Exam.countDocuments();
    res.json({
      exams,
      pagination: { page, limit, total },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exams: " + error.message });
  }
});

// Get Single Exam
router.get("/:id", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate("questions");
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exam: " + error.message });
  }
});

// Update Exam
router.put("/:id", authenticateUser, authorizeAdmin, createExamValidation, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json({
      message: "Exam updated successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update exam: " + error.message });
  }
});

// Delete Exam
router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json({
      message: "Exam deleted successfully",
      examId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete exam: " + error.message });
  }
});

// Generate random exam (public)
router.post("/random", async (req, res) => {
  try {
    const { numQuestions, duration } = req.body;
    if (!numQuestions || !duration) {
      return res.status(400).json({ error: "Number of questions and duration are required" });
    }
    const allQuestions = await Question.find({ isDeleted: { $ne: true } });
    if (allQuestions.length < numQuestions) {
      return res.status(400).json({ error: "Not enough questions available" });
    }
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numQuestions);
    const exam = new Exam({
      title: `Random Exam - ${new Date().toLocaleString()}`,
      questions: selected.map((q) => q._id),
      isRandom: true,
      duration: duration * 60, // Store duration in seconds
    });
    await exam.save();
    const populatedExam = await Exam.findById(exam._id).populate("questions");
    res.json(populatedExam);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate random exam: " + error.message });
  }
});

module.exports = router;