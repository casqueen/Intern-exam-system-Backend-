// const Joi = require("joi");

// // **Validation Middleware**
// const validateRequest = (schema) => {
//   return (req, res, next) => {
//     const { error } = schema.validate(req.body, { abortEarly: false });
//     if (error) {
//       const formattedErrors = error.details.reduce((acc, curr) => {
//         acc[curr.path.join(".")] = curr.message;
//         return acc;
//       }, {});
//       // return res.status(400).json({ error: "Validation failed", details: formattedErrors });
//     }
//     next();
//   };
// };


// // **Optimized Password Validation**
// const passwordValidation = Joi.string()
//   .required()  
//   .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, "password")
//   .messages({
//     "string.pattern.name":
//       "Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&).",
//   });


// // **Register Schema**
// const registerSchema = Joi.object({
//   name: Joi.string().required().messages({
//     "any.required": "Name is required",
//     "string.empty": "Name is required",
//   }),
//   email: Joi.string().email().required().messages({
//     "string.email": "Invalid email format",
//     "any.required": "Email is required",
//   }),
//   password: passwordValidation,
//   role: Joi.string().required().valid("admin", "student").messages({
//     "any.required": "Role is required",
//     "string.valid": "Invalid role. Must be 'admin' or 'student'",
//   }),
// });


// // **Login Schema**
// const loginSchema = Joi.object({
//   email: Joi.string().email().required().messages({
//     "string.email": "Invalid email format",
//     "any.required": "Email is required",
//   }),
//   password: passwordValidation,
//   role: Joi.string().required().valid("admin", "student").messages({
//     "any.required": "Role is required",
//     "string.valid": "Invalid role. Must be 'admin' or 'student'",
//   }),
// });


// // **Create/Update Exam Schema** (UPDATED: Added for exam validation)
// const createExamSchema = Joi.object({
//   title: Joi.string().required().messages({
//     "any.required": "Exam title is required",
//   }),
//   questions: Joi.array()
//     .min(1)
//     .items(
//       Joi.object({
//         question: Joi.string().required().messages({
//           "any.required": "Question is required",
//         }),
//         options: Joi.array()
//           .min(2)
//           .items(Joi.string().required())
//           .messages({
//             "array.min": "At least two options are required",
//             "string.empty": "Option cannot be empty",
//           }),
//         correctAnswer: Joi.string()
//           .required()
//           .custom((value, helpers) => {
//             const options = helpers.state.ancestors[0].options;
//             if (!options.includes(value)) {
//               return helpers.error("any.invalid");
//             }
//             return value;
//           })
//           .messages({
//             "any.required": "Correct answer is required",
//             "any.invalid": "Correct answer must be one of the provided options",
//           }),
//       })
//     )
//     .messages({
//       "array.min": "At least one question is required",
//     }),
// });


// // update student
// const updateStudentSchema = Joi.object({
//   name: Joi.string().optional().messages({
//     "string.empty": "Name is optional",
//   }),
//   email: Joi.string().email().optional().messages({
//     "string.email": "Invalid email format",
//   }),
// });


// // **Validation Middleware Functions**
// const registerValidation = validateRequest(registerSchema);
// const loginValidation = validateRequest(loginSchema);
// const updateStudentValidation = validateRequest(updateStudentSchema);
// const createExamValidation = validateRequest(createExamSchema); //  Added exam validation


// // **Export Validations**
// module.exports = {
//   registerValidation,
//   loginValidation,
//   updateStudentValidation,
//   createExamValidation,
// };




const Joi = require("joi");

/**
 * Validation Middleware
 * @description Validates request body against a Joi schema
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const formattedErrors = error.details.reduce((acc, curr) => {
        acc[curr.path.join(".")] = curr.message;
        return acc;
      }, {});
      return res.status(400).json({ error: "Validation failed", details: formattedErrors });
    }
    next();
  };
};

/**
 * Password Validation
 * @description Ensures password meets complexity requirements
 */
const passwordValidation = Joi.string()
  .required()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
  .messages({
    "string.pattern.base":
      "Password must be at least 8 characters long and include one lowercase, one uppercase, one number, and one special character (@$!%*?&).",
  });

/**
 * Register Schema
 */
const registerSchema = Joi.object({
  name: Joi.string().required().messages({ "any.required": "Name is required" }),
  email: Joi.string().email().required().messages({ "string.email": "Invalid email format" }),
  password: passwordValidation,
  role: Joi.string().required().valid("admin", "student").messages({
    "any.required": "Role is required",
    "string.valid": "Invalid role. Must be 'admin' or 'student'",
  }),
});

/**
 * Login Schema
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({ "string.email": "Invalid email format" }),
  password: passwordValidation,
  role: Joi.string().required().valid("admin", "student").messages({
    "any.required": "Role is required",
    "string.valid": "Invalid role. Must be 'admin' or 'student'",
  }),
});

/**
 * Question Schema
 */
const questionSchema = Joi.object({
  type: Joi.string()
    .required()
    .valid("mcq-single", "mcq-multiple", "true-false", "fill-blank", "short-answer", "matching")
    .messages({ "any.required": "Question type is required" }),
  text: Joi.string().required().messages({ "any.required": "Question text is required" }),
  options: Joi.when("type", {
    is: Joi.string().valid("mcq-single", "mcq-multiple", "true-false"),
    then: Joi.array().min(2).items(Joi.string().required()).required(),
    otherwise: Joi.array().optional(),
  }).messages({ "array.min": "At least two options required for MCQ/True-False" }),
  correctAnswers: Joi.when("type", {
    is: Joi.string().valid("mcq-single", "mcq-multiple", "true-false"),
    then: Joi.array().items(Joi.string().required()).min(1).required(),
    otherwise: Joi.array().optional(),
  }).messages({ "array.min": "At least one correct answer required" }),
  blankAnswer: Joi.when("type", {
    is: "fill-blank",
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }).messages({ "any.required": "Blank answer required for fill-in-the-blank" }),
  keywords: Joi.when("type", {
    is: "short-answer",
    then: Joi.array().items(Joi.string().required()).min(1).required(),
    otherwise: Joi.array().optional(),
  }).messages({ "array.min": "At least one keyword required for short answer" }),
  matchingLeft: Joi.when("type", {
    is: "matching",
    then: Joi.array().items(Joi.string().required()).min(1).required(),
    otherwise: Joi.array().optional(),
  }).messages({ "array.min": "At least one left item required for matching" }),
  matchingRight: Joi.when("type", {
    is: "matching",
    then: Joi.array().items(Joi.string().required()).min(1).required(),
    otherwise: Joi.array().optional(),
  }).messages({ "array.min": "At least one right item required for matching" }),
  correctMatches: Joi.when("type", {
    is: "matching",
    then: Joi.array()
      .items(Joi.object({ left: Joi.string().required(), right: Joi.string().required() }))
      .min(1)
      .required(),
    otherwise: Joi.array().optional(),
  }).messages({ "array.min": "At least one correct match required" }),
  points: Joi.number().min(1).default(1),
});

/**
 * Create/Update Exam Schema
 */
const createExamSchema = Joi.object({
  title: Joi.string().required().messages({ "any.required": "Exam title is required" }),
  questionIds: Joi.array().items(Joi.string().required()).min(1).required().messages({
    "array.min": "At least one question is required",
  }),
});

/**
 * Update Student Schema
 */
const updateStudentSchema = Joi.object({
  name: Joi.string().optional().messages({ "string.empty": "Name is optional" }),
  email: Joi.string().email().optional().messages({ "string.email": "Invalid email format" }),
});

// Validation Middleware Functions
const registerValidation = validateRequest(registerSchema);
const loginValidation = validateRequest(loginSchema);
const createQuestionValidation = validateRequest(questionSchema);
const createExamValidation = validateRequest(createExamSchema);
const updateStudentValidation = validateRequest(updateStudentSchema);

module.exports = {
  registerValidation,
  loginValidation,
  createQuestionValidation,
  createExamValidation,
  updateStudentValidation,
};