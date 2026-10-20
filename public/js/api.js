/**
 * Orbitly API Client Module
 * Provides unified fetch wrappers, CSRF token attachment, and error handling.
 */

function getCsrfToken() {
  const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : '';
}

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers ? { ...options.headers } : {};

  // Attach CSRF header on state-changing requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }

  // Handle FormData vs JSON
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, {
    ...options,
    method,
    headers,
    body
  });

  // Parse JSON response
  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => apiRequest('/api/auth/register', { method: 'POST', body }),
  login: (body) => apiRequest('/api/auth/login', { method: 'POST', body }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  changePassword: (body) => apiRequest('/api/auth/change-password', { method: 'POST', body }),
  getMe: () => apiRequest('/api/auth/me'),

  // Posts
  getFeed: (page = 1) => apiRequest(`/api/posts/feed?page=${page}`),
  getExplore: (sort = 'latest', page = 1) => apiRequest(`/api/posts/explore?sort=${sort}&page=${page}`),
  getPost: (id) => apiRequest(`/api/posts/${id}`),
  getByTag: (tag, page = 1) => apiRequest(`/api/posts/tag/${encodeURIComponent(tag)}?page=${page}`),
  createPost: (formData) => apiRequest('/api/posts', { method: 'POST', body: formData }),
  updatePost: (id, body) => apiRequest(`/api/posts/${id}`, { method: 'PUT', body }),
  deletePost: (id) => apiRequest(`/api/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => apiRequest(`/api/posts/${id}/like`, { method: 'POST' }),
  unlikePost: (id) => apiRequest(`/api/posts/${id}/like`, { method: 'DELETE' }),
  getPostLikes: (id) => apiRequest(`/api/posts/${id}/likes`),

  // Comments
  getComments: (postId) => apiRequest(`/api/posts/${postId}/comments`),
  createComment: (postId, body) => apiRequest(`/api/posts/${postId}/comments`, { method: 'POST', body }),
  deleteComment: (commentId) => apiRequest(`/api/comments/${commentId}`, { method: 'DELETE' }),
  likeComment: (commentId) => apiRequest(`/api/comments/${commentId}/like`, { method: 'POST' }),
  unlikeComment: (commentId) => apiRequest(`/api/comments/${commentId}/like`, { method: 'DELETE' }),

  // Users
  getUserProfile: (username) => apiRequest(`/api/users/${encodeURIComponent(username)}`),
  updateProfile: (formData) => apiRequest('/api/users/me', { method: 'PUT', body: formData }),
  getUserPosts: (username, page = 1) => apiRequest(`/api/users/${encodeURIComponent(username)}/posts?page=${page}`),
  getUserLikedPosts: (username, page = 1) => apiRequest(`/api/users/${encodeURIComponent(username)}/liked?page=${page}`),
  getFollowers: (username) => apiRequest(`/api/users/${encodeURIComponent(username)}/followers`),
  getFollowing: (username) => apiRequest(`/api/users/${encodeURIComponent(username)}/following`),
  followUser: (username) => apiRequest(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'POST' }),
  unfollowUser: (username) => apiRequest(`/api/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),
  getSuggestions: () => apiRequest('/api/users/suggestions'),

  // Search
  search: (q, type = '') => apiRequest(`/api/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`),

  // Notifications
  getNotifications: (page = 1) => apiRequest(`/api/notifications?page=${page}`),
  getUnreadCount: () => apiRequest('/api/notifications/unread-count'),
  markAsRead: (id) => apiRequest(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllAsRead: () => apiRequest('/api/notifications/read-all', { method: 'POST' })
};
