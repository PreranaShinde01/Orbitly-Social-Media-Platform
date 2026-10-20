import { api } from '../api.js';
import { createPostCard } from '../components/postCard.js';
import { showToast } from '../components/toast.js';

export async function renderSearchView(container, query, currentUser) {
  let _activeTab = 'all';

  container.innerHTML = `
    <!-- Search Header -->
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
        Search Results for <span style="color: var(--color-primary);">"${escapeHtml(query)}"</span>
      </h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;" id="search-results-summary">Searching orbit...</p>
    </div>

    <!-- Search Tabs -->
    <div class="profile-tabs" style="margin-bottom: 20px;">
      <div class="profile-tab active" data-search-tab="all">All Results</div>
      <div class="profile-tab" data-search-tab="users">People</div>
      <div class="profile-tab" data-search-tab="posts">Posts</div>
    </div>

    <!-- Results Containers -->
    <div id="search-users-section" style="margin-bottom: 24px;"></div>
    <div id="search-posts-section"></div>
  `;

  try {
    const res = await api.search(query);
    const summary = container.querySelector('#search-results-summary');
    const usersSec = container.querySelector('#search-users-section');
    const postsSec = container.querySelector('#search-posts-section');

    const totalUsers = (res.users && res.users.length) || 0;
    const totalPosts = (res.posts && res.posts.length) || 0;
    summary.textContent = `Found ${totalUsers} ${totalUsers === 1 ? 'person' : 'people'} and ${totalPosts} ${totalPosts === 1 ? 'post' : 'posts'}`;

    if (totalUsers === 0 && totalPosts === 0) {
      postsSec.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">🛸</div>
          <h3 style="margin-bottom: 8px;">No results found for "${escapeHtml(query)}"</h3>
          <p style="color: var(--text-muted);">Try searching for other keywords, hashtags like #space, or user handles.</p>
        </div>
      `;
      return;
    }

    // Render users
    if (totalUsers > 0) {
      usersSec.innerHTML = `<h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 12px;">People</h3>`;
      const usersList = document.createElement('div');
      usersList.style.display = 'flex';
      usersList.style.flexDirection = 'column';
      usersList.style.gap = '10px';

      for (const u of res.users) {
        const item = document.createElement('div');
        item.className = 'sidebar-card';
        item.style.padding = '12px 16px';
        item.style.marginBottom = '0';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';

        item.innerHTML = `
          <a href="/u/${encodeURIComponent(u.username)}" style="display: flex; align-items: center; gap: 12px; text-decoration: none;" data-nav>
            <img src="${u.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(u.display_name)}" class="avatar-small">
            <div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${escapeHtml(u.display_name)}</div>
              <div style="font-size: 0.82rem; color: var(--text-muted);">@${escapeHtml(u.username)} &middot; ${u.followers_count || 0} followers</div>
              ${u.bio ? `<div style="font-size: 0.85rem; color: var(--text-main); margin-top: 4px;">${escapeHtml(u.bio)}</div>` : ''}
            </div>
          </a>
        `;
        usersList.appendChild(item);
      }
      usersSec.appendChild(usersList);
    }

    // Render posts
    if (totalPosts > 0) {
      postsSec.innerHTML = `<h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 12px;">Posts</h3>`;
      for (const p of res.posts) {
        postsSec.appendChild(createPostCard(p, currentUser));
      }
    }

    // Tab switcher
    const tabEls = container.querySelectorAll('.profile-tab');
    tabEls.forEach(tab => {
      tab.onclick = () => {
        tabEls.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.searchTab;
        if (mode === 'all') {
          usersSec.style.display = totalUsers > 0 ? 'block' : 'none';
          postsSec.style.display = totalPosts > 0 ? 'block' : 'none';
        } else if (mode === 'users') {
          usersSec.style.display = 'block';
          postsSec.style.display = 'none';
        } else if (mode === 'posts') {
          usersSec.style.display = 'none';
          postsSec.style.display = 'block';
        }
      };
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
