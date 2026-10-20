import { api } from '../api.js';
import { showToast } from './toast.js';
import { confirmModal } from './modal.js';

export function createCommentItem(comment, currentUser, options = {}) {
  const { onReplyAdded = null, onCommentDeleted = null } = options;
  const _isAuthor = currentUser && currentUser.id === comment.author_id;
  const canDelete = Boolean(comment.can_delete);

  const item = document.createElement('div');
  item.className = 'comment-item';
  item.id = `comment-${comment.id}`;

  const avatarSrc = comment.avatar_path || '/img/logo.svg';

  item.innerHTML = `
    <a href="/u/${encodeURIComponent(comment.username)}" data-nav style="flex-shrink: 0;">
      <img src="${avatarSrc}" alt="${escapeHtml(comment.display_name)}" class="avatar-small">
    </a>
    <div style="flex: 1; min-width: 0;">
      <div class="comment-bubble">
        <div class="comment-header">
          <a href="/u/${encodeURIComponent(comment.username)}" class="comment-author" data-nav>
            ${escapeHtml(comment.display_name)}
            <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">@${escapeHtml(comment.username)}</span>
          </a>
          <span class="comment-time">${comment.relative_time || 'just now'}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.content)}</div>
      </div>

      <div class="comment-footer-actions">
        <!-- Comment Like -->
        <span class="comment-action-btn btn-comment-like ${comment.is_liked ? 'liked' : ''}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${comment.is_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span class="comment-like-counter">${comment.likes_count || 0}</span>
        </span>

        <!-- Reply Button (Only on top-level comments) -->
        ${!comment.parent_id && currentUser ? `
          <span class="comment-action-btn btn-toggle-reply">Reply</span>
        ` : ''}

        <!-- Delete Comment Button -->
        ${canDelete ? `
          <span class="comment-action-btn btn-delete-comment" style="color: var(--text-subtle);">Delete</span>
        ` : ''}
      </div>

      <!-- Nested Reply Input Area -->
      <div class="reply-composer-container" style="display: none; margin-top: 10px;">
        <form class="reply-composer-form" style="display: flex; gap: 8px;">
          <input type="text" class="reply-input form-input" style="padding: 6px 12px; font-size: 0.88rem;" placeholder="Reply to @${escapeHtml(comment.username)}..." maxlength="280">
          <button type="submit" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.85rem;">Reply</button>
        </form>
      </div>

      <!-- Nested Replies List Container -->
      <div class="nested-replies-list" id="replies-list-${comment.id}"></div>
    </div>
  `;

  // Attach event handlers
  setupCommentEvents(item, comment, currentUser, { onReplyAdded, onCommentDeleted });

  // Render existing nested replies if present
  if (comment.replies && comment.replies.length > 0) {
    const repliesContainer = item.querySelector(`#replies-list-${comment.id}`);
    for (const reply of comment.replies) {
      const replyEl = createCommentItem(reply, currentUser, { onCommentDeleted });
      repliesContainer.appendChild(replyEl);
    }
  }

  return item;
}

function setupCommentEvents(item, comment, currentUser, { onReplyAdded, onCommentDeleted }) {
  // 1. Comment Like Toggle
  const likeBtn = item.querySelector('.btn-comment-like');
  const countSpan = item.querySelector('.comment-like-counter');
  let isLiked = Boolean(comment.is_liked);
  let likesCount = parseInt(comment.likes_count, 10) || 0;
  let isLiking = false;

  likeBtn.addEventListener('click', async () => {
    if (!currentUser) {
      showToast('Please log in to like comments', 'info');
      return;
    }
    if (isLiking) return;
    isLiking = true;

    // Optimistic toggle
    const prevLiked = isLiked;
    const prevCount = likesCount;

    isLiked = !isLiked;
    likesCount = isLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    likeBtn.classList.toggle('liked', isLiked);
    countSpan.textContent = likesCount;
    likeBtn.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');

    try {
      if (isLiked) {
        const res = await api.likeComment(comment.id);
        likesCount = res.likes_count;
        countSpan.textContent = likesCount;
      } else {
        const res = await api.unlikeComment(comment.id);
        likesCount = res.likes_count;
        countSpan.textContent = likesCount;
      }
    } catch (err) {
      // Rollback
      isLiked = prevLiked;
      likesCount = prevCount;
      likeBtn.classList.toggle('liked', isLiked);
      countSpan.textContent = likesCount;
      likeBtn.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');
      showToast(err.message, 'error');
    } finally {
      isLiking = false;
    }
  });

  // 2. Reply Toggle & Submit (for top-level comments)
  const replyToggle = item.querySelector('.btn-toggle-reply');
  const replyContainer = item.querySelector('.reply-composer-container');
  if (replyToggle && replyContainer) {
    replyToggle.addEventListener('click', () => {
      const isOpen = replyContainer.style.display === 'block';
      replyContainer.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) {
        replyContainer.querySelector('.reply-input').focus();
      }
    });

    const replyForm = item.querySelector('.reply-composer-form');
    replyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = replyForm.querySelector('.reply-input');
      const content = input.value.trim();
      if (!content) return;

      const submitBtn = replyForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '...';

      try {
        const res = await api.createComment(comment.post_id, {
          content,
          parent_id: comment.id
        });
        input.value = '';
        replyContainer.style.display = 'none';

        // Append newly created reply to replies container
        const repliesContainer = item.querySelector(`#replies-list-${comment.id}`);
        const newReplyEl = createCommentItem(res.comment, currentUser, { onCommentDeleted });
        repliesContainer.appendChild(newReplyEl);

        showToast('Reply added', 'success');
        if (onReplyAdded) onReplyAdded(res.comment);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reply';
      }
    });
  }

  // 3. Delete Comment
  const deleteBtn = item.querySelector('.btn-delete-comment');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      confirmModal({
        title: 'Delete Comment',
        message: 'Are you sure you want to delete this comment?',
        confirmText: 'Delete',
        isDanger: true,
        onConfirm: async () => {
          try {
            await api.deleteComment(comment.id);
            item.style.transition = 'all 0.25s ease';
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
              if (item.parentNode) item.parentNode.removeChild(item);
              if (onCommentDeleted) onCommentDeleted(comment.id);
            }, 250);
            showToast('Comment deleted', 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
      });
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
