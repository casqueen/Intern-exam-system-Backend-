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
const AuditLog = require("../models/AuditLog");
const transporter = require("../config/mail");
const { authenticateUser, authorizeAdmin } = require("../middleware/authMiddleware");
const { createExamValidation } = require("../validation/validations");

const router = express.Router();

// Create Exam
router.post("/", authenticateUser, authorizeAdmin, createExamValidation, async (req, res) => {
  try {
    const { title, questionIds } = req.body;
    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) return res.status(400).json({ error: "Invalid question IDs" });
    const exam = new Exam({ title, questions: questionIds });
    await exam.save();
    const log = new AuditLog({
      action: "create",
      model: "Exam",
      documentId: exam._id,
      changes: req.body,
      userId: req.student.id,
    });
    await log.save();
    // Email notification
    transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `New Exam Created: ${title}`,
      text: `A new exam "${title}" has been created.`,
    });
    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    throw new Error("Failed to create exam: " + error.message);
  }
});

// Get All Exams (public for students)
router.get("/", async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const query = { title: { $regex: search, $options: "i" } };
    const exams = await Exam.find(query)
      .populate("questions", "question type")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await Exam.countDocuments(query);
    res.json({ exams, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    throw new Error("Failed to fetch exams: " + error.message);
  }
});

// Get Single Exam (public)
router.get("/:id", async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate("questions");
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(exam);
  } catch (error) {
    throw new Error("Failed to fetch exam: " + error.message);
  }
});

// Update Exam
router.put("/:id", authenticateUser, authorizeAdmin, createExamValidation, async (req, res) => {
  try {
    const { title, questionIds } = req.body;
    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) return res.status(400).json({ error: "Invalid question IDs" });
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { title, questions: questionIds },
      { new: true, runValidators: true }
    ).populate("questions");
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const log = new AuditLog({
      action: "update",
      model: "Exam",
      documentId: exam._id,
      changes: req.body,
      userId: req.student.id,
    });
    await log.save();
    res.json({ message: "Exam updated successfully", exam });
  } catch (error) {
    throw new Error("Failed to update exam: " + error.message);
  }
});

// Soft Delete Exam
router.delete("/:id", authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const log = new AuditLog({
      action: "delete",
      model: "Exam",
      documentId: exam._id,
      userId: req.student.id,
    });
    await log.save();
    res.json({ message: "Exam deleted successfully" });
  } catch (error) {
    throw new Error("Failed to delete exam: " + error.message);
  }
});

module.exports = router;