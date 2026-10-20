/**
 * Extract distinct hashtags from post text
 * @param {string} text
 * @returns {string[]} array of unique lowercase hashtag names (without #)
 */
function extractHashtags(text) {
  if (!text || typeof text !== 'string') return [];
  const regex = /#([a-zA-Z0-9_]{1,50})\b/g;
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1].toLowerCase());
  }
  return Array.from(matches);
}

/**
 * Escapes HTML entities to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts hashtags into safe clickable links inside pre-escaped or escaped text
 * @param {string} rawText
 * @returns {string} HTML string with hashtag links
 */
function linkifyHashtags(rawText) {
  if (!rawText) return '';
  const escaped = escapeHtml(rawText);
  // Convert #tag to <a href="/tag/:name" class="hashtag" data-nav>#name</a>
  return escaped.replace(/#([a-zA-Z0-9_]{1,50})\b/g, (match, tag) => {
    return `<a href="/tag/${encodeURIComponent(tag.toLowerCase())}" class="hashtag" data-nav>#${tag}</a>`;
  });
}

module.exports = {
  extractHashtags,
  escapeHtml,
  linkifyHashtags
};
