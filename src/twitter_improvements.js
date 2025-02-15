'use strict';

(() => {
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
        download_history_has: (id) => chrome.runtime.sendMessage({type: 'download_history_has', id}),
        download_history_remove: (id) => chrome.runtime.sendMessage({type: 'download_history_remove', id}),

        save_video: (url) => chrome.runtime.sendMessage({
            type: 'video', url,
            cookie: document.cookie.split(';').find(a => a.trim().startsWith("ct0")).trim().substring(4)
        }),
        save_image: (url, sourceURL) => chrome.runtime.sendMessage({type: 'image', url, sourceURL}),
        get_settings: () => chrome.runtime.sendMessage({type: 'get_settings'}),
        get_default_settings: () => chrome.runtime.sendMessage({type: 'get_default_settings'}),
    };

    const Tweet = { // Tweet functions
        addVXButton: (article) => {
            try {
                article.setAttribute('usy', '');
                const a = Tweet.anchor(article);
                const cb = Tweet.vxButtonCallback.bind(null, article);
                a.after(Button.newButton(a, vx_button_path, cb, 'usy-copy'));

                const altAnchor = Tweet.maximisedShareButtonAnchor(article);
                if (altAnchor) {
                    for (const copy of altAnchor.parentElement.querySelectorAll('[usy-copy]')) copy.remove();
                    altAnchor.after(Button.newButton(altAnchor, vx_button_path, cb, 'usy-copy'));
                }
            } catch {
                article.removeAttribute('usy');
            }
        },

        addVideoButton: (videoComponent)=> {
            try {
                videoComponent.setAttribute('usy', '');
                const article = Tweet.nearestTweet(videoComponent), a = Tweet.anchor(article);
                // checks if quote tweet contains specific video component (don't show button)
                // doesn't affect a video QRT as each video checked separately
                if (!(article.querySelector('div[id] > div[id]')?.contains(videoComponent)) && !article.querySelector('.usybuttonclickdiv[usy-video]')) {
                    const cb = Tweet.videoButtonCallback.bind(null, article);
                    a.after(Button.newButton(a, download_button_path, cb, 'usy-video'));

                    const altAnchor = Tweet.maximisedShareButtonAnchor(article);
                    if (altAnchor) {
                        for (const copy of altAnchor.parentElement.querySelectorAll('[usy-video]')) copy.remove();
                        altAnchor.after(Button.newButton(altAnchor, download_button_path, cb, 'usy-video'));
                    }
                }
            } catch {
                videoComponent.removeAttribute('usy')
            }
        },

        copyBookmarkButton: (article) => {
            try {
                article.setAttribute('usy-bookmarked', '');
                const a = Tweet.maximisedShareButtonAnchor(article);
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

        anchor: (article) => {
           return article.querySelector('button[aria-label="Share post"]:not([usy])').parentElement.parentElement;
        },

        isFocused: (article) => {
            // checks for reply section, or "Who can reply?" on limited reply tweets
            return article.parentElement.querySelector('[data-testid="inline_reply_offscreen"]') ||
                article.querySelector('div[aria-live="polite"][role="status"]');
        },

        respectiveBookmarkButton: (article) => {
            return (article.querySelector('button[data-testid="bookmark"]')
                ?? article.querySelector('button[data-testid="removeBookmark"]')).parentElement;
        },

        url: (article) => {
            for (const a of article.querySelectorAll('a')) if (a.querySelector('time')) return a.href.replace(/\/history$/, "");
            throw new TypeError("No URL Found");
        },

        nearestTweet: (elem) => {
            let anchor;
            while (elem) {
                anchor = elem.querySelector('article');
                if (anchor) return anchor;
                elem = elem.parentElement;
            }
        },

        vxButtonCallback: (article) => {
            try {
                navigator.clipboard.writeText(URLS.vxIfy(Tweet.url(article))).then(() => {
                    Notification.create('Copied URL to clipboard');
                });
            } catch {
                Notification.create('Failed to copy url, please report the issue along with the current url to twitter improvements');
            }
        },

        videoButtonCallback: (article, event) => {
            Notification.create(`Saving Tweet Video(s)${About.android ? ' (This may take a second on android)' : ''}`);
            Background.save_video(Tweet.url(article)).then((r) => Tweet.videoResponseHandler(event, r));
        },

        videoResponseHandler: (event, r) => {
            if (r.status === 'success') Notification.create('Successfully Downloaded Video(s)');
            else if (r.status === 'choice') Notification.createVideoChoice(r.choices, event);
            else if (r.status === 'newpage') {
                navigator.clipboard.writeText(r.copy);
                Notification.create('Error occurred downloading video\nCopied file name to clipboard\nTry clicking on a tweet and re-downloading', 10000);
            } else Notification.create('Error occurred downloading video, try clicking on a new tweet to fix', 10000);
        },

        maximised: () => {
            const pathname = window.location.pathname;
            return pathname.includes('/photo/') || pathname.includes('/video/');
        },

        maximisedShareButtonAnchor: (article) => {
            if (Tweet.maximised() && Tweet.isFocused(article))
                for (const b of document.querySelectorAll('button[aria-label="Share post"]:not([usy])'))
                    if (!b.closest('article')) return b.parentElement.parentElement;
        }
    };

    const Image = { // Image element functions
        addImageButton: (image) => {
            let button;
            try {
                image.setAttribute('usy', '');
                button = Button.newButton(Image.createDownloadButton(), download_button_path, Image.imageButtonCallback.bind(null, image), "usy-image", Image.removeImageDownloadCallback.bind(null, image));
                const prefs = Settings.image_preferences;
                button.style.width = (prefs.image_button_width_value === Defaults.image_preferences.image_button_width_value)
                    ? 'fit-content' : `${+prefs.image_button_width_value / +prefs.image_button_scale}%`;
                button.style.height = (prefs.image_button_height_value === Defaults.image_preferences.image_button_height_value)
                    ? 'fit-content' : `${+prefs.image_button_height_value / +prefs.image_button_scale}%`;
                button.classList.add(...(Image.buttonModes[prefs.image_button_position] ?? []));
                button.style.transform = `scale(${prefs.image_button_scale})`;

                image.after(button);
                if (prefs.download_history_enabled) { // mark image
                    const id = Image.idWithNumber(image);
                    button.setAttribute('ti-id', id);
                    Background.download_history_has(id).then((response) => {
                        if (response === true) Button.mark(button);
                    });
                }
            } catch {
                image.removeAttribute('usy');
                button?.remove();
            }
        },

        buttonModes: {
            0: ['usy-top', 'usy-left'],
            1: ['usy-top', 'usy-right'],
            2: ['usy-bottom', 'usy-left'],
            3: ['usy-bottom', 'usy-right'],
        },

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

            outer.classList.add('usyImageButton');

            return () => outer.cloneNode(true);
        })(),

        respectiveURL: (image) => {
            let url = image.closest('[href]')?.href;
            if (url) return url;

            url = window.location.href;
            if (url.includes('/photo/')) return url;
        },

        idWithNumber: (image) => {
            const a = Image.respectiveURL(image).split("/").slice(-3);
            return `${a[0]}-${a[2]}`;
        },

        getRespectiveButton: (image) => image.parentElement.querySelector('div.usybuttonclickdiv'),

        imageButtonCallback: (image) => {
            if (Settings.image_preferences.download_history_prevent_download && Button.isMarked(Image.getRespectiveButton(image))) {
                const notif = Notification.create('Image is already saved\nClick here to save again');
                notif.style.cursor = 'pointer';
                notif.addEventListener('click', () => {
                    Background.save_image(Image.respectiveURL(image), image.src);
                });
            } else {
                Notification.create(`Saving Image${About.android ? ' (This may take a second on android)' : ''}`);
                Background.save_image(Image.respectiveURL(image), image.src);
            }
        },

        removeImageDownloadCallback: (image) => {
            Notification.create('Removing image from saved');
            Background.download_history_remove(Image.idWithNumber(image));
        },

        resetAll: () => {
            document.querySelectorAll('div[usy-image].usybuttonclickdiv').forEach((e) => e.remove());
            document.querySelectorAll('img[usy]').forEach((e) => e.removeAttribute('usy'));
        },

        getButtons: (id) => document.querySelectorAll(`div[usy-image][ti-id="${id}"].usybuttonclickdiv`)
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

        isMarked: (button) => {
            return button.classList.contains('usyMarked');
        },

        stopAllEvents: (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        },

        mark: (button) => button.classList.add('usyMarked'),
        unmark: (button) => button.classList.remove('usyMarked'),

        onhover: (bc) => {
            bc.classList.add('r-1cvl2hr');
            bc.style.color = '';
            bc.firstElementChild.firstElementChild.classList.replace('r-1niwhzg', 'r-1peqgm7');
        },

        stophover: (bc, origColour) => {
            bc.classList.remove('r-1cvl2hr');
            bc.style.color = origColour;
            bc.firstElementChild.firstElementChild.classList.replace('r-1peqgm7', 'r-1niwhzg');
        },

        resetAll: () => {
            document.querySelectorAll('.usybuttonclickdiv').forEach(b => b.remove());
            document.querySelectorAll('[usy]').forEach((e) => e.removeAttribute('usy'));
        },

        closest: (elem) => elem.closest('.usybuttonclickdiv'),
    };

    const Notification = {
        create: (text, timeout = 5000) => {
            Notification.clear();
            const outer = document.createElement('div'), inner = document.createElement('div');
            outer.appendChild(inner);
            outer.classList.add('usyNotificationOuter');
            inner.classList.add('usyNotificationInner');
            inner.textContent = text;
            document.body.appendChild(outer);
            setTimeout(() => {
                inner.classList.add('usyFadeOut');
                inner.addEventListener('transitionend', (e) => {
                    if (e.target === e.currentTarget) outer.remove();
                });
            }, timeout);
            return inner;
        },

        clear: () => {
            document.querySelectorAll('div.usyNotificationOuter').forEach((e) => e.remove());
        },

        createVideoChoice: (choices, event) => {
            Notification.clear();
            const notificationEventListeners = [];
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
                for (const e of notificationEventListeners) window.removeEventListener(e.type, e.listener);
                Notification.clear();
            });

            const sendResponse = (choice) => {
                const data = {type: 'videoChoice', choices};
                if (choice != null) data.choice = choice;
                chrome.runtime.sendMessage(data).then((r) => Tweet.videoResponseHandler(null, r));
            }
            for (let id = 0; id < choices.urls.length; ++id) {
                popup.appendChild(Notification.getNotificationButton(`Video ${id + 1}`, (e) => {
                    sendResponse(parseInt(e.target.textContent.split(" ")[1]) - 1);
                }));
            }
            popup.appendChild(Notification.getNotificationButton('Download All', () => sendResponse()));

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
            }

            popup.classList.add('animate');
            notificationEventListeners.push({type: 'scroll', listener: fixScrollPosition});

            for (const listener of notificationEventListeners) {
                listener.listener();
                window.addEventListener(listener.type, listener.listener);
            }
        },

        getNotificationButton: (text, onclick) => {
            const b = document.createElement('button'), t = document.createElement('b');
            b.classList.add('usyDownloadChoiceButton');
            t.textContent = text;
            b.appendChild(t);
            b.addEventListener('click', onclick);
            return b;
        }
    };

    const Helpers = {
        download: (url, filename) => {
            fetch(url).then(r => r.blob()).then((blob) => {
                const link = document.createElement('a'),
                    objectURL = URL.createObjectURL(blob);
                link.href = objectURL;
                link.download = filename;
                link.dispatchEvent(new MouseEvent('click'));
                URL.revokeObjectURL(objectURL);
            });
        }
    };

    const Observer = {
        observer: null,
        forceUpdate: null,

        start: () => {
            Observer.disable();

            Button.resetAll();
            const observerSettings = {subtree: true, childList: true},
                callbackMappings = {
                    vx_button: [{s: 'article:not([usy])', f: Tweet.addVXButton}],
                    video_button: [{
                        s: 'div[data-testid="videoComponent"]:not([usy])',
                        f: Tweet.addVideoButton
                    }, {s: 'img[alt="Embedded video"]:not([usy])', f: Tweet.addVideoButton}],
                    image_button: [{
                        s: 'img[src*="https://pbs.twimg.com/media/"]:not([usy])',
                        f: Image.addImageButton
                    }],
                    bookmark_on_photo_page: [{
                        s: 'article:not([usy-bookmarked])',
                        f: Tweet.copyBookmarkButton
                    }]
                }, getCallback = () => {
                    const callbacks = [];
                    for (const m in callbackMappings) if (Settings.setting[m]) callbacks.push(...callbackMappings[m]);
                    const update = (pre) => {
                        Observer.observer?.disconnect();
                        pre?.();
                        for (const i of callbacks) for (const a of document.body.querySelectorAll(i.s)) i.f(a);
                        Observer.observer?.observe(document.body, observerSettings);
                    };
                    update();
                    Observer.forceUpdate = update;
                    // Fix green button on switching image
                    let previousURL = window.location.href;
                    const imageFix = () => {
                        const newUrl = window.location.href;
                        previousURL.includes("/photo/") && newUrl !== previousURL &&
                        newUrl.includes("/photo/") && Settings.setting.image_button &&
                        Settings.image_preferences.download_history_enabled && Image.resetAll();
                        previousURL = newUrl;
                    }

                    if (callbacks.length > 0) return () => update(imageFix);
                    return Observer.disable;
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

    chrome.runtime.onMessage.addListener((message) => {
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
                    else if (changes.hasOwnProperty('image_preferences')) Observer.forceUpdate?.(Image.resetAll);
                });
                break;
            }
            case 'history_change': {
                Observer.forceUpdate?.(Image.resetAll);
                break;
            }
            case 'image_saved': {
                Notification.create(`Saving Image${About.android ? ' (This may take a second on android)' : ''}`);
                break;
            }
            case 'download': {
                Helpers.download(message.url, message.filename);
                break;
            }
        }
    });
})();