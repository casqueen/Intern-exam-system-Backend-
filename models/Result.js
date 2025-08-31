// const mongoose = require("mongoose");

// const ResultSchema = new mongoose.Schema(
//   {
//     studentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Student",
//       required: true,
//     },
//     examId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Exam",
//       required: true,
//     },
//     answers: [
//       {
//         questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
//         selectedOption: { type: String, required: true }
//       }
//     ],
//     score: { type: Number, required: true },
//     passed: { type: Boolean, required: true },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Result", ResultSchema);

const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Result Schema
 * @description Stores exam results with flexible answer formats and per-question scoring
 */
const ResultSchema = new mongoose.Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        selected: Schema.Types.Mixed, // String, [String], or [{left, right}] for matching
        isCorrect: { type: Boolean, required: true },
        score: { type: Number, required: true },
      },
    ],
    totalScore: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", ResultSchema);