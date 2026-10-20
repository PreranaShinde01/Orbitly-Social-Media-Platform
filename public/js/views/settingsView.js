import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderSettingsView(container, currentUser) {
  if (!currentUser) {
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 48px 24px; text-align: center;">
        <h3 style="margin-bottom: 8px;">Authentication Required</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">Please log in to manage your account settings.</p>
        <a href="/login" class="btn btn-primary" data-nav>Log In</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <!-- Settings Header -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">Account Settings</h2>
      <p style="color: var(--text-muted); font-size: 0.92rem;">Manage your security, login credentials, and preferences.</p>
    </div>

    <!-- Account Details Card -->
    <section class="sidebar-card" style="margin-bottom: 24px;">
      <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 16px;">Profile Information</h3>
      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.95rem;">
        <div>
          <span style="color: var(--text-muted); width: 120px; display: inline-block;">Username:</span>
          <strong>@${escapeHtml(currentUser.username)}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); width: 120px; display: inline-block;">Email:</span>
          <strong>${escapeHtml(currentUser.email || 'Not visible')}</strong>
        </div>
      </div>
    </section>

    <!-- Change Password Card -->
    <section class="sidebar-card">
      <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 16px;">Change Password</h3>
      <form id="form-change-password" style="max-width: 480px;">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" name="currentPassword" class="form-input" required placeholder="••••••••">
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" name="newPassword" class="form-input" required minlength="6" placeholder="At least 6 characters">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" name="confirmPassword" class="form-input" required minlength="6" placeholder="Repeat new password">
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top: 8px;">Update Password</button>
      </form>
    </section>
  `;

  // Submit Password Change
  const form = container.querySelector('#form-change-password');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
      await api.changePassword({ currentPassword, newPassword, confirmPassword });
      form.reset();
      showToast('Password updated successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
