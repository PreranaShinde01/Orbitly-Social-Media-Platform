const bcrypt = require('bcryptjs');
const { getDb } = require('../db/connection');
const queries = require('../db/queries');

const BCRYPT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const { username, email, password, display_name } = req.body;
    const db = getDb();

    // Check if username already exists
    const existingUser = queries.findUserByUsername(db, username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    // Check if email already exists
    const existingEmail = queries.findUserByEmail(db, email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // Hash password with 12 rounds
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const userId = queries.createUser(db, {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      display_name: (display_name && display_name.trim()) || username.trim()
    });

    // Automatically establish session
    req.session.userId = userId;
    req.session.username = username.trim();

    const userProfile = queries.getUserProfile(db, username.trim(), userId);

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: userId,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        display_name: userProfile ? userProfile.display_name : username.trim(),
        avatar_path: userProfile ? userProfile.avatar_path : ''
      }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password, rememberMe } = req.body;
    const db = getDb();

    const user = queries.findUserByIdentifier(db, identifier.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    // Configure session longevity
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    const profile = queries.getUserProfile(db, user.username, user.id);

    return res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: profile ? profile.display_name : user.username,
        avatar_path: profile ? profile.avatar_path : ''
      }
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('orbitly.sid');
    res.json({ message: 'Logged out successfully' });
  });
}

async function changePassword(req, res, next) {
  try {
    const userId = req.session.userId;
    const { currentPassword, newPassword } = req.body;
    const db = getDb();

    const user = queries.findUserById(db, userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userWithHash = queries.findUserByUsername(db, user.username);
    const isValid = await bcrypt.compare(currentPassword, userWithHash.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    queries.updateUserPassword(db, userId, newHash);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
}

function getMe(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = getDb();
    const user = queries.findUserById(db, req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const profile = queries.getUserProfile(db, user.username, user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: profile ? profile.display_name : user.username,
        avatar_path: profile ? profile.avatar_path : '',
        bio: profile ? profile.bio : '',
        created_at: user.created_at
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  changePassword,
  getMe
};
