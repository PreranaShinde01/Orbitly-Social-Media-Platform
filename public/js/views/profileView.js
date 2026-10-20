import { api } from '../api.js';
import { createPostCard } from '../components/postCard.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export async function renderProfileView(container, username, currentUser) {
  container.innerHTML = `
    <div class="skeleton-card" style="height: 320px;">
      <div class="skeleton skeleton-line long"></div>
      <div class="skeleton skeleton-avatar" style="width: 80px; height: 80px; margin-top: 40px;"></div>
    </div>
  `;

  try {
    const res = await api.getUserProfile(username);
    const user = res.user;
    let activeTab = 'posts';

    renderProfileCard(container, user, currentUser, activeTab);
  } catch (err) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 12px;">🛸</div>
        <h3 style="margin-bottom: 8px;">User not found</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">The user @${escapeHtml(username)} doesn't exist or is lost in deep space.</p>
        <a href="/" class="btn btn-primary" data-nav>Return Home</a>
      </div>
    `;
  }
}

function renderProfileCard(container, user, currentUser, activeTab) {
  const isOwner = currentUser && currentUser.id === user.id;
  const joinDateFormatted = formatJoinDate(user.created_at);

  container.innerHTML = `
    <!-- Profile Banner & Info Card -->
    <div class="profile-card">
      <div class="profile-cover">
        ${user.cover_path ? `<img src="${user.cover_path}" alt="Cover image">` : ''}
      </div>

      <div class="profile-info-container">
        <div class="profile-avatar-row">
          <img src="${user.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(user.display_name)}" class="profile-avatar-large">
          
          <div>
            ${isOwner ? `
              <button id="btn-edit-profile" class="btn btn-outline" style="font-weight: 700;">Edit Profile</button>
            ` : currentUser ? `
              <button id="btn-follow-profile" class="btn btn-follow ${user.is_following ? 'following' : 'btn-primary'}">
                ${user.is_following ? 'Following' : 'Follow'}
              </button>
            ` : `
              <a href="/login" class="btn btn-primary" data-nav>Follow</a>
            `}
          </div>
        </div>

        <h1 class="profile-details-name">${escapeHtml(user.display_name)}</h1>
        <div class="profile-handle">@${escapeHtml(user.username)}</div>

        ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : ''}

        <div class="profile-meta-row">
          ${user.location ? `
            <div class="profile-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${escapeHtml(user.location)}</span>
            </div>
          ` : ''}

          ${user.website ? `
            <div class="profile-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <a href="${escapeHtml(user.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(user.website.replace(/^https?:\/\//, ''))}</a>
            </div>
          ` : ''}

          <div class="profile-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Joined ${joinDateFormatted}</span>
          </div>
        </div>

        <div class="profile-stats-row">
          <span class="stat-link" id="stat-posts">
            <strong id="stat-count-posts">${user.stats.posts_count || 0}</strong> Posts
          </span>
          <span class="stat-link" id="stat-followers">
            <strong id="stat-count-followers">${user.stats.followers_count || 0}</strong> Followers
          </span>
          <span class="stat-link" id="stat-following">
            <strong id="stat-count-following">${user.stats.following_count || 0}</strong> Following
          </span>
        </div>
      </div>
    </div>

    <!-- Profile Tabs -->
    <div class="profile-tabs">
      <div class="profile-tab ${activeTab === 'posts' ? 'active' : ''}" data-tab="posts">Posts</div>
      <div class="profile-tab ${activeTab === 'liked' ? 'active' : ''}" data-tab="liked">Liked Posts</div>
      <div class="profile-tab ${activeTab === 'followers' ? 'active' : ''}" data-tab="followers">Followers</div>
      <div class="profile-tab ${activeTab === 'following' ? 'active' : ''}" data-tab="following">Following</div>
    </div>

    <!-- Tab Content Stream -->
    <div id="profile-tab-stream"></div>
  `;

  // Attach Follow/Unfollow Button Handler
  const followBtn = container.querySelector('#btn-follow-profile');
  if (followBtn) {
    let isFollowing = user.is_following;
    let followersCount = user.stats.followers_count;
    let inProgress = false;

    followBtn.onclick = async () => {
      if (inProgress) return;
      inProgress = true;

      const prevFollowing = isFollowing;
      const prevCount = followersCount;

      isFollowing = !isFollowing;
      followersCount = isFollowing ? followersCount + 1 : Math.max(0, followersCount - 1);

      followBtn.className = `btn btn-follow ${isFollowing ? 'following' : 'btn-primary'}`;
      followBtn.textContent = isFollowing ? 'Following' : 'Follow';
      container.querySelector('#stat-count-followers').textContent = followersCount;

      try {
        if (isFollowing) {
          const res = await api.followUser(user.username);
          followersCount = res.followers_count;
          container.querySelector('#stat-count-followers').textContent = followersCount;
          showToast(`Now following @${user.username}`, 'success');
        } else {
          const res = await api.unfollowUser(user.username);
          followersCount = res.followers_count;
          container.querySelector('#stat-count-followers').textContent = followersCount;
          showToast(`Unfollowed @${user.username}`, 'info');
        }
      } catch (err) {
        // Rollback
        isFollowing = prevFollowing;
        followersCount = prevCount;
        followBtn.className = `btn btn-follow ${isFollowing ? 'following' : 'btn-primary'}`;
        followBtn.textContent = isFollowing ? 'Following' : 'Follow';
        container.querySelector('#stat-count-followers').textContent = followersCount;
        showToast(err.message, 'error');
      } finally {
        inProgress = false;
      }
    };
  }

  // Attach Edit Profile Modal Handler
  const editProfileBtn = container.querySelector('#btn-edit-profile');
  if (editProfileBtn) {
    editProfileBtn.onclick = () => {
      openEditProfileModal(user, (updatedUser) => {
        user.display_name = updatedUser.display_name;
        user.bio = updatedUser.bio;
        user.location = updatedUser.location;
        user.website = updatedUser.website;
        if (updatedUser.avatar_path) user.avatar_path = updatedUser.avatar_path;
        if (updatedUser.cover_path) user.cover_path = updatedUser.cover_path;

        // Refresh view & broadcast
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: user }));
        renderProfileCard(container, user, currentUser, activeTab);
      });
    };
  }

  // Attach Tab Clicks
  const tabElements = container.querySelectorAll('.profile-tab');
  tabElements.forEach(tab => {
    tab.onclick = () => {
      tabElements.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      loadTabContent(container, user, currentUser, activeTab);
    };
  });

  // Stat link clicks switch tabs
  container.querySelector('#stat-posts').onclick = () => container.querySelector('.profile-tab[data-tab="posts"]').click();
  container.querySelector('#stat-followers').onclick = () => container.querySelector('.profile-tab[data-tab="followers"]').click();
  container.querySelector('#stat-following').onclick = () => container.querySelector('.profile-tab[data-tab="following"]').click();

  // Load initial active tab
  loadTabContent(container, user, currentUser, activeTab);
}

async function loadTabContent(container, user, currentUser, tab) {
  const stream = container.querySelector('#profile-tab-stream');
  stream.innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line long"></div>
    </div>
  `;

  try {
    if (tab === 'posts') {
      const res = await api.getUserPosts(user.username);
      stream.innerHTML = '';
      if (res.posts.length === 0) {
        stream.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 36px 0;">No posts shared yet.</p>`;
        return;
      }
      for (const p of res.posts) {
        stream.appendChild(createPostCard(p, currentUser));
      }
    } else if (tab === 'liked') {
      const res = await api.getUserLikedPosts(user.username);
      stream.innerHTML = '';
      if (res.posts.length === 0) {
        stream.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 36px 0;">No liked posts yet.</p>`;
        return;
      }
      for (const p of res.posts) {
        stream.appendChild(createPostCard(p, currentUser));
      }
    } else if (tab === 'followers') {
      const res = await api.getFollowers(user.username);
      stream.innerHTML = '';
      if (res.followers.length === 0) {
        stream.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 36px 0;">No followers yet.</p>`;
        return;
      }
      renderUserList(stream, res.followers, currentUser);
    } else if (tab === 'following') {
      const res = await api.getFollowing(user.username);
      stream.innerHTML = '';
      if (res.following.length === 0) {
        stream.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 36px 0;">Not following anyone yet.</p>`;
        return;
      }
      renderUserList(stream, res.following, currentUser);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderUserList(container, users, currentUser) {
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '12px';

  for (const u of users) {
    const isSelf = currentUser && currentUser.id === u.user_id;
    const item = document.createElement('div');
    item.className = 'sidebar-card';
    item.style.padding = '14px 18px';
    item.style.marginBottom = '0';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';

    item.innerHTML = `
      <a href="/u/${encodeURIComponent(u.username)}" style="display: flex; align-items: center; gap: 12px; text-decoration: none;" data-nav>
        <img src="${u.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(u.display_name)}" class="avatar-small">
        <div>
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${escapeHtml(u.display_name)}</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">@${escapeHtml(u.username)}</div>
          ${u.bio ? `<div style="font-size: 0.85rem; color: var(--text-main); margin-top: 4px;">${escapeHtml(u.bio)}</div>` : ''}
        </div>
      </a>
      ${!isSelf && currentUser ? `
        <button class="btn btn-follow ${u.is_following ? 'following' : 'btn-primary'} btn-user-list-follow">
          ${u.is_following ? 'Following' : 'Follow'}
        </button>
      ` : ''}
    `;

    const followBtn = item.querySelector('.btn-user-list-follow');
    if (followBtn) {
      let isFollowing = Boolean(u.is_following);
      followBtn.onclick = async () => {
        isFollowing = !isFollowing;
        followBtn.className = `btn btn-follow ${isFollowing ? 'following' : 'btn-primary'}`;
        followBtn.textContent = isFollowing ? 'Following' : 'Follow';
        try {
          if (isFollowing) {
            await api.followUser(u.username);
            showToast(`Following @${u.username}`, 'success');
          } else {
            await api.unfollowUser(u.username);
            showToast(`Unfollowed @${u.username}`, 'info');
          }
        } catch (err) {
          isFollowing = !isFollowing;
          followBtn.className = `btn btn-follow ${isFollowing ? 'following' : 'btn-primary'}`;
          followBtn.textContent = isFollowing ? 'Following' : 'Follow';
          showToast(err.message, 'error');
        }
      };
    }

    list.appendChild(item);
  }

  container.appendChild(list);
}

function openEditProfileModal(user, onSave) {
  const bodyHtml = `
    <form id="edit-profile-form">
      <div class="form-group">
        <label class="form-label">Display Name</label>
        <input type="text" name="display_name" class="form-input" value="${escapeHtml(user.display_name)}" required maxlength="50">
      </div>
      <div class="form-group">
        <label class="form-label">Bio</label>
        <textarea name="bio" class="form-input" style="min-height: 80px; resize: vertical;" maxlength="280">${escapeHtml(user.bio || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input type="text" name="location" class="form-input" value="${escapeHtml(user.location || '')}" maxlength="60" placeholder="e.g. Earth, Sol System">
      </div>
      <div class="form-group">
        <label class="form-label">Website</label>
        <input type="url" name="website" class="form-input" value="${escapeHtml(user.website || '')}" maxlength="120" placeholder="https://yourwebsite.com">
      </div>
      <div class="form-group">
        <label class="form-label">Avatar Image</label>
        <input type="file" name="avatar" class="form-input" accept="image/jpeg,image/png,image/webp,image/gif">
        <div class="form-helper">Recommended square JPG/PNG/WEBP (max 5 MB)</div>
      </div>
      <div class="form-group">
        <label class="form-label">Cover Header Image</label>
        <input type="file" name="cover" class="form-input" accept="image/jpeg,image/png,image/webp,image/gif">
        <div class="form-helper">Recommended 3:1 banner image (max 5 MB)</div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button class="btn btn-outline btn-cancel-profile">Cancel</button>
    <button class="btn btn-primary btn-save-profile">Save Changes</button>
  `;

  openModal({
    title: 'Edit Profile',
    bodyHtml,
    footerHtml,
    onRender: (modalEl) => {
      const cancelBtn = modalEl.querySelector('.btn-cancel-profile');
      const saveBtn = modalEl.querySelector('.btn-save-profile');
      const form = modalEl.querySelector('#edit-profile-form');

      cancelBtn.onclick = closeModal;

      saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const formData = new FormData(form);

        try {
          const res = await api.updateProfile(formData);
          closeModal();
          showToast('Profile updated!', 'success');
          if (onSave) onSave(res.user);
        } catch (err) {
          showToast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      };
    }
  });
}

function formatJoinDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
