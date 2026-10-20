const path = require('path');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./src/config/env');
const { initDb } = require('./src/db/connection');
const { createSessionMiddleware } = require('./src/config/session');
const { csrfMiddleware } = require('./src/middleware/csrf');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const postRoutes = require('./src/routes/postRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const searchRoutes = require('./src/routes/searchRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');

const app = express();

// Initialize Database on startup
initDb();

// Security Headers with tailored Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Logging
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers & Cookies
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Sessions (SQLite backed)
app.use(createSessionMiddleware());

// CSRF Double Submit Cookie & Header validation
app.use(csrfMiddleware);

// General API rate limiter (300 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test'
});
app.use('/api', apiLimiter);

// Serve Static Assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 for unhandled API routes
app.use(notFoundHandler);

// Catch-all SPA route: serve index.html for any client navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

// Start server when run directly
if (require.main === module) {
  const _server = app.listen(env.port, () => {
    console.log(`🚀 Orbitly server is orbiting at http://localhost:${env.port}`);
  });
}

module.exports = app;
