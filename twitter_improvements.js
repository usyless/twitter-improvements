'use strict';

(async () => {
    const vx_button_path = "M 18.36 5.64 c -1.95 -1.96 -5.11 -1.96 -7.07 0 l -1.41 1.41 l -1.42 -1.41 l 1.42 -1.42 c 2.73 -2.73 7.16 -2.73 9.9 0 c 2.73 2.74 2.73 7.17 0 9.9 l -1.42 1.42 l -1.41 -1.42 l 1.41 -1.41 c 1.96 -1.96 1.96 -5.12 0 -7.07 z m -2.12 3.53 z m -12.02 0.71 l 1.42 -1.42 l 1.41 1.42 l -1.41 1.41 c -1.96 1.96 -1.96 5.12 0 7.07 c 1.95 1.96 5.11 1.96 7.07 0 l 1.41 -1.41 l 1.42 1.41 l -1.42 1.42 c -2.73 2.73 -7.16 2.73 -9.9 0 c -2.73 -2.74 -2.73 -7.17 0 -9.9 z m 1 5 l 1.2728 -1.2728 l 2.9698 1.2728 l -1.4142 -2.8284 l 1.2728 -1.2728 l 2.2627 6.2225 l -6.364 -2.1213 m 4.9497 -4.9497 l 3.182 1.0607 l 1.0607 3.182 l 1.2728 -1.2728 l -0.7071 -2.1213 l 2.1213 0.7071 l 1.2728 -1.2728 l -3.182 -1.0607 l -1.0607 -3.182 l -1.2728 1.2728 l 0.7071 2.1213 l -2.1213 -0.7071 l -1.2728 1.2728",
        download_button_path = "M 12 17.41 l -5.7 -5.7 l 1.41 -1.42 L 11 13.59 V 4 h 2 V 13.59 l 3.3 -3.3 l 1.41 1.42 L 12 17.41 zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
        Settings = await getSettings();

    class Tweet { // Tweet functions
        static addVXButton(article) {
            try {
                article.setAttribute('usy', '');
                const a = Tweet.anchor(article);
                a.after(Button.newButton(a, vx_button_path, () => navigator.clipboard.writeText(URL.vxIfy(Tweet.url(article)))));
            } catch {article.removeAttribute('usy')}
        }

        static addVideoButton(videoComponent) {
            try {
                videoComponent.setAttribute('usy', '');
                const article = Tweet.nearestTweet(videoComponent), a = Tweet.anchor(article);
                a.after(Button.newButton(a, download_button_path, () => chrome.runtime.sendMessage({type: 'video', url: Tweet.url(article)})));
            } catch {videoComponent.removeAttribute('usy')}
        }

        static anchor(article) {
            return article.querySelector('button[aria-label="Share post"]').parentElement.parentElement;
        }

        static url(article) {
            for (const a of article.querySelectorAll('a')) if (a.firstElementChild && a.firstElementChild.nodeName === 'TIME') return a.href;
        }

        static nearestTweet(elem) {
            let anchor;
            while (elem) {
                anchor = elem.querySelector('article');
                if (anchor) return anchor;
                elem = elem.parentElement;
            }
        }
    }

    class Image { // Image element functions
        static addImageButton(image) {
            try {
                image.setAttribute('usy', '');
                image.after(Button.newButton(Tweet.anchor(Tweet.nearestTweet(image)), download_button_path, (e) => {
                    e.preventDefault();
                    chrome.runtime.sendMessage({type: 'image', url: Image.respectiveURL(image), sourceURL: image.src});
                }));
            } catch {image.removeAttribute('usy')}
        }

        static respectiveURL(image) {
            let url = window.location.href;
            if (url.includes('/photo/')) return url;
            while (image) {
                url = image.href;
                if (url) return url;
                image = image.parentElement;
            }
        }
    }

    class URL { // URL modification functions
        static vxIfy(url) {
            return `https://fixvx.com/${url.substring(14)}`;
        }
    }

    class Remove {
        static Node(node) {
            node.classList.add('hidden');
        }
    }

    class Button { // Button functions
        static newButton(shareButton, path, clickCallback) {
            shareButton = shareButton.cloneNode(true);
            shareButton.classList.add('usybuttonclickdiv');
            shareButton.querySelector('path').setAttribute("d", path);
            const bc = shareButton.querySelector('button').firstElementChild;
            shareButton.addEventListener('mouseover', () => Button.onhover(bc));
            shareButton.addEventListener('mouseout', () => Button.stophover(bc));
            shareButton.addEventListener('click', clickCallback);
            return shareButton;
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
    }

    if (Settings.tweetObservingEnabled()) { // Run the extension
        const observerSettings = {subtree: true, childList: true},
            callbackMappings = {
                vx_button: [{s: 'article:not([usy])', f: Tweet.addVXButton}],
                video_button: [{s: 'div[data-testid="videoComponent"]:not([usy])', f: Tweet.addVideoButton}],
                image_button: [{s: 'img[src*="https://pbs.twimg.com/media/"]:not([usy])', f: Image.addImageButton}],
                show_hidden: [{s: 'button[type="button"]', f: Button.showHidden}],
                hide_notifications: [{s: 'a[aria-label="Notifications"]', f: Remove.Node}],
                hide_messages: [{s: 'a[aria-label="Direct Messages"]', f: Remove.Node}],
                hide_grok: [{s: 'a[aria-label="Grok"]', f: Remove.Node}],
                hide_jobs: [{s: 'a[aria-label="Jobs"]', f: Remove.Node}],
                hide_lists: [{s: 'a[aria-label="Lists"]', f: Remove.Node}],
                hide_communities: [{s: 'a[aria-label="Communities"]', f: Remove.Node}],
                hide_premium: [{s: 'a[aria-label="Premium"]', f: Remove.Node}, {s: 'aside[aria-label="Subscribe to Premium"]', f: Remove.Node}],
                hide_verified_orgs: [{s: 'a[aria-label="Verified Orgs"]', f: Remove.Node}],
                hide_whats_happening: [{s: 'div[aria-label="Timeline: Trending now"]', f: Remove.Node}],
                hide_who_to_follow: [{s: 'aside[aria-label="Who to follow"]', f: Remove.Node}, {s: 'aside[aria-label="Relevant people"]', f: Remove.Node}],
            }, getCallback = () => {
                const callbacks = [];
                for (const m in callbackMappings) if (Settings.setting[m]) for (const cb of callbackMappings[m]) callbacks.push(cb);
                return (_, observer) => {
                    observer.disconnect();
                    for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                    observer.observe(document.body, observerSettings);
                }
            };
        (new MutationObserver(getCallback())).observe(document.body, observerSettings);
    }

    async function getSettings() { // Setting handling
        class Settings {
            setting = {
                vx_button: true,
                video_button: true,
                image_button: true,
                show_hidden: false,
                hide_notifications: false,
                hide_messages: false,
                hide_grok: false,
                hide_jobs: false,
                hide_lists: false,
                hide_communities: false,
                hide_premium: false,
                hide_verified_orgs: false,
                hide_whats_happening: false,
                hide_who_to_follow: false,
            }

            tweetObservingEnabled() {
                for (const s in this.setting) if (this.setting[s]) return true;
            }

            async loadSettings() {
                const data = await Settings.getStorage();
                for (const s in this.setting) if (data[s] != null) this.setting[s] = data[s];
            }

            static async getStorage() {
                return await chrome.storage.local.get();
            }
        }

        const set = new Settings();
        await set.loadSettings();
        return set;
    }
})();