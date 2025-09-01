const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["single", "multiple"], required: true },
    question: { type: String, required: true, index: true },
    options: [{ type: String, required: true }],
    correctAnswers: [{ type: String, required: true }],
    score: { type: Number, required: true, default: 1 }, // Added score field
    allowedTime: { type: Number, required: true, default: 60 }, // Added allowedTime field in seconds
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

QuestionSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model("Question", QuestionSchema);