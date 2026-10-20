const multer = require('multer');

/**
 * Centralized error handler returning consistent JSON errors
 */
function errorHandler(err, req, res, next) {
  // Prevent sending headers twice
  if (res.headersSent) {
    return next(err);
  }

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum allowed size is 5 MB.' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  // Handle SQLite constraint violations
  if (err && err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ error: 'Resource conflict: a unique constraint was violated.' });
  }
  if (err && err.message && err.message.includes('CHECK constraint failed')) {
    return res.status(400).json({ error: 'Validation constraint violated.' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test' && statusCode === 500) {
    console.error('Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

/**
 * 404 handler for API routes
 */
function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `API route '${req.method} ${req.path}' not found` });
  }
  next();
}

module.exports = {
  errorHandler,
  notFoundHandler
};
