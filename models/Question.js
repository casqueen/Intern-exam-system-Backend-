const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Question Schema
 * @description Defines the schema for questions supporting multiple types, images, soft deletes, and version history
 */
const QuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq-single", "mcq-multiple", "true-false", "fill-blank", "short-answer", "matching"],
      required: true,
    },
    text: { type: String, required: true },
    options: [{ type: String }], // For MCQ single/multiple, True/False
    correctAnswers: [{ type: String }], // Array for single/multiple correct answers
    blankAnswer: { type: String }, // For Fill-in-the-Blank
    keywords: [{ type: String }], // For Short Answer semi-grading
    matchingLeft: [{ type: String }], // For Matching (left side)
    matchingRight: [{ type: String }], // For Matching (right side)
    correctMatches: [{ left: String, right: String }], // For Matching correct pairs
    image: { type: String }, // URL to uploaded image
    points: { type: Number, default: 1, min: 1 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "Student" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Student" },
    versions: [
      {
        date: { type: Date, default: Date.now },
        changes: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

// Text index for faster search on question text
QuestionSchema.index({ text: "text" });

module.exports = mongoose.model("Question", QuestionSchema);