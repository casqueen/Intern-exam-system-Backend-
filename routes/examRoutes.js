const express = require("express");
const Exam = require("../models/Exam");
const {
  authenticateUser,
  authorizeAdmin,
} = require("../middleware/authMiddleware");
const { createExamValidation } = require("../validation/validations"); // Added validation
const router = express.Router();

// Create Exam
router.post(
  "/",
  authenticateUser,
  authorizeAdmin,
  createExamValidation, //  Added validation
  async (req, res) => {
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
      throw new Error("Failed to create exam: " + error.message);
    }
  }
);

// Get All Exams
router.get("/", authenticateUser, async (req, res) => {
  try {
    // Added pagination
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
    throw new Error("Failed to fetch exams: " + error.message);
  }
});

// Get Single Exam
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (error) {
    throw new Error("Failed to fetch exam: " + error.message);
  }
});

// Added Update Exam
router.put(
  "/:id",
  authenticateUser,
  authorizeAdmin,
  createExamValidation,
  async (req, res) => {
    try {
      const exam = await Exam.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      res.json({
        message: "Exam updated successfully",
        exam,
      });
    } catch (error) {
      throw new Error("Failed to update exam: " + error.message);
    }
  }
);

//  Added Delete Exam
router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json({
      message: "Exam deleted successfully",
      examId: req.params.id,
    });
  } catch (error) {
    throw new Error("Failed to delete exam: " + error.message);
  }
});

module.exports = router;