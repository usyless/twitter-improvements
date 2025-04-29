/**
 * @typedef {Object} MediaItem
 * @property {number} index
 * @property {string} save_id
 * @property {string} url
 * @property {'Image' | 'Video'} type
 */

/**
 * @typedef {Object} MediaTransfer
 * @property {string} id
 * @property {MediaItem[]} media
 */

/**
 * @typedef {'error' | 'saving' | 'copied_url' | 'history_remove'
 * | 'save_video_duplicate' | 'save_image'} NotificationTypes
 */

/**
 * @typedef {string} tweetId
 */

/**
 * @typedef {string} saveId
 */

/**
 * @typedef {1 | 2 | 3 | 4 | '1' | '2' | '3' | '4'} tweetNum
 */

/**
 * @typedef {Object} NameParts
 * @property {string} username
 * @property {tweetId} tweetId
 * @property {tweetNum} tweetNum
 * @property {string} [extension]
 */