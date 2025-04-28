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