const { getDb } = require('../db/connection');
const queries = require('../db/queries');
const feedService = require('../services/feedService');
const { notifyFollow } = require('../services/notificationService');

function getProfile(req, res, next) {
  try {
    const { username } = req.params;
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    const profile = queries.getUserProfile(db, username, currentUserId);
    if (!profile) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    res.json({
      user: {
        id: profile.user_id,
        username: profile.username,
        display_name: profile.display_name,
        bio: profile.bio,
        avatar_path: profile.avatar_path,
        cover_path: profile.cover_path,
        location: profile.location,
        website: profile.website,
        created_at: profile.created_at,
        stats: {
          posts_count: profile.posts_count,
          followers_count: profile.followers_count,
          following_count: profile.following_count
        },
        is_following: Boolean(profile.is_following),
        is_self: currentUserId === profile.user_id
      }
    });
  } catch (err) {
    next(err);
  }
}

function updateProfile(req, res, next) {
  try {
    const userId = req.session.userId;
    const { display_name, bio, location, website } = req.body;
    const db = getDb();

    const updateData = {};
    if (display_name !== undefined) updateData.display_name = display_name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (location !== undefined) updateData.location = location.trim();
    if (website !== undefined) updateData.website = website.trim();

    // Check for uploaded files
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        updateData.avatar_path = `/uploads/${req.files.avatar[0].filename}`;
      }
      if (req.files.cover && req.files.cover[0]) {
        updateData.cover_path = `/uploads/${req.files.cover[0].filename}`;
      }
    }

    queries.updateProfile(db, userId, updateData);

    const updatedUser = queries.findUserById(db, userId);
    const updatedProfile = queries.getUserProfile(db, updatedUser.username, userId);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedProfile.user_id,
        username: updatedProfile.username,
        display_name: updatedProfile.display_name,
        bio: updatedProfile.bio,
        avatar_path: updatedProfile.avatar_path,
        cover_path: updatedProfile.cover_path,
        location: updatedProfile.location,
        website: updatedProfile.website,
        created_at: updatedProfile.created_at,
        stats: {
          posts_count: updatedProfile.posts_count,
          followers_count: updatedProfile.followers_count,
          following_count: updatedProfile.following_count
        },
        is_self: true
      }
    });
  } catch (err) {
    next(err);
  }
}

function getUserPosts(req, res, next) {
  try {
    const { username } = req.params;
    const currentUserId = req.session ? req.session.userId : null;
    const { page, limit } = req.query;
    const db = getDb();

    const user = queries.findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    const posts = feedService.getUserPosts(db, user.id, { page, limit, currentUserId });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

function getUserLikedPosts(req, res, next) {
  try {
    const { username } = req.params;
    const currentUserId = req.session ? req.session.userId : null;
    const { page, limit } = req.query;
    const db = getDb();

    const user = queries.findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    const posts = feedService.getUserLikedPosts(db, user.id, { page, limit, currentUserId });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

function getFollowers(req, res, next) {
  try {
    const { username } = req.params;
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    const user = queries.findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    const followers = queries.getFollowers(db, user.id, currentUserId);
    res.json({ followers });
  } catch (err) {
    next(err);
  }
}

function getFollowing(req, res, next) {
  try {
    const { username } = req.params;
    const currentUserId = req.session ? req.session.userId : null;
    const db = getDb();

    const user = queries.findUserByUsername(db, username);
    if (!user) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    const following = queries.getFollowing(db, user.id, currentUserId);
    res.json({ following });
  } catch (err) {
    next(err);
  }
}

function followUser(req, res, next) {
  try {
    const followerId = req.session.userId;
    const { username } = req.params;
    const db = getDb();

    const targetUser = queries.findUserByUsername(db, username);
    if (!targetUser) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    if (followerId === targetUser.id) {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }

    queries.followUser(db, followerId, targetUser.id);
    notifyFollow(db, { followerId, followingId: targetUser.id });

    const targetProfile = queries.getUserProfile(db, targetUser.username, followerId);

    res.json({
      message: `You are now following @${targetUser.username}`,
      is_following: true,
      followers_count: targetProfile.followers_count
    });
  } catch (err) {
    next(err);
  }
}

function unfollowUser(req, res, next) {
  try {
    const followerId = req.session.userId;
    const { username } = req.params;
    const db = getDb();

    const targetUser = queries.findUserByUsername(db, username);
    if (!targetUser) {
      return res.status(404).json({ error: `User '@${username}' not found` });
    }

    if (followerId === targetUser.id) {
      return res.status(400).json({ error: 'You cannot unfollow yourself.' });
    }

    queries.unfollowUser(db, followerId, targetUser.id);
    const targetProfile = queries.getUserProfile(db, targetUser.username, followerId);

    res.json({
      message: `Unfollowed @${targetUser.username}`,
      is_following: false,
      followers_count: targetProfile.followers_count
    });
  } catch (err) {
    next(err);
  }
}

function getSuggestions(req, res, next) {
  try {
    const currentUserId = req.session.userId;
    const limit = parseInt(req.query.limit, 10) || 5;
    const db = getDb();

    const suggestions = queries.getSuggestedUsers(db, currentUserId, limit);
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getUserPosts,
  getUserLikedPosts,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getSuggestions
};
