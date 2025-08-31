// const mongoose = require("mongoose");

// const ExamSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     questions: [
//       {
//         question: { type: String, required: true },
//         options: [{ type: String, required: true }],
//         correctAnswer: { type: String, required: true },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Exam", ExamSchema);


const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Exam Schema
 * @description Defines the schema for an exam, referencing questions, with soft delete and version history
 */
const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
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

// Text index for faster search on title
ExamSchema.index({ title: "text" });

module.exports = mongoose.model("Exam", ExamSchema);