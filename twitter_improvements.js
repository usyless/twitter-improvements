'use strict';

(async () => {
    const vx_button_path = "M 18.36 5.64 c -1.95 -1.96 -5.11 -1.96 -7.07 0 l -1.41 1.41 l -1.42 -1.41 l 1.42 -1.42 c 2.73 -2.73 7.16 -2.73 9.9 0 c 2.73 2.74 2.73 7.17 0 9.9 l -1.42 1.42 l -1.41 -1.42 l 1.41 -1.41 c 1.96 -1.96 1.96 -5.12 0 -7.07 z m -2.12 3.53 z m -12.02 0.71 l 1.42 -1.42 l 1.41 1.42 l -1.41 1.41 c -1.96 1.96 -1.96 5.12 0 7.07 c 1.95 1.96 5.11 1.96 7.07 0 l 1.41 -1.41 l 1.42 1.41 l -1.42 1.42 c -2.73 2.73 -7.16 2.73 -9.9 0 c -2.73 -2.74 -2.73 -7.17 0 -9.9 z m 1 5 l 1.2728 -1.2728 l 2.9698 1.2728 l -1.4142 -2.8284 l 1.2728 -1.2728 l 2.2627 6.2225 l -6.364 -2.1213 m 4.9497 -4.9497 l 3.182 1.0607 l 1.0607 3.182 l 1.2728 -1.2728 l -0.7071 -2.1213 l 2.1213 0.7071 l 1.2728 -1.2728 l -3.182 -1.0607 l -1.0607 -3.182 l -1.2728 1.2728 l 0.7071 2.1213 l -2.1213 -0.7071 l -1.2728 1.2728",
        download_button_path = "M 12 17.41 l -5.7 -5.7 l 1.41 -1.42 L 11 13.59 V 4 h 2 V 13.59 l 3.3 -3.3 l 1.41 1.42 L 12 17.41 zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
        Settings = await getSettings();
    let downloadHistoryEnabled = Settings.preferences.download_history_enabled;

    // Fallbacks for when button cannot be found
    let fallbackButton;

    class Tweet { // Tweet functions
        static addVXButton(article) {
            try {
                article.setAttribute('usy', '');
                const a = Tweet.anchor(article);
                a.after(Button.newButton(a, vx_button_path, () => Tweet.vxButtonCallback(article)));
            } catch {article.removeAttribute('usy');}
        }

        static addVideoButton(videoComponent) {
            try {
                videoComponent.setAttribute('usy', '');
                const article = Tweet.nearestTweet(videoComponent), a = Tweet.anchor(article);
                // checks if quote tweet contains specific video component (don't show button)
                // doesn't affect a video QRT as each video checked separately
                if (!(article.querySelector('div[id] > div[id]')?.contains(videoComponent)) && !article.querySelector('.usybuttonclickdiv[usy-video]')) {
                    a.after(Button.newButton(a, download_button_path, () => Tweet.videoButtonCallback(article), false, "usy-video"));
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
            try {navigator.clipboard.writeText(URL.vxIfy(Tweet.url(article))).then(() => {Notification.create('Copied URL to clipboard');});}
            catch {Notification.create('Failed to copy url, please report the issue along with the current url to twitter improvements');}
        }

        static videoButtonCallback(article) {
            Notification.create('Saving Tweet Video(s)');
            chrome.runtime.sendMessage({type: 'video', url: Tweet.url(article), cobalt_url: Settings.preferences.cobalt_url, cobalt_api_key: Settings.preferences.cobalt_api_key}).then((r) => {
                if (r.status === 'success') Notification.create('Successfully Downloaded Video(s)');
                else {
                    navigator.clipboard.writeText(r.copy);
                    Notification.create('Copied file name to clipboard, use cobalt website to download or update cobalt API url');
                }
            });
        }
    }

    class Image { // Image element functions
        static addImageButton(image) {
            try {
                image.setAttribute('usy', '');
                image.after(Button.newButton(Tweet.anchorWithFallback(Tweet.nearestTweet(image)), download_button_path, (e) => Image.imageButtonCallback(e, image), downloadHistoryEnabled && (Settings.preferences.download_history.hasOwnProperty(Image.idWithNumber(image)[0])), null, (e) => Image.removeImageDownloadCallback(e, image)));
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
            const url = Image.respectiveURL(image), a = Image.respectiveURL(image).split("/").slice(-3);
            return [`${a[0]}-${a[2]}`, url];
        }

        static getRespectiveButton(image) {
            return image.parentElement.querySelector('div.usybuttonclickdiv');
        }

        static imageButtonCallback(e, image) {
            e.preventDefault();
            if (Settings.preferences.download_history_prevent_download && Button.isMarked(Image.getRespectiveButton(image))) {
                Notification.create('Image is already saved, save using right click menu, or remove from saved to override')
            } else {
                Notification.create('Saving Image');
                chrome.runtime.sendMessage({type: 'image', url: Image.respectiveURL(image), sourceURL: image.src});
            }
        }

        static removeImageDownloadCallback(e, image) {
            e.preventDefault();
            Notification.create('Removing image from saved');
            const [id] = Image.idWithNumber(image);
            delete Settings.preferences.download_history[id];
            Settings.saveDownloadHistory();
        }
    }

    class URL { // URL modification functions
        static vxIfy(url) {
            return `https://${URL.getPrefix()}/${url.substring(14)}`;
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
            if (attribute != null) shareButton.setAttribute(attribute, "");
            if (marked) shareButton.classList.add('usyMarked');
            const button = shareButton.querySelector('button');
            button.setAttribute('usy', '');
            button.disabled = false;
            shareButton.querySelector('path').setAttribute("d", path);
            shareButton.addEventListener('mouseover', () => Button.onhover(button.firstElementChild));
            shareButton.addEventListener('mouseout', () => Button.stophover(button.firstElementChild));
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
            if (b.innerText === 'Show' || b.innerText === 'View') b.click();
        }

        static removeAll() {
            document.querySelectorAll('div.usybuttonclickdiv').forEach(b => b.remove());
        }
    }

    class Notification {
        static create(text) {
            document.querySelectorAll('div.usyNotificationOuter').forEach((e) => e.remove());
            const outer = document.createElement('div');
            const inner = document.createElement('div');
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
            }, 5000);
        }
    }

    const observer = {
        observer: null,
        start: () => {
            const observerSettings = {subtree: true, childList: true},
                callbackMappings = {
                    vx_button: [{s: 'article:not([usy])', f: Tweet.addVXButton}],
                    video_button: [{s: 'div[data-testid="videoComponent"]:not([usy])', f: Tweet.addVideoButton}],
                    image_button: [{s: 'img[src*="https://pbs.twimg.com/media/"]:not([usy])', f: Image.addImageButton}],
                    show_hidden: [{s: 'button[type="button"]', f: Button.showHidden}]
                }, getCallback = () => {
                    const callbacks = [];
                    for (const m in callbackMappings) if (Settings.setting[m]) for (const cb of callbackMappings[m]) callbacks.push(cb);
                    for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                    if (callbacks.length > 0) {
                        return (_, observer) => {
                            observer.disconnect();
                            for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                            observer.observe(document.body, observerSettings);
                        }
                    }
                    return (_, observer) => observer.disconnect();
                };
            this.observer = new MutationObserver(getCallback());
            this.observer.observe(document.body, observerSettings);

            // Style stuff
            const styleMapping = {
                hide_notifications: ['a[href="/notifications"]'],
                hide_messages: ['a[href="/messages"]'],
                hide_grok: ['a[href="/i/grok"]'],
                hide_jobs: ['a[href="/jobs"]'],
                hide_lists: ['a[href*="/lists"]'],
                hide_communities: ['a[href*="/communities"]'],
                hide_premium: ['a[href="/i/premium_sign_up"]', 'aside[aria-label="Subscribe to Premium"]'],
                hide_verified_orgs: ['a[href="/i/verified-orgs-signup"]'],
                hide_monetization: ['a[href="/settings/monetization"]'],
                hide_ads_button: ['a[href*="https://ads.x.com"]'],
                hide_whats_happening: ['div[aria-label="Timeline: Trending now"]'],
                hide_who_to_follow: ['aside[aria-label="Who to follow"]', 'aside[aria-label="Relevant people"]'],
            }, style = {
                style: '',
                hideSelector: (selector) => style.style += `${selector} {display:none;}`,
                applyStyle: () => {
                    if (style.style.length > 0) {
                        const s = document.createElement('style');
                        s.setAttribute('usyStyle', '');
                        s.appendChild(document.createTextNode(style.style));
                        document.head.appendChild(s);
                    }
                }
            }
            for (const setting in Settings.style) if (Settings.style[setting]) for (const selector of styleMapping[setting]) style.hideSelector(selector);
            style.applyStyle();
        },
        stop: () => {
            this.observer?.disconnect();
        }
    }

    observer.start();

    chrome.storage.onChanged.addListener(async (_, namespace) => {
        if (namespace === 'local') {
            await Settings.loadSettings();
            downloadHistoryEnabled = Settings.preferences.download_history_enabled;
            observer.stop();
            document.querySelectorAll('style[usyStyle]').forEach((e) => e.remove());
            document.querySelectorAll('[usy]').forEach((e) => e.removeAttribute('usy'));
            Button.removeAll();
            observer.start();
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.store) downloadHistoryEnabled && (Settings.preferences.download_history[message.store] = true, Settings.saveDownloadHistory());
    });


    async function getSettings() { // Setting handling
        class Settings {
            setting = {
                vx_button: true,
                video_button: !/Android/i.test(navigator.userAgent),
                image_button: !/Android/i.test(navigator.userAgent),
                show_hidden: false,
            }

            style = {
                hide_notifications: false,
                hide_messages: false,
                hide_grok: false,
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
                cobalt_url: 'https://api.cobalt.tools/api/json',
                cobalt_api_key: '',
                url_prefix: 'fixvx.com',
                custom_url: '',
                download_history_enabled: true,
                download_history_prevent_download: false,
                download_history: {}
            }

            async loadSettings() {
                const data = await chrome.storage.local.get(), settings = ['setting', 'style', 'preferences'];
                for (const setting of settings) for (const s in this[setting]) this[setting][s] = data[s] ?? this[setting][s];
                // Fix for past changes
                this.preferences.url_prefix === 'vx' && (this.preferences.url_prefix = 'fixvx.com');
                this.preferences.url_prefix === 'fx' && (this.preferences.url_prefix = 'fixupx.com');
            }

            saveDownloadHistory() {
                chrome.storage.local.set({download_history: this.preferences.download_history});
            }
        }

        const set = new Settings();
        await set.loadSettings();
        return set;
    }
})();