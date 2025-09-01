const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedOptions: [{ type: String, required: true }],
        isCorrect: { type: Boolean, required: true },
        questionScore: { type: Number, required: true }, // Added to store individual question score
      },
    ],
    score: { type: Number, required: true },
    totalPossibleScore: { type: Number, required: true }, // Added to store total possible score
    passed: { type: Boolean, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ResultSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model("Result", ResultSchema);