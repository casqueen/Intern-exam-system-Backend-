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
      return res.status(400).json({ errors: formattedErrors });
    }
    next();
  };
};
// **Optimized Password Validation**
const passwordValidation = Joi.string()
  .required()
  .messages({ "any.required": "Password is required" })
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, "password")
  .messages({
    "string.pattern.name":
      "Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&).",
  });
// **Register Schema**
const registerSchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "Name is required",
    "string.empty": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: passwordValidation,
  // UPDATED: Made role required and validated against valid values (previously optional)
  role: Joi.string().required().valid("admin", "student").messages({
    "any.required": "Role is required",
    "string.valid": "Invalid role. Must be 'admin' or 'student'",
  }),
});
// **Login Schema**
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: passwordValidation,
  // UPDATED: Added role to login schema as required
  role: Joi.string().required().valid("admin", "student").messages({
    "any.required": "Role is required",
    "string.valid": "Invalid role. Must be 'admin' or 'student'",
  }),
});
// update student
const updateStudentSchema = Joi.object({
  name: Joi.string().optional().messages({
    "string.empty": "Name is optional",
  }),
  email: Joi.string().email().optional().messages({
    "string.email": "Invalid email format",
  }),
});
// **Validation Middleware Functions**
const registerValidation = validateRequest(registerSchema);
const loginValidation = validateRequest(loginSchema);
const updateStudentValidation = validateRequest(updateStudentSchema);
// **Export Validations**
module.exports = { registerValidation, loginValidation, updateStudentValidation };