const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: function () { return this.role === "admin"; } },
    role: { type: String, enum: ["admin", "student"], required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

StudentSchema.pre(/^find/, function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

module.exports = mongoose.model("Student", StudentSchema);