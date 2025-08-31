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
const Question = require("../models/Question");
const nodemailer = require("nodemailer");
const { authenticateUser } = require("../middleware/authMiddleware");
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
 * @route POST /api/v1/student/exams/:examId/submit
 * @desc Submit exam answers
 * @access Student
 */
router.post("/exams/:examId/submit", authenticateUser, async (req, res) => {
  try {
    if (req.student.role !== "student") {
      return res.status(403).json({ error: "Only students can submit exams" });
    }
    const exam = await Exam.findById(req.params.examId).populate("questions");
    if (!exam || exam.isDeleted) {
      return res.status(404).json({ error: "Exam not found" });
    }
    const existingResult = await Result.findOne({
      studentId: req.student.id,
      examId: req.params.examId,
    });
    if (existingResult) {
      return res.status(400).json({ error: "Exam already submitted" });
    }
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Invalid answers format" });
    }

    let totalScore = 0;
    const formattedAnswers = answers.map((answer) => {
      const question = exam.questions.find((q) => q._id.toString() === answer.questionId);
      if (!question) {
        throw new Error(`Question ${answer.questionId} not found`);
      }
      let isCorrect = false;
      let score = 0;

      if (question.type === "mcq-single" || question.type === "true-false") {
        isCorrect = answer.selected === question.correctAnswers[0];
        score = isCorrect ? question.points : 0;
      } else if (question.type === "mcq-multiple") {
        const selected = Array.isArray(answer.selected) ? answer.selected : [answer.selected];
        isCorrect = selected.length === question.correctAnswers.length &&
          selected.every((s) => question.correctAnswers.includes(s));
        score = isCorrect ? question.points : 0;
      } else if (question.type === "fill-blank") {
        isCorrect = answer.selected.toLowerCase() === question.blankAnswer.toLowerCase();
        score = isCorrect ? question.points : 0;
      } else if (question.type === "short-answer") {
        const keywords = question.keywords.map((k) => k.toLowerCase());
        const matches = keywords.filter((k) => answer.selected.toLowerCase().includes(k)).length;
        isCorrect = matches >= keywords.length / 2;
        score = isCorrect ? question.points : 0;
      } else if (question.type === "matching") {
        const selected = answer.selected || [];
        isCorrect = selected.length === question.correctMatches.length &&
          selected.every((s, i) => s.left === question.correctMatches[i].left && s.right === question.correctMatches[i].right);
        score = isCorrect ? question.points : 0;
      }

      totalScore += score;
      return { questionId: answer.questionId, selected: answer.selected, isCorrect, score };
    });

    const result = new Result({
      studentId: req.student.id,
      examId: req.params.examId,
      answers: formattedAnswers,
      totalScore,
      passed: (totalScore / exam.questions.reduce((sum, q) => sum + q.points, 0)) * 100 >= 50,
    });
    await result.save();

    await transporter.sendMail({
      to: req.student.email,
      subject: `Exam Result: ${exam.title}`,
      html: `<p>You scored ${totalScore} points (${((totalScore / exam.questions.reduce((sum, q) => sum + q.points, 0)) * 100).toFixed(2)}%) in "${exam.title}".</p>`,
    });

    res.json({
      message: "Exam submitted successfully",
      resultId: result._id,
      totalScore,
      passed: result.passed,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit exam: " + error.message });
  }
});

/**
 * @route GET /api/v1/student/results/:examId
 * @desc Get exam result for a student
 * @access Student
 */
router.get("/results/:examId", authenticateUser, async (req, res) => {
  try {
    if (req.student.role !== "student") {
      return res.status(403).json({ error: "Only students can view their results" });
    }
    const result = await Result.findOne({
      studentId: req.student.id,
      examId: req.params.examId,
      isDeleted: false,
    })
      .populate("studentId", "name email")
      .populate({
        path: "examId",
        populate: { path: "questions" },
      });
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }
    const exam = result.examId;
    const maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);
    const performance = {
      totalQuestions: exam.questions.length,
      correctAnswers: result.answers.filter((a) => a.isCorrect).length,
      incorrectAnswers: exam.questions.length - result.answers.filter((a) => a.isCorrect).length,
      accuracy: ((result.totalScore / maxScore) * 100).toFixed(2) + "%",
      passed: result.passed,
    };
    res.json({
      message: `🎉 You ${result.passed ? "passed" : "failed"} the '${exam.title}' with ${performance.accuracy}.`,
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
          totalScore: result.totalScore,
          maxScore,
          status: result.passed ? "Passed ✅" : "Failed ❌",
        },
        answers: result.answers.map((answer) => ({
          questionId: answer.questionId,
          question: exam.questions.find((q) => q._id.toString() === answer.questionId.toString()).text,
          selected: answer.selected,
          isCorrect: answer.isCorrect,
          score: answer.score,
        })),
        performance,
        examDate: new Date(result.createdAt).toLocaleDateString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch result: " + error.message });
  }
});

/**
 * @route GET /api/v1/student/:studentId/exams
 * @desc Get all exams taken by a student
 * @access Student
 */
router.get("/:studentId/exams", authenticateUser, async (req, res) => {
  try {
    if (req.student.id !== req.params.studentId || req.student.role !== "student") {
      return res.status(403).json({ error: "Access denied" });
    }
    const results = await Result.find({ studentId: req.params.studentId, isDeleted: false })
      .populate("examId", "title")
      .lean();
    const exams = results.map((result) => ({
      examId: result.examId._id,
      title: result.examId.title,
      totalScore: result.totalScore,
      examDate: new Date(result.createdAt).toLocaleDateString(),
      passed: result.passed,
    }));
    res.json({ message: "Student exams fetched successfully", exams });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student exams: " + error.message });
  }
});

module.exports = router;