'use strict';

let chromeMode = false;
if (typeof this.browser === 'undefined') {
    this.browser = chrome;
    chromeMode = true;
}

const DOWNLOAD_DB_VERSION = 1;

const requestMap = {
    save_media: download_media,
    download_history_has: download_history_has,
    download_history_remove: download_history_remove,
    download_history_clear: download_history_clear,
    download_history_add: ({id}) => download_history_add(id),
    download_history_add_all: download_history_add_all,
    download_history_get_all: download_history_get_all,

    get_settings: get_settings,
    get_default_settings: get_default_settings,

    open_tab: ({url}, sendResponse) => {
        void browser.tabs.create({url});
        sendResponse(true);
    },

    set_icon: setIcon
}

browser.runtime.onMessage.addListener((request, _, sendResponse) => {
    requestMap[request.type]?.(request, sendResponse);
    return true;
});

browser?.runtime?.onInstalled?.addListener?.((details) => {
    updateHistoryDb().then(() => {
        if (details.reason === 'install') void browser.tabs.create({url: browser.runtime.getURL('/settings/settings.html?installed=true')});
        else if (details.reason === 'update' && details.previousVersion != null) void migrateSettings(details.previousVersion);
    });
});

browser?.runtime?.onStartup?.addListener?.(setIcon);

browser?.contextMenus?.create?.(
    {
        id: "save-image",
        title: "Save Image",
        contexts: ["image", "link"],
        documentUrlPatterns: ['https://x.com/*'],
        targetUrlPatterns: ['https://pbs.twimg.com/*']
    }
);

browser?.contextMenus?.onClicked?.addListener?.((info) => {
    if (info.menuItemId === "save-image") saveImage(info.linkUrl ?? info.pageUrl, info.srcUrl);
});

const /** @type {Map<number, (string) => *>} */ DOWNLOAD_MAP = new Map();
browser?.downloads?.onChanged?.addListener?.(({error, state, id}) => {
    if (DOWNLOAD_MAP.has(id)) {
        if (state?.current === 'complete') {
            DOWNLOAD_MAP.delete(id);
        } else if (error?.current) {
            DOWNLOAD_MAP.get(id)(error.current);
            DOWNLOAD_MAP.delete(id);
        }
    }
});

const defaultSettings = {
    setting: {
        vx_button: true,
        media_download_button: true,
        inline_download_button: false,
        bookmark_on_photo_page: false,
    },

    listeners: {
        vx_copy_shortcut: true
    },

    vx_preferences: {
        url_prefix: 'fixvx.com',
        custom_url: '',
    },

    image_preferences: {
        image_button_position: '0',
        image_button_scale: '1',
        image_button_height_value: '1',
        image_button_height_value_small: '1',
        small_image_size_threshold: '350',
        image_button_width_value: '1'
    },

    download_preferences: {
        save_as_prompt: 'browser',
        save_as_prompt_shift: 'browser',
        save_as_prompt_ctrl: 'browser',
        save_directory: '',
        save_directory_shift: '',
        save_directory_ctrl: '',
        save_format: '[twitter] {username} - {tweetId} - {tweetNum}',
        download_all_near_click: false,
        download_all_override_saved: true,
        download_history_enabled: true,
        download_history_prevent_download: false,
    },

    style: {
        hide_grok: false,
        hide_premium: false,
        hide_post_reply_sections: false,
        hide_tweet_view_count: false,
        hide_tweet_share_button: false,
        hide_replies_button_tweet: false,
        hide_retweet_button_tweet: false,
        hide_like_button_tweet: false,
        hide_bookmark_button_tweet: false,
        hide_notifications: false,
        hide_messages: false,
        hide_jobs: false,
        hide_lists: false,
        hide_communities: false,
        hide_create_your_space: false,
        hide_post_button: false,
        hide_follower_requests: false,
        hide_verified_orgs: false,
        hide_monetization: false,
        hide_ads_button: false,
        hide_whats_happening: false,
        hide_who_to_follow: false,
        hide_relevant_people: false,
        hide_live_on_x: false,
        hide_sidebar_footer: false,

        tweet_button_positions: '{replies}{retweets}{likes}{views}{bookmark}{share}{download}{copy}'
    },

    hidden_extension_notifications: {
        save_media: false,
        save_media_duplicate: false,
        history_remove: false,
        copied_url: false,
    },

    extension_icon: {
        custom: false,
    }
}

const Settings = { // Setting handling
    defaults: defaultSettings,

    loaded: false,
    loading: false,
    promiseQueue: [],

    getSettings: () => new Promise((resolve) => {
        if (Settings.loading) Settings.promiseQueue.push(resolve);
        else if (Settings.loaded) resolve();
        else {
            Settings.loading = true;
            Settings.loadSettings().then(() => {
                Settings.loading = false;
                Settings.loaded = true;
                for (const promise of Settings.promiseQueue) promise();
                delete Settings.promiseQueue;
                resolve();
            });
        }
    }),

    loadSettings: () => new Promise(resolve => {
        browser.storage.local.get().then((s) => {
            for (const setting in defaultSettings) Settings[setting] = {...defaultSettings[setting], ...s[setting]};
            resolve();
        });
    }),
}

/** @typedef {typeof defaultSettings} Settings */

/** @typedef {Settings & { loadSettings: *, loadDefaults: * }} LoadedSettings */

function get_settings(_, sendResponse) {
    Settings.getSettings().then(() => {
        const data = {};
        for (const setting in defaultSettings) data[setting] = Settings[setting];
        sendResponse(data);
    });
}

function get_default_settings(_, sendResponse) {
    sendResponse(defaultSettings);
}

browser.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        Settings.loadSettings().then(() => send_to_all_tabs({type: 'settings_update', changes}));
    }
});

/**
 * @param {string} url
 * @param {string} filename
 * @param {EventModifiers} [modifiers]
 */
function download(url, filename, {shift, ctrl}={}) {
    return new Promise((resolve, reject) => {
        /Android/i.test(navigator.userAgent)
            ? resolve(sendToTab({ type: 'download', url, filename }) || -1)
            : Settings.getSettings().then(() => {
            const {
                save_as_prompt, save_as_prompt_shift, save_as_prompt_ctrl,
                save_directory, save_directory_shift, save_directory_ctrl
            } = Settings.download_preferences;

            const [directory, save_as] = (shift) ? [save_directory_shift, save_as_prompt_shift]
                : (ctrl) ? [save_directory_ctrl, save_as_prompt_ctrl] : [save_directory, save_as_prompt];

            browser.downloads.download({
                url, saveAs: (save_as === 'on') ? true : (save_as === 'off') ? false : undefined,
                filename: (directory?.length > 0 ? `${directory}${directory.endsWith('/') ? '' : '/'}` : '') + filename
            }).then(resolve, reject);
        });
    });
}

const singleTabQuery = {active: true, currentWindow: true, discarded: false, status: 'complete', url: '*://*.x.com/*'};
function sendToTab(message) {
    browser.tabs.query(singleTabQuery).then((tabs) => {
        void browser.tabs.sendMessage(tabs[0].id, message);
    });
}

const tabQuery = {discarded: false, status: 'complete', url: '*://*.x.com/*'};
function send_to_all_tabs(message) {
    browser.tabs.query(tabQuery).then((tabs) => {
        for (const tab of tabs) void browser.tabs.sendMessage(tab.id, message);
    });
}

/**
 * @param {string} url
 * @returns {Omit<NameParts, 'extension'>}
 */
function getNamePartsGeneric(url) {
    const parts = url.split("/");
    return {
        username: parts[3],
        tweetId: parts[5],
        tweetNum: parts[7],
    }
}

/**
 * @param {string} url
 * @param {string} sourceURL
 * @returns {NameParts}
 */
function getNamePartsImage(url, sourceURL) {
    return {
        ...getNamePartsGeneric(url),
        extension: sourceURL.match(/format=(\w+)/)[1],
        imageId: sourceURL.substring(sourceURL.lastIndexOf('/') + 1).split('?')[0],
    }
}

/**
 * @param {string} url
 * @param {string} sourceURL
 * @returns {NameParts}
 */
function getNamePartsVideo(url, sourceURL) {
    return {
        ...getNamePartsGeneric(url),
        extension: sourceURL.includes(".mp4") ? "mp4" : "gif"
    }
}

/**
 * @param {NameParts} parts
 * @returns {saveId}
 */
function formatPartsForStorage(parts) {
    return `${parts.tweetId}-${parts.tweetNum}`
}

/**
 * @param {NameParts} parts
 * @param {string} save_format
 * @returns {string}
 */
function formatFilename(parts, save_format) {
    return save_format
            .replaceAll('{username}', parts.username)
            .replaceAll('{tweetId}', parts.tweetId)
            .replaceAll('{tweetNum}', parts.tweetNum ?? '')
            .replaceAll('{imageId}', parts.imageId ?? '')
            .replaceAll('{extension}', parts.extension ?? '') +
        (parts.extension ? `.${parts.extension}` : '');
}

/**
 * @param {string} url
 * @param {MediaItem[]} media
 * @param {EventModifiers} modifiers
 * @param {function(any)} sendResponse
 */
function download_media({url, media, modifiers}, sendResponse) {
    Settings.getSettings().then(() => {
        const {save_format, download_history_enabled} = Settings.download_preferences;
        for (const {type, url: sourceURL, index, save_id} of media) {
            const parts = ((type === 'Video') ? getNamePartsVideo : getNamePartsImage)(url, sourceURL);
            parts.tweetNum = index;
            if (download_history_enabled) void download_history_add(save_id);
            const onError = (error) => download_history_remove({id: save_id}, () => sendToTab({type: 'error', message: `Failed to download media with error ${error}\nClick here to see the tweet.`, url}));
            download(sourceURL, formatFilename(parts, save_format), modifiers).then((downloadId) => {
                if (downloadId === undefined) onError("Failed to start download");
                else if (downloadId === -1) void 0 // android, ignore it
                else DOWNLOAD_MAP.set(downloadId, onError);
            }, onError);
        }
        sendResponse({status: 'success'});
    });
}

// only used for right click menu
/**
 * @param {string} url
 * @param {string} sourceURL
 */
function saveImage(url, sourceURL) {
    const parts = getNamePartsImage(url, sourceURL);
    download_media( {url, media: [{
            index: parts.tweetNum,
            save_id: formatPartsForStorage(parts),
            url: sourceURL.replace(/name=[^&]*/, "name=orig"),
            type: 'Image'
        }], modifiers: {shift: false, ctrl: false}}, () => sendToTab({type: 'image_saved'}))
}

const migrations = [
    ['1.4', () => new Promise((resolve) => {
        browser.storage.local.get().then(async (/** @type {Settings} */s) => {
            const setting = s?.setting;
            if (setting != null) {
                if (setting.image_button != null) {
                    setting.media_download_button = setting.image_button;
                    delete setting.image_button;
                }

                if (setting.inline_image_button != null) {
                    setting.inline_download_button = setting.inline_image_button;
                    delete setting.inline_image_button;
                }

                if (setting.video_button != null) {
                    setting.inline_download_button ||= setting.video_button;
                    delete setting.video_button;
                }
            }
            delete s.video_preferences;
            delete s.video_details;

            const notifs = s?.hidden_extension_notifications;
            if (notifs != null) {
                if (notifs.save_image != null) {
                    notifs.save_media = notifs.save_image;
                    delete notifs.save_image;
                }
                if (notifs.save_video != null) {
                    notifs.save_media ||= notifs.save_video;
                    delete notifs.save_video;
                }

                if (notifs.save_image_duplicate != null) {
                    notifs.save_media_duplicate = notifs.save_image_duplicate;
                    delete notifs.save_image_duplicate;
                }
                if (notifs.save_video_duplicate != null) {
                    notifs.save_media_duplicate ||= notifs.save_video_duplicate;
                    delete notifs.save_video_duplicate;
                }
            }

            const image = s?.image_preferences;
            if (image != null) {
                if (image.long_image_button != null) {
                    if (image.long_image_button === true) {
                        image.image_button_width_value = '100';
                    }
                    delete image.long_image_button;
                }
                if (image.download_history_enabled != null) {
                    s.download_preferences ||= {};
                    s.download_preferences.download_history_enabled = image.download_history_enabled;
                    delete image.download_history_enabled;
                }
                if (image.download_history_prevent_download != null) {
                    s.download_preferences ||= {};
                    s.download_preferences.download_history_prevent_download = image.download_history_prevent_download;
                    delete image.download_history_prevent_download;
                }
            }

            await browser.storage.local.set(s);

            resolve();
        });
    })],
    ['1.1.1.4', () => new Promise((resolve) => {
        getHistoryDB().then((db) => {
            browser.storage.local.get(['download_history']).then(async (r) => {
                const history = r.download_history ?? {};
                const transaction = db.transaction(['download_history'], 'readwrite');
                if (Object.keys(history).length > 0) {
                    const objectStore = transaction.objectStore('download_history');
                    for (const saved_image in history) objectStore.put({saved_image});
                }

                await browser.storage.local.remove('download_history');

                transaction.addEventListener('complete', resolve);
            });
        });
    })],
    ['1.1.1.1', () => new Promise((resolve) => {
        browser.storage.local.get().then(async (s) => {
            const {
                // styles
                hide_notifications, hide_messages, hide_grok, hide_jobs, hide_lists, hide_communities,
                hide_premium, hide_verified_orgs, hide_monetization, hide_ads_button, hide_whats_happening,
                hide_who_to_follow, hide_relevant_people, hide_create_your_space, hide_post_button,
                hide_follower_requests, hide_live_on_x, hide_post_reply_sections, hide_sidebar_footer,
                // settings
                vx_button, video_button, image_button, show_hidden,
                // preferences
                url_prefix, long_image_button, custom_url, download_history_enabled,
                download_history_prevent_download, download_history,
            } = s;

            await browser.storage.local.clear();
            const newSettings = {style: {}, setting: {}, vx_preferences: {}, image_preferences: {}};

            if (hide_notifications != null) newSettings.style.hide_notifications = hide_notifications;
            if (hide_messages != null) newSettings.style.hide_messages = hide_messages;
            if (hide_grok != null) newSettings.style.hide_grok = hide_grok;
            if (hide_jobs != null) newSettings.style.hide_jobs = hide_jobs;
            if (hide_lists != null) newSettings.style.hide_lists = hide_lists;
            if (hide_communities != null) newSettings.style.hide_communities = hide_communities;
            if (hide_premium != null) newSettings.style.hide_premium = hide_premium;
            if (hide_verified_orgs != null) newSettings.style.hide_verified_orgs = hide_verified_orgs;
            if (hide_monetization != null) newSettings.style.hide_monetization = hide_monetization;
            if (hide_ads_button != null) newSettings.style.hide_ads_button = hide_ads_button;
            if (hide_whats_happening != null) newSettings.style.hide_whats_happening = hide_whats_happening;
            if (hide_who_to_follow != null) newSettings.style.hide_who_to_follow = hide_who_to_follow;
            if (hide_relevant_people != null) newSettings.style.hide_relevant_people = hide_relevant_people;
            if (hide_create_your_space != null) newSettings.style.hide_create_your_space = hide_create_your_space;
            if (hide_post_button != null) newSettings.style.hide_post_button = hide_post_button;
            if (hide_follower_requests != null) newSettings.style.hide_follower_requests = hide_follower_requests;
            if (hide_live_on_x != null) newSettings.style.hide_live_on_x = hide_live_on_x;
            if (hide_post_reply_sections != null) newSettings.style.hide_post_reply_sections = hide_post_reply_sections;
            if (hide_sidebar_footer != null) newSettings.style.hide_sidebar_footer = hide_sidebar_footer;

            if (vx_button != null) newSettings.setting.vx_button = vx_button;
            if (video_button != null) newSettings.setting.video_button = video_button;
            if (image_button != null) newSettings.setting.image_button = image_button;
            if (show_hidden != null) newSettings.setting.show_hidden = show_hidden;

            if (url_prefix != null) {
                if (url_prefix === 'vx') newSettings.vx_preferences.url_prefix = 'fixvx.com';
                else if (url_prefix === 'fx') newSettings.vx_preferences.url_prefix = 'fixupx.com';
                else newSettings.vx_preferences.url_prefix = url_prefix;
            }
            if (custom_url != null) newSettings.vx_preferences.custom_url = custom_url;

            if (download_history_prevent_download != null) newSettings.image_preferences.download_history_prevent_download = download_history_prevent_download;
            if (long_image_button != null) newSettings.image_preferences.long_image_button = long_image_button;
            if (download_history_enabled != null) newSettings.image_preferences.download_history_enabled = download_history_enabled;

            if (download_history != null) newSettings.download_history = download_history;

            await browser.storage.local.set(newSettings);

            resolve();
        });
    })]
]

// migrating to new settings format
/** @param {string} previousVersion */
async function migrateSettings(previousVersion) {
    previousVersion = (previousVersion?.match?.(/\d+/g) ?? []).join('');
    /**
     * @param {string} maxVersion
     * @returns {boolean}
     */
    const previousIsBelow = (maxVersion) => {
        maxVersion = (maxVersion?.match?.(/\d+/g) ?? []).join('');
        const length = Math.max(previousVersion.length, maxVersion.length);
        return +previousVersion.padEnd(length, '0') < +maxVersion.padEnd(length, '0');
    }

    const m = [];
    for (const [version, migration] of migrations) {
        if (previousIsBelow(version)) m.push(migration);
        else break;
    }
    for (let i = m.length - 1; i >= 0; --i) await m[i]();
}

function updateHistoryDb() {
    return new Promise((resolve) => {
        const idb = indexedDB.open('download_history', DOWNLOAD_DB_VERSION);
        idb.addEventListener('upgradeneeded', (event) => {
            const db = event.target.result;

            if (event.oldVersion <= 0) {
                const objectStore = db.createObjectStore('download_history', {keyPath: 'saved_image'});
                objectStore.createIndex('saved_image', 'saved_image', {unique: true});
            }
        });
        idb.addEventListener('success', resolve);
    });
}

let download_history_db;
let db_opening = false;
const pending_db_promises = [];
function getHistoryDB() {
    return new Promise((resolve) => {
        if (download_history_db != null) resolve(download_history_db);
        else if (db_opening) pending_db_promises.push(resolve);
        else {
            db_opening = true;
            indexedDB.open('download_history', DOWNLOAD_DB_VERSION)
                .addEventListener('success', (e) => {
                    download_history_db = e.target.result;
                    db_opening = false;
                    resolve(download_history_db);

                    for (const promise of pending_db_promises) promise(download_history_db);
                    pending_db_promises.length = 0;
                });
        }
    });
}

/**
 * @param {saveId} id
 * @param {function(any): any} sendResponse
 */
function download_history_has({id}, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction(['download_history'], 'readonly').objectStore('download_history').index('saved_image')
            .get(id).addEventListener('success', (e) => {
            if (e.target.result) sendResponse(true);
            else sendResponse(false);
        });
    });
}

/** @param {saveId} saved_image */
function download_history_add(saved_image) {
    return new Promise((resolve) => {
        getHistoryDB().then((db) => {
            db.transaction(['download_history'], 'readwrite').objectStore('download_history')
                .put({saved_image}).addEventListener('success', () => {
                send_to_all_tabs({type: 'history_change_add', id: saved_image});
                resolve();
            });
        });
    });
}

/**
 * @param {saveId} id
 * @param {function(any): any} [sendResponse]
 */
function download_history_remove({id}, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction(['download_history'], 'readwrite').objectStore('download_history')
            .delete(id).addEventListener('success', () => {
                send_to_all_tabs({type: 'history_change_remove', id});
                sendResponse?.(true);
        });
    });
}

function download_history_clear(_, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction(['download_history'], 'readwrite').objectStore('download_history')
            .clear().addEventListener('success', () => {
                send_to_all_tabs({type: 'history_change'});
                sendResponse(true);
        });
    })
}

function download_history_add_all(request, sendResponse) {
    getHistoryDB().then((db) => {
        const transaction = db.transaction(['download_history'], 'readwrite');
        const objectStore = transaction.objectStore('download_history');

        for (const saved_image of request.saved_images) objectStore.put({saved_image});

        transaction.addEventListener('complete', () => {
            send_to_all_tabs({type: 'history_change'});
            sendResponse(true);
        });
    });
}

function download_history_get_all(_, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction(['download_history'], 'readonly').objectStore('download_history')
            .getAllKeys().addEventListener('success', (e) => {
                const valid = [];
                for (const /** @type {saveId} */ saveId of e.target.result) {
                    const [tweetId, tweetNum] = saveId.split('-');
                    if (tweetId && tweetNum) valid.push(saveId);
                    else download_history_remove({id: saveId});
                }

                sendResponse(valid);
        })
    });
}

// icon changing
function setIcon(_, sendResponse) {
    Settings.getSettings().then(() => {
        ((chromeMode) ? browser.action : browser.browserAction).setIcon((Settings.extension_icon.custom)
            ? ((chromeMode) ? {
                path: {
                    "16": "/icons/alt/icon-16.png",
                    "32": "/icons/alt/icon-32.png",
                    "48": "/icons/alt/icon-48.png",
                    "96": "/icons/alt/icon-96.png",
                    "128": "/icons/alt/icon-128.png"
                }
            } : { path: "/icons/alt/icon.svg" }) // firefox
            : ((chromeMode) ? {
                path: {
                    "16": "/icons/icon-16.png",
                    "32": "/icons/icon-32.png",
                    "48": "/icons/icon-48.png",
                    "96": "/icons/icon-96.png",
                    "128": "/icons/icon-128.png"
                }
            } : { path: "/icons/icon.svg" }) // firefox
        );
        sendResponse?.(true);
    });
}
setIcon();