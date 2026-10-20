import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export async function renderNotificationsView(container, currentUser) {
  if (!currentUser) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
        <h3 style="margin-bottom: 8px;">Sign in to see notifications</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">Never miss a follow, comment, or like on your posts.</p>
        <a href="/login" class="btn btn-primary" data-nav>Log In</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <!-- Notifications Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-main);">Notifications</h2>
      <button id="btn-mark-all-read" class="btn btn-outline" style="font-size: 0.85rem; padding: 6px 14px;">Mark all as read</button>
    </div>

    <!-- Notifications List Stream -->
    <div id="notifications-stream" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
      <div class="skeleton-card" style="border: none; border-radius: 0;">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
      </div>
    </div>
  `;

  loadNotifications();

  // Mark all read button
  const markAllBtn = container.querySelector('#btn-mark-all-read');
  markAllBtn.onclick = async () => {
    try {
      await api.markAllAsRead();
      showToast('All notifications marked as read', 'success');
      window.dispatchEvent(new CustomEvent('notifications-read'));
      loadNotifications();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  async function loadNotifications() {
    try {
      const res = await api.getNotifications();
      const stream = container.querySelector('#notifications-stream');
      stream.innerHTML = '';

      if (!res.notifications || res.notifications.length === 0) {
        stream.innerHTML = `
          <div style="padding: 48px 24px; text-align: center;">
            <div style="font-size: 2.2rem; margin-bottom: 12px;">🔔</div>
            <h3 style="margin-bottom: 6px;">No notifications yet</h3>
            <p style="color: var(--text-muted);">When people interact with your posts or follow you, you'll see them here.</p>
          </div>
        `;
        return;
      }

      for (const n of res.notifications) {
        const item = document.createElement('div');
        item.className = `notification-item ${!n.is_read ? 'unread' : ''}`;
        item.id = `notif-${n.id}`;

        let iconSvg = '';
        let actionText = '';
        let targetHref = '#';

        if (n.type === 'like') {
          iconSvg = `<div class="notif-icon-badge like"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>`;
          actionText = 'liked your post';
          targetHref = `/post/${n.post_id}`;
        } else if (n.type === 'comment') {
          iconSvg = `<div class="notif-icon-badge comment"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>`;
          actionText = 'commented on your post';
          targetHref = `/post/${n.post_id}`;
        } else if (n.type === 'reply') {
          iconSvg = `<div class="notif-icon-badge reply"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg></div>`;
          actionText = 'replied to your comment';
          targetHref = `/post/${n.post_id}`;
        } else if (n.type === 'follow') {
          iconSvg = `<div class="notif-icon-badge follow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></div>`;
          actionText = 'started following you';
          targetHref = `/u/${encodeURIComponent(n.sender_username)}`;
        }

        item.innerHTML = `
          ${iconSvg}
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <div>
                <a href="/u/${encodeURIComponent(n.sender_username)}" data-nav style="font-weight: 700; color: var(--text-main);">
                  ${escapeHtml(n.sender_display_name)}
                </a>
                <span style="color: var(--text-muted); font-size: 0.92rem;"> ${actionText}</span>
              </div>
              <span style="font-size: 0.8rem; color: var(--text-subtle);">${n.relative_time || 'recently'}</span>
            </div>
            ${n.post_snippet ? `
              <div style="font-size: 0.88rem; color: var(--text-muted); margin-top: 6px; padding: 6px 12px; background: var(--bg-input); border-radius: var(--radius-sm); border-left: 3px solid var(--color-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                "${escapeHtml(n.post_snippet)}"
              </div>
            ` : ''}
          </div>
        `;

        item.onclick = async (_e) => {
          if (!n.is_read) {
            try {
              await api.markAsRead(n.id);
              item.classList.remove('unread');
              window.dispatchEvent(new CustomEvent('notifications-read'));
            } catch (err) {
              // ignore
            }
          }
          if (targetHref !== '#') {
            import('../router.js').then(r => r.navigate(targetHref));
          }
        };

        stream.appendChild(item);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
