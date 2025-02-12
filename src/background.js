'use strict';

const DOWNLOAD_DB_VERSION = 1;

const requestMap = {
    image: saveImage,
    video: download_video,
    videoChoice: download_video_from_choices,
    download_history_has: download_history_has,
    download_history_remove: download_history_remove,
    download_history_clear: download_history_clear,
    download_history_add_all: download_history_add_all,
    download_history_get_all: download_history_get_all,
}

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    requestMap[request.type]?.(request, sendResponse);
    return true;
});

chrome?.runtime?.onInstalled?.addListener?.((details) => {
    updateHistoryDb().then(() => {
        if (details.reason === 'install') chrome.tabs.create({url: chrome.runtime.getURL('/settings/settings.html?installed=true')});
        else if (details.reason === 'update' && details.previousVersion != null) migrateSettings(details.previousVersion);
    });
});

chrome?.contextMenus?.create?.(
    {
        id: "save-image",
        title: "Save Image",
        contexts: ["image", "link"],
        documentUrlPatterns: ['https://x.com/*'],
        targetUrlPatterns: ['https://pbs.twimg.com/*']
    }
);

chrome?.contextMenus?.onClicked?.addListener?.((info) => {
    if (info.menuItemId === "save-image") saveImage({url: info.linkUrl ?? info.pageUrl, sourceURL: info.srcUrl});
});

const Settings = { // Setting handling
    download_preferences: {
        save_as_prompt: 'browser',
        save_directory: '',
        save_format: '[twitter] {username} - {tweetId} - {tweetNum}',
    },

    image_preferences: {
        download_history_enabled: true,
    },

    video_details: {
        detailsURL: '',
        authorization: '',
        features: '',
        fieldToggles: ''
    },

    video_preferences: {
        video_download_fallback: true
    },

    loadedCategories: ['download_preferences', 'image_preferences', 'video_details', 'video_preferences'],
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
        chrome.storage.local.get(Settings.loadedCategories, (s) => {
            for (const setting of Settings.loadedCategories) Settings[setting] = {...Settings[setting], ...s[setting]};
            resolve();
        });
    }),
}

chrome.storage.onChanged.addListener(async (_, namespace) => {
    if (namespace === 'local') void Settings.loadSettings();
});

function download(url, filename) {
    /Android/i.test(navigator.userAgent) ? sendToTab({type: 'download', url, filename}) : Settings.getSettings().then(() => {
        const dir = Settings.download_preferences.save_directory;
        const downloadData = {
            url, filename: (dir?.length > 0 ? `${dir}${dir.endsWith('/') ? '' : '/'}` : '') + filename
        };
        if (Settings.download_preferences.save_as_prompt === 'off') downloadData.saveAs = false;
        else if (Settings.download_preferences.save_as_prompt === 'on') downloadData.saveAs = true;
        chrome.downloads.download(downloadData);
    });
}

function sendToTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
}

function send_to_all_tabs(message) {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) if (tab.status === 'complete') chrome.tabs.sendMessage(tab.id, message);
    });
}

function saveImage(request, sendResponse) {
    Settings.getSettings().then(() => {
        const parts = getNamePartsImage(request.url, request.sourceURL);
        download(request.sourceURL.replace(/name=[^&]*/, "name=orig"), formatFilename(parts, Settings.download_preferences.save_format));

        const saved_id = `${parts.tweetId}-${parts.tweetNum}`;
        if (Settings.image_preferences.download_history_enabled) download_history_add(saved_id).then(() => {
            sendToTab({type: 'image_saved'});
        });
    })
    sendResponse?.('success');
}

function getNamePartsGeneric(url) {
    url = url.split("/");
    return {
        username: url[3],
        tweetId: url[5],
        tweetNum: url[7],
    }
}

function getNamePartsImage(url, sourceURL) {
    return {
        ...getNamePartsGeneric(url),
        extension: sourceURL.match(/format=(\w+)/)[1]
    }
}

function formatFilename(parts, save_format) {
    return save_format
        .replaceAll('{username}', parts.username)
        .replaceAll('{tweetId}', parts.tweetId)
        .replaceAll('{tweetNum}', parts.tweetNum ?? '')
        .replaceAll('{extension}', parts.extension ?? '') +
        (parts.extension ? `.${parts.extension}` : '');
}

chrome.webRequest.onSendHeaders.addListener((details) => {
    const url = new URL(decodeURIComponent(details.url));
    const authorization = details.requestHeaders?.find?.(a => a.name === 'authorization');
    const features = url.searchParams.get("features"), fieldToggles = url.searchParams.get("fieldToggles");
    if (authorization?.value?.length > 0 && features?.length > 2 && fieldToggles?.length > 2) {
        const data = {
            detailsURL: `${url.origin}${url.pathname}`,
            authorization: authorization.value,
            features, fieldToggles
        }
        Settings.getSettings().then(() => {
            const result = Settings.video_details;
            if (result == null || Object.keys(result).length !== 4) chrome.storage.local.set({video_details: data});
            else {
                for (const n in data) if (result.hasOwnProperty(n) && result[n] !== data[n]) {
                    chrome.storage.local.set({video_details: data})
                    break;
                }
            }
        });
    }
}, { urls: ["https://x.com/i/api/graphql/*/TweetDetail*"] }, ["requestHeaders"]);


const getBestQuality = (variants) => variants.filter(v => v?.content_type === "video/mp4").reduce((x, y) => +x?.bitrate > +y?.bitrate ? x : y).url;
const defaultHeaders = {'x-twitter-client-language': 'en', 'x-twitter-active-user': 'yes', 'accept-language': 'en', 'content-type': 'application/json', 'X-Twitter-Auth-Type': 'OAuth2Session'};
const variables = {"with_rux_injections":false,"rankingMode":"Relevance","includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withBirdwatchNotes":true,"withVoice":true};
function download_video(request, sendResponse) {
    Settings.getSettings().then(async () => {
        const parts = getNamePartsGeneric(request.url);
        const save_format = Settings.download_preferences.save_format;
        const id = parts.tweetId, details = Settings.video_details;
        try {
            const tweetDetailsURL = new URL(details.detailsURL);
            tweetDetailsURL.searchParams.set('variables', JSON.stringify({...variables, "focalTweetId": id}));
            tweetDetailsURL.searchParams.set('features', details.features);
            tweetDetailsURL.searchParams.set('fieldToggles', details.fieldToggles);
            const headers = {
                'user-agent': navigator.userAgent,
                'x-csrf-token': request.cookie,
                'authorization': details.authorization, ...defaultHeaders
            }; // Cookie sent by browser so no need to set myself
            const json = await(await fetch(tweetDetailsURL, {headers})).json();
            let urls = json?.data?.threaded_conversation_with_injections_v2?.instructions
                ?.find?.(a => a?.type === "TimelineAddEntries")?.entries?.find?.(a => a?.entryId?.includes?.(id))?.content
                ?.itemContent?.tweet_results?.result;
            urls = urls?.tweet ?? urls;
            urls = urls?.legacy?.entities?.media?.filter?.(m => ["video", "animated_gif"].includes?.(m?.type))
                ?.map?.(m => getBestQuality(m?.video_info?.variants));
            const download = () => {
                if (urls.length === 1) {
                    downloadVideos(urls, parts, save_format);
                    sendResponse({status: 'success'});
                } else sendResponse({status: 'choice', choices: {parts, save_format, urls: urls}});
            }
            if (urls?.length > 0) download();
            else {
                console.log("Attempting to brute force video download");
                urls = []
                for (const tweet of findAllPotentialTweetsById(json, id)) {
                    const videos = findVideos(tweet);
                    for (const key in videos) urls.push(videos[key].url);
                    if (urls.length > 0) {
                        download();
                        break;
                    }
                }
                if (urls.length <= 0) throw new Error("failed to download");
            }
        } catch (error) {
            console.error(error);
            if (Settings.video_preferences.video_download_fallback) {
                sendResponse({status: 'newpage', copy: formatFilename(parts, save_format)});
                chrome.tabs.create({url: `https://cobalt.tools/#${request.url}`});
            } else sendResponse({status: 'error'});
        }
    });
}

function download_video_from_choices(request, sendResponse) {
    const choices = request.choices;
    if (request.choice != null) {
        choices.parts.tweetNum = request.choice + 1;
        downloadVideos([choices.urls[request.choice]], choices.parts, choices.save_format);
    }
    else {
        downloadVideos(choices.urls, choices.parts, choices.save_format);
    }
    sendResponse({status: 'success'});
}

function downloadVideos(urls, parts, save_format) {
    urls.forEach((url, i) => {
        parts.tweetNum ??= i + 1;
        parts.extension = url.includes(".mp4") ? "mp4" : "gif";
        download(url, formatFilename(parts, save_format));
    });
}

function findAllPotentialTweetsById(data, id, results=[]) {
    if (Array.isArray(data)) for (const item of data) findAllPotentialTweetsById(item, id, results);
    else if (typeof data === 'object' && data != null) {
        for (const val of Object.values(data)) {
            if (val.includes?.(id)) {
                results.push(data);
                break;
            }
        }
        for (const key in data) findAllPotentialTweetsById(data[key], id, results);
    }
    return results;
}

function findVideos(data, results = {}) {
    if (Array.isArray(data)) for (const item of data) findVideos(item, results);
    else if (typeof data === 'object' && data != null) {
        if (Array.isArray(data.variants)) for (const variant of data.variants) if (variant.bitrate && variant.url && variant.content_type === "video/mp4") {
            const id = variant.url.match(/ext_tw_video\/(\d+)\//)?.[1];
            if (id) results[id] = +results[id]?.bitrate > variant?.bitrate ? results[id] : variant;
        }
        for (const key in data) findVideos(data[key], results);
    }
    return results;
}

// migrating to new settings format
function versionBelowGiven(previousVersion, maxVersion) {
    previousVersion = (previousVersion?.match?.(/\d+/g) ?? []).join('');
    maxVersion = (maxVersion?.match?.(/\d+/g) ?? []).join('');
    const length = Math.max(previousVersion.length, maxVersion.length);
    return +previousVersion.padEnd(length, '0') < +maxVersion.padEnd(length, '0');
}

function migrateSettings(previousVersion) {
    // Fix for old link copying setting
    if (versionBelowGiven(previousVersion, '1.0.7.3')) {
        console.log("Migrating vx and fx settings to new format");
        chrome.storage.local.get(['url_prefix'], async (s) => {
            if (s.url_prefix === 'vx') await chrome.storage.local.set({url_prefix: 'fixvx.com'});
            if (s.url_prefix === 'fx') await chrome.storage.local.set({url_prefix: 'fixupx.com'});
        });
    }

    // 1.1.1.1 is settings migrate update
    if (versionBelowGiven(previousVersion, '1.1.1.1')) {
        console.log("Migrating settings to new format");
        chrome.storage.local.get(async (s) => {
            const {
                // styles
                hide_notifications, hide_messages, hide_grok, hide_jobs, hide_lists, hide_communities,
                hide_premium, hide_verified_orgs, hide_monetization, hide_ads_button, hide_whats_happening,
                hide_who_to_follow, hide_relevant_people, hide_create_your_space, hide_post_button,
                hide_follower_requests, hide_live_on_x, hide_post_reply_sections, hide_sidebar_footer,
                // settings
                vx_button, video_button, image_button, show_hidden,
                // preferences
                url_prefix, video_download_fallback, long_image_button, custom_url, download_history_enabled,
                download_history_prevent_download, download_history,
                // videoDownloading
                detailsURL, authorization, features, fieldToggles
            } = s;

            await chrome.storage.local.clear();
            const newSettings = {style: {}, setting: {}, vx_preferences: {}, video_details: {},
                image_preferences: {}, video_preferences: {}};

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

            if (url_prefix != null) newSettings.vx_preferences.url_prefix = url_prefix;
            if (custom_url != null) newSettings.vx_preferences.custom_url = custom_url;

            if (download_history_prevent_download != null) newSettings.image_preferences.download_history_prevent_download = download_history_prevent_download;
            if (long_image_button != null) newSettings.image_preferences.long_image_button = long_image_button;
            if (download_history_enabled != null) newSettings.image_preferences.download_history_enabled = download_history_enabled;

            if (video_download_fallback != null) newSettings.video_preferences.video_download_fallback = video_download_fallback;

            if (detailsURL != null) newSettings.video_details.detailsURL = detailsURL;
            if (authorization != null) newSettings.video_details.authorization = authorization;
            if (features != null) newSettings.video_details.features = features;
            if (fieldToggles != null) newSettings.video_details.fieldToggles = fieldToggles;

            if (download_history != null) newSettings.download_history = download_history;

            await chrome.storage.local.set(newSettings);
        });
    }

    // migrate history to indexed db
    if (versionBelowGiven(previousVersion, 'v1.1.1.4')) {
        getHistoryDB().then((db) => {
            chrome.storage.local.get(['download_history'], (r) => {
                const history = r.download_history ?? {};
                if (Object.keys(history).length > 0) {
                    const objectStore = db.transaction(['download_history'], 'readwrite').objectStore('download_history');
                    for (const saved_image in history) objectStore.put({saved_image});
                }

                chrome.storage.local.remove('download_history');
            });
        });
    }
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

function download_history_has(request, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction(['download_history'], 'readonly').objectStore('download_history').index('saved_image')
            .get(request.id).addEventListener('success', (e) => {
            if (e.target.result) sendResponse(true);
            else sendResponse(false);
        });
    });
}

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

function download_history_remove(request, sendResponse) {
    getHistoryDB().then((db) => {
        db.transaction(['download_history'], 'readwrite').objectStore('download_history')
            .delete(request.id).addEventListener('success', () => {
                send_to_all_tabs({type: 'history_change_remove', id: request.id});
                sendResponse(true);
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
                sendResponse(e.target.result);
        })
    });
}
