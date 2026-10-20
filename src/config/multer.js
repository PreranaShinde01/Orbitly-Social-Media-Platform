const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('./env');

const UPLOADS_DIR = path.resolve(__dirname, '../../', env.uploadDir);
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    cb(null, `${timestamp}-${randomHex}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error('Invalid file format. Only JPEG, PNG, WEBP, and GIF images are allowed.');
    error.status = 400;
    return cb(error, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  }
});

module.exports = {
  upload,
  UPLOADS_DIR
};
