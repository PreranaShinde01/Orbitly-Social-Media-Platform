import { api } from '../api.js';
import { createPostCard } from '../components/postCard.js';
import { showToast } from '../components/toast.js';

export function renderExploreView(container, currentUser, options = {}) {
  const tagName = options.tag || null;
  let currentSort = options.sort || 'latest';
  let currentPage = 1;
  let isLoading = false;

  container.innerHTML = `
    <!-- Header with Toggle or Tag Banner -->
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-main);">
          ${tagName ? `Posts tagged <span style="color: var(--color-primary);">#${escapeHtml(tagName)}</span>` : 'Explore the Orbit'}
        </h2>
        ${tagName ? `
          <a href="/explore" class="btn btn-outline" data-nav style="padding: 6px 14px; font-size: 0.85rem;">Clear Tag</a>
        ` : ''}
      </div>

      ${!tagName ? `
        <!-- Latest vs Trending Pill Toggle -->
        <div style="display: inline-flex; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-full); padding: 4px;">
          <button id="btn-sort-latest" class="btn ${currentSort === 'latest' ? 'btn-primary' : 'btn-ghost'}" style="padding: 8px 20px; font-size: 0.9rem; border-radius: var(--radius-full);">
            🔥 Latest
          </button>
          <button id="btn-sort-trending" class="btn ${currentSort === 'trending' ? 'btn-primary' : 'btn-ghost'}" style="padding: 8px 20px; font-size: 0.9rem; border-radius: var(--radius-full);">
            📈 Trending
          </button>
        </div>
      ` : ''}
    </div>

    <!-- Posts Stream -->
    <div id="explore-stream">
      <div class="skeleton-card">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
      </div>
    </div>

    <!-- Load More -->
    <div id="load-more-explore" style="text-align: center; margin-top: 24px; display: none;">
      <button id="btn-load-more-explore" class="btn btn-outline" style="padding: 10px 24px;">Load More</button>
    </div>
  `;

  // Toggle handlers
  if (!tagName) {
    const btnLatest = container.querySelector('#btn-sort-latest');
    const btnTrending = container.querySelector('#btn-sort-trending');

    btnLatest.onclick = () => {
      if (currentSort === 'latest') return;
      currentSort = 'latest';
      btnLatest.className = 'btn btn-primary';
      btnTrending.className = 'btn btn-ghost';
      currentPage = 1;
      loadExplorePosts();
    };

    btnTrending.onclick = () => {
      if (currentSort === 'trending') return;
      currentSort = 'trending';
      btnTrending.className = 'btn btn-primary';
      btnLatest.className = 'btn btn-ghost';
      currentPage = 1;
      loadExplorePosts();
    };
  }

  loadExplorePosts();

  async function loadExplorePosts() {
    if (isLoading) return;
    isLoading = true;

    try {
      let res;
      if (tagName) {
        res = await api.getByTag(tagName, currentPage);
      } else {
        res = await api.getExplore(currentSort, currentPage);
      }

      const stream = container.querySelector('#explore-stream');
      if (currentPage === 1) {
        stream.innerHTML = '';
      }

      if (!res.posts || res.posts.length === 0) {
        if (currentPage === 1) {
          stream.innerHTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
              <div style="font-size: 2.2rem; margin-bottom: 12px;">🔍</div>
              <h3 style="margin-bottom: 6px;">No posts found</h3>
              <p style="color: var(--text-muted);">Be the first to create a post ${tagName ? `with #${tagName}` : ''}!</p>
            </div>
          `;
        }
        container.querySelector('#load-more-explore').style.display = 'none';
        return;
      }

      for (const p of res.posts) {
        const card = createPostCard(p, currentUser);
        stream.appendChild(card);
      }

      const loadMoreContainer = container.querySelector('#load-more-explore');
      const loadMoreBtn = container.querySelector('#btn-load-more-explore');
      if (res.posts.length >= 20) {
        loadMoreContainer.style.display = 'block';
        loadMoreBtn.onclick = () => {
          currentPage++;
          loadExplorePosts();
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
