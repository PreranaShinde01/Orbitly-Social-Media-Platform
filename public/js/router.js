import { renderFeedView } from './views/feedView.js';
import { renderExploreView } from './views/exploreView.js';
import { renderPostDetailView } from './views/postDetailView.js';
import { renderProfileView } from './views/profileView.js';
import { renderNotificationsView } from './views/notificationsView.js';
import { renderSearchView } from './views/searchView.js';
import { renderSettingsView } from './views/settingsView.js';
import { renderAuthView } from './views/authView.js';

let currentUserState = null;

export function setCurrentUser(user) {
  currentUserState = user;
}

export function getCurrentUser() {
  return currentUserState;
}

export function navigate(path) {
  window.history.pushState({}, '', path);
  handleRoute();
}

export function initRouter(currentUser) {
  currentUserState = currentUser;

  // Intercept data-nav links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-nav]');
    if (link) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        e.preventDefault();
        navigate(href);
      }
    }
  });

  window.addEventListener('popstate', handleRoute);
  handleRoute();
}

export function handleRoute() {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const container = document.getElementById('main-view');
  if (!container) return;

  // Update active sidebar nav item
  updateActiveNav(path);

  // Scroll to top
  window.scrollTo(0, 0);

  // 1. Home Feed
  if (path === '/') {
    renderFeedView(container, currentUserState);
    return;
  }

  // 2. Explore & Tags
  if (path === '/explore') {
    const sort = searchParams.get('sort') || 'latest';
    renderExploreView(container, currentUserState, { sort });
    return;
  }
  const tagMatch = path.match(/^\/tag\/([a-zA-Z0-9_]+)$/);
  if (tagMatch) {
    renderExploreView(container, currentUserState, { tag: tagMatch[1] });
    return;
  }

  // 3. Post Details: /post/:id or /posts/:id
  const postMatch = path.match(/^\/posts?\/([0-9]+)$/);
  if (postMatch) {
    renderPostDetailView(container, parseInt(postMatch[1], 10), currentUserState);
    return;
  }

  // 4. Notifications
  if (path === '/notifications') {
    renderNotificationsView(container, currentUserState);
    return;
  }

  // 5. User Profiles: /profile or /u/:username
  if (path === '/profile') {
    if (currentUserState) {
      navigate(`/u/${currentUserState.username}`);
    } else {
      navigate('/login');
    }
    return;
  }
  const profileMatch = path.match(/^\/u\/([a-zA-Z0-9_]+)$/);
  if (profileMatch) {
    renderProfileView(container, profileMatch[1], currentUserState);
    return;
  }

  // 6. Search: /search?q=...
  if (path === '/search') {
    const q = searchParams.get('q') || '';
    renderSearchView(container, q, currentUserState);
    return;
  }

  // 7. Settings
  if (path === '/settings') {
    renderSettingsView(container, currentUserState);
    return;
  }

  // 8. Auth: /login, /register
  if (path === '/login') {
    renderAuthView(container, { mode: 'login' });
    return;
  }
  if (path === '/register') {
    renderAuthView(container, { mode: 'register' });
    return;
  }

  // 9. Custom 404 Fallback
  container.innerHTML = `
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 56px 24px; text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 14px;">🚀</div>
      <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 8px;">Lost in deep orbit (404)</h2>
      <p style="color: var(--text-muted); margin-bottom: 20px;">The coordinates you followed do not exist in this galaxy.</p>
      <a href="/" class="btn btn-primary" data-nav>Return to Safe Orbit</a>
    </div>
  `;
}

function updateActiveNav(path) {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    const route = item.dataset.route;
    if (route === '/' && path === '/') {
      item.classList.add('active');
    } else if (route && route !== '/' && path.startsWith(route)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
