// const express = require("express");
// const Result = require("../models/Result");
// const Exam = require("../models/Exam");
// const { authenticateUser } = require("../middleware/authMiddleware");
// const router = express.Router();

// // Submit exam answers
// router.post("/exams/:examId/submit", authenticateUser, async (req, res) => {
//   try {
//     if (req.student.role !== "student") {
//       return res.status(403).json({ error: "Only students can submit exams" });
//     }
//     const exam = await Exam.findById(req.params.examId);
//     if (!exam) {
//       return res.status(404).json({ error: "Exam not found" });
//     }
//     const existingResult = await Result.findOne({
//       studentId: req.student.id,
//       examId: req.params.examId,
//     });
//     if (existingResult) {
//       return res.status(400).json({ error: "Exam already submitted" });
//     }
//     const { answers } = req.body;
//     if (!answers || !Array.isArray(answers)) {
//       return res.status(400).json({ error: "Invalid answers format" });
//     }
//     let score = 0;
//     const formattedAnswers = answers.map((answer) => {
//       const question = exam.questions.find((q) => q._id.toString() === answer.questionId);
//       if (!question) {
//         throw new Error(`Question ${answer.questionId} not found`);
//       }
//       const isCorrect = answer.selectedOption === question.correctAnswer;
//       if (isCorrect) score++;
//       return {
//         questionId: answer.questionId,
//         selectedOption: answer.selectedOption,
//         correctAnswer: question.correctAnswer,
//         isCorrect,
//       };
//     });
//     const result = new Result({
//       studentId: req.student.id,
//       examId: req.params.examId,
//       answers: formattedAnswers,
//       score,
//       passed: (score / exam.questions.length) * 100 >= 50,
//     });
//     await result.save();
//     res.json({
//       message: "Exam submitted successfully",
//       resultId: result._id,
//       score,
//       passed: result.passed,
//     });
//   } catch (error) {
//     throw new Error("Failed to submit exam: " + error.message);
//   }
// });


// // Get exam result for a student
// router.get("/results/:examId", authenticateUser, async (req, res) => {
//   try {
//     if (req.student.role !== "student") {
//       return res.status(403).json({ error: "Only students can view their results" });
//     }
//     const result = await Result.findOne({
//       studentId: req.student.id,
//       examId: req.params.examId,
//     })
//       .populate("studentId", "name email")
//       .populate("examId", "title questions");
//     if (!result) {
//       return res.status(404).json({ error: "Result not found" });
//     }
//     const exam = result.examId;
//     const performance = {
//       totalQuestions: exam.questions.length,
//       correctAnswers: result.score,
//       incorrectAnswers: exam.questions.length - result.score,
//       accuracy: ((result.score / exam.questions.length) * 100).toFixed(2) + "%",
//       passed: result.passed,
//     };
//     res.json({
//       message: `🎉 Congratulations! You have ${result.passed ? "passed" : "failed"} the '${exam.title}' with a score of ${performance.accuracy} (${result.score} out of ${exam.questions.length} correct).`,
//       examResult: {
//         resultId: result._id,
//         student: {
//           id: result.studentId._id,
//           name: result.studentId.name,
//           email: result.studentId.email,
//         },
//         exam: {
//           id: exam._id,
//           title: exam.title,
//           totalQuestions: exam.questions.length,
//           correctAnswers: result.score,
//           score: performance.accuracy,
//           status: result.passed ? "Passed ✅" : "Failed ❌",
//         },
//         answers: result.answers.map((answer) => ({
//           questionId: answer.questionId,
//           question: exam.questions.find((q) => q._id.toString() === answer.questionId.toString()).question,
//           selectedOption: answer.selectedOption,
//           correctAnswer: answer.correctAnswer,
//           isCorrect: answer.isCorrect,
//         })),
//         performance,
//         examDate: new Date(result.createdAt).toLocaleDateString(),
//         generatedAt: new Date().toLocaleString(),
//       },
//     });
//   } catch (error) {
//     throw new Error("Failed to fetch result: " + error.message);
//   }
// });


// // Get all exams taken by a student
// router.get("/:studentId/exams", authenticateUser, async (req, res) => {
//   try {
//     if (req.student.id !== req.params.studentId || req.student.role !== "student") {
//       return res.status(403).json({ error: "Access denied" });
//     }
//     const results = await Result.find({ studentId: req.params.studentId })
//       .populate("examId", "title")
//       .lean();
//     const exams = results.map((result) => ({
//       examId: result.examId._id,
//       title: result.examId.title,
//       score: result.score,
//       examDate: new Date(result.createdAt).toLocaleDateString(),
//       passed: result.passed,
//     }));
//     res.json({
//       message: "Student exams fetched successfully",
//       exams,
//     });
//   } catch (error) {
//     throw new Error("Failed to fetch student exams: " + error.message);
//   }
// });

// module.exports = router;



const express = require("express");
const Result = require("../models/Result");
const Exam = require("../models/Exam");
const Student = require("../models/Student");
const AuditLog = require("../models/AuditLog");
const transporter = require("../config/mail");

const router = express.Router();

// Submit exam answers (public)
router.post("/exams/:examId/submit", async (req, res) => {
  try {
    const { name, email, answers } = req.body;
    if (!name || !email || !answers) return res.status(400).json({ error: "Missing required fields" });
    let student = await Student.findOne({ email, role: "student" });
    if (!student) {
      student = new Student({ name, email, role: "student" });
      await student.save();
    }
    const exam = await Exam.findById(req.params.examId).populate("questions");
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const existingResult = await Result.findOne({ studentId: student._id, examId: req.params.examId });
    if (existingResult) return res.status(400).json({ error: "Exam already submitted" });
    let score = 0;
    const formattedAnswers = answers.map((answer) => {
      const question = exam.questions.find((q) => q._id.toString() === answer.questionId);
      if (!question) throw new Error(`Question ${answer.questionId} not found`);
      let isCorrect = false;
      const selectedSorted = [...answer.selectedOptions].sort();
      const correctSorted = [...question.correctAnswers].sort();
      if (question.type === "single") {
        isCorrect = selectedSorted.length === 1 && selectedSorted[0] === correctSorted[0];
      } else {
        isCorrect = selectedSorted.length === correctSorted.length && selectedSorted.every((v, i) => v === correctSorted[i]);
      }
      if (isCorrect) score++;
      return {
        questionId: answer.questionId,
        selectedOptions: answer.selectedOptions,
        isCorrect,
      };
    });
    const result = new Result({
      studentId: student._id,
      examId: req.params.examId,
      answers: formattedAnswers,
      score,
      passed: (score / exam.questions.length) * 100 >= 50,
    });
    await result.save();
    const log = new AuditLog({
      action: "create",
      model: "Result",
      documentId: result._id,
      changes: { studentId: student._id, examId: req.params.examId },
    });
    await log.save();
    // Email notification
    transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: `Your Result for ${exam.title}`,
      text: `You scored ${score} out of ${exam.questions.length}. Passed: ${result.passed ? "Yes" : "No"}.`,
    });
    res.json({ message: "Exam submitted successfully", resultId: result._id });
  } catch (error) {
    throw new Error("Failed to submit exam: " + error.message);
  }
});

// Get exam result by result ID (public)
router.get("/results/:resultId", async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId)
      .populate("studentId", "name email")
      .populate({
        path: "examId",
        populate: { path: "questions" },
      });
    if (!result) return res.status(404).json({ error: "Result not found" });
    const exam = result.examId;
    const performance = {
      totalQuestions: exam.questions.length,
      correctAnswers: result.score,
      incorrectAnswers: exam.questions.length - result.score,
      accuracy: ((result.score / exam.questions.length) * 100).toFixed(2) + "%",
      passed: result.passed,
    };
    res.json({
      message: `🎉 Congratulations! You have ${result.passed ? "passed" : "failed"} the '${exam.title}' with a score of ${performance.accuracy} (${result.score} out of ${exam.questions.length} correct).`,
      examResult: {
        resultId: result._id,
        student: {
          id: result.studentId._id,
          name: result.studentId.name,
          email: result.studentId.email,
        },
        exam: {
          id: exam._id,
          title: exam.title,
          totalQuestions: exam.questions.length,
          correctAnswers: result.score,
          score: performance.accuracy,
          status: result.passed ? "Passed ✅" : "Failed ❌",
        },
        answers: result.answers.map((answer) => ({
          questionId: answer.questionId,
          question: exam.questions.find((q) => q._id.toString() === answer.questionId.toString()).question,
          selectedOptions: answer.selectedOptions,
          correctAnswer: exam.questions.find((q) => q._id.toString() === answer.questionId.toString()).correctAnswers,
          isCorrect: answer.isCorrect,
        })),
        performance,
        examDate: new Date(result.createdAt).toLocaleDateString(),
        generatedAt: new Date().toLocaleString(),
      },
    });
  } catch (error) {
    throw new Error("Failed to fetch result: " + error.message);
  }
});

// Get all exams taken by a student (by email)
router.get("/exams", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const student = await Student.findOne({ email, role: "student" });
    if (!student) return res.json({ exams: [] });
    const results = await Result.find({ studentId: student._id }).populate("examId", "title");
    const exams = results.map((result) => ({
      examId: result.examId._id,
      title: result.examId.title,
      score: result.score,
      examDate: new Date(result.createdAt).toLocaleDateString(),
      passed: result.passed,
      resultId: result._id,
    }));
    res.json({ exams });
  } catch (error) {
    throw new Error("Failed to fetch student exams: " + error.message);
  }
});

module.exports = router;