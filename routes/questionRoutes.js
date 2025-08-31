const express = require("express");
const Question = require("../models/Question");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { createQuestionValidation } = require("../validation/validations");
const multer = require("multer");
const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

/**
 * @route POST /api/v1/questions
 * @desc Create a new question with optional image upload
 * @access Admin
 */
router.post(
  "/",
  authenticateUser,
  authorizeAdmin,
  upload.single("image"),
  createQuestionValidation,
  async (req, res) => {
    try {
      const question = new Question({
        ...req.body,
        image: req.file ? `/uploads/${req.file.filename}` : null,
        createdBy: req.student.id,
        updatedBy: req.student.id,
      });
      await question.save();
      res.status(201).json({ message: "Question created successfully", question });
    } catch (error) {
      res.status(500).json({ error: "Failed to create question: " + error.message });
    }
  }
);

/**
 * @route GET /api/v1/questions
 * @desc Get all questions with pagination and filtering
 * @access Admin
 */
router.get("/", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query;
    const query = { isDeleted: false };
    if (type) query.type = type;
    if (search) query.$text = { $search: search };
    const questions = await Question.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("text type points createdAt");
    const total = await Question.countDocuments(query);
    res.json({
      questions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions: " + error.message });
  }
});

/**
 * @route GET /api/v1/questions/:id
 * @desc Get a single question
 * @access Authenticated
 */
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question || question.isDeleted) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question: " + error.message });
  }
});

/**
 * @route PUT /api/v1/questions/:id
 * @desc Update a question with optional image upload
 * @access Admin
 */
router.put(
  "/:id",
  authenticateUser,
  authorizeAdmin,
  upload.single("image"),
  createQuestionValidation,
  async (req, res) => {
    try {
      const oldQuestion = await Question.findById(req.params.id);
      if (!oldQuestion || oldQuestion.isDeleted) {
        return res.status(404).json({ error: "Question not found" });
      }
      oldQuestion.versions.push({ date: new Date(), changes: oldQuestion.toObject() });
      const updatedQuestion = await Question.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          image: req.file ? `/uploads/${req.file.filename}` : oldQuestion.image,
          updatedBy: req.student.id,
        },
        { new: true, runValidators: true }
      );
      res.json({ message: "Question updated successfully", question: updatedQuestion });
    } catch (error) {
      res.status(500).json({ error: "Failed to update question: " + error.message });
    }
  }
);

/**
 * @route DELETE /api/v1/questions/:id
 * @desc Soft delete a question
 * @access Admin
 */
router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question || question.isDeleted) {
      return res.status(404).json({ error: "Question not found" });
    }
    await Question.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete question: " + error.message });
  }
});

module.exports = router;