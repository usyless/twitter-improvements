(() => {
    'use strict';

    let chromeMode = false;
    // set browser to chrome if not in firefox
    /** @type {typeof browser} */
    const extension = typeof browser !== 'undefined' ? browser : (() => {
        chromeMode = true;
        return chrome;
    })();

    const /** @type {Map<tweetId, {promises: [{resolve: function(MediaItem[]), reject: function(String)}], timer: Number}>}*/ URL_CACHE_PROMISES = new Map();
    const /** @type {Map<tweetId, MediaItem[]>}*/ URL_CACHE = new Map();

    /** @type {(saveId) => Promise<MediaItem[]>} */
    const URLCacheGet = (id) => {
        const result = URL_CACHE.get(id);
        if (result) return Promise.resolve(result);
        if (Number.isNaN(+id) || +id <= 0) return Promise.reject("Invalid ID provided");

        return new Promise((resolve, reject) => {
            // undefined if id doesnt exist, otherwise a number
            const success = URL_CACHE_PROMISES.get(id)?.promises.push({resolve, reject});

            if (success == null) {
                // set 10 second timeout on this array
                const timer = setTimeout(() => {
                    const promises = URL_CACHE_PROMISES.get(id);
                    if (promises) {
                        const rejectReason = `Failed to get media for ${id}`;
                        for (const {reject} of promises.promises) reject(rejectReason);
                    }
                    URL_CACHE_PROMISES.delete(id);
                }, 10000);

                URL_CACHE_PROMISES.set(id, {promises: [{resolve, reject}], timer});
            }
        });
    };

    window.addEventListener("message", (e) => {
        if (e.source !== window || e.origin !== "https://x.com") return;

        const data = e?.data;
        if (data?.source === "ift" && data?.type === 'media-urls') for (const {id, media} of /** @type {MediaTransfer[]}*/ data.media) {
            URL_CACHE.set(id, media);
            const promises = URL_CACHE_PROMISES.get(id);
            if (promises) {
                clearTimeout(promises.timer);
                for (const {resolve} of promises.promises) resolve(media);
                URL_CACHE_PROMISES.delete(id);
            }
        }
    });

    let ACCENT_COLOUR;

    const vx_button_path = "M 18.36 5.64 c -1.95 -1.96 -5.11 -1.96 -7.07 0 l -1.41 1.41 l -1.42 -1.41 l 1.42 -1.42 c 2.73 -2.73 7.16 -2.73 9.9 0 c 2.73 2.74 2.73 7.17 0 9.9 l -1.42 1.42 l -1.41 -1.42 l 1.41 -1.41 c 1.96 -1.96 1.96 -5.12 0 -7.07 z m -2.12 3.53 z m -12.02 0.71 l 1.42 -1.42 l 1.41 1.42 l -1.41 1.41 c -1.96 1.96 -1.96 5.12 0 7.07 c 1.95 1.96 5.11 1.96 7.07 0 l 1.41 -1.41 l 1.42 1.41 l -1.42 1.42 c -2.73 2.73 -7.16 2.73 -9.9 0 c -2.73 -2.74 -2.73 -7.17 0 -9.9 z m 1 5 l 1.2728 -1.2728 l 2.9698 1.2728 l -1.4142 -2.8284 l 1.2728 -1.2728 l 2.2627 6.2225 l -6.364 -2.1213 m 4.9497 -4.9497 l 3.182 1.0607 l 1.0607 3.182 l 1.2728 -1.2728 l -0.7071 -2.1213 l 2.1213 0.7071 l 1.2728 -1.2728 l -3.182 -1.0607 l -1.0607 -3.182 l -1.2728 1.2728 l 0.7071 2.1213 l -2.1213 -0.7071 l -1.2728 1.2728",
        download_button_path = "M 12 17.41 l -5.7 -5.7 l 1.41 -1.42 L 11 13.59 V 4 h 2 V 13.59 l 3.3 -3.3 l 1.41 1.42 L 12 17.41 zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
        thumbnail_path = "M2 2C0 2 0 2 0 4v6c0 2 0 2 2 2H12c2 0 2 0 2-2V4c0-2 0-2-2-2H2ZM2 3H12c1 0 1 0 1 1v6c0 1 0 1-1 1H2c-1 0-1 0-1-1V4C1 3 1 3 2 3Zm0 7L4.264 5.01c.432-.978.812-.939 1.43-.038L9 10Zm8-6a1 1 0 000 4 1 1 0 000-4Z";

    const /** @type {LoadedSettings} */ Defaults = {
        loadDefaults: async () => {
            const r = await Background.get_default_settings();
            for (const def in r) Defaults[def] = r[def];
        },
    };
    const /** @type {LoadedSettings} */ Settings = {
        loadSettings: async () => {
            const r = await Background.get_settings();
            for (const setting in r) Settings[setting] = r[setting];
        },
    };
    let isAndroid;
    const loadAndroid = () => Background.get_android().then((r) => {isAndroid = r});

    const Background = {
        /** @param {saveId} id */
        download_history_has: (id) => extension.runtime.sendMessage({type: 'download_history_has', id}),
        /** @param {saveId} id */
        download_history_remove: (id) => extension.runtime.sendMessage({type: 'download_history_remove', id}),
        /** @param {saveId} id */
        download_history_add: (id) => extension.runtime.sendMessage({type: 'download_history_add', id}),

        /**
         * @param {MediaItem[]} media
         * @param {EventModifiers} modifiers
         */
        save_media: (media, modifiers) => extension.runtime.sendMessage({ type: 'save_media', media, modifiers }),

        /** @returns {Promise<Settings>} */
        get_settings: () => extension.runtime.sendMessage({type: 'get_settings'}),
        /** @returns {Promise<Settings>} */
        get_default_settings: () => extension.runtime.sendMessage({type: 'get_default_settings'}),
        /** @returns {Promise<boolean>} */
        get_android: () => extension.runtime.sendMessage({type: 'get_android'}),

        /** @param {string} url */
        open_tab: (url) => extension.runtime.sendMessage({type: 'open_tab', url}),
    };

    const Downloaders = {
        /**
         * @param {MediaItem[] | MediaItem} media
         * @param {EventModifiers} modifiers
         * @param {boolean} [override]
         * @param {boolean} [softOverride]
         * @returns {void}
         */
        download_all: async (media, modifiers, {override=false, softOverride=false}={}) => {
            if (!media) {
                Notification.create('Error downloading, please try again in a second', 'error');
                return;
            }
            if (!Array.isArray(media)) media = [media];
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
                        notif.addEventListener('click', Downloaders.download_all.bind(null, media, modifiers, {override: true}));
                    }
                    return;
                }
                if (newMedia) media = newMedia;
            }
            if (media.length > 0) {
                void Background.save_media(media, modifiers);
                Notification.create(`Downloading media${isAndroid ? '\n(This may take a second on android)' : ''}`, 'save_media');
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
                const a = Tweet.defaultAnchor(article), cb = Tweet.vxButtonCallback.bind(null, article);
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

        /**
         * @param {HTMLElement} article
         */
        addDownloadButton: (() => {
            const finishButton = (media, article, id) => {
                try {
                    if (media?.length > 0 && !article.querySelector('.usybuttonclickdiv[usy-download]')) {
                        const a = Tweet.defaultAnchor(article);
                        const cb = Tweet.mediaDownloadCallback.bind(null, media);
                        const button = Button.newButton(a, download_button_path, cb, 'usy-download', cb);
                        const id_specific = `${id}-1`;
                        if (media.length === 1) {
                            button.setAttribute('ti-id', id_specific);
                            Image.addThumbnailSupport(button);
                        } else {
                            button.setAttribute('ti-id-vague', id);
                        }
                        a.after(button);

                        const buttons = [button];

                        const altAnchor = Tweet.secondaryAnchor(article);
                        if (altAnchor) {
                            for (const copy of altAnchor.parentElement.querySelectorAll('[usy-download]')) copy.remove();
                            const button = Button.newButton(altAnchor, download_button_path, cb, 'usy-download', cb);
                            if (media.length === 1) {
                                button.setAttribute('ti-id', id_specific);
                            } else {
                                button.setAttribute('ti-id-vague', id);
                            }
                            altAnchor.after(button);
                            buttons.push(button);
                        }

                        if (media.length > 1) void Tweet.downloadUpdateMarked(media, buttons);
                        else {
                            Background.download_history_has(id_specific).then((response) => {
                                if (response === true) for (const button of buttons) Button.mark(button);
                            });
                        }
                    }
                } catch {
                    article.removeAttribute('usy-download');
                }
            }
            return (article) => {
                try {
                    article.setAttribute('usy-download', '');
                    const id = Helpers.id(Tweet.url(article));
                    URLCacheGet(id).then((media) => {
                        finishButton(media, article, id);
                    }).catch(() => {
                        article.removeAttribute('usy-download');
                    });
                } catch {
                    article.removeAttribute('usy-download');
                }
            }
        })(),

        /**
         * @param {MediaItem[]} media
         * @param {Iterable<HTMLElement>} buttons
         */
        downloadUpdateMarked: async (media, buttons) => {
            // all saved
            if ((await Promise.all(media.map(({save_id}) => Background.download_history_has(save_id)))).every(Boolean)) {
                for (const button of buttons) Button.mark(button);
            } else {
                for (const button of buttons) Button.unmark(button);
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
                        (btn) => btn.firstElementChild.firstElementChild.style.color = '#ffffff'));
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
            const c = elem.closest('article');
            if (c) return c;
            else if (Tweet.maximised()) {
                for (const article of elem.closest('#layers').querySelectorAll('article')) {
                    if (Tweet.isFocused(article)) return article;
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
         * @param {MediaItem[]} media
         * @param {MouseEvent} ev
         */
        mediaDownloadCallback: (media, ev) => {
            if (ev.type === 'click') {
                if (media.length === 1) Downloaders.download_all(media, Helpers.eventModifiers(ev));
                else Notification.createDownloadChoices(media, ev);
            } else {
                if (media.length === 1) Button.handleClick(null, media[0].save_id, null);
                else Notification.create('Multi-media tweet\nClick download button first to modify history', 'error');
            }
        },

        /** @returns {boolean} */
        maximised: () => {
            const pathname = window.location.pathname;
            return pathname.includes('/photo/') || pathname.includes('/video/');
        },

        /** @returns {boolean} */
        previewing: () => window.location.pathname.includes('/status/'),

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
            button.style.width = (image_button_width_value === Defaults.image_preferences.image_button_width_value.default)
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
                const id = Helpers.idWithNumber(Image.respectiveURL(image));
                button = Image.genericButton(image, Image.downloadButtonCallback);

                button.setAttribute('ti-id', id);
                if (Settings.download_preferences.download_history_enabled) { // mark image
                    if (Settings.download_preferences.download_picker_on_media_page
                        && image.closest('a[href$="/photo/1"], a[href$="/video/1"]')?.querySelector(':scope > div + svg')) {
                        // is multi-media, and on media page
                        button.removeAttribute('ti-id');
                        const id_vague = id.split('-')[0];
                        button.setAttribute('ti-id-vague', id_vague);
                        URLCacheGet(id_vague).then((media) => {
                            void Tweet.downloadUpdateMarked(media, [button]);
                        });
                    } else {
                        Background.download_history_has(id).then((response) => {
                            if (response === true) Button.mark(button);
                        });
                        Image.addThumbnailSupport(button);
                    }
                } else {
                    Image.addThumbnailSupport(button);
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
                    const [id_tweet, index] = id.split('-');
                    URLCacheGet(id_tweet).then((media) => {
                        const mark_button = (button) => {
                            button.setAttribute('ti-id', id);
                            if (Settings.download_preferences.download_history_enabled) { // mark image
                                Background.download_history_has(id).then((response) => {
                                    if (response === true) Button.mark(button);
                                });
                            }
                        }

                        if (media[(+index) - 1].isGif === true) {
                            button = Image.genericButton(video, Image.downloadButtonCallback);
                            mark_button(button);
                            Image.addThumbnailSupport(button);
                        } else {
                            let onVideoButton;
                            const observerSettings = { childList: true, subtree: true };
                            const observer = new MutationObserver((_, observer) => {
                                const share = video.querySelector('[aria-label="Video Settings"]')?.parentElement?.parentElement;
                                if (share && !video.querySelector('[usy-media]')) {
                                    onVideoButton ??= (() => {
                                        const b = Button.newButton(share.cloneNode(true), download_button_path, Image.downloadButtonCallback,
                                        "usy-media", Image.downloadButtonCallback, null,
                                        (btn) => {
                                            btn.firstElementChild.firstElementChild.style.color = '#ffffff';
                                            btn.classList.add('usy-inline');
                                        });
                                        mark_button(b);
                                        return b;
                                    })();
                                    button = onVideoButton;
                                    observer.disconnect();
                                    share.previousElementSibling.previousElementSibling.before(button);
                                    observer.observe(video, observerSettings);
                                }
                            });
                            observer.observe(video, observerSettings);

                            const interval = setInterval(() => {
                                if (!video.isConnected) {
                                    observer.disconnect();
                                    clearInterval(interval);
                                }
                            }, 1000);
                        }
                    }).catch(() => {
                        video.removeAttribute('usy-media');
                        button?.remove();
                    });
                }
            } catch {
                video.removeAttribute('usy-media');
                button?.remove();
            }
        },

        /** @param {HTMLElement} thumb */
        fixThumbnailPosition: (thumb) => {
            requestAnimationFrame(() => {
                // now preview is loaded, reposition if needed
                if (thumb?.isConnected) {
                    const {left, right, top, bottom} = thumb.getBoundingClientRect();
                    if (left < 0) {
                        thumb.style.right = '';
                        thumb.classList.add('removeTransform');
                        thumb.style.left = `0px`;
                    } else if (right > window.innerWidth) {
                        thumb.style.left = '';
                        thumb.classList.add('removeTransform');
                        thumb.style.right = '0px';
                    }

                    if (bottom > window.innerHeight) {
                        thumb.style.top = '';
                        thumb.classList.add('removeTransform');
                        thumb.style.bottom = '0px';
                    } else if (top < 0) {
                        thumb.style.bottom = '';
                        thumb.classList.add('removeTransform');
                        thumb.style.top = '0px';
                    }
                }
            });
        },

        /**
         * @param {HTMLElement} element
         * @param {MediaItem} media
         * @param {Element} [eventTarget]
         * @param {string} [customSearch]
         */
        showThumbnail: (element, media, {eventTarget, customSearch} = {}) => {
            for (const e of document.querySelectorAll('.usyNotificationOuter[data-usythumb]')) e.usyCloseThumb?.();

            const fullscreen = document.createElement('div');
            fullscreen.classList.add('usyNotificationOuter');
            fullscreen.dataset.usythumb = '';
            const thumb = document.createElement((media.type === 'Video') ? 'video' : 'img');
            fullscreen.appendChild(thumb);

            thumb.classList.add('usyVideoPreview', 'topBottom');
            if (media.type === 'Video') {
                thumb.autoplay = true;
                thumb.muted = false;
                thumb.loop = true;
                thumb.controls = false;
            }
            thumb.style.display = 'none';

            document.body.appendChild(fullscreen);

            const controller = new AbortController();

            const eventElem = eventTarget ?? element;

            const closeThumb = () => {
                eventElem.removeEventListener('pointerleave', closeThumb);
                eventElem.removeEventListener('pointerdown', closeThumb, { capture: true });
                eventElem.removeEventListener('click', closeThumb, { capture: true });
                window.removeEventListener('popstate', closeThumb, { capture: true });
                window.removeEventListener('scroll', closeThumb, { capture: true });
                fullscreen.remove();
                controller.abort();
            }

            fullscreen.usyCloseThumb = closeThumb;

            thumb.addEventListener((media.type === 'Video') ? 'loadeddata' : 'load', () => {
                requestAnimationFrame(() => {
                    if ((thumb.isConnected) && !(controller.signal.aborted)) {
                        if (!isAndroid && !Array.from(Helpers.allHoveringElements()).includes(eventElem)) {
                            closeThumb();
                            return;
                        }

                        const {left, width, top, bottom} = element.getBoundingClientRect();
                        const bottomDistance = window.innerHeight - bottom;

                        if (bottomDistance > top) { // show on bottom
                            thumb.style.top = `${bottom}px`;
                            thumb.style.setProperty('--usy-max-height', `${bottomDistance}px`);
                        } else { // show on top
                            thumb.style.bottom = `${window.innerHeight - top}px`;
                            thumb.style.setProperty('--usy-max-height', `${top}px`);
                        }
                        thumb.style.left = `${left + (width / 2)}px`;
                        thumb.style.display = '';
                        Image.fixThumbnailPosition(thumb);
                    }
                });
            }, { once: true, signal: controller.signal });

            thumb.addEventListener('error', closeThumb);

            eventElem.addEventListener('pointerleave', closeThumb);
            eventElem.addEventListener('click', closeThumb, { capture: true });
            eventElem.addEventListener('pointerdown', closeThumb, { capture: true });
            window.addEventListener('popstate', closeThumb, { capture: true });
            window.addEventListener('scroll', closeThumb, { capture: true });

            if (media.type === 'Image') {
                let baseUrl = media.url.split('?')[0];
                thumb.src = (document.querySelector(`[src^="${baseUrl}"]`)?.src)
                    ?? ((customSearch) ? (baseUrl + customSearch) : (media.url.replaceAll('&name=orig', '&name=360x360')));
            } else {
                thumb.src = media.url_lowres ?? media.url;
            }
            return closeThumb;
        },

        /** @param {HTMLElement} button */
        addThumbnailSupport: (button) => {
            const timeout = +Settings.download_preferences.hover_thumbnail_timeout;
            if (!(isAndroid) && (timeout >= 0)) {
                const id_specific = button.getAttribute('ti-id');
                if (id_specific) {
                    const [id, index] = id_specific.split('-');
                    URLCacheGet(id).then(/** @param {MediaItem[]} media*/(media) => {
                        let hoverTimeout;
                        button.addEventListener('pointerenter', () => {
                            if (timeout === 0) {
                                Image.showThumbnail(button, media[(+index) - 1]);
                            } else {
                                hoverTimeout = setTimeout(Image.showThumbnail,
                                    timeout * 1000,
                                    button, media[(+index) - 1]);
                            }
                        });
                        const clearTimer = () => clearTimeout(hoverTimeout);
                        // clear timer on click or mouse exit
                        button.addEventListener('pointerleave', clearTimer);
                        button.addEventListener('click', clearTimer, {capture: true});
                        button.addEventListener('pointerdown', clearTimer, {capture: true});
                    });
                }
            }
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
                {image_button_height_value: {default: dibh}, image_button_height_value_small: {default: dibhs}} = Defaults.image_preferences;

            if (ibh === dibh && ibhs === dibhs) return;

            const height = image.clientHeight;

            if (height <= 0 && image.isConnected) setTimeout(Image.setButtonHeight, 50, image, button);
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
                if (li) {
                    const valid = li.parentElement.querySelectorAll('li:not(:has(img[alt="placeholder"]))');
                    return `${url.slice(0, -1)}${Array.from(valid).indexOf(li) + 1}`;
                } else {
                    return url;
                }
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
                if (li) {
                    const valid = li.parentElement.querySelectorAll('li:not(:has(img[alt="placeholder"]))');
                    return Array.from(valid).indexOf(li) + 1;
                } else {
                    return 1;
                }
            } else {
                if (!tweet) tweet = Tweet.nearestTweet(video);
                return Array.from(tweet.querySelectorAll('[data-testid="tweetPhoto"]'))
                    .indexOf(video.closest('[data-testid="tweetPhoto"]')) + 1;
            }
        },

        /**
         * @param {MouseEvent} ev
         */
        downloadButtonCallback: (ev) => {
            const save_id = ev.currentTarget.getAttribute('ti-id')
                ?? ev.currentTarget.getAttribute('ti-id-vague');
            const split = save_id.split('-');
            // - 1 is because indexes are 1-4
            const /** @type {MediaItem[]} */ media = URL_CACHE.get(split[0]);
            if (Settings.download_preferences.download_picker_on_media_page
                && media?.length > 1 && location.pathname.endsWith('/media')) {
                // if using ti-id-vague, this should always be true
                Notification.createDownloadChoices(media, ev);
            } else {
                const /** @type {MediaItem} */ exactMedia = media?.[(+split[1]) - 1];
                Button.handleClick(ev, save_id, () => {
                    if (exactMedia) {
                        Downloaders.download_all(exactMedia, Helpers.eventModifiers(ev));
                    } else {
                        Notification.create('Error saving, try again', 'error');
                    }
                }, exactMedia.type.toLowerCase() ?? 'media');
            }
        },

        resetAll: () => {
            for (const button of document.querySelectorAll('[usy-media].usybuttonclickdiv')) button.remove();
            for (const image of document.querySelectorAll('[usy-media]')) image.removeAttribute('usy-media');
        },

        getButtons: (id) => document.querySelectorAll(`[ti-id="${id}"]`)
    };

    const URLS = { // URL modification functions
        vxIfy: (url) => {
            return `https://${URLS.getPrefix()}/${url.substring(14)}`;
        },

        getPrefix: () => {
            const {url_prefix, custom_url} = Settings.vx_preferences;
            return (url_prefix === 'x.com') ? custom_url : url_prefix;
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
         * @param {function(HTMLElement): any} [extra]
         * @returns {HTMLElement}
         */
        newButton: (shareButton, path, clickCallback, attribute, rightClickCallback, customListeners, extra) => {
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
            if (customListeners) for (const {type, listener, options} of customListeners) {
                if (options) shareButton.addEventListener(type, listener, options);
                else shareButton.addEventListener(type, listener);
            }
            extra?.(shareButton);
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
         * @returns {HTMLElement | null}
         */
        closest: (elem) => elem.closest('.usybuttonclickdiv'),

        /**
         * @param {MouseEvent} ev
         * @param {saveId} save_id
         * @param {(...any) => any} func
         * @param {string} [type]
         */
        handleClick: (ev, save_id, func, type='media') => {
            if (ev?.type === 'click') {
                func();
            } else if (Settings.download_preferences.download_history_enabled) {
                Background.download_history_has(save_id).then((r) => {
                    // buttons implicitly adjusted
                    if (r === true) {
                        Notification.create(`Removing ${type} from saved`, 'history_remove');
                        void Background.download_history_remove(save_id);
                    } else {
                        Notification.create(`Adding ${type} to saved`, 'history_add');
                        void Background.download_history_add(save_id);
                    }
                });
            }
        }
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
                document.querySelectorAll('div.usyDefaultNotification').forEach((e) => e.remove());
                const outer = document.createElement('div'), inner = document.createElement('div');
                outer.appendChild(inner);
                outer.classList.add('usyNotificationOuter', 'usyDefaultNotification');
                inner.classList.add('usyNotificationInner');
                inner.textContent = text;
                if (ACCENT_COLOUR) inner.style.backgroundColor = ACCENT_COLOUR;

                const fixInterval = setInterval(() => {
                    if (inner?.isConnected) {
                        if (Notification.getCurrentTwitterNotif()) inner.style.transform = 'translateY(-50px)';
                        else inner.style.transform = '';
                    } else clearInterval(fixInterval);
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

        /**
         * @param {string} text
         * @param {MediaItem} media
         * @param {EventModifiers} modifiers
         */
        persistentError: (text, media, modifiers) => {
            const outer = document.querySelector('.usyErrorNotificationOuter')
                || document.createElement('div');
            const inner = document.createElement('div');
            outer.classList.add('usyNotificationOuter', 'usyErrorNotificationOuter');
            inner.classList.add('usyNotificationInner', 'usyErrorNotificationInner');
            const innerText = document.createElement('div');
            const innerChoices = document.createElement('div');
            const retryChoice = document.createElement('div');
            const viewChoice = document.createElement('div');
            const cancelChoice = document.createElement('div');

            innerText.textContent = text;
            innerChoices.style.cursor = 'pointer';

            retryChoice.textContent = 'Retry';
            viewChoice.textContent = 'View Tweet';
            cancelChoice.textContent = 'Cancel';

            retryChoice.addEventListener('click', () => {
                void Downloaders.download_all(media, modifiers);
            });

            viewChoice.addEventListener('click', () => {
                void Background.open_tab(media.tweetURL);
            });

            inner.addEventListener('click', () => {
                if (outer.children.length === 2) outer.remove();
                else inner.remove();
            });

            innerChoices.append(retryChoice, viewChoice, cancelChoice);
            inner.append(innerText, innerChoices);

            if (!outer.isConnected) {
                const clear = document.createElement('div');
                clear.classList.add('usyNotificationInner', 'usyErrorNotificationInner', 'usyErrorNotificationClear');
                clear.textContent = 'Clear all errors';
                clear.style.cursor = 'pointer';
                clear.addEventListener('click', () => {
                    outer.remove();
                });

                outer.append(inner, clear);

                document.body.appendChild(outer);
            } else {
                outer.lastElementChild.before(inner);
            }
        },

        clearFullscreen: () => {
            document.querySelectorAll('div.usyNotificationOuter.usyFullscreen').forEach((e) => e.remove());
        },

        /**
         * @param {MediaItem[]} choices
         * @param {Event} event
         */
        createDownloadChoices: (choices, event) => {
            Notification.clearFullscreen();
            const /** @type {EventListeners[]} */ notificationEventListeners = [];
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

            let closeThumbnail;
            fullscreen.addEventListener('click', () => {
                for (const {type, listener, options} of notificationEventListeners) {
                    if (options) window.removeEventListener(type, listener, options);
                    else window.removeEventListener(type, listener);
                }
                Notification.clearFullscreen();
                closeThumbnail?.();
            });

            for (const {index, type, save_id} of choices) {
                const btn = Notification.getChoiceButton(`${type} ${index}`, true);
                btn.dataset.index = index.toString();
                btn.setAttribute('ti-id', save_id);

                if (Settings.download_preferences.download_history_enabled) {
                    Background.download_history_has(save_id).then((r) => r && Button.mark(btn));
                }

                popup.appendChild(btn);
            }
            popup.appendChild(Notification.getChoiceButton('Download All'));
            popup.addEventListener('click', (e) => {
                const choice = +e.target.closest('.usyDownloadChoiceButton')?.dataset.index - 1;
                if (Number.isNaN(choice)) {
                    Downloaders.download_all(choices, Helpers.eventModifiers(e),
                        Settings.download_preferences.download_all_override_saved ? {override: true} : {softOverride: true});
                } else Downloaders.download_all(choices[choice], Helpers.eventModifiers(e));
            });
            popup.addEventListener('contextmenu', (e) => {
                const btn = e.target.closest('.usyDownloadChoiceButton'), save_id = btn?.getAttribute('ti-id');
                if (save_id) {
                    e.preventDefault();
                    Button.handleClick(null, save_id, null);
                }
            });

            let popupHeight;

            { // thumbnails
                let lastIndex;
                let index = 0;
                let customSearch;
                for (const m of choices) {
                    if (m.type === 'Image') {
                        const url = document.querySelector(`[src^="${m.url.split('?')[0]}"]`)?.src;
                        if (url) {
                            customSearch = '?' + url.split('?')[1];
                        }
                        break;
                    }
                }
                for (const button of popup.querySelectorAll('.usyThumbnailDiv')) {
                    const choice = choices[index];
                    const showThumbnail = () => {
                        if (index !== lastIndex) {
                            closeThumbnail = Image.showThumbnail(popup, choice, {eventTarget: button, customSearch});
                        }
                        lastIndex = index;
                    }
                    const pointerEvent = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        lastIndex = null;
                        showThumbnail();
                    }
                    button.addEventListener('pointerdown', pointerEvent);
                    button.addEventListener('click', pointerEvent);
                    button.addEventListener('pointermove', showThumbnail);
                    button.addEventListener('pointerleave', () => {
                        lastIndex = null;
                    });
                    ++index;
                }
            }

            fullscreen.appendChild(popup);
            document.body.appendChild(fullscreen);

            // ensure popup has a size in the body
            requestAnimationFrame(() => {
                const rect = popup.getBoundingClientRect();
                popupHeight = rect.height;

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
                notificationEventListeners.push({type: 'scroll', listener: fixScrollPosition, options: {passive: true}});

                for (const {type, listener, options} of notificationEventListeners) {
                    listener();
                    if (options) window.addEventListener(type, listener, options);
                    else window.addEventListener(type, listener);
                }
            });
        },

        /**
         * @param {string} text
         * @param {boolean} [thumbnail]
         * @returns {HTMLButtonElement}
         */
        getChoiceButton: (text, thumbnail = false) => {
            const b = document.createElement('button'),
                t = document.createElement('b');
            b.classList.add('usyDownloadChoiceButton');
            t.textContent = text;
            b.appendChild(t);
            if (thumbnail) {
                const thumb = document.createElement('div');
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                svg.appendChild(path);
                svg.setAttributeNS(null, 'viewBox', '0 0 14 14');
                path.setAttributeNS(null, 'd', thumbnail_path);
                path.setAttributeNS(null, 'fill', '#ffffff');
                thumb.classList.add('usyThumbnailDiv');
                thumb.appendChild(svg);
                b.appendChild(thumb);
            }
            return b;
        },

        getCurrentTwitterNotif: () => document.body.querySelector('[data-testid="toast"]'),

        /**
         * @returns {{downloadFinished: (function(string): Promise<void>), onProgress: function(number | null, number), downloadError: function(string, MediaItem, EventModifiers)}}
         */
        createMobileDownloadPopup: () => {
            const outer = document.querySelector('.usyDownloadNotificationOuter')
                || document.createElement('div');
            const inner = document.createElement('div');
            const progressBar = document.createElement('div');
            const textBox = document.createElement('div');
            outer.classList.add('usyNotificationOuter', 'usyDownloadNotificationOuter');
            inner.classList.add('usyNotificationInner', 'usyDownloadNotificationInner');
            progressBar.classList.add('usyDownloadProgressBar');
            textBox.classList.add('usyDownloadTextBox');
            inner.append(progressBar, textBox);

            if (!outer.isConnected) {
                // create collapse element
                const collapse = document.createElement('div');
                collapse.classList.add('usyNotificationInner', 'usyDownloadNotificationInner');
                const textBox = document.createElement('div');
                textBox.classList.add('usyDownloadTextBox');
                collapse.appendChild(textBox);
                collapse.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    textBox.textContent = (outer.classList.toggle('usyNotificationOuterCollapsed')) ?
                        'Show download queue' : 'Hide download queue';
                });
                collapse.click();

                outer.append(inner, collapse);
                document.body.appendChild(outer);
            } else {
                outer.prepend(inner);
            }

            return {
                downloadFinished: (filename) => new Promise(resolve => {
                    textBox.textContent = `Click here to download\n${filename}`;
                    progressBar.style.width = '100%';
                    inner.style.cursor = 'pointer';
                    inner.addEventListener('click', () => {
                        resolve();
                        if (outer.children.length === 2) outer.remove();
                        else inner.remove();
                    });
                }),

                onProgress: (totalBytes, receivedBytes) => {
                    if (totalBytes) {
                        progressBar.style.width = `${(receivedBytes / totalBytes) * 100}%`;
                    }
                    textBox.textContent = `Downloaded: ${receivedBytes} / ${totalBytes ? totalBytes : 'Unknown'} Bytes`;
                },

                downloadError: (text, media, modifiers) => {
                    inner.classList.add('usyErrorNotificationInner');
                    inner.classList.remove('usyDownloadNotificationInner');
                    inner.style.cursor = 'pointer';

                    const innerText = document.createElement('div');
                    const innerChoices = document.createElement('div');
                    const retryChoice = document.createElement('div');
                    const viewChoice = document.createElement('div');
                    const cancelChoice = document.createElement('div');

                    innerText.textContent = text;
                    innerChoices.style.cursor = 'pointer';

                    retryChoice.textContent = 'Retry';
                    viewChoice.textContent = 'View Tweet';
                    cancelChoice.textContent = 'Cancel';

                    retryChoice.addEventListener('click', () => {
                        void Downloaders.download_all(media, modifiers);
                    });

                    viewChoice.addEventListener('click', () => {
                        void Background.open_tab(media.tweetURL);
                    });

                    inner.addEventListener('click', () => {
                        if (outer.children.length === 2) outer.remove();
                        else inner.remove();
                    });

                    innerChoices.append(retryChoice, viewChoice, cancelChoice);
                    textBox.remove();
                    progressBar.remove();
                    inner.append(innerText, innerChoices);
                }
            }
        }
    };

    const Extras = {
        /**
         * @param {HTMLElement} bar
         */
        hideBottomBar: (bar) => {
            const style = bar.getAttribute('style');
            if (style) {
                const notifs = bar.parentElement?.parentElement?.previousElementSibling;
                const par = notifs?.parentElement;
                if (par && !(par.style.transition)) par.style.transition = 'transform 300ms ease-in-out, opacity 300ms ease-in-out';
                if (style.includes('opacity: 1')) {
                    if (par) {
                        par.style.transform = '';
                        par.style.opacity = '';
                    }
                } else {
                    if (notifs && par) {
                        const match = notifs.style.transform.match(/translateY\((.*)\)/);
                        if (match) par.style.transform = `translateY(calc(-1 * ${match[1]}))`;
                        else par.style.opacity = '0';
                    }
                }
            }
        }
    };

    const Helpers = {
        /**
         * @param {string} url
         * @param {function(number, number)} progressCallback
         * @returns {Promise<Uint8Array>}
         */
        progressDownload: async (url, progressCallback) => {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const totalBytes = parseInt(response.headers.get('Content-Length'), 10);
            const reader = response.body.getReader();
            let receivedBytes = 0;
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;
                progressCallback(totalBytes, receivedBytes);
            }

            const finalResult = new Uint8Array(receivedBytes);
            let position = 0;
            for (const chunk of chunks) {
                finalResult.set(chunk, position);
                position += chunk.length;
            }

            return finalResult;
        },

        /**
         * @param {Blob} blob
         * @param {string} filename
         */
        downloadFromBlob: (blob, filename) => {
            const link = document.createElement('a'),
                objectURL = URL.createObjectURL(blob);
            link.href = objectURL;
            link.download = filename;
            link.dispatchEvent(new MouseEvent('click'));
            URL.revokeObjectURL(objectURL);
        },

        /**
         * Basic download fallback for android where the downloads.download API isn't supported
         * @param {string} url
         * @param {string} filename
         * @param {MediaItem} media
         * @param {EventModifiers} modifiers
         */
        download: async (url, filename, media, modifiers) => {
            if (Settings.download_preferences.use_download_progress) {
                const { downloadFinished, onProgress, downloadError } = Notification.createMobileDownloadPopup();
                onProgress(null, 0);
                try {
                    const binary_data = await Helpers.progressDownload(url, onProgress);
                    await downloadFinished(filename);
                    Helpers.downloadFromBlob(new Blob([binary_data], { type: 'application/octet-stream' }), filename);
                } catch {
                    void Background.download_history_remove(media.save_id);
                    downloadError(`Error downloading: ${filename}`, media, modifiers);
                }
            } else {
                try {
                    const r = await fetch(url);
                    if (r.ok) {
                        Helpers.downloadFromBlob(await r.blob(), filename);
                    } else {
                        throw new Error(`HTTP error! status: ${r.status}`);
                    }
                } catch {
                    void Background.download_history_remove(media.save_id);
                    Notification.persistentError(`Error downloading: ${filename}`, media, modifiers);
                }
            }
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
        eventModifiers: ({shiftKey: shift, ctrlKey: ctrl, altKey: alt}) => ({shift, ctrl, alt}),

        allHoveringElements: () => document.querySelectorAll(':hover')
    };

    const Observer = {
        /** @type {(MutationObserver | null)} */ observer: null,

        /** @type {Record<string, [string, function(HTMLElement): *][]>} */ callbackMappings: {
            vx_button: [['article:not([usy])', Tweet.addVXButton]],
            bookmark_on_photo_page: [['article:not([usy-bookmarked])', Tweet.copyBookmarkButton]],
            inline_download_button: [['article:not([usy-download])', Tweet.addDownloadButton]],
            media_download_button: [
                [`img[src^="https://pbs.twimg.com/media/"]:not([usy-media]),
                img[src^="https://pbs.twimg.com/ext_tw_video_thumb/"]:not([usy-media]),
                img[src^="https://pbs.twimg.com/amplify_video_thumb/"]:not([usy-media]),
                img[src^="https://pbs.twimg.com/tweet_video_thumb/"]:not([usy-media])`, Image.addImageButton],
                [`div[data-testid="videoComponent"]:not([usy-media]), 
                img[alt="Embedded video"]:not([usy-media])`, Image.addVideoButton]],
            hide_bottom_bar_completely: [['div[data-testid="BottomBar"]', Extras.hideBottomBar]]
        },

        start: () => {
            Observer.disable();

            Button.resetAll();
            const callbackMappings = Observer.callbackMappings;
            const observerSettings = {subtree: true, childList: true};
            let lastReactRoot;
            const getCallback = () => {
                const /** @type {[string, function(HTMLElement): *][]} */ callbacks = [];
                const settings = Settings.setting;
                for (const m in callbackMappings) if (settings[m]) callbacks.push(...callbackMappings[m]);
                const update = () => {
                    if (!(lastReactRoot?.isConnected)) {
                        lastReactRoot = document.getElementById('react-root');
                    }

                    if (lastReactRoot) {
                        if (!ACCENT_COLOUR) {
                            const colourElement = document.querySelector('a[href="/explore/tabs/for-you"]')?.firstElementChild;
                            if (colourElement) {
                                const bg = window.getComputedStyle(colourElement).color;
                                if (!bg.includes('(0, 0, 0')) ACCENT_COLOUR = bg;
                            }
                        }
                        // uses this rather than called with observer to make sure it isn't re-started
                        Observer.observer?.disconnect();
                        for (const [s, f] of callbacks) for (const a of lastReactRoot.querySelectorAll(s)) f(a);
                        Observer.observer?.observe(document.body, observerSettings);
                    }
                };
                if (callbacks.length > 0) {
                    update();
                    return update;
                } else {
                    return Observer.disable;
                }
            };
            Observer.observer = new MutationObserver(getCallback());
            Observer.observer?.observe(document.body, observerSettings);
        },

        disable: () => {
            Observer.observer?.disconnect();
            Observer.observer = null;
        }
    };

    const Listeners = {
        listeners: {
            vx_copy_shortcut: [{
                event: 'keydown',
                target: () => window,
                listener: (e) => {
                    if (e.ctrlKey && e.key.toLowerCase() === 'c' && Tweet.previewing() && window.getSelection().isCollapsed) {
                        const id = Helpers.id(window.location.href);
                        for (const elem of document.querySelectorAll('[usy-copy]')) {
                            if (Helpers.id(Tweet.url(Tweet.nearestTweet(elem))) === id) {
                                elem.click();
                                break;
                            }
                        }
                    }
                }
            }]
        },

        start: () => {
            const settings = Settings.listeners, callbacks = Listeners.listeners;
            for (const setting in callbacks) {
                for (const {event, target, listener} of callbacks[setting]) {
                    const t = target?.();
                    if (t) {
                        t.removeEventListener(event, listener);
                        if (settings[setting]) t.addEventListener(event, listener);
                    }
                }
            }
        }
    };

    const start = () => {
        Observer.start();
        Listeners.start();
    }

    Promise.all([Defaults.loadDefaults(), Settings.loadSettings(), loadAndroid()]).then(start);

    extension.runtime.onMessage.addListener((message) => {
        switch (message.type) {
            case 'history_change_add': {
                for (const button of Image.getButtons(message.id)) Button.mark(button);

                const id = message.id.split('-')[0];
                const multi_media_buttons = /** @type {NodeListOf<HTMLElement>} */ document.querySelectorAll(`[ti-id-vague="${id}"]`);
                if (multi_media_buttons.length > 0) {
                    URLCacheGet(id).then((media) => {
                        void Tweet.downloadUpdateMarked(media, multi_media_buttons);
                    });
                }
                break;
            }
            case 'history_change_remove': {
                for (const button of Image.getButtons(message.id)) Button.unmark(button);
                for (const button of document.querySelectorAll(`[ti-id-vague="${message.id.split('-')[0]}"]`)) Button.unmark(button);
                break;
            }
            case 'settings_update': {
                Settings.loadSettings().then(() => {
                    const changes = message.changes;
                    // only need to reload for vx setting change
                    if (Object.hasOwn(changes, 'setting')) Observer.start();
                    // update on image pref or download pref change
                    else if (Object.hasOwn(changes, 'image_preferences') || Object.hasOwn(changes, 'download_preferences')) Image.resetAll();

                    if (Object.hasOwn(changes, 'listeners')) Listeners.start();
                });
                break;
            }
            case 'history_change': {
                // inherently calls observer
                Image.resetAll();
                break;
            }
            case 'image_saved': {
                Notification.create(`Saving Image${isAndroid ? '\n(This may take a second on android)' : ''}`, 'save_media');
                break;
            }
            case 'download': {
                void Helpers.download(message.url, message.filename, message.media, message.modifiers);
                break;
            }
            case 'error': {
                Notification.persistentError(message.message, message.media, message.modifiers);
                break;
            }
        }
    });
})();