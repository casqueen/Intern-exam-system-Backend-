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

// **Validation Middleware**
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

// **Optimized Password Validation**
const passwordValidation = Joi.string()
  .required()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, "password")
  .messages({
    "string.pattern.name":
      "Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&).",
  });

// **Register Schema**
const registerSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "any.required": "Name is required",
    "string.empty": "Name is required",
  }),
  email: Joi.string().email().trim().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: passwordValidation,
  role: Joi.string().required().valid("admin", "student").messages({
    "any.required": "Role is required",
    "string.valid": "Invalid role. Must be 'admin' or 'student'",
  }),
});

// **Login Schema**
const loginSchema = Joi.object({
  email: Joi.string().email().trim().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: passwordValidation,
  role: Joi.string().required().valid("admin", "student").messages({
    "any.required": "Role is required",
    "string.valid": "Invalid role. Must be 'admin' or 'student'",
  }),
});

// **Create/Update Exam Schema** (UPDATED: Added trim() to strings for robustness)
const createExamSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "any.required": "Exam title is required",
  }),
  questions: Joi.array()
    .min(1)
    .items(
      Joi.object({
        question: Joi.string().trim().required().messages({
          "any.required": "Question is required",
        }),
        options: Joi.array()
          .min(2)
          .items(Joi.string().trim().required())
          .messages({
            "array.min": "At least two options are required",
            "string.empty": "Option cannot be empty",
          }),
        correctAnswer: Joi.string()
          .trim()
          .required()
          .custom((value, helpers) => {
            const options = helpers.state.ancestors[0].options;
            if (!options.includes(value)) {
              return helpers.error("any.invalid");
            }
            return value;
          })
          .messages({
            "any.required": "Correct answer is required",
            "any.invalid": "Correct answer must be one of the provided options",
          }),
      })
    )
    .messages({
      "array.min": "At least one question is required",
    }),
});

// update student
const updateStudentSchema = Joi.object({
  name: Joi.string().trim().optional().messages({
    "string.empty": "Name is optional",
  }),
  email: Joi.string().email().trim().optional().messages({
    "string.email": "Invalid email format",
  }),
});

// **Validation Middleware Functions**
const registerValidation = validateRequest(registerSchema);
const loginValidation = validateRequest(loginSchema);
const updateStudentValidation = validateRequest(updateStudentSchema);
const createExamValidation = validateRequest(createExamSchema);

module.exports = {
  registerValidation,
  loginValidation,
  updateStudentValidation,
  createExamValidation,
};