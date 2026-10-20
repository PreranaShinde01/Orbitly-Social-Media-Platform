const { extractHashtags } = require('../utils/sanitize');
const queries = require('../db/queries');

/**
 * Service to process and sync hashtags for a given post
 */
function processPostHashtags(db, postId, content) {
  const tags = extractHashtags(content);
  queries.syncPostHashtags(db, postId, tags);
  return tags;
}

module.exports = {
  processPostHashtags
};
