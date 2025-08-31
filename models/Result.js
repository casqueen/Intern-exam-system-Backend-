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
      },
    ],
    score: { type: Number, required: true },
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