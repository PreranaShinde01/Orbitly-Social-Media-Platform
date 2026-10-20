import { api } from '../api.js';
import { createPostCard } from '../components/postCard.js';
import { createCommentItem } from '../components/commentItem.js';
import { showToast } from '../components/toast.js';

export async function renderPostDetailView(container, postId, currentUser) {
  container.innerHTML = `
    <!-- Back Header -->
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <button id="btn-back" class="btn btn-outline" style="border-radius: 50%; width: 38px; height: 38px; padding: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">Post</h2>
    </div>

    <!-- Post Details Container -->
    <div id="post-detail-card-container">
      <div class="skeleton-card">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
      </div>
    </div>

    <!-- Comments Section Card -->
    <section class="sidebar-card" style="margin-top: 24px;">
      <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 18px;" id="comments-heading">Comments</h3>

      ${currentUser ? `
        <!-- Add Comment Form -->
        <form id="form-add-comment" class="comment-composer">
          <img src="${currentUser.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(currentUser.display_name)}" class="avatar-small">
          <input type="text" id="comment-content-input" class="comment-input" placeholder="Post your reply..." maxlength="280" required autocomplete="off">
          <button type="submit" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.88rem;">Reply</button>
        </form>
      ` : `
        <div style="padding: 12px 16px; background: var(--bg-input); border-radius: var(--radius-sm); margin-bottom: 18px; font-size: 0.9rem;">
          <a href="/login" data-nav style="font-weight: 600;">Log in</a> to join the conversation and leave a reply.
        </div>
      `}

      <!-- Comments List -->
      <div id="comments-list-stream"></div>
    </section>
  `;

  // Back button
  container.querySelector('#btn-back').onclick = () => {
    window.history.back();
  };

  try {
    const res = await api.getPost(postId);
    const postContainer = container.querySelector('#post-detail-card-container');
    postContainer.innerHTML = '';

    const postCard = createPostCard(res.post, currentUser, {
      onPostDeleted: () => {
        import('../router.js').then(r => r.navigate('/'));
      }
    });
    postContainer.appendChild(postCard);

    // Load comments
    await loadComments(postId, res.post, currentUser, container);
  } catch (err) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
        <div style="font-size: 2.2rem; margin-bottom: 12px;">🛸</div>
        <h3 style="margin-bottom: 8px;">Post not found</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">This post may have drifted out of orbit or was deleted.</p>
        <a href="/" class="btn btn-primary" data-nav>Return Home</a>
      </div>
    `;
  }
}

async function loadComments(postId, post, currentUser, container) {
  const stream = container.querySelector('#comments-list-stream');
  const heading = container.querySelector('#comments-heading');

  try {
    const res = await api.getComments(postId);
    stream.innerHTML = '';
    heading.textContent = `Comments (${res.total_count || 0})`;

    if (res.comments.length === 0) {
      stream.innerHTML = `<p style="color: var(--text-muted); font-size: 0.92rem; text-align: center; padding: 24px 0;">No comments yet. Be the first to reply!</p>`;
    } else {
      for (const comment of res.comments) {
        const commentEl = createCommentItem(comment, currentUser, {
          onReplyAdded: () => {
            loadComments(postId, post, currentUser, container);
          },
          onCommentDeleted: () => {
            loadComments(postId, post, currentUser, container);
          }
        });
        stream.appendChild(commentEl);
      }
    }

    // Handle Comment Submit
    const commentForm = container.querySelector('#form-add-comment');
    if (commentForm) {
      commentForm.onsubmit = async (e) => {
        e.preventDefault();
        const input = commentForm.querySelector('#comment-content-input');
        const content = input.value.trim();
        if (!content) return;

        const submitBtn = commentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '...';

        try {
          await api.createComment(postId, { content });
          input.value = '';
          showToast('Reply published!', 'success');
          await loadComments(postId, post, currentUser, container);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Reply';
        }
      };
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
