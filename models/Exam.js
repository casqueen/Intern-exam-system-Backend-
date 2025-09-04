const mongoose = require("mongoose");
const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    isDeleted: { type: Boolean, default: false },
    isRandom: { type: Boolean, default: false },
  },
  { timestamps: true }
);
ExamSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});
module.exports = mongoose.model("Exam", ExamSchema);