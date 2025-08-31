// const mongoose = require("mongoose");

// const StudentSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     role: { type: String, enum: ["admin", "student"], required: true },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Student", StudentSchema);


const mongoose = require("mongoose");

/**
 * Student Schema
 * @description Defines user accounts with soft delete support
 */
const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);