'use strict';

let chromeMode = false;
// set browser to chrome if not in firefox
/** @type {typeof browser} */
const extension = typeof browser !== 'undefined' ? browser : (() => {
    chromeMode = true;
    return chrome;
})();

const isAndroid = /Android/.test(navigator.userAgent);
const isEdgeAndroid = /EdgA\//.test(navigator.userAgent);

const CONSTRAINTS = {
    BOOLEAN: a => typeof a === 'boolean',
    NUMBERLIKE: a => typeof a === 'string' && !Number.isNaN(+a),
    STRING: a => typeof a === 'string',
    VALUES: (...v) => a => v.includes(a),
    COMBINATOR: (...v) => a => v.every(f => f(a)),
    GT: v => a => +a > v,
    GTE: v => a => +a >= v,
    LT: v => a => +a < v,
    LTE: v => a => +a <= v,
    MOBILE: () => isAndroid,
    DESKTOP: () => !isAndroid,
    MUST_INCLUDE: (...v) => a => v.every(i => a.includes(i))
}

const defaultSettings = {
    setting: {
        vx_button: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        },
        media_download_button: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        },
        inline_download_button: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        bookmark_on_photo_page: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_bottom_bar_completely: {
            default: false,
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.BOOLEAN, CONSTRAINTS.MOBILE)
        }
    },

    listeners: {
        vx_copy_shortcut: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        }
    },

    contextmenu: {
        save_image: {
            default: true,
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.BOOLEAN, CONSTRAINTS.DESKTOP)
        }
    },

    vx_preferences: {
        url_prefix: {
            default: 'fixvx.com',
            validate: CONSTRAINTS.VALUES('fixvx.com', 'fixupx.com', 'x.com')
        },
        custom_url: {
            default: '',
            validate: CONSTRAINTS.STRING
        },
    },

    image_preferences: {
        image_button_position: {
            default: '0',
            validate: CONSTRAINTS.VALUES('0', '1', '2', '3')
        },
        image_button_scale: {
            default: '1',
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.NUMBERLIKE, CONSTRAINTS.GT(0))
        },
        image_button_height_value: {
            default: '1',
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.NUMBERLIKE, CONSTRAINTS.GT(0), CONSTRAINTS.LTE(100))
        },
        image_button_height_value_small: {
            default: '1',
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.NUMBERLIKE, CONSTRAINTS.GT(0), CONSTRAINTS.LTE(100))
        },
        small_image_size_threshold: {
            default: '350',
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.NUMBERLIKE, CONSTRAINTS.GT(0))
        },
        image_button_width_value: {
            default: '1',
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.NUMBERLIKE, CONSTRAINTS.GT(0), CONSTRAINTS.LTE(100))
        }
    },

    download_preferences: {
        save_as_prompt: {
            default: 'browser',
            validate: CONSTRAINTS.VALUES('browser', 'off', 'on')
        },
        save_as_prompt_shift: {
            default: 'browser',
            validate: CONSTRAINTS.VALUES('browser', 'off', 'on')
        },
        save_as_prompt_ctrl: {
            default: 'browser',
            validate: CONSTRAINTS.VALUES('browser', 'off', 'on')
        },
        save_as_prompt_alt: {
            default: 'browser',
            validate: CONSTRAINTS.VALUES('browser', 'off', 'on')
        },
        save_directory: {
            default: '',
            validate: CONSTRAINTS.STRING
        },
        save_directory_shift: {
            default: '',
            validate: CONSTRAINTS.STRING
        },
        save_directory_ctrl: {
            default: '',
            validate: CONSTRAINTS.STRING
        },
        save_directory_alt: {
            default: '',
            validate: CONSTRAINTS.STRING
        },
        save_format: {
            default: '[twitter] {username} - {tweetId} - {tweetNum}',
            validate: CONSTRAINTS.STRING
        },
        download_all_near_click: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        download_all_override_saved: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        },
        download_history_enabled: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        },
        download_history_prevent_download: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },

        use_download_progress: {
            default: false,
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.BOOLEAN, CONSTRAINTS.MOBILE)
        },
        download_picker_on_media_page: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        },
        hover_thumbnail_timeout: {
            default: "-1",
            validate: CONSTRAINTS.NUMBERLIKE
        },

        disable_cancelled_download_notification: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        }
    },

    style: {
        hide_grok: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_premium: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_post_reply_sections: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_subscribe_buttons: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_tweet_view_count: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_tweet_share_button: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_replies_button_tweet: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_retweet_button_tweet: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_like_button_tweet: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_bookmark_button_tweet: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_notifications: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_messages: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_chat: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_jobs: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_lists: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_communities: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_create_your_space: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_post_button: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_follower_requests: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_verified_orgs: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_monetization: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_ads_button: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_todays_news: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_whats_happening: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_who_to_follow: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_relevant_people: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_live_on_x: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        hide_sidebar_footer: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },

        tweet_button_positions: {
            default: '{replies}{retweets}{likes}{views}{bookmark}{share}{download}{copy}',
            validate: CONSTRAINTS.COMBINATOR(CONSTRAINTS.STRING, CONSTRAINTS.MUST_INCLUDE(
                '{replies}', '{retweets}', '{likes}', '{views}', '{bookmark}', '{share}', '{download}', '{copy}'
            ))
        },
        more_media_icon_visible: {
            default: true,
            validate: CONSTRAINTS.BOOLEAN
        }
    },

    hidden_extension_notifications: {
        save_media: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        save_media_duplicate: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        history_remove: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        history_add: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
        copied_url: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
    },

    extension_icon: {
        custom: {
            default: false,
            validate: CONSTRAINTS.BOOLEAN
        },
    }
}

const defaultSettingToSetting = (set) => {
    const out = {};
    for (const s in set) out[s] = set[s].default;
    return out;
}

const Settings = { // Setting handling
    defaults: defaultSettings,

    getSettings: (() => {
        let loaded = false;
        let loading = false;
        const promiseQueue = [];
        return () => new Promise((resolve) => {
            if (loaded) resolve();
            else if (loading) promiseQueue.push(resolve);
            else {
                loading = true;
                Settings.loadSettings().then(() => {
                    loaded = true;
                    for (const promise of promiseQueue) promise();
                    resolve();
                    promiseQueue.length = 0;
                });
            }
        });
    })(),

    loadSettings: () => new Promise(resolve => {
        extension.storage.local.get().then((storage) => {
            let updateStorage = false;
            storage ||= {};
            const keysToDelete = [];

            for (const category in defaultSettings) {
                const defaults = defaultSettings[category];
                Settings[category] = defaultSettingToSetting(defaults);
                const settingsCategory = Settings[category];

                if (storage[category] == null) {
                    continue;
                } else if (typeof storage[category] !== 'object') {
                    updateStorage = true;
                    keysToDelete.push(category);
                    delete storage[category];
                    continue;
                }

                const storageCategory = storage[category];

                for (const setting in storageCategory) {
                    if (Object.hasOwn(defaults, setting)
                        && defaults[setting].validate(storageCategory[setting])
                        && (defaults[setting].default !== storageCategory[setting])) {
                        settingsCategory[setting] = storageCategory[setting];
                    } else {
                        updateStorage = true;
                        delete storageCategory[setting];
                    }
                }
            }

            for (const setting in storage) {
                if ((!Object.hasOwn(defaultSettings, setting))
                    || (typeof storage[setting] !== 'object')
                    || ((typeof storage[setting] === 'object') && (Object.keys(storage[setting]).length <= 0))) {
                    updateStorage = true;
                    keysToDelete.push(setting);
                    delete storage[setting];
                }
            }

            if (updateStorage) {
                extension.storage.onChanged.removeListener(onSettingsChangeListener);
                Promise.allSettled([
                    extension.storage.local.remove(keysToDelete),
                    extension.storage.local.set(storage)
                ]).then(() => {
                    extension.storage.onChanged.addListener(onSettingsChangeListener);
                    resolve();
                });
            }
            else resolve();
        });
    }),
}

/** @typedef {typeof defaultSettings} Settings */

/** @typedef {Settings & { loadSettings: *, loadDefaults: * }} LoadedSettings */

const DOWNLOAD_DB_VERSION = 2;

const getHistoryDB = (() => {
    let download_history_db;
    let db_opening = false;
    const pending_db_promises = [];
    return () => new Promise((resolve, reject) => {
        if (download_history_db != null) resolve(download_history_db);
        else if (db_opening) pending_db_promises.push({ resolve, reject });
        else {
            db_opening = true;
            const request = indexedDB.open('download_history', DOWNLOAD_DB_VERSION);

            request.onsuccess = (e) => {
                download_history_db = e.target.result;
                db_opening = false;

                for (const { resolve } of pending_db_promises) resolve(download_history_db);
                resolve(download_history_db);
                pending_db_promises.length = 0;
            };

            request.onerror = (e) => {
                const error = e.target.error;
                console.error("Error opening downloads database: ", error);

                db_opening = false;

                for (const { reject } of pending_db_promises) reject(error);
                reject(error);
                pending_db_promises.length = 0;
            };

            request.onupgradeneeded = async (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;

                // remove unnecessary index
                if (event.oldVersion <= 1) {
                    if (db.objectStoreNames.contains('download_history')) {
                        // update to new version
                        const keys = [];
                        await new Promise((resolve) => {
                            transaction.objectStore('download_history')
                                .getAllKeys().addEventListener('success', (e) => {
                                for (const saveId of e.target.result) keys.push(saveId);
                                resolve();
                            });
                        });
                        db.deleteObjectStore('download_history');
                        const objectStore = db.createObjectStore('download_history');
                        for (const key of keys) objectStore.put(true, key);
                    } else {
                        // just create without the update process
                        db.createObjectStore('download_history');
                    }
                }
            };
        }
    });
})();

const onSettingsChangeListener = (changes, namespace) => {
    if (namespace === 'local') {
        Settings.loadSettings().then(() => {
            send_to_all_tabs({type: 'settings_update', changes});
            if (Object.hasOwn(changes, 'contextmenu')) void setupContextMenus();
            if (Object.hasOwn(changes, 'extension_icon')) setIcon();
        });
    }
}
extension.storage.onChanged.addListener(onSettingsChangeListener);

const requestMap = {
    save_media: download_media,
    download_history_has: download_history_has,
    download_history_remove: download_history_remove,
    download_history_clear: download_history_clear,
    download_history_add: ({id}, sendResponse) => {
        download_history_add(id).then(() => {
            sendResponse(true);
        });
    },
    download_history_add_all: download_history_add_all,
    download_history_get_all: download_history_get_all,

    get_settings: (_, sendResponse) => {
        Settings.getSettings().then(() => {
            const data = {};
            for (const setting in defaultSettings) data[setting] = Settings[setting];
            sendResponse(data);
        });
    },
    get_default_settings: (_, sendResponse) => {
        sendResponse(defaultSettings);
    },

    get_android: (_, sendResponse) => {
        sendResponse(isAndroid);
    },

    open_tab: ({url}, sendResponse) => {
        extension.tabs.create({url}).then(() => {
            sendResponse(true);
        });
    },

    validate_setting: ({category, setting, value}, sendResponse) => sendResponse(!!(defaultSettings[category]?.[setting]?.validate(value)))
};

const requestMapPorts = {
    /** @type {function(extension.runtime.Port): void} */ download_history_add_all: (port) => {
        port.onMessage.addListener((request) => {
            download_history_add_all(request, () => {
                port.disconnect();
            }, (message) => {
                port.postMessage(message);
            });
        });
    }
}

extension.runtime.onMessage.addListener((request, _, sendResponse) => {
    requestMap[request.type]?.(request, sendResponse);
    return true;
});

extension.runtime.onConnect.addListener((port) => {
    requestMapPorts[port.name]?.(port);
});

extension.runtime.onInstalled?.addListener((details) => {
    // updates it if needed
    getHistoryDB().then(() => {
        if (details.reason === 'install') void extension.tabs.create({url: extension.runtime.getURL('/settings/settings.html?installed=true')});
        else if (details.reason === 'update' && details.previousVersion != null) void migrateSettings(details.previousVersion);
    });
});

extension.runtime.onStartup?.addListener(setIcon);

// context menus
const setupContextMenus = (() => {
    if (isAndroid) return async () => {};

    const contextMenusListener = (info) => {
        if (info.menuItemId === "save-image") saveImage(info.linkUrl ?? info.pageUrl, info.srcUrl);
    }

    const setContextMenus = () => {
        if (extension.contextMenus?.onClicked?.hasListener?.(contextMenusListener) === false) {
            extension.contextMenus?.onClicked?.addListener?.(contextMenusListener);
        }

        try {
            extension.contextMenus?.create?.(
                {
                    id: "save-image",
                    title: "Save Image",
                    contexts: ["image", "link"],
                    documentUrlPatterns: ['https://x.com/*'],
                    targetUrlPatterns: ['https://pbs.twimg.com/*']
                }
            );
        } catch {} // already added
    }

    // do initial setup incase of delays
    setContextMenus();

    return () => Settings.getSettings().then(() => {
        if (Settings.contextmenu.save_image) {
            setContextMenus();
        } else {
            // this is fine for now as theres just one
            void extension.contextMenus?.removeAll?.();
        }
    });
})();
void setupContextMenus();

const /** @type {Map<number, (string) => *>} */ DOWNLOAD_MAP = new Map();
extension.downloads?.onChanged?.addListener?.(({error, state, id}) => {
    if (DOWNLOAD_MAP.has(id)) {
        if (state?.current === 'complete') {
            DOWNLOAD_MAP.delete(id);
        } else if (error?.current) {
            DOWNLOAD_MAP.get(id)(error.current);
            DOWNLOAD_MAP.delete(id);
        }
    }
});

/**
 * @param {string} url
 * @param {string} filename
 * @param {EventModifiers} [modifiers]
 * @param {MediaItem} [media]
 * @return {Promise<number>}
 */
function download(url, filename, modifiers={ctrl: false, shift: false, alt: false}, {media}={}) {
    if (isAndroid && !isEdgeAndroid) {
        sendToTab({ type: 'download', url, filename, media, modifiers });
        return Promise.resolve(-1);
    } else {
        return Settings.getSettings().then(() => {
            const {
                save_as_prompt, save_as_prompt_shift, save_as_prompt_ctrl, save_as_prompt_alt,
                save_directory, save_directory_shift, save_directory_ctrl, save_directory_alt
            } = Settings.download_preferences;

            const [directory, save_as] = (modifiers.shift) ? [save_directory_shift, save_as_prompt_shift]
                : (modifiers.ctrl) ? [save_directory_ctrl, save_as_prompt_ctrl]
                    : (modifiers.alt) ? [save_directory_alt, save_as_prompt_alt] : [save_directory, save_as_prompt];

            return extension.downloads.download({
                url, saveAs: (save_as === 'on') ? true : (save_as === 'off') ? false : undefined,
                filename: (directory?.length > 0 ? `${directory}${directory.endsWith('/') ? '' : '/'}` : '') + filename
            });
        });
    }
}

const singleTabQuery = {active: true, currentWindow: true, discarded: false, status: 'complete', url: '*://*.x.com/*'};
function sendToTab(message) {
    extension.tabs.query(singleTabQuery).then((tabs) => {
        void extension.tabs.sendMessage(tabs[0].id, message);
    });
}

const tabQuery = {discarded: false, status: 'complete', url: '*://*.x.com/*'};
function send_to_all_tabs(message) {
    extension.tabs.query(tabQuery).then((tabs) => {
        for (const tab of tabs) void extension.tabs.sendMessage(tab.id, message);
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

const USER_CANCELED = ["download canceled by the user", "user_canceled"];

/**
 * @param {string} error
 * @returns {Promise<boolean>}
 */
async function checkErrorAllowed(error) {
    await Settings.getSettings();
    error = error.message || error;

    return !((USER_CANCELED.includes(error?.toLowerCase()?.trim()))
        && Settings.download_preferences.disable_cancelled_download_notification);
}

/**
 * @param {MediaItem[]} media
 * @param {EventModifiers} modifiers
 * @param {function(any)} sendResponse
 */
function download_media({media, modifiers}, sendResponse) {
    Settings.getSettings().then(() => {
        const {save_format, download_history_enabled} = Settings.download_preferences;
        for (const m of media) {
            const parts = ((m.type === 'Video') ? getNamePartsVideo : getNamePartsImage)(m.tweetURL, m.url);
            parts.tweetNum = m.index;
            if (download_history_enabled) void download_history_add(m.save_id);
            const onError = (error) => download_history_remove({id: m.save_id},
                () => checkErrorAllowed(error).then((r) => r && sendToTab({type: 'error', message: `Failed to download with error ${error}`, media: m, modifiers})));
            download(m.url, formatFilename(parts, save_format), modifiers, {media: m})
                .then((downloadId) => {
                    if (downloadId === undefined) onError("Failed to start download");
                    else if (downloadId === -1) void 0; // android, ignore it
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
    download_media( {media: [{
            index: parts.tweetNum,
            save_id: formatPartsForStorage(parts),
            url: sourceURL.replace(/name=[^&]*/, "name=orig"),
            tweetURL: url,
            type: 'Image'
        }], modifiers: {shift: false, ctrl: false, alt: false}}, () => sendToTab({type: 'image_saved'}))
}

// migrating to new settings format
/** @param {string} previousVersion */
async function migrateSettings(previousVersion) {
    const migrations = [
        ['1.4', () => new Promise((resolve) => {
            extension.storage.local.get().then(async (/** @type {Settings} */s) => {
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

                await extension.storage.local.set(s);

                resolve();
            });
        })],
        ['1.1.1.4', () => new Promise((resolve) => {
            extension.storage.local.get(['download_history']).then((r) => {
                const history = r.download_history ?? {};
                Promise.all([
                    new Promise((res) => download_history_add_all({saved_images: Object.keys(history)}, res)),
                    extension.storage.local.remove('download_history')
                ]).then(resolve);
            });
        })],
        ['1.1.1.1', () => new Promise((resolve) => {
            extension.storage.local.get().then(async (s) => {
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

                await extension.storage.local.clear();
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

                await extension.storage.local.set(newSettings);

                resolve();
            });
        })]
    ];

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

/**
 * @param {saveId} id
 * @param {function(any): any} sendResponse
 */
function download_history_has({id}, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction('download_history', 'readonly').objectStore('download_history')
            .get(id).addEventListener('success', (e) => sendResponse(e.target.result != null));
    });
}

/** @param {saveId} saved_image */
function download_history_add(saved_image) {
    return new Promise((resolve) => {
        getHistoryDB().then((db) => {
            db.transaction('download_history', 'readwrite').objectStore('download_history')
                .put(true, saved_image).addEventListener('success', () => {
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
        db.transaction('download_history', 'readwrite').objectStore('download_history')
            .delete(id).addEventListener('success', () => {
                send_to_all_tabs({type: 'history_change_remove', id});
                sendResponse?.(true);
        });
    });
}

function download_history_clear(_, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction('download_history', 'readwrite').objectStore('download_history')
            .clear().addEventListener('success', () => {
                send_to_all_tabs({type: 'history_change'});
                sendResponse(true);
        });
    })
}

function download_history_add_all(request, sendResponse, progressCallback) {
    getHistoryDB().then((db) => {
        const transaction = db.transaction('download_history', 'readwrite');
        const objectStore = transaction.objectStore('download_history');

        transaction.addEventListener('complete', () => {
            send_to_all_tabs({type: 'history_change'});
            sendResponse?.(true);
        });

        if (progressCallback) {
            let progress = 0;
            for (const saved_image of request.saved_images) {
                objectStore.put(true, saved_image);
                if ((++progress % 250) === 0) progressCallback({progress});
            }
            progressCallback({text: 'Finished importing, waiting...'});
        } else {
            for (const saved_image of request.saved_images) objectStore.put(true, saved_image);
        }
    });
}

function download_history_get_all(_, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction('download_history', 'readonly').objectStore('download_history')
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
function setIcon() {
    Settings.getSettings().then(() => {
        void ((chromeMode) ? extension.action : extension.browserAction).setIcon((Settings.extension_icon.custom)
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
    });
}
setIcon();

// opening settings page
((chromeMode) ? extension.action : extension.browserAction)?.onClicked?.addListener(() => {
    void extension.runtime.openOptionsPage();
});