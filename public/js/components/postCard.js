import { api } from '../api.js';
import { showToast } from './toast.js';
import { openModal, confirmModal } from './modal.js';

export function createPostCard(post, currentUser, options = {}) {
  const { onPostDeleted = null, onPostUpdated = null } = options;
  const isOwner = currentUser && currentUser.id === post.author_id;

  const card = document.createElement('article');
  card.className = 'post-card';
  card.id = `post-${post.id}`;

  // Process text: escape HTML first, then linkify hashtags
  const formattedContent = linkifyText(post.content);

  const avatarSrc = post.avatar_path || '/img/logo.svg';

  card.innerHTML = `
    <header class="post-card-header">
      <a href="/u/${encodeURIComponent(post.username)}" class="post-author-info" data-nav>
        <img src="${avatarSrc}" alt="${escapeHtml(post.display_name)}" class="avatar-small">
        <div class="post-author-names">
          <span class="post-display-name">${escapeHtml(post.display_name)}</span>
          <span class="post-meta">
            @${escapeHtml(post.username)} &middot; 
            <span class="post-time">${post.relative_time || 'recently'}</span>
            ${post.is_edited ? '<span class="edited-badge">edited</span>' : ''}
          </span>
        </div>
      </a>

      ${isOwner ? `
        <div class="post-menu-container" style="position: relative;">
          <button class="post-card-menu-trigger btn-ghost" title="More options">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
          <div class="post-dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 10; min-width: 130px; overflow: hidden;">
            <button class="btn-edit-post" style="width: 100%; text-align: left; padding: 8px 14px; font-size: 0.88rem; display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Edit
            </button>
            <button class="btn-delete-post" style="width: 100%; text-align: left; padding: 8px 14px; font-size: 0.88rem; color: var(--danger); display: flex; align-items: center; gap: 8px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete
            </button>
          </div>
        </div>
      ` : ''}
    </header>

    <div class="post-content">${formattedContent}</div>

    ${post.image_path ? `
      <div class="post-image-container">
        <img src="${post.image_path}" alt="Post attachment" class="post-image" loading="lazy">
      </div>
    ` : ''}

    <footer class="post-actions">
      <!-- Like Button with Optimistic UI -->
      <button class="action-btn btn-like ${post.is_liked ? 'liked' : ''}" title="Like">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${post.is_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span class="like-counter">${post.likes_count || 0}</span>
      </button>

      <!-- Comment Link -->
      <a href="/post/${post.id}" class="action-btn btn-comment" data-nav title="Comments">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span class="comment-counter">${post.comments_count || 0}</span>
      </a>

      <!-- Liked By Trigger Modal -->
      ${post.likes_count > 0 ? `
        <span class="liked-by-link">Liked by ${post.likes_count} ${post.likes_count === 1 ? 'person' : 'people'}</span>
      ` : ''}
    </footer>
  `;

  // Attach event listeners
  setupPostCardEvents(card, post, currentUser, { onPostDeleted, onPostUpdated });

  return card;
}

function setupPostCardEvents(card, post, currentUser, { onPostDeleted, onPostUpdated }) {
  // 1. Optimistic Like Button
  const likeBtn = card.querySelector('.btn-like');
  const likeCountSpan = card.querySelector('.like-counter');
  let isLiked = Boolean(post.is_liked);
  let likesCount = parseInt(post.likes_count, 10) || 0;
  let isLiking = false;

  likeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please log in to like posts', 'info');
      return;
    }
    if (isLiking) return;
    isLiking = true;

    // Optimistic toggle
    const previousState = isLiked;
    const previousCount = likesCount;

    isLiked = !isLiked;
    likesCount = isLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    likeBtn.classList.toggle('liked', isLiked);
    likeCountSpan.textContent = likesCount;
    likeBtn.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');

    try {
      if (isLiked) {
        const res = await api.likePost(post.id);
        likesCount = res.likes_count;
        likeCountSpan.textContent = likesCount;
      } else {
        const res = await api.unlikePost(post.id);
        likesCount = res.likes_count;
        likeCountSpan.textContent = likesCount;
      }
    } catch (err) {
      // Rollback on error
      isLiked = previousState;
      likesCount = previousCount;
      likeBtn.classList.toggle('liked', isLiked);
      likeCountSpan.textContent = likesCount;
      likeBtn.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');
      showToast(err.message, 'error');
    } finally {
      isLiking = false;
    }
  });

  // 2. Liked By Modal
  const likedByBtn = card.querySelector('.liked-by-link');
  if (likedByBtn) {
    likedByBtn.addEventListener('click', async () => {
      try {
        const { likes } = await api.getPostLikes(post.id);
        const listHtml = likes.length === 0
          ? '<p style="color: var(--text-muted);">No likes yet.</p>'
          : `<div style="display: flex; flex-direction: column; gap: 12px;">
              ${likes.map(u => `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <a href="/u/${encodeURIComponent(u.username)}" style="display: flex; align-items: center; gap: 10px; text-decoration: none;" data-nav>
                    <img src="${u.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(u.display_name)}" class="avatar-small">
                    <div>
                      <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(u.display_name)}</div>
                      <div style="font-size: 0.8rem; color: var(--text-muted);">@${escapeHtml(u.username)}</div>
                    </div>
                  </a>
                </div>
              `).join('')}
            </div>`;

        openModal({
          title: 'Liked by',
          bodyHtml: listHtml
        });
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // 3. Dropdown Menu (for post owner)
  const menuTrigger = card.querySelector('.post-card-menu-trigger');
  const dropdown = card.querySelector('.post-dropdown-menu');
  if (menuTrigger && dropdown) {
    menuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });

    // Edit Post
    const editBtn = card.querySelector('.btn-edit-post');
    editBtn.addEventListener('click', () => {
      dropdown.style.display = 'none';
      openEditModal(post, (updatedPost) => {
        post.content = updatedPost.content;
        post.is_edited = updatedPost.is_edited;
        card.querySelector('.post-content').innerHTML = linkifyText(updatedPost.content);
        const metaSpan = card.querySelector('.post-meta');
        if (!metaSpan.querySelector('.edited-badge')) {
          metaSpan.insertAdjacentHTML('beforeend', ' <span class="edited-badge">edited</span>');
        }
        if (onPostUpdated) onPostUpdated(updatedPost);
      });
    });

    // Delete Post
    const deleteBtn = card.querySelector('.btn-delete-post');
    deleteBtn.addEventListener('click', () => {
      dropdown.style.display = 'none';
      confirmModal({
        title: 'Delete Post',
        message: 'Are you sure you want to delete this post? This action cannot be undone.',
        confirmText: 'Delete Post',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.deletePost(post.id);
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
              if (card.parentNode) card.parentNode.removeChild(card);
              if (onPostDeleted) onPostDeleted(post.id);
            }, 300);
            showToast('Post deleted', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}

function openEditModal(post, onSuccess) {
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">Edit your post</label>
      <textarea id="edit-post-textarea" class="form-input" style="min-height: 120px; resize: vertical;" maxlength="500">${escapeHtml(post.content)}</textarea>
      <div style="display: flex; justify-content: flex-end; font-size: 0.8rem; color: var(--text-subtle); margin-top: 4px;">
        <span id="edit-char-counter">${500 - post.content.length}</span> / 500
      </div>
    </div>
  `;

  const footerHtml = `
    <button class="btn btn-outline btn-cancel-edit">Cancel</button>
    <button class="btn btn-primary btn-save-edit">Save Changes</button>
  `;

  openModal({
    title: 'Edit Post',
    bodyHtml,
    footerHtml,
    onRender: (modalEl) => {
      const textarea = modalEl.querySelector('#edit-post-textarea');
      const counter = modalEl.querySelector('#edit-char-counter');
      const cancelBtn = modalEl.querySelector('.btn-cancel-edit');
      const saveBtn = modalEl.querySelector('.btn-save-edit');

      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      textarea.addEventListener('input', () => {
        counter.textContent = 500 - textarea.value.length;
      });

      cancelBtn.onclick = () => {
        import('./modal.js').then(m => m.closeModal());
      };

      saveBtn.onclick = async () => {
        const newContent = textarea.value.trim();
        if (!newContent) {
          showToast('Post content cannot be empty', 'error');
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
          const res = await api.updatePost(post.id, { content: newContent });
          import('./modal.js').then(m => m.closeModal());
          showToast('Post updated successfully', 'success');
          if (onSuccess) onSuccess(res.post);
        } catch (err) {
          showToast(err.message, 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      };
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export function linkifyText(rawText) {
  if (!rawText) return '';
  const escaped = escapeHtml(rawText);
  // Replace #tag with clickable link
  return escaped.replace(/#([a-zA-Z0-9_]{1,50})\b/g, (match, tag) => {
    return `<a href="/tag/${encodeURIComponent(tag.toLowerCase())}" class="hashtag" data-nav>#${tag}</a>`;
  });
}
