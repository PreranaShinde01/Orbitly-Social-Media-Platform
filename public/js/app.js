import { api } from './api.js';
import { initRouter, setCurrentUser, navigate } from './router.js';
import { showToast } from './components/toast.js';

let currentUser = null;
let pollInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupThemeToggle();

  // Load current user session
  try {
    const res = await api.getMe();
    currentUser = res.user;
  } catch (err) {
    currentUser = null;
  }

  setCurrentUser(currentUser);
  updateUserUI(currentUser);
  initRouter(currentUser);

  // Setup right sidebar features
  setupLiveSearch();
  loadSuggestedUsers();

  // Start notification unread count polling
  if (currentUser) {
    updateUnreadCount();
    pollInterval = setInterval(updateUnreadCount, 30000); // Poll every 30s
  }

  // Compose button in sidebar
  const composeBtn = document.getElementById('btn-open-compose');
  if (composeBtn) {
    composeBtn.addEventListener('click', () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      if (window.location.pathname === '/') {
        const composerTextarea = document.getElementById('composer-text');
        if (composerTextarea) {
          composerTextarea.focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        navigate('/');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await api.logout();
        currentUser = null;
        setCurrentUser(null);
        if (pollInterval) clearInterval(pollInterval);
        showToast('Logged out successfully', 'info');
        updateUserUI(null);
        navigate('/login');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Global events
  window.addEventListener('auth-changed', (e) => {
    currentUser = e.detail;
    setCurrentUser(currentUser);
    updateUserUI(currentUser);
    loadSuggestedUsers();
    if (currentUser) {
      updateUnreadCount();
      if (!pollInterval) {
        pollInterval = setInterval(updateUnreadCount, 30000);
      }
    }
  });

  window.addEventListener('notifications-read', () => {
    updateUnreadCount();
  });
});

function updateUserUI(user) {
  const userFooter = document.getElementById('user-footer-card');
  const avatarImg = document.getElementById('user-footer-avatar');
  const nameEl = document.getElementById('user-footer-name');
  const handleEl = document.getElementById('user-footer-handle');
  const logoutBtn = document.getElementById('btn-logout');

  if (user) {
    avatarImg.src = user.avatar_path || '/img/logo.svg';
    nameEl.textContent = user.display_name || user.username;
    handleEl.textContent = `@${user.username}`;
    userFooter.style.display = 'flex';
    logoutBtn.style.display = 'block';

    userFooter.onclick = (e) => {
      if (e.target.closest('#btn-logout')) return;
      navigate(`/u/${encodeURIComponent(user.username)}`);
    };
  } else {
    avatarImg.src = '/img/logo.svg';
    nameEl.textContent = 'Welcome!';
    handleEl.textContent = 'Log in / Register';
    logoutBtn.style.display = 'none';

    userFooter.onclick = () => {
      navigate('/login');
    };
  }
}

async function updateUnreadCount() {
  if (!currentUser) return;
  try {
    const res = await api.getUnreadCount();
    const badge = document.getElementById('nav-unread-badge');
    if (badge) {
      if (res.count > 0) {
        badge.textContent = res.count > 99 ? '99+' : res.count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    // ignore polling failures
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('orbitly-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeLabels(savedTheme);
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('orbitly-theme', newTheme);
    updateThemeLabels(newTheme);
  });
}

function updateThemeLabels(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon && label) {
    if (theme === 'dark') {
      icon.textContent = '☀️';
      label.textContent = 'Light Mode';
    } else {
      icon.textContent = '🌙';
      label.textContent = 'Dark Mode';
    }
  }
}

function setupLiveSearch() {
  const searchInput = document.getElementById('global-search-input');
  const suggestionsBox = document.getElementById('search-suggestions');
  if (!searchInput || !suggestionsBox) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();

    if (!q) {
      suggestionsBox.classList.remove('open');
      suggestionsBox.innerHTML = '';
      return;
    }

    // Debounce 300 ms
    debounceTimer = setTimeout(async () => {
      try {
        const res = await api.search(q);
        const users = res.users || [];
        const posts = res.posts || [];

        if (users.length === 0 && posts.length === 0) {
          suggestionsBox.innerHTML = `<div style="padding: 12px 16px; color: var(--text-muted); font-size: 0.88rem;">No results found for "${escapeHtml(q)}"</div>`;
          suggestionsBox.classList.add('open');
          return;
        }

        let html = '';

        if (users.length > 0) {
          html += `<div style="padding: 8px 14px; font-size: 0.75rem; font-weight: 700; color: var(--text-subtle); text-transform: uppercase;">People</div>`;
          for (const u of users.slice(0, 4)) {
            html += `
              <div class="suggestion-item" data-navigate="/u/${encodeURIComponent(u.username)}">
                <img src="${u.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(u.display_name)}" class="avatar-small" style="width: 32px; height: 32px;">
                <div>
                  <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">${escapeHtml(u.display_name)}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted);">@${escapeHtml(u.username)}</div>
                </div>
              </div>
            `;
          }
        }

        if (posts.length > 0) {
          html += `<div style="padding: 8px 14px; font-size: 0.75rem; font-weight: 700; color: var(--text-subtle); text-transform: uppercase;">Posts</div>`;
          for (const p of posts.slice(0, 3)) {
            html += `
              <div class="suggestion-item" data-navigate="/post/${p.id}">
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-main);">${escapeHtml(p.display_name)} <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 400;">@${escapeHtml(p.username)}</span></div>
                  <div style="font-size: 0.82rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 250px;">${escapeHtml(p.content)}</div>
                </div>
              </div>
            `;
          }
        }

        html += `
          <div class="suggestion-item" data-navigate="/search?q=${encodeURIComponent(q)}" style="border-top: 1px solid var(--border-color); color: var(--color-primary); font-weight: 600; font-size: 0.88rem;">
            Search for "${escapeHtml(q)}" &rarr;
          </div>
        `;

        suggestionsBox.innerHTML = html;
        suggestionsBox.classList.add('open');

        // Suggestion click listeners
        suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
          item.onclick = () => {
            const dest = item.dataset.navigate;
            suggestionsBox.classList.remove('open');
            searchInput.value = '';
            navigate(dest);
          };
        });
      } catch (err) {
        // ignore
      }
    }, 300);
  });

  // Enter key press triggers full search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (q) {
        suggestionsBox.classList.remove('open');
        navigate(`/search?q=${encodeURIComponent(q)}`);
      }
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-widget')) {
      suggestionsBox.classList.remove('open');
    }
  });
}

async function loadSuggestedUsers() {
  const container = document.getElementById('suggested-users-list');
  const card = document.getElementById('suggested-users-card');
  if (!container || !card) return;

  if (!currentUser) {
    card.style.display = 'none';
    return;
  }

  try {
    const res = await api.getSuggestions();
    container.innerHTML = '';

    if (!res.suggestions || res.suggestions.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';

    for (const u of res.suggestions) {
      const item = document.createElement('div');
      item.className = 'suggested-user-item';
      item.innerHTML = `
        <a href="/u/${encodeURIComponent(u.username)}" class="suggested-user-info" data-nav>
          <img src="${u.avatar_path || '/img/logo.svg'}" alt="${escapeHtml(u.display_name)}" class="avatar-small">
          <div class="suggested-user-names">
            <div class="suggested-user-name">${escapeHtml(u.display_name)}</div>
            <div class="suggested-user-handle">@${escapeHtml(u.username)}</div>
          </div>
        </a>
        <button class="btn btn-primary btn-follow btn-quick-follow" data-username="${u.username}">Follow</button>
      `;

      const followBtn = item.querySelector('.btn-quick-follow');
      followBtn.onclick = async () => {
        followBtn.disabled = true;
        try {
          await api.followUser(u.username);
          followBtn.textContent = 'Following';
          followBtn.className = 'btn btn-follow following';
          showToast(`Following @${u.username}`, 'success');
        } catch (err) {
          followBtn.disabled = false;
          showToast(err.message, 'error');
        }
      };

      container.appendChild(item);
    }
  } catch (err) {
    card.style.display = 'none';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
