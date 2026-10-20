const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'orbitly-dev-secret-replace-in-prod',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  isProd: process.env.NODE_ENV === 'production',
};
