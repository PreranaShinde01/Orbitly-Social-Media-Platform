/**
 * Relative time helper for human-readable timestamps
 * @param {string|Date} dateInput
 * @returns {string} e.g. "just now", "5m ago", "3h ago", "2d ago"
 */
function timeAgo(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput.toString().endsWith('Z') ? dateInput : `${dateInput}Z`);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 0) return 'just now';
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

/**
 * Format absolute date string
 * @param {string|Date} dateInput
 * @returns {string} e.g. "October 2026"
 */
function formatJoinDate(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput.toString().endsWith('Z') ? dateInput : `${dateInput}Z`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

module.exports = {
  timeAgo,
  formatJoinDate
};
