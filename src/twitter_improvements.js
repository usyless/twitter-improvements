'use strict';

(() => {
    if (typeof this.browser === 'undefined') {
        this.browser = /** @suppress */ chrome;
    }

    // this will memory leak for now, its fine
    // i will fix this later
    const /** @type {Map<string, MediaItem[]>}*/ URL_CACHE = new Map();

    window.addEventListener("message", (e) => {
        if (e.source !== window || e.origin !== "https://x.com") return;

        const data = e?.data;
        if (data?.source === "ift" && data?.type === 'media-urls') for (const {id, media} of /** @type {MediaTransfer[]}*/ data.media)
            URL_CACHE.set(id, media);
    });

    const vx_button_path = "M 18.36 5.64 c -1.95 -1.96 -5.11 -1.96 -7.07 0 l -1.41 1.41 l -1.42 -1.41 l 1.42 -1.42 c 2.73 -2.73 7.16 -2.73 9.9 0 c 2.73 2.74 2.73 7.17 0 9.9 l -1.42 1.42 l -1.41 -1.42 l 1.41 -1.41 c 1.96 -1.96 1.96 -5.12 0 -7.07 z m -2.12 3.53 z m -12.02 0.71 l 1.42 -1.42 l 1.41 1.42 l -1.41 1.41 c -1.96 1.96 -1.96 5.12 0 7.07 c 1.95 1.96 5.11 1.96 7.07 0 l 1.41 -1.41 l 1.42 1.41 l -1.42 1.42 c -2.73 2.73 -7.16 2.73 -9.9 0 c -2.73 -2.74 -2.73 -7.17 0 -9.9 z m 1 5 l 1.2728 -1.2728 l 2.9698 1.2728 l -1.4142 -2.8284 l 1.2728 -1.2728 l 2.2627 6.2225 l -6.364 -2.1213 m 4.9497 -4.9497 l 3.182 1.0607 l 1.0607 3.182 l 1.2728 -1.2728 l -0.7071 -2.1213 l 2.1213 0.7071 l 1.2728 -1.2728 l -3.182 -1.0607 l -1.0607 -3.182 l -1.2728 1.2728 l 0.7071 2.1213 l -2.1213 -0.7071 l -1.2728 1.2728",
        download_button_path = "M 12 17.41 l -5.7 -5.7 l 1.41 -1.42 L 11 13.59 V 4 h 2 V 13.59 l 3.3 -3.3 l 1.41 1.42 L 12 17.41 zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z";

    const Defaults = {
        loadDefaults: async () => {
            const r = await Background.get_default_settings();
            for (const def in r) Defaults[def] = r[def];
        },
    };
    const Settings = {
        loadSettings: async () => {
            const r = await Background.get_settings();
            for (const setting in r) Settings[setting] = r[setting];
        },
    };
    const About = {
        android: /Android/i.test(navigator.userAgent)
    };

    const Background = {
        /** @param {saveId} id */
        download_history_has: (id) => browser.runtime.sendMessage({type: 'download_history_has', id}),
        /** @param {saveId} id */
        download_history_remove: (id) => browser.runtime.sendMessage({type: 'download_history_remove', id}),

        /**
         * @param {string} url
         * @param {MediaItem[]} media
         * @param {EventModifiers} modifiers
         */
        save_media: (url, media, modifiers) => browser.runtime.sendMessage({ type: 'save_media', url, media, modifiers }),

        get_settings: () => browser.runtime.sendMessage({type: 'get_settings'}),
        get_default_settings: () => browser.runtime.sendMessage({type: 'get_default_settings'}),
    };

    const Downloaders = {
        /**
         * @param {string} url
         * @param {MediaItem[] | MediaItem} [media]
         * @param {EventModifiers} modifiers
         * @param {boolean} [override]
         * @param {boolean} [softOverride]
         * @returns {void}
         */
        download_all: async (url, media, modifiers, {override=false, softOverride=false}={}) => {
            if (!media) {
                const id = Helpers.id(url);
                if (URL_CACHE.has(id)) media = URL_CACHE.get(id);
                else {
                    Notification.create('Error downloading, please try again in a second', 'error');
                    return;
                }
            }
            if (!Array.isArray(media)) media = [media];
            Notification.create(`Downloading media${About.android ? '\n(This may take a second on android)' : ''}`, 'save_media');
            if (!override && Helpers.shouldPreventDuplicate()) {
                let newMedia;
                if (softOverride) {
                    newMedia = (await Promise.all(media.map(async (m) => [m, await Background.download_history_has(m.save_id)])))
                        .filter(([_, saved]) => !saved).map(([m]) => m);
                }
                if (((newMedia && newMedia.length === 0) || (!softOverride)) &&
                    (await Promise.all(media.map(({save_id}) => Background.download_history_has(save_id)))).some(Boolean)) {
                    const notif = Notification.create('Already downloaded\nClick here to save anyway', 'save_media_duplicate');
                    if (notif) {
                        notif.style.cursor = 'pointer';
                        notif.addEventListener('click', Downloaders.download_all.bind(null, url, media, modifiers, {override: true}));
                    }
                    return;
                }
                if (newMedia) media = newMedia;
            }
            if (media.length > 0) {
                Background.save_media(url, media, modifiers);
            } else {
                Notification.create('No media to save', 'error');
            }
        }
    };

    const Tweet = { // Tweet functions
        /** @param {HTMLElement} article */
        addVXButton: (article) => {
            try {
                article.setAttribute('usy', '');
                const a = Tweet.defaultAnchor(article);
                const cb = Tweet.vxButtonCallback.bind(null, article);
                a.after(Button.newButton(a, vx_button_path, cb, 'usy-copy'));

                const altAnchor = Tweet.secondaryAnchor(article);
                if (altAnchor) {
                    for (const copy of altAnchor.parentElement.querySelectorAll('[usy-copy]')) copy.remove();
                    altAnchor.after(Button.newButton(altAnchor, vx_button_path, cb, 'usy-copy'));
                }
            } catch {
                article.removeAttribute('usy');
            }
        },

        /** @param {HTMLElement} media */
        addDownloadButton: (media)=> {
            try {
                media.setAttribute('usy-download', '');
                const article = Tweet.nearestTweet(media);
                // checks if quote tweet contains specific media (don't show button)
                // doesn't affect a video QRT as each media checked separately
                if (!(article.querySelector('div[id] > div[id]')?.contains(media)) && !article.querySelector('.usybuttonclickdiv[usy-download]')) {
                    const a = Tweet.defaultAnchor(article), cb = Tweet.mediaDownloadCallback.bind(null, article);
                    a.after(Button.newButton(a, download_button_path, cb, 'usy-download', cb));

                    const altAnchor = Tweet.secondaryAnchor(article);
                    if (altAnchor) {
                        for (const copy of altAnchor.parentElement.querySelectorAll('[usy-download]')) copy.remove();
                        altAnchor.after(Button.newButton(altAnchor, download_button_path, cb, 'usy-download', cb));
                    }
                }
            } catch {
                media.removeAttribute('usy-download');
            }
        },

        /** @param {HTMLElement} article */
        copyBookmarkButton: (article) => {
            try {
                article.setAttribute('usy-bookmarked', '');
                const a = Tweet.secondaryAnchor(article);
                if (a) {
                    // Clear all previous bookmark buttons to avoid stacking
                    for (const bk of a.parentElement.querySelectorAll('[usy-bookmark]')) bk.remove();

                    const bk = Tweet.respectiveBookmarkButton(article);
                    bk.addEventListener('click', () => {
                        setTimeout(() => {
                            a.parentElement.removeChild(a.parentElement.querySelector('[usy-bookmark]'));
                            article.removeAttribute('usy-bookmarked');
                        }, 100);
                    }, {once: true});
                    a.before(Button.newButton(bk, null, () => {
                        bk.firstElementChild.click();
                    }, 'usy-bookmark', null,
                        [{type: 'pointerout', listener: (e) => e.currentTarget.firstElementChild.firstElementChild.style.color = '#ffffff'}],
                        [(btn) => btn.firstElementChild.firstElementChild.style.color = '#ffffff']));
                }
            } catch {
                article.removeAttribute('usy-bookmarked');
            }
        },

        /**
         * @param {HTMLElement} article
         * @returns {HTMLElement}
         */
        defaultAnchor: (article) => {
           return article.querySelector('button[aria-label="Share post"]:not([usy])').parentElement.parentElement;
        },

        /**
         * @param {HTMLElement} article
         * @returns {boolean}
         */
        isFocused: (article) => {
            // checks for reply section, or "Who can reply?" on limited reply tweets
            return !!(article.parentElement.querySelector('[data-testid="inline_reply_offscreen"]') ||
                article.querySelector('div[aria-live="polite"][role="status"]'));
        },

        /**
         * @param {HTMLElement} article
         * @returns {HTMLElement}
         */
        respectiveBookmarkButton: (article) => {
            return (article.querySelector('button[data-testid="bookmark"]')
                ?? article.querySelector('button[data-testid="removeBookmark"]')).parentElement;
        },

        /**
         * @param {HTMLElement} article
         * @returns {string}
         */
        url: (article) => {
            for (const a of article.querySelectorAll('a')) if (a.querySelector('time')) return a.href.replace(/\/history$/, "");
            throw new TypeError("No URL Found");
        },

        /**
         * @param {HTMLElement} elem
         * @returns {HTMLElement | null}
         */
        nearestTweet: (elem) => {
            if (Tweet.maximised()) {
                let c = elem.closest('article');
                if (c) return c;
                else {
                    for (const article of elem.closest('#layers').querySelectorAll('article')) {
                        if (Tweet.isFocused(article)) return article;
                    }
                }
            } else {
                let anchor;
                while (elem) {
                    anchor = elem.querySelector('article');
                    if (anchor) return anchor;
                    elem = elem.parentElement;
                }
            }
        },

        /** @param {HTMLElement} article */
        vxButtonCallback: (article) => {
            try {
                navigator.clipboard.writeText(URLS.vxIfy(Tweet.url(article))).then(() => {
                    Notification.create('Copied URL to clipboard', 'copied_url');
                });
            } catch {
                Notification.create('Failed to copy url, please report the issue along with the current url to twitter improvements', 'error');
            }
        },

        /**
         * @param {HTMLElement} article
         * @param {MouseEvent} ev
         */
        mediaDownloadCallback: (article, ev) => {
            const url = Tweet.url(article), id = Helpers.id(url);
            if (URL_CACHE.has(id)) {
                const media = URL_CACHE.get(id);
                if (ev.type === 'click') {
                    if (media.length === 1) {
                        Downloaders.download_all(url, media, Helpers.eventModifiers(ev));
                    } else Notification.createDownloadChoices(url, media, ev);
                } else {
                    if (media.length === 1) {
                        Background.download_history_remove(media[0].save_id);
                        Notification.create('Removing media from history', 'history_remove');
                    } else Notification.create('Multi-media tweet\nClick download button first to remove', 'error');
                }
            } else if (article.isConnected) { // look into this
                setTimeout(Tweet.mediaDownloadCallback, 100, article, ev);
            }
        },

        /** @returns {boolean} */
        maximised: () => {
            const pathname = window.location.pathname;
            return pathname.includes('/photo/') || pathname.includes('/video/');
        },

        /**
         * @param {HTMLElement} article
         * @returns {HTMLElement | null}
         */
        secondaryAnchor: (article) => {
            if (Tweet.maximised() && Tweet.isFocused(article))
                for (const b of document.querySelectorAll('button[aria-label="Share post"]:not([usy])'))
                    if (!b.closest('article')) return b.parentElement.parentElement;
        },
    };

    const Image = { // Image element functions
        /**
         * @param {HTMLElement | HTMLImageElement} media
         * @param {function} cb
         * @returns {HTMLElement}
         */
        genericButton: (media, cb) => {
            const button = Button.newButton(Image.createDownloadButton(), download_button_path, cb, "usy-media", cb);
            const {image_button_width_value, image_button_scale, image_button_position} = Settings.image_preferences;
            button.style.width = (image_button_width_value === Defaults.image_preferences.image_button_width_value)
                ? 'fit-content' : `${+image_button_width_value / +image_button_scale}%`;
            button.classList.add(...(Image.buttonModes[image_button_position] ?? []));
            button.style.transform = `scale(${image_button_scale})`;

            if (media.complete || !('complete' in media)) Image.setButtonHeight(media, button);
            else media.addEventListener('load', Image.setButtonHeight.bind(null, media, button), {once: true});
            media.after(button);
            return button;
        },

        /** @param {HTMLImageElement} image */
        addImageButton: (image) => {
            let button;
            try {
                image.setAttribute('usy-media', '');
                button = Image.genericButton(image, Image.imageButtonCallback.bind(null, image));

                if (Settings.download_preferences.download_history_enabled) { // mark image
                    const id = Image.idWithNumber(image);
                    button.setAttribute('ti-id', id);
                    Background.download_history_has(id).then((response) => {
                        if (response === true) Button.mark(button);
                    });
                }
            } catch {
                image.removeAttribute('usy-media');
                button?.remove();
            }
        },

        /** @param {HTMLElement} video */
        addVideoButton: (video) => {
            let button;
            try {
                video.setAttribute('usy-media', '');
                const article = Tweet.nearestTweet(video);
                // no way to get id from inside quote tweet i think
                if (!(article.querySelector('div[id] > div[id]')?.contains(video))) {
                    const id = Helpers.idWithNumber(Tweet.url(article), Image.videoRespectiveIndex(video, article));
                    const mark_button = () => {
                        if (Settings.download_preferences.download_history_enabled) { // mark image
                            button.setAttribute('ti-id', id);
                            Background.download_history_has(id).then((response) => {
                                if (response === true) Button.mark(button);
                            });
                        }
                    }

                    const cb =  Image.videoButtonCallback.bind(null, video, article);
                    if (video.textContent.includes('GIF')) { // gif
                        button = Image.genericButton(video, cb);
                        mark_button();
                    } else { // video player
                        let timer;
                        video.addEventListener('pointermove', () => {
                            if (!timer) timer = setTimeout(() => {
                                const share = video.querySelector('[aria-label="Video Settings"]')?.parentElement?.parentElement;
                                if (share && !video.querySelector('[usy-media]')) {
                                    button = Button.newButton(share.cloneNode(true), download_button_path, cb,
                                        "usy-media", cb, [],
                                        [(btn) => {
                                            btn.firstElementChild.firstElementChild.style.color = '#ffffff';
                                            btn.classList.add('usy-inline');
                                        }]);
                                    share.before(button);
                                    mark_button();
                                }
                                timer = null;
                            }, 100);
                        });
                    }
                }
            } catch {
                video.removeAttribute('usy-media');
                button?.remove();
            }
        },

        /** @param {HTMLElement} video */
        addVideoButtonTimeout: (video) => {
            video.setAttribute('usy-media', '');
            setTimeout(Image.addVideoButton, 100, video);
        },

        buttonModes: {
            0: ['usy-top', 'usy-left'],
            1: ['usy-top', 'usy-right'],
            2: ['usy-bottom', 'usy-left'],
            3: ['usy-bottom', 'usy-right'],
        },

        setButtonHeight: (image, button) => {
            const {image_button_height_value: ibh,image_button_height_value_small: ibhs,
                    small_image_size_threshold, image_button_scale} = Settings.image_preferences,
                {image_button_height_value: dibh, image_button_height_value_small: dibhs} = Defaults.image_preferences;

            if (ibh === dibh && ibhs === dibhs) return;

            const height = image.clientHeight;

            if (height <= 0 && image.isConnected) setTimeout(Image.setButtonHeight.bind(null, image, button), 50);
            else if (height > +small_image_size_threshold) {
                if (ibh !== dibh) button.style.height = `${+ibh / +image_button_scale}%`;
            } else if (ibhs !== dibhs) button.style.height = `${+ibhs / +image_button_scale}%`;
        },

        /** @returns {HTMLElement} */
        createDownloadButton: (() => {
            const outer = document.createElement('div'),
                button = document.createElement('button'),
                svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                g = document.createElementNS('http://www.w3.org/2000/svg', 'g'),
                path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            g.appendChild(path);
            svg.appendChild(g);
            button.appendChild(svg);
            outer.appendChild(button);

            svg.setAttributeNS(null, 'viewBox', '0 0 24 24');
            path.setAttributeNS(null, 'fill', 'currentColor');

            return () => outer.cloneNode(true);
        })(),

        /**
         * @param {HTMLImageElement} image
         * @returns {string}
         */
        respectiveURL: (image) => {
            let url = image.closest('[href]')?.href;
            if (url) return url;

            if (Tweet.maximised()) {
                url = window.location.href;
                const li = image.closest('li');
                return (li) ? `${url.slice(0, -1)}${Array.from(li.parentElement.children).indexOf(li) + 1}` : url;
            }
        },

        /**
         * @param {HTMLElement} video
         * @param {HTMLElement} [tweet]
         * @returns {tweetNum}
         */
        videoRespectiveIndex: (video, tweet) => {
            if (Tweet.maximised()) {
                const li = video.closest('li');
                return li ? (Array.from(li.parentElement.children).indexOf(li) + 1) : 1;
            } else {
                if (!tweet) tweet = Tweet.nearestTweet(video);
                return Array.from(tweet.querySelectorAll('[data-testid="tweetPhoto"]'))
                    .indexOf(video.closest('[data-testid="tweetPhoto"]')) + 1;
            }
        },

        /**
         * @param {HTMLImageElement} image
         * @returns {saveId}
         */
        idWithNumber: (image) => Helpers.idWithNumber(Image.respectiveURL(image)),

        /**
         * @param {HTMLImageElement} image
         * @param {MouseEvent} ev
         */
        imageButtonCallback: (image, ev) => {
            const url = Image.respectiveURL(image), save_id = Helpers.idWithNumber(url),
                split = save_id.split('-');
            if (ev?.type === 'click' || !ev) {
                Downloaders.download_all(url,{
                    index: +split[1], save_id, type: 'Image',
                    url: image.src.replace(/name=[^&]*/, "name=orig"),
                }, Helpers.eventModifiers(ev));
            } else {
                Notification.create('Removing image from saved', 'history_remove');
                Background.download_history_remove(save_id);
            }
        },

        /**
         * @param {HTMLElement} video
         * @param {HTMLElement} article
         * @param {MouseEvent} ev
         */
        videoButtonCallback: (video, article, ev) => {
            const save_id = ev.currentTarget.getAttribute('ti-id');
            if (ev?.type === 'click' || !ev) {
                if (URL_CACHE.has(save_id.split('-')[0])) {
                    Downloaders.download_all(Tweet.url(article),
                        URL_CACHE.get(save_id.split('-')[0]).filter(({save_id: sid}) => sid === save_id),
                        Helpers.eventModifiers(ev));
                } else {
                    Notification.create('Error saving, try again', 'error');
                }
            } else {
                Notification.create('Removing video from saved', 'history_remove');
                Background.download_history_remove(save_id);
            }
        },

        resetAll: () => {
            for (const button of document.querySelectorAll('[usy-media].usybuttonclickdiv')) button.remove();
            for (const image of document.querySelectorAll('[usy-media]')) image.removeAttribute('usy-media');
        },

        getButtons: (id) => document.querySelectorAll(`[usy-media][ti-id="${id}"]`)
    };

    const URLS = { // URL modification functions
        vxIfy: (url) => {
            return `https://${URLS.getPrefix()}/${url.substring(14)}`;
        },

        getPrefix: () => {
            if (Settings.vx_preferences.url_prefix === 'x.com') return Settings.vx_preferences.custom_url;
            return Settings.vx_preferences.url_prefix;
        }
    };

    const Button = { // Button functions
        /**
         * @param {HTMLElement} shareButton
         * @param {string | null} [path]
         * @param {function} clickCallback
         * @param {string} attribute
         * @param {function} [rightClickCallback]
         * @param {EventListeners[]} [customListeners]
         * @param {(function(HTMLElement): any)[]} [extras]
         * @returns {HTMLElement}
         */
        newButton: (shareButton, path, clickCallback, attribute, rightClickCallback = null, customListeners = [], extras = []) => {
            shareButton = shareButton.cloneNode(true);
            shareButton.classList.add('usybuttonclickdiv');
            shareButton.setAttribute(attribute, "");
            const button = shareButton.querySelector('button');
            button.setAttribute('usy', '');
            button.disabled = false;
            button.classList.remove('r-icoktb'); // private tweet buttons more visible
            if (path) shareButton.querySelector('path').setAttribute("d", path);
            shareButton.addEventListener('pointerover', Button.onhover.bind(null, button.firstElementChild));
            shareButton.addEventListener('pointerout', Button.stophover.bind(null, button.firstElementChild, button.firstElementChild.style.color));
            shareButton.addEventListener('click', clickCallback);
            shareButton.addEventListener('click', Button.stopAllEvents);
            if (rightClickCallback) {
                shareButton.addEventListener('contextmenu', rightClickCallback);
                shareButton.addEventListener('contextmenu', Button.stopAllEvents);
            }
            for (const listener of customListeners) {
                shareButton.addEventListener(listener.type, listener.listener);
            }
            for (const extra of extras) extra(shareButton);
            return shareButton;
        },

        stopAllEvents: (e) => {
            e.preventDefault();
            e.stopPropagation();
        },

        /** @param {HTMLElement} button */
        mark: (button) => button.classList.add('usyMarked'),
        /** @param {HTMLElement} button */
        unmark: (button) => button.classList.remove('usyMarked'),
        /** @param {HTMLElement} bc */
        onhover: (bc) => {
            bc.classList.add('r-1cvl2hr');
            bc.style.color = '';
            bc.firstElementChild.firstElementChild.classList.replace('r-1niwhzg', 'r-1peqgm7');
        },
        /**
         * @param {HTMLElement} bc
         * @param {string} origColour
         */
        stophover: (bc, origColour) => {
            bc.classList.remove('r-1cvl2hr');
            bc.style.color = origColour;
            bc.firstElementChild.firstElementChild.classList.replace('r-1peqgm7', 'r-1niwhzg');
        },

        resetAll: () => {
            for (const e of document.querySelectorAll('.usybuttonclickdiv')) e.remove();
            for (const attr of ['usy', 'usy-bookmarked', 'usy-download', 'usy-media']) {
                for (const e of document.querySelectorAll(`[${attr}]`)) e.removeAttribute(attr);
            }
        },

        /**
         * @param {HTMLElement} elem
         * @returns {HTMLElement | void}
         */
        closest: (elem) => elem.closest('.usybuttonclickdiv'),
    };

    const Notification = {
        /**
         * @param {string} text
         * @param {NotificationTypes} type
         * @param {number} [timeout]
         * @returns {HTMLDivElement}
         */
        create: (text, type, timeout = 5000) => {
            if (!Settings.hidden_extension_notifications[type]) {
                Notification.clear();
                const outer = document.createElement('div'), inner = document.createElement('div');
                outer.appendChild(inner);
                outer.classList.add('usyNotificationOuter');
                inner.classList.add('usyNotificationInner');
                inner.textContent = text;

                const fixInterval = setInterval(() => {
                    if (Notification.getCurrentTwitterNotif()) inner.style.transform = 'translateY(-50px)';
                    else inner.style.transform = '';
                }, 200);

                document.body.appendChild(outer);
                setTimeout(() => {
                    inner.classList.add('usyFadeOut');
                    inner.addEventListener('transitionend', (e) => {
                        if (e.target === e.currentTarget) {
                            outer.remove();
                            clearInterval(fixInterval);
                        }
                    });
                }, timeout);
                return inner;
            }
        },

        clear: () => {
            document.querySelectorAll('div.usyNotificationOuter:not(.usyFullscreen)').forEach((e) => e.remove());
        },

        clearFullscreen: () => {
            document.querySelectorAll('div.usyNotificationOuter.usyFullscreen').forEach((e) => e.remove());
        },

        /**
         * @param {string} url
         * @param {MediaItem[]} choices
         * @param {Event} event
         */
        createDownloadChoices: (url, choices, event) => {
            Notification.clearFullscreen();
            const /** @type EventListeners[] */ notificationEventListeners = [];
            const fullscreen = document.createElement('div'),
                popup = document.createElement('div');

            const btnRect = Button.closest(event.target).getBoundingClientRect();

            const originalScrollY = window.scrollY;
            let fixScrollPosition = () => popup.style.top = `${btnRect.y - (window.scrollY - originalScrollY)}px`;

            fullscreen.classList.add('usyNotificationOuter', 'usyFullscreen');
            popup.classList.add('usyDownloadChoicePopup');
            popup.style.left = `${btnRect.x}px`;
            popup.style.top = `${btnRect.y}px`;

            popup.style.backgroundColor = window.getComputedStyle(document.body).backgroundColor;

            fullscreen.addEventListener('click', () => {
                for (const {type, listener} of notificationEventListeners) window.removeEventListener(type, listener);
                Notification.clearFullscreen();
            });

            for (const {index, type, save_id} of choices) {
                const btn = Notification.getChoiceButton(`${type} ${index}`);
                btn.dataset.index = index.toString();
                btn.dataset.save_id = save_id;

                if (Settings.download_preferences.download_history_enabled) {
                    Background.download_history_has(save_id).then((r) => r && Button.mark(btn));
                }

                popup.appendChild(btn);
            }
            popup.appendChild(Notification.getChoiceButton('Download All'));
            popup.addEventListener('click', (e) => {
                const choice = +e.target.closest('.usyDownloadChoiceButton')?.dataset.index - 1;
                if (Number.isNaN(choice)) {
                    Downloaders.download_all(url, choices, Helpers.eventModifiers(e),
                        Settings.download_preferences.download_all_override_saved ? {override: true} : {softOverride: true});
                } else Downloaders.download_all(url, choices[choice], Helpers.eventModifiers(e));
            });
            popup.addEventListener('contextmenu', (e) => {
                const btn = e.target.closest('.usyDownloadChoiceButton'), save_id = btn?.dataset?.save_id;
                if (save_id) {
                    e.preventDefault();
                    Background.download_history_remove(save_id);
                    Notification.create('Removing media from history', 'history_remove');
                    Button.unmark(btn);
                }
            });

            fullscreen.appendChild(popup);
            document.body.appendChild(fullscreen);

            const rect = popup.getBoundingClientRect();
            if (rect.left < 0) popup.style.left = '0px';
            else if (rect.right > window.innerWidth) popup.style.left = `${btnRect.x - rect.width + btnRect.width}px`;

            if (rect.top < 0) popup.style.top = '0px';
            else if (rect.bottom > window.innerHeight) {
                popup.style.removeProperty('top');
                popup.style.bottom = `${window.innerHeight - btnRect.y - btnRect.height}px`;
                fixScrollPosition = () => popup.style.bottom = `${window.innerHeight - btnRect.y - btnRect.height + (window.scrollY - originalScrollY)}px`;
            } else if (Settings.download_preferences.download_all_near_click) {
                popup.firstElementChild.before(popup.lastElementChild);
            }

            popup.classList.add('animate');
            notificationEventListeners.push({type: 'scroll', listener: fixScrollPosition});

            for (const {type, listener} of notificationEventListeners) {
                listener();
                window.addEventListener(type, listener);
            }
        },

        /**
         * @param {string} text
         * @returns {HTMLButtonElement}
         */
        getChoiceButton: (text) => {
            const b = document.createElement('button'), t = document.createElement('b');
            b.classList.add('usyDownloadChoiceButton');
            t.textContent = text;
            b.appendChild(t);
            return b;
        },

        getCurrentTwitterNotif: () => document.body.querySelector('[data-testid="toast"]')
    };

    const Helpers = {
        /**
         * @param {string} url
         * @param {string} filename
         */
        download: (url, filename) => {
            fetch(url).then(r => r.blob()).then((blob) => {
                const link = document.createElement('a'),
                    objectURL = URL.createObjectURL(blob);
                link.href = objectURL;
                link.download = filename;
                link.dispatchEvent(new MouseEvent('click'));
                URL.revokeObjectURL(objectURL);
            });
        },

        /**
         * @param {string} url
         * @param {tweetNum} [override]
         * @returns {saveId}
         */
        idWithNumber: (url, override) => {
            const a = url.split("/");
            return `${a[5]}-${override ?? a[7]}`;
        },

        /**
         * @param {string} url
         * @returns {tweetId}
         */
        id: (url) => url.split("/")[5],

        /** @returns {boolean} */
        shouldPreventDuplicate: () => {
            return Settings.download_preferences.download_history_enabled && Settings.download_preferences.download_history_prevent_download;
        },

        /**
         * @param {MouseEvent} e
         * @returns {EventModifiers}
         */
        eventModifiers: (e) => ({shift: e.shiftKey, ctrl: e.ctrlKey})
    };

    const Observer = {
        observer: null,
        forceUpdate: null,

        start: () => {
            Observer.disable();

            Button.resetAll();
            const observerSettings = {subtree: true, childList: true},
                callbackMappings = {
                    vx_button: [{
                        s: 'article:not([usy])',
                        f: Tweet.addVXButton
                    }],
                    bookmark_on_photo_page: [{
                        s: 'article:not([usy-bookmarked])',
                        f: Tweet.copyBookmarkButton
                    }],
                    inline_download_button: [{ // tweetPhoto data id doesnt work for maximised view
                        s: 'img[src^="https://pbs.twimg.com/media/"]:not([usy-download])',
                        f: Tweet.addDownloadButton
                    }, {
                        s: 'div[data-testid="videoComponent"]:not([usy-download])',
                        f: Tweet.addDownloadButton
                    }, {
                        s: 'img[alt="Embedded video"]:not([usy-download])',
                        f: Tweet.addDownloadButton
                    }],
                    media_download_button: [{
                        s: 'img[src^="https://pbs.twimg.com/media/"]:not([usy-media])',
                        f: Image.addImageButton
                    }, {
                        s: 'div[data-testid="videoComponent"]:not([usy-media])',
                        f: Image.addVideoButtonTimeout
                    }, {
                        s: 'img[alt="Embedded video"]:not([usy-media])',
                        f: Image.addVideoButton
                    }]
                }, getCallback = () => {
                    const callbacks = [];
                    for (const m in callbackMappings) if (Settings.setting[m]) callbacks.push(...callbackMappings[m]);
                    const update = (_, __, pre) => {
                        Observer.observer?.disconnect();
                        pre?.();
                        for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                        Observer.observer?.observe(document.body, observerSettings);
                    };
                    update();
                    Observer.forceUpdate = update;
                    return (callbacks.length > 0) ? update : Observer.disable;
                };
            Observer.observer = new MutationObserver(getCallback());
            Observer.observer?.observe(document.body, observerSettings);
        },

        disable: () => {
            Observer.observer?.disconnect();
            Observer.observer = null;
            Observer.forceUpdate = null;
        }
    };

    Promise.all([Defaults.loadDefaults(), Settings.loadSettings()]).then(Observer.start);

    browser.runtime.onMessage.addListener((message) => {
        switch (message.type) {
            case 'history_change_add': {
                for (const button of Image.getButtons(message.id)) Button.mark(button);
                break;
            }
            case 'history_change_remove': {
                for (const button of Image.getButtons(message.id)) Button.unmark(button);
                break;
            }
            case 'settings_update': {
                Settings.loadSettings().then(() => {
                    const changes = message.changes;
                    // only need to reload for vx setting change
                    if (changes.hasOwnProperty('setting')) Observer.start();
                    // update on image pref or download pref change
                    else if (changes.hasOwnProperty('image_preferences') || changes.hasOwnProperty('download_preferences')) Observer.forceUpdate?.(null, null, Image.resetAll);
                });
                break;
            }
            case 'history_change': {
                Observer.forceUpdate?.(null, null, Image.resetAll);
                break;
            }
            case 'image_saved': {
                Notification.create(`Saving Image${About.android ? '\n(This may take a second on android)' : ''}`, 'save_media');
                break;
            }
            case 'download': {
                Helpers.download(message.url, message.filename);
                break;
            }
        }
    });
})();