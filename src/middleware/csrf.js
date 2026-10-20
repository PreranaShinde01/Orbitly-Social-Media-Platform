const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

function csrfMiddleware(req, res, next) {
  // Ensure the client has a CSRF token cookie
  let token = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by client JS to send in X-CSRF-Token header
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });
  }

  // Exempt safe HTTP methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Allow bypass in test mode if explicitly configured
  if (process.env.NODE_ENV === 'test' && process.env.DISABLE_CSRF === 'true') {
    return next();
  }

  // Validate double-submit cookie
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toLowerCase()];
  if (!headerToken || !token || headerToken !== token) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token. Please refresh the page and try again.'
    });
  }

  next();
}

module.exports = {
  csrfMiddleware,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
