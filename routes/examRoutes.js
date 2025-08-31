// const express = require("express");
// const Exam = require("../models/Exam");
// const {
//   authenticateUser,
//   authorizeAdmin,
// } = require("../middleware/authMiddleware");
// const { createExamValidation } = require("../validation/validations"); // Added validation
// const router = express.Router();

// // Create Exam
// router.post(
//   "/",
//   authenticateUser,
//   authorizeAdmin,
//   createExamValidation, //  Added validation
//   async (req, res) => {
//     try {
//       const exam = new Exam(req.body);
//       await exam.save();
//       res.status(201).json({
//         message: "Exam created successfully",
//         exam: {
//           _id: exam._id,
//           title: exam.title,
//           questions: exam.questions,
//           createdAt: exam.createdAt,
//         },
//       });
//     } catch (error) {
//       throw new Error("Failed to create exam: " + error.message);
//     }
//   }
// );

// // Get All Exams
// router.get("/", authenticateUser, async (req, res) => {
//   try {
//     // Added pagination
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;
//     const exams = await Exam.find()
//       .select("_id createdAt questions title")
//       .skip(skip)
//       .limit(limit);
//     const total = await Exam.countDocuments();
//     res.json({
//       exams,
//       pagination: { page, limit, total },
//     });
//   } catch (error) {
//     throw new Error("Failed to fetch exams: " + error.message);
//   }
// });

// // Get Single Exam
// router.get("/:id", authenticateUser, async (req, res) => {
//   try {
//     const exam = await Exam.findById(req.params.id);
//     if (!exam) {
//       return res.status(404).json({ error: "Exam not found" });
//     }
//     res.json(exam);
//   } catch (error) {
//     throw new Error("Failed to fetch exam: " + error.message);
//   }
// });

// // Added Update Exam
// router.put(
//   "/:id",
//   authenticateUser,
//   authorizeAdmin,
//   createExamValidation,
//   async (req, res) => {
//     try {
//       const exam = await Exam.findByIdAndUpdate(
//         req.params.id,
//         req.body,
//         { new: true, runValidators: true }
//       );
//       if (!exam) {
//         return res.status(404).json({ error: "Exam not found" });
//       }
//       res.json({
//         message: "Exam updated successfully",
//         exam,
//       });
//     } catch (error) {
//       throw new Error("Failed to update exam: " + error.message);
//     }
//   }
// );

// //  Added Delete Exam
// router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
//   try {
//     const exam = await Exam.findByIdAndDelete(req.params.id);
//     if (!exam) {
//       return res.status(404).json({ error: "Exam not found" });
//     }
//     res.json({
//       message: "Exam deleted successfully",
//       examId: req.params.id,
//     });
//   } catch (error) {
//     throw new Error("Failed to delete exam: " + error.message);
//   }
// });

// module.exports = router;



const express = require("express");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const nodemailer = require("nodemailer");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { createExamValidation } = require("../validation/validations");
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * @route POST /api/v1/exams
 * @desc Create a new exam
 * @access Admin
 */
router.post("/", authenticateUser, authorizeAdmin, createExamValidation, async (req, res) => {
  try {
    const { title, questionIds } = req.body;
    const questions = await Question.find({ _id: { $in: questionIds }, isDeleted: false });
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ error: "Some questions are invalid or deleted" });
    }
    const exam = new Exam({
      title,
      questions: questionIds,
      createdBy: req.student.id,
      updatedBy: req.student.id,
    });
    await exam.save();
    await transporter.sendMail({
      to: process.env.ADMIN_EMAIL,
      subject: `New Exam Created: ${title}`,
      html: `<p>Exam "${title}" has been created with ${questionIds.length} questions.</p>`,
    });
    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    res.status(500).json({ error: "Failed to create exam: " + error.message });
  }
});

/**
 * @route GET /api/v1/exams
 * @desc Get all exams with pagination and search
 * @access Authenticated
 */
router.get("/", authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = { isDeleted: false };
    if (search) query.$text = { $search: search };
    const exams = await Exam.find(query)
      .populate("questions")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("_id title createdAt questions");
    const total = await Exam.countDocuments(query);
    res.json({ exams, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exams: " + error.message });
  }
});

/**
 * @route GET /api/v1/exams/:id
 * @desc Get a single exam
 * @access Authenticated
 */
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate("questions");
    if (!exam || exam.isDeleted) {
      return res.status(404).json({ error: "Exam not found" });
    }
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch exam: " + error.message });
  }
});

/**
 * @route PUT /api/v1/exams/:id
 * @desc Update an exam
 * @access Admin
 */
router.put("/:id", authenticateUser, authorizeAdmin, createExamValidation, async (req, res) => {
  try {
    const { title, questionIds } = req.body;
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.isDeleted) {
      return res.status(404).json({ error: "Exam not found" });
    }
    const questions = await Question.find({ _id: { $in: questionIds }, isDeleted: false });
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ error: "Some questions are invalid or deleted" });
    }
    exam.versions.push({ date: new Date(), changes: exam.toObject() });
    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { title, questions: questionIds, updatedBy: req.student.id },
      { new: true, runValidators: true }
    ).populate("questions");
    res.json({ message: "Exam updated successfully", exam: updatedExam });
  } catch (error) {
    res.status(500).json({ error: "Failed to update exam: " + error.message });
  }
});

/**
 * @route DELETE /api/v1/exams/:id
 * @desc Soft delete an exam
 * @access Admin
 */
router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || exam.isDeleted) {
      return res.status(404).json({ error: "Exam not found" });
    }
    await Exam.findByIdAndUpdate(req.params.id, { isDeleted: true });
    await Result.updateMany({ examId: req.params.id }, { isDeleted: true });
    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete exam: " + error.message });
  }
});

module.exports = router;