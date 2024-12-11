'use strict';

(async () => {
    const vx_button_path = "M 18.36 5.64 c -1.95 -1.96 -5.11 -1.96 -7.07 0 l -1.41 1.41 l -1.42 -1.41 l 1.42 -1.42 c 2.73 -2.73 7.16 -2.73 9.9 0 c 2.73 2.74 2.73 7.17 0 9.9 l -1.42 1.42 l -1.41 -1.42 l 1.41 -1.41 c 1.96 -1.96 1.96 -5.12 0 -7.07 z m -2.12 3.53 z m -12.02 0.71 l 1.42 -1.42 l 1.41 1.42 l -1.41 1.41 c -1.96 1.96 -1.96 5.12 0 7.07 c 1.95 1.96 5.11 1.96 7.07 0 l 1.41 -1.41 l 1.42 1.41 l -1.42 1.42 c -2.73 2.73 -7.16 2.73 -9.9 0 c -2.73 -2.74 -2.73 -7.17 0 -9.9 z m 1 5 l 1.2728 -1.2728 l 2.9698 1.2728 l -1.4142 -2.8284 l 1.2728 -1.2728 l 2.2627 6.2225 l -6.364 -2.1213 m 4.9497 -4.9497 l 3.182 1.0607 l 1.0607 3.182 l 1.2728 -1.2728 l -0.7071 -2.1213 l 2.1213 0.7071 l 1.2728 -1.2728 l -3.182 -1.0607 l -1.0607 -3.182 l -1.2728 1.2728 l 0.7071 2.1213 l -2.1213 -0.7071 l -1.2728 1.2728",
        download_button_path = "M 12 17.41 l -5.7 -5.7 l 1.41 -1.42 L 11 13.59 V 4 h 2 V 13.59 l 3.3 -3.3 l 1.41 1.42 L 12 17.41 zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
        Settings = await getSettings();

    // Fallbacks for when button cannot be found
    let fallbackButton;

    class Tweet { // Tweet functions
        static addVXButton(article) {
            try {
                article.setAttribute('usy', '');
                const a = Tweet.anchor(article);
                a.after(Button.newButton(a, vx_button_path, () => Tweet.vxButtonCallback(article), false, "usy-copy"));
            } catch {article.removeAttribute('usy');}
        }

        static addVideoButton(videoComponent) {
            try {
                videoComponent.setAttribute('usy', '');
                const article = Tweet.nearestTweet(videoComponent), a = Tweet.anchor(article);
                // checks if quote tweet contains specific video component (don't show button)
                // doesn't affect a video QRT as each video checked separately
                if (!(article.querySelector('div[id] > div[id]')?.contains(videoComponent)) && !article.querySelector('.usybuttonclickdiv[usy-video]')) {
                    a.after(Button.newButton(a, download_button_path, (e) => Tweet.videoButtonCallback(e, article), false, "usy-video"));
                }
            } catch {videoComponent.removeAttribute('usy')}
        }

        static anchor(article) {
            const anchor = article.querySelector('button[aria-label="Share post"]:not([usy])').parentElement.parentElement;
            if (!fallbackButton) fallbackButton = anchor;
            return anchor;
        }

        static anchorWithFallback(article) {
            try {return Tweet.anchor(article);} catch {return fallbackButton;}
        }

        static url(article) {
            for (const a of article.querySelectorAll('a')) if (a.querySelector('time')) return a.href.replace(/\/history$/, "");
            throw new TypeError("No URL Found");
        }

        static nearestTweet(elem) {
            let anchor;
            while (elem) {
                anchor = elem.querySelector('article');
                if (anchor) return anchor;
                elem = elem.parentElement;
            }
        }

        static vxButtonCallback(article) {
            try {navigator.clipboard.writeText(URLS.vxIfy(Tweet.url(article))).then(() => {Notification.create('Copied URL to clipboard');});}
            catch {Notification.create('Failed to copy url, please report the issue along with the current url to twitter improvements');}
        }

        static videoButtonCallback(event, article) {
            Notification.create(`Saving Tweet Video(s)${Settings.about.android ? ' (This may take a second on android)' : ''}`);
            chrome.runtime.sendMessage({...Settings.preferences, type: 'video', url: Tweet.url(article), cookie: document.cookie.split(';').find(a => a.trim().startsWith("ct0")).trim().substring(4), ...Settings.videoDownloading}).then((r) => Tweet.videoResponseHandler(event, r));
        }

        static videoResponseHandler(event, r) {
            if (r.status === 'success') Notification.create('Successfully Downloaded Video(s)');
            else if (r.status === 'choice') Notification.createVideoChoice(r.choices, event);
            else if (r.status === 'newpage') {
                navigator.clipboard.writeText(r.copy);
                Notification.create('Error occurred downloading video, copied file name to clipboard, use cobalt.tools website to download, alternatively turn on auto update downloading in settings', 10000);
            } else Notification.create('Error occurred downloading video, try clicking on tweet to fix if enabled auto update downloading in settings', 10000);
        }
    }

    class Image { // Image element functions
        static addImageButton(image) {
            try {
                image.setAttribute('usy', '');
                image.after(Button.newButton(Tweet.anchorWithFallback(Tweet.nearestTweet(image)), download_button_path, (e) => Image.imageButtonCallback(e, image), Settings.preferences.download_history_enabled && (Settings.preferences.download_history.hasOwnProperty(Image.idWithNumber(image))), "usy-image", (e) => Image.removeImageDownloadCallback(e, image)));
            } catch {image.removeAttribute('usy')}
        }

        static respectiveURL(image) {
            let url;
            while (image) {
                url = image.href;
                if (url) return url;
                image = image.parentElement;
            }
            url = window.location.href;
            if (url.includes('/photo/')) return url;
        }

        static idWithNumber(image) {
            const a = Image.respectiveURL(image).split("/").slice(-3);
            return `${a[0]}-${a[2]}`;
        }

        static getRespectiveButton(image) {
            return image.parentElement.querySelector('div.usybuttonclickdiv');
        }

        static imageButtonCallback(e, image) {
            e.preventDefault();
            if (Settings.preferences.download_history_prevent_download && Button.isMarked(Image.getRespectiveButton(image))) {
                Notification.create('Image is already saved, save using right click menu, or remove from saved to override')
            } else {
                Notification.create(`Saving Image${Settings.about.android ? ' (This may take a second on android)' : ''}`);
                chrome.runtime.sendMessage({type: 'image', url: Image.respectiveURL(image), sourceURL: image.src});
            }
        }

        static removeImageDownloadCallback(e, image) {
            e.preventDefault();
            Notification.create('Removing image from saved');
            delete Settings.preferences.download_history[Image.idWithNumber(image)];
            Settings.saveDownloadHistory();
        }

        static resetAll() {
            document.querySelectorAll('div[usy-image].usybuttonclickdiv').forEach((e) => e.remove());
            document.querySelectorAll('img[usy]').forEach((e) => e.removeAttribute('usy'));
        }
    }

    class URLS { // URL modification functions
        static vxIfy(url) {
            return `https://${URLS.getPrefix()}/${url.substring(14)}`;
        }

        static getPrefix() {
            if (Settings.preferences.url_prefix === 'x.com') return Settings.preferences.custom_url;
            return Settings.preferences.url_prefix;
        }
    }

    class Button { // Button functions
        static newButton(shareButton, path, clickCallback, marked, attribute, rightClickCallback) {
            shareButton = shareButton.cloneNode(true);
            shareButton.classList.add('usybuttonclickdiv');
            shareButton.setAttribute(attribute, "");
            if (marked) shareButton.classList.add('usyMarked');
            if (attribute === "usy-image" && !Settings.preferences.long_image_button) shareButton.style.maxWidth = 'fit-content';
            const button = shareButton.querySelector('button');
            button.setAttribute('usy', '');
            button.disabled = false;
            button.classList.remove('r-icoktb'); // private tweet buttons more visible
            shareButton.querySelector('path').setAttribute("d", path);
            shareButton.addEventListener('pointerover', () => Button.onhover(button.firstElementChild));
            shareButton.addEventListener('pointerout', () => Button.stophover(button.firstElementChild));
            shareButton.addEventListener('click', clickCallback);
            if (rightClickCallback) shareButton.addEventListener('contextmenu', rightClickCallback);
            return shareButton;
        }

        static isMarked(button) {
            return button.classList.contains('usyMarked');
        }

        static onhover(bc) {
            bc.classList.add('r-1cvl2hr');
            bc.style.color = "";
            bc.firstElementChild.firstElementChild.classList.replace('r-1niwhzg', 'r-1peqgm7');
        }

        static stophover(bc) {
            bc.classList.remove('r-1cvl2hr');
            bc.style.color = "rgb(113, 118, 123)";
            bc.firstElementChild.firstElementChild.classList.replace('r-1peqgm7', 'r-1niwhzg');
        }

        static showHidden(b) {
            b.setAttribute('usy', '');
            if (b.innerText === 'Show' || b.innerText === 'View') b.click();
        }

        static resetAll() {
            document.querySelectorAll('div.usybuttonclickdiv').forEach(b => b.remove());
            document.querySelectorAll('[usy]').forEach((e) => e.removeAttribute('usy'));
        }
    }

    class Notification {
        static create(text, timeout=5000) {
            Notification.clear();
            const outer = document.createElement('div'), inner = document.createElement('div');
            outer.appendChild(inner);
            outer.classList.add('usyNotificationOuter');
            inner.classList.add('usyNotificationInner');
            inner.textContent = text;
            document.body.appendChild(outer);
            setTimeout(() => {
                inner.classList.add('usyFadeOut');
                inner.addEventListener('transitionend', () => {
                    outer.remove();
                });
            }, timeout);
        }

        static clear() {
            document.querySelectorAll('div.usyNotificationOuter').forEach((e) => e.remove());
        }

        static createVideoChoice(choices, event) {
            Notification.clear();
            const notificationEventListeners = [];
            const fullscreen = document.createElement('div'),
                popup = document.createElement('div');

            let originalScrollY = window.scrollY;
            const fixScrollPosition = () => popup.style.top = `${event.y - (window.scrollY - originalScrollY)}px`;
            fixScrollPosition.bind(this);
            notificationEventListeners.push({type: 'scroll', listener: fixScrollPosition});

            const getNotificationButton = (text, onclick) => {
                const b = document.createElement('button'), t = document.createElement('b');
                b.classList.add('usyDownloadChoiceButton');
                t.textContent = text;
                b.appendChild(t);
                b.addEventListener('click', onclick);
                return b;
            }
            fullscreen.classList.add('usyNotificationOuter', 'usyFullscreen');
            popup.classList.add('usyDownloadChoicePopup');
            popup.style.left = `${event.x}px`;
            popup.style.top = `${event.y}px`;
            fullscreen.addEventListener('click', () => {
                for (const e of notificationEventListeners) window.removeEventListener(e.type, e.listener);
                Notification.clear();
            });

            const sendResponse = (choice) => {
                const data = {type: 'videoChoice', choices};
                if (choice != null) data.choice = choice;
                chrome.runtime.sendMessage(data).then((r) => Tweet.videoResponseHandler(null, r));
            }
            for (let id = 0; id < choices.urls.length; ++id) {
                popup.appendChild(getNotificationButton(`Video ${id + 1}`, (e) => {
                    sendResponse(parseInt(e.target.textContent.split(" ")[1]) - 1);
                }));
            }
            popup.appendChild(getNotificationButton('Download All', () => sendResponse()));

            fullscreen.appendChild(popup);
            document.body.appendChild(fullscreen);

            const rect = popup.getBoundingClientRect();
            if (rect.left < 0) popup.style.left = '0px';
            else if (rect.right > window.innerWidth) popup.style.left = `${event.x - popup.clientWidth}px`;
            if (rect.top < 0) popup.style.top = '0px';
            else if (rect.bottom > window.innerHeight) {
                popup.style.top = `${event.y - popup.clientHeight}px`;
                originalScrollY -= popup.clientHeight;
            }
            for (const listener of notificationEventListeners) {
                listener.listener();
                window.addEventListener(listener.type, listener.listener);
            }
        }
    }

    class Helpers {
        static download(url, filename) {
            fetch(url).then(r => r.blob()).then(blob => {
                const link = document.createElement('a'),
                    objectURL = URL.createObjectURL(blob);
                link.href = objectURL;
                link.download = filename;
                link.dispatchEvent(new MouseEvent('click'));
                URL.revokeObjectURL(objectURL);
            });
        }
    }

    const observer = {
        observer: null,
        start: () => {
            observer.observer?.disconnect();
            Button.resetAll();
            const observerSettings = {subtree: true, childList: true},
                callbackMappings = {
                    vx_button: [{s: 'article:not([usy])', f: Tweet.addVXButton}],
                    video_button: [{s: 'div[data-testid="videoComponent"]:not([usy])', f: Tweet.addVideoButton}, {s: 'img[alt="Embedded video"]:not([usy])', f: Tweet.addVideoButton}],
                    image_button: [{s: 'img[src*="https://pbs.twimg.com/media/"]:not([usy])', f: Image.addImageButton}],
                    show_hidden: [{s: 'button[type="button"]:not([usy])', f: Button.showHidden}]
                }, getCallback = () => {
                    const callbacks = [];
                    for (const m in callbackMappings) if (Settings.setting[m]) for (const cb of callbackMappings[m]) callbacks.push(cb);
                    for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                    let previousURL = window.location.href;
                    const update = () => {
                        for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                    };
                    let timer = null, lastUpdate = performance.now();
                    const updateFrequency = 100;
                    if (callbacks.length > 0) {
                        return (_, o) => {
                            o.disconnect();
                            clearTimeout(timer);
                            const newUrl = window.location.href;
                            // Fix green button on switching image
                            if (previousURL.includes("/photo/") && newUrl !== previousURL && newUrl.includes("/photo/") && Settings.setting.image_button && Settings.preferences.download_history_enabled) Image.resetAll();
                            previousURL = newUrl;
                            if (performance.now() - lastUpdate > updateFrequency) update();
                            else setTimeout(update, updateFrequency);
                            lastUpdate = performance.now();
                            o.observe(document.body, observerSettings);
                        }
                    }
                    return (_, observer) => observer.disconnect();
                };
            observer.observer = new MutationObserver(getCallback());
            observer.observer.observe(document.body, observerSettings);
        }
    }, styles = {
        styleMap: {
            hide_notifications: ['a[href="/notifications"]'],
            hide_messages: ['a[href="/messages"]'],
            hide_grok: ['a[href="/i/grok"]'],
            hide_grok_explain: ['div > button[aria-label="Grok actions"]'],
            hide_jobs: ['a[href="/jobs"]'],
            hide_lists: ['a[href*="/lists"]'],
            hide_communities: ['a[href*="/communities"]'],
            hide_premium: ['a[href="/i/premium_sign_up"]', 'aside[aria-label="Subscribe to Premium"]'],
            hide_verified_orgs: ['a[href="/i/verified-orgs-signup"]'],
            hide_monetization: ['a[href="/settings/monetization"]', 'a[href="/i/monetization"]'],
            hide_ads_button: ['a[href*="https://ads.x.com"]'],
            hide_whats_happening: ['div[aria-label="Timeline: Trending now"]'],
            hide_who_to_follow: ['aside[aria-label="Who to follow"]', 'aside[aria-label="Relevant people"]'],
        },
        style: '',
        start: () => {
            document.querySelectorAll('style[usyStyle]').forEach((e) => e.remove());
            styles.style = '';
            for (const setting in Settings.style) if (Settings.style[setting]) for (const selector of styles.styleMap[setting]) styles.style += `${selector} {display:none;}`;
            if (styles.style.length > 0) {
                const s = document.createElement('style');
                s.setAttribute('usyStyle', '');
                s.appendChild(document.createTextNode(styles.style));
                document.head.appendChild(s);
            }
        }
    }, extension = {
        start: () => {
            observer.start();
            styles.start();
        }
    }

    // Starts extension
    extension.start();

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local') {
            for (const key in changes) {
                if (Settings.videoDownloading.hasOwnProperty(key)) continue;
                else {
                    await Settings.loadSettings();
                    extension.start();
                    break;
                }
            }
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'imageStore') {
            Settings.preferences.download_history_enabled && (Settings.preferences.download_history[message.store] = true, Settings.saveDownloadHistory());
            Notification.create(`Saving Image${Settings.about.android ? ' (This may take a second on android)' : ''}`);
        } else if (message.type === 'downloadDetails') {
            let changeMade = false;
            for (const n in message) if (Settings.videoDownloading[n] && Settings.videoDownloading[n] !== message[n]) {
                Settings.videoDownloading[n] = message[n];
                changeMade = true;
            }
            changeMade && Settings.saveVideoDownloadInfo();
        } else if (message.type === 'download') Helpers.download(message.url, message.filename);
    });

    async function getSettings() { // Setting handling
        class Settings {
            setting = {
                vx_button: true,
                video_button: true,
                image_button: true,
                show_hidden: false,
            }

            style = {
                hide_notifications: false,
                hide_messages: false,
                hide_grok: false,
                hide_grok_explain: false,
                hide_jobs: false,
                hide_lists: false,
                hide_communities: false,
                hide_premium: false,
                hide_verified_orgs: false,
                hide_monetization: false,
                hide_ads_button: false,
                hide_whats_happening: false,
                hide_who_to_follow: false,
            }

            preferences = {
                url_prefix: 'fixvx.com',
                video_download_fallback: true,
                long_image_button: false,
                custom_url: '',
                download_history_enabled: true,
                download_history_prevent_download: false,
                download_history: {}
            }

            videoDownloading = {
                detailsURL: 'https://x.com/i/api/graphql/nBS-WpgA6ZG0CyNHD517JQ/TweetDetail',
                authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
                features: '{"responsive_web_live_screen_enabled":false,"rweb_tipjar_consumption_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"articles_preview_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"creator_subscriptions_quote_tweet_preview_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"rweb_video_timestamps_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_enhance_cards_enabled":false}',
                fieldToggles: '{"withArticleRichContentState":true,"withArticlePlainText":false,"withGrokAnalyze":false,"withDisallowedReplyControls":false}'
            }

            about = {
                android: /Android/i.test(navigator.userAgent)
            }

            async loadSettings() {
                const data = await chrome.storage.local.get(), settings = ['setting', 'style', 'preferences', 'videoDownloading', 'about'];
                for (const setting of settings) for (const s in this[setting]) this[setting][s] = data[s] ?? this[setting][s];
                // Fix for past changes
                this.preferences.url_prefix === 'vx' && (this.preferences.url_prefix = 'fixvx.com');
                this.preferences.url_prefix === 'fx' && (this.preferences.url_prefix = 'fixupx.com');
            }

            saveDownloadHistory() {
                chrome.storage.local.set({download_history: this.preferences.download_history});
            }

            saveVideoDownloadInfo() {
                chrome.storage.local.set(this.videoDownloading);
            }
        }

        const set = new Settings();
        await set.loadSettings();
        return set;
    }
})();