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
  const exam = await Exam.findById(req.params.examId).populate("questionIds");
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const existingResult = await Result.findOne({ studentId: student._id, examId: req.params.examId });
    if (existingResult) return res.status(400).json({ error: "Exam already submitted" });
    let score = 0;
    let totalPossibleScore = 0;
    const formattedAnswers = answers.map((answer) => {
      const question = exam.questionIds.find((q) => q._id.toString() === answer.questionId);
      if (!question) throw new Error(`Question ${answer.questionId} not found`);
      totalPossibleScore += question.score;
      let isCorrect = false;
      const selectedSorted = [...answer.selectedOptions].sort();
      const correctSorted = [...question.correctAnswers].sort();
      if (question.type === "single") {
        isCorrect = selectedSorted.length === 1 && selectedSorted[0] === correctSorted[0];
      } else {
        isCorrect = selectedSorted.length === correctSorted.length && selectedSorted.every((v, i) => v === correctSorted[i]);
      }
      if (isCorrect) score += question.score;
      return {
        questionId: answer.questionId,
        selectedOptions: answer.selectedOptions,
        isCorrect,
        questionScore: question.score,
      };
    });
    const result = new Result({
      studentId: student._id,
      examId: req.params.examId,
      answers: formattedAnswers,
      score,
      totalPossibleScore,
      passed: (score / totalPossibleScore) * 100 >= 50,
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
      text: `You scored ${score} out of ${totalPossibleScore}. Passed: ${result.passed ? "Yes" : "No"}.`,
    });
    res.json({ message: "Exam submitted successfully", resultId: result._id });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit exam: " + error.message });
  }
});

// Get exam result by result ID (public)
router.get("/results/:resultId", async (req, res) => {
  try {
    const result = await Result.findById(req.params.resultId)
      .populate("studentId", "name email")
      .populate({
        path: "examId",
        populate: { path: "questionIds" },
      });
    if (!result) return res.status(404).json({ error: "Result not found" });
    const exam = result.examId;
    const performance = {
      totalQuestions: result.answers.length,
      correctAnswers: result.answers.filter((a) => a.isCorrect).length,
      incorrectAnswers: result.answers.length - result.answers.filter((a) => a.isCorrect).length,
      score: result.score,
      totalPossibleScore: result.totalPossibleScore,
      accuracy: ((result.score / result.totalPossibleScore) * 100).toFixed(2) + "%",
      passed: result.passed,
    };
    // safe question lookup in populated exam
    const findQuestion = (qid) => {
      try {
        if (!exam || !exam.questionIds) return null;
        return exam.questionIds.find((q) => q && q._id && q._id.toString() === qid.toString()) || null;
      } catch (e) {
        return null;
      }
    };

    res.json({
      message: `🎉 Congratulations! You have ${result.passed ? "passed" : "failed"} the '${exam ? exam.title : "exam"}' with a score of ${performance.accuracy} (${result.score} out of ${performance.totalPossibleScore} points).`,
      examResult: {
        resultId: result._id,
        student: {
          id: result.studentId?._id,
          name: result.studentId?.name,
          email: result.studentId?.email,
        },
        exam: {
          id: exam?._id,
          title: exam?.title,
          totalQuestions: performance.totalQuestions,
          correctAnswers: performance.correctAnswers,
          score: performance.accuracy,
          status: result.passed ? "Passed ✅" : "Failed ❌",
        },
        answers: result.answers.map((answer) => {
          const q = findQuestion(answer.questionId);
          return {
            questionId: answer.questionId,
            question: q ? q.question : null,
            selectedOptions: answer.selectedOptions,
            correctAnswer: q ? q.correctAnswers : [],
            isCorrect: answer.isCorrect,
            questionScore: answer.questionScore,
          };
        }),
        performance,
        examDate: new Date(result.createdAt).toLocaleDateString(),
        generatedAt: new Date().toLocaleString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch result: " + error.message });
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
      totalPossibleScore: result.totalPossibleScore,
      examDate: new Date(result.createdAt).toLocaleDateString(),
      passed: result.passed,
      resultId: result._id,
    }));
    res.json({ exams });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student exams: " + error.message });
  }
});

module.exports = router;