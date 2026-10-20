import { api } from '../api.js';
import { showToast } from '../components/toast.js';

export function renderAuthView(container, options = {}) {
  const initialMode = options.mode || 'login';

  container.innerHTML = `
    <div style="max-width: 440px; margin: 40px auto; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 36px 32px; box-shadow: var(--shadow-lg);">
      <div style="text-align: center; margin-bottom: 28px;">
        <img src="/img/logo.svg" alt="Orbitly" style="width: 58px; height: 58px; margin: 0 auto 14px auto;">
        <h1 style="font-size: 1.8rem; font-weight: 800; background: var(--gradient-brand); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px;">Orbitly</h1>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Keep your circle in orbit.</p>
      </div>

      <!-- Auth Switcher Tabs -->
      <div style="display: flex; background: var(--bg-input); border-radius: var(--radius-full); padding: 4px; margin-bottom: 24px;">
        <button id="tab-login" class="btn ${initialMode === 'login' ? 'btn-primary' : 'btn-ghost'}" style="flex: 1; border-radius: var(--radius-full); padding: 8px 16px;">Log In</button>
        <button id="tab-register" class="btn ${initialMode === 'register' ? 'btn-primary' : 'btn-ghost'}" style="flex: 1; border-radius: var(--radius-full); padding: 8px 16px;">Register</button>
      </div>

      <!-- Login Form -->
      <form id="form-login" style="${initialMode === 'login' ? 'display: block;' : 'display: none;'}">
        <div class="form-group">
          <label class="form-label">Username or Email</label>
          <input type="text" name="identifier" class="form-input" placeholder="e.g. stella_nova or stella@orbitly.io" required>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-input" placeholder="••••••••" required>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--text-muted); cursor: pointer;">
            <input type="checkbox" name="rememberMe" checked> Remember me
          </label>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Log In</button>
      </form>

      <!-- Register Form -->
      <form id="form-register" style="${initialMode === 'register' ? 'display: block;' : 'display: none;'}">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input type="text" name="username" class="form-input" placeholder="e.g. cosmo_coder" required pattern="[a-zA-Z0-9_]{3,20}" title="3-20 characters, alphanumeric & underscore">
          <div class="form-helper">3 to 20 letters, numbers, or underscores</div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" name="email" class="form-input" placeholder="you@example.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input type="text" name="display_name" class="form-input" placeholder="What should we call you?">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-input" placeholder="At least 6 characters" required minlength="6">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input type="password" name="confirmPassword" class="form-input" placeholder="Repeat your password" required minlength="6">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-top: 10px;">Create Account</button>
      </form>
    </div>
  `;

  // Switch tabs
  const tabLogin = container.querySelector('#tab-login');
  const tabRegister = container.querySelector('#tab-register');
  const formLogin = container.querySelector('#form-login');
  const formRegister = container.querySelector('#form-register');

  tabLogin.onclick = () => {
    tabLogin.className = 'btn btn-primary';
    tabRegister.className = 'btn btn-ghost';
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
  };

  tabRegister.onclick = () => {
    tabRegister.className = 'btn btn-primary';
    tabLogin.className = 'btn btn-ghost';
    formRegister.style.display = 'block';
    formLogin.style.display = 'none';
  };

  // Submit Login
  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = formLogin.querySelector('button[type="submit"]');
    const formData = new FormData(formLogin);
    const identifier = formData.get('identifier');
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe') === 'on';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const res = await api.login({ identifier, password, rememberMe });
      showToast(`Welcome back, ${res.user.display_name}!`, 'success');
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
      import('../router.js').then(r => r.navigate('/'));
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  };

  // Submit Register
  formRegister.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = formRegister.querySelector('button[type="submit"]');
    const formData = new FormData(formRegister);
    const username = formData.get('username');
    const email = formData.get('email');
    const display_name = formData.get('display_name');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const res = await api.register({ username, email, display_name, password, confirmPassword });
      showToast(`Welcome to Orbitly, @${res.user.username}!`, 'success');
      window.dispatchEvent(new CustomEvent('auth-changed', { detail: res.user }));
      import('../router.js').then(r => r.navigate('/'));
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  };
}
