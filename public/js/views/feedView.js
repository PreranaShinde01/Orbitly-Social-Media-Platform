import { api } from '../api.js';
import { createPostCard } from '../components/postCard.js';
import { showToast } from '../components/toast.js';

export function renderFeedView(container, currentUser) {
  let currentPage = 1;
  let _hasMore = true;
  let isLoading = false;

  container.innerHTML = `
    <!-- Feed Page Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-main);">Home Feed</h2>
    </div>

    <!-- Post Composer Card -->
    ${currentUser ? `
      <section class="composer-card" id="feed-composer">
        <div class="composer-header">
          <img src="${currentUser.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(currentUser.display_name)}" class="avatar-small">
          <div class="composer-body">
            <textarea id="composer-text" class="composer-textarea" placeholder="What's orbiting in your universe?" maxlength="500"></textarea>
            
            <div id="composer-preview" class="composer-preview-container" style="display: none;">
              <img id="composer-preview-img" class="composer-preview-img" src="" alt="Image Preview">
              <button id="btn-clear-preview" class="btn-remove-preview" title="Remove image">&times;</button>
            </div>

            <div class="composer-footer">
              <div class="composer-actions">
                <label class="btn-icon-upload" title="Attach image">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <input type="file" id="composer-file" accept="image/jpeg,image/png,image/webp,image/gif" style="display: none;">
                </label>
              </div>

              <div style="display: flex; align-items: center; gap: 14px;">
                <span id="composer-char-count" class="composer-counter">0 / 500</span>
                <button id="btn-submit-post" class="btn btn-primary" style="padding: 8px 20px;">Post</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    ` : `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 24px; text-align: center; margin-bottom: 24px;">
        <h3 style="margin-bottom: 8px;">Join the Orbit!</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">Sign up or log in to post, like, comment, and connect.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="/login" class="btn btn-primary" data-nav>Log In</a>
          <a href="/register" class="btn btn-outline" data-nav>Register</a>
        </div>
      </div>
    `}

    <!-- Posts Feed Container -->
    <div id="posts-stream">
      <div class="skeleton-card">
        <div style="display: flex; gap: 12px; margin-bottom: 14px;">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-line short"></div>
            <div class="skeleton skeleton-line short" style="width: 20%;"></div>
          </div>
        </div>
        <div class="skeleton skeleton-line long"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
      <div class="skeleton-card">
        <div style="display: flex; gap: 12px; margin-bottom: 14px;">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-line short"></div>
          </div>
        </div>
        <div class="skeleton skeleton-line long"></div>
      </div>
    </div>

    <!-- Load More Container -->
    <div id="load-more-container" style="text-align: center; margin-top: 24px; display: none;">
      <button id="btn-load-more" class="btn btn-outline" style="padding: 10px 24px;">Load More</button>
    </div>
  `;

  // Setup Composer logic if authenticated
  if (currentUser) {
    setupComposer(container, currentUser, (newPost) => {
      const stream = container.querySelector('#posts-stream');
      const emptyMsg = stream.querySelector('.empty-feed-message');
      if (emptyMsg) emptyMsg.remove();

      const newCard = createPostCard(newPost, currentUser);
      stream.insertBefore(newCard, stream.firstChild);
    });
  }

  // Load feed posts
  loadPosts();

  async function loadPosts() {
    if (isLoading) return;
    isLoading = true;

    try {
      const res = currentUser ? await api.getFeed(currentPage) : await api.getExplore('latest', currentPage);
      const stream = container.querySelector('#posts-stream');

      if (currentPage === 1) {
        stream.innerHTML = '';
      }

      if (!res.posts || res.posts.length === 0) {
        if (currentPage === 1) {
          stream.innerHTML = `
            <div class="empty-feed-message" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
              <div style="font-size: 2.5rem; margin-bottom: 12px;">🌌</div>
              <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 8px;">Your orbit is quiet</h3>
              <p style="color: var(--text-muted); margin-bottom: 18px;">Follow more people from the suggestions sidebar, or explore what's trending!</p>
              <a href="/explore" class="btn btn-primary" data-nav>Explore Posts</a>
            </div>
          `;
        }
        _hasMore = false;
        container.querySelector('#load-more-container').style.display = 'none';
        return;
      }

      for (const p of res.posts) {
        const card = createPostCard(p, currentUser, {
          onPostDeleted: (_deletedId) => {
            // Check if stream is empty
            if (stream.children.length === 0) {
              loadPosts();
            }
          }
        });
        stream.appendChild(card);
      }

      // Check if more
      const loadMoreContainer = container.querySelector('#load-more-container');
      const loadMoreBtn = container.querySelector('#btn-load-more');
      if (res.posts.length >= 20) {
        loadMoreContainer.style.display = 'block';
        loadMoreBtn.onclick = () => {
          currentPage++;
          loadPosts();
        };
      } else {
        loadMoreContainer.style.display = 'none';
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      isLoading = false;
    }
  }
}

function setupComposer(container, currentUser, onPostCreated) {
  const textarea = container.querySelector('#composer-text');
  const fileInput = container.querySelector('#composer-file');
  const previewContainer = container.querySelector('#composer-preview');
  const previewImg = container.querySelector('#composer-preview-img');
  const clearPreviewBtn = container.querySelector('#btn-clear-preview');
  const counterSpan = container.querySelector('#composer-char-count');
  const submitBtn = container.querySelector('#btn-submit-post');

  let selectedFile = null;

  // Live character counter (500 max)
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    counterSpan.textContent = `${len} / 500`;
    counterSpan.className = 'composer-counter';
    if (len >= 450 && len < 500) {
      counterSpan.classList.add('warning');
    } else if (len >= 500) {
      counterSpan.classList.add('danger');
    }
  });

  // Image upload preview
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image cannot exceed 5 MB', 'error');
        fileInput.value = '';
        return;
      }
      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewContainer.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  // Clear preview
  clearPreviewBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    previewContainer.style.display = 'none';
    previewImg.src = '';
  });

  // Submit Post
  submitBtn.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) {
      showToast('Please write something in your post', 'error');
      textarea.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const formData = new FormData();
    formData.append('content', content);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const res = await api.createPost(formData);
      showToast('Post published to orbit!', 'success');

      // Reset composer
      textarea.value = '';
      counterSpan.textContent = '0 / 500';
      counterSpan.className = 'composer-counter';
      selectedFile = null;
      fileInput.value = '';
      previewContainer.style.display = 'none';

      if (onPostCreated) {
        onPostCreated(res.post);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
