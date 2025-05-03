/**
 * @typedef {Object} MediaItem
 * @property {tweetNum} index
 * @property {saveId} save_id
 * @property {string} url
 * @property {('Image' | 'Video')} type
 */

/**
 * @typedef {Object} MediaTransfer
 * @property {tweetId} id
 * @property {MediaItem[]} media
 */

/**
 * @typedef {('error' | 'copied_url' | 'history_remove'
 * | 'save_media_duplicate' | 'save_media')} NotificationTypes
 */

/** @typedef {string} tweetId */
/** @typedef {(1 | 2 | 3 | 4 | '1' | '2' | '3' | '4')} tweetNum */
/** @typedef {string} saveId */

/**
 * @typedef {Object} NameParts
 * @property {string} username
 * @property {tweetId} tweetId
 * @property {tweetNum} tweetNum
 * @property {string} extension
 */

/**
 * @typedef {Object} EventListeners
 * @property {string} type
 * @property {function} listener
 */

/**
 * @typedef {Object} EventModifiers
 * @property {boolean} shift
 * @property {boolean} ctrl
 */

/**
 * @typedef {Object} option
 * @property {string} [name]
 * @property {string} [description]
 * @property {string} [button]
 * @property {string} [category]
 * @property {({ name: string, type: string })[]} [choices]
 * @property {('text' | 'choice' | 'button' | 'number' | 'quickPick' | 'break')} [type]
 * @property {[string, string][]} [quickPicks]
 * @property {function(number): boolean} [validate]
 * @property {function(HTMLElement): *} [post]
 * @property {Record<string, string>} [attributes]
 * @property {function(): *} [onclick]
 * @property {string[]} [class]
 * @property {function(): *} [init]
 * @property {boolean} [noDefaultListener]
 */
