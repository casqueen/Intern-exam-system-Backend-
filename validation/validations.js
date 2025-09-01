const Joi = require("joi");

const validateRequest = (schema) => (req, res, next) => {
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

const passwordValidation = Joi.string()
  .required()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
  .messages({
    "string.pattern.base":
      "Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&).",
  });

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: passwordValidation,
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: passwordValidation,
});

const updateStudentSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
});

const createExamSchema = Joi.object({
  title: Joi.string().required(),
  questionIds: Joi.array().items(Joi.string().required()).min(1).required(),
});

const createQuestionSchema = Joi.object({
  type: Joi.string().valid("single", "multiple").required(),
  question: Joi.string().required(),
  options: Joi.array().items(Joi.string().required()).min(2).required(),
  correctAnswers: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
    .custom((value, helpers) => {
      const options = helpers.state.ancestors[0].options;
      if (!value.every((v) => options.includes(v))) {
        return helpers.error("any.invalid");
      }
      const type = helpers.state.ancestors[0].type;
      if (type === "single" && value.length !== 1) {
        return helpers.error("array.length");
      }
      return value;
    })
    .messages({
      "any.invalid": "Correct answers must be from the provided options",
      "array.length": "Single choice questions must have exactly one correct answer",
    }),
  score: Joi.number().min(1).required().messages({
    "number.base": "Score must be a number",
    "number.min": "Score must be at least 1",
    "any.required": "Score is required",
  }),
  allowedTime: Joi.number().min(10).required().messages({
    "number.base": "Allowed time must be a number",
    "number.min": "Allowed time must be at least 10 seconds",
    "any.required": "Allowed time is required",
  }),
});

module.exports = {
  registerValidation: validateRequest(registerSchema),
  loginValidation: validateRequest(loginSchema),
  updateStudentValidation: validateRequest(updateStudentSchema),
  createExamValidation: validateRequest(createExamSchema),
  createQuestionValidation: validateRequest(createQuestionSchema),
};