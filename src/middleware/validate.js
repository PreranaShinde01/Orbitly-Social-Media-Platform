const { validationResult } = require('express-validator');

/**
 * Middleware that inspects validation results from express-validator
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(422).json({
      error: errorList[0].msg,
      errors: errorList
    });
  }
  next();
}

module.exports = {
  validate
};
