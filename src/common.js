(() => {
    globalThis.chromeMode = false;
    // set browser to chrome if not in firefox
    /** @type {typeof browser} */
    globalThis.extension = typeof browser !== 'undefined' ? browser : (() => {
        globalThis.chromeMode = true;
        return chrome;
    })();

    globalThis.CommonSelectors = {
        views: ['div:has(> a[href$="/analytics"])', 'div:has(> button[aria-label="View post analytics"])'],
        share: [
            'div:has(> div > button[aria-label="Share post"]:not([usy]))',
            'div:has(> div > button > div > div > svg > g > path[d^="M17 4c-1.1 0-2 .9-2 2 0 .33.08.65.22.92C15.56 7.56"])',
            'div:has(> div > button > div > div > svg > g > path[d^="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12"])',
        ],
        replies: ['div:has(> button[data-testid="reply"])'],
        retweets: ['div:has(> button[data-testid="retweet"])', 'div:has(> button[data-testid="unretweet"])'],
        likes: ['div:has(> button[data-testid="like"])', 'div:has(> button[data-testid="unlike"])'],
        bookmark: ['div:has(> button[data-testid="bookmark"])', 'div:has(> button[data-testid="removeBookmark"])'],

        copy: ['div[usy-copy]'],
        download: ['div[usy-download]']
    };

    globalThis.GlobalBackground = {
        /** @param {saveId} id */
        download_history_has: (id) => extension.runtime.sendMessage({type: 'download_history_has', id}),
        /** @param {saveId[]} ids */
        download_history_has_all: (ids) => extension.runtime.sendMessage({type: 'download_history_has_all', ids}),
        /** @param {saveId} id */
        download_history_remove: (id) => extension.runtime.sendMessage({type: 'download_history_remove', id}),
        /** @param {saveId} id */
        download_history_add: (id) => extension.runtime.sendMessage({type: 'download_history_add', id}),

        /**
         * Needs GlobalTabId to be ready to be used
         * @param {MediaItem[]} media
         * @param {EventModifiers} modifiers
         */
        save_media: (media, modifiers) => extension.runtime.sendMessage({ type: 'save_media', media, modifiers, tabId: GlobalTabId.value }),

        /** @returns {Promise<Settings>} */
        get_settings: () => extension.runtime.sendMessage({type: 'get_settings'}),
        /** @returns {Promise<Settings>} */
        get_default_settings: () => extension.runtime.sendMessage({type: 'get_default_settings'}),
        /** @returns {Promise<boolean>} */
        get_android: () => extension.runtime.sendMessage({type: 'get_android'}),

        /** @param {string} url */
        open_tab: (url) => extension.runtime.sendMessage({type: 'open_tab', url}),

        /** @returns {Promise<Number>} */
        get_tab_id: () => extension.runtime.sendMessage({type: 'get_tab_id'}),

        // for the settings page
        clear_download_history: () => extension.runtime.sendMessage({type: 'download_history_clear'}),
        download_history_get_all: () => extension.runtime.sendMessage({type: 'download_history_get_all'}),
        validate_setting: (category, setting, value) => extension.runtime.sendMessage({type: 'validate_setting', category, setting, value})
    };

    /** @typedef {{
     *      _resolve: () => void,
     *      ready: boolean,
     *      setReady: () => void,
     *      promise: Promise<void>
     * }} ReadyObject */

    /**
     * @returns {ReadyObject}
     */
    const getReadyObject = () => {
        const obj = {
            _resolve: undefined,
            ready: false,
            setReady: () => {
                obj.ready = true;
                obj._resolve();
            },
            promise: undefined
        };
        obj.promise = new Promise(resolve => {
            obj._resolve = resolve;
        });
        return obj;
    };

    /** @typedef {{
     *      fireListeners: (any) => void,
     *      removeListener: (f: (any) => *) => void,
     *      addListener: (f: (any) => *) => void
     * }} BasicEventListener */

    /**
     * @returns {BasicEventListener}
     */
    const getListenersObject = () => {
        const listeners = [];
        return {
            addListener: (f) => listeners.push(f),
            removeListener: (f) => {
                const idx = listeners.indexOf(f);
                if (idx >= 0) listeners.splice(idx, 1);
            },
            fireListeners: (e) => {
                for (const listener of listeners) {
                    try {
                        listener(e);
                    } catch {}
                }
            }
        }
    };

    /** @type {LoadedSettings} */
    globalThis.GlobalDefaults = {
        load: async () => {
            const r = await GlobalBackground.get_default_settings();
            for (const def in r) GlobalDefaults[def] = r[def];
        },
        onReady: getReadyObject(),
    };
    /** @type {LoadedSettings} */
    globalThis.GlobalSettings = {
        loadFrom: (r) => {
            for (const setting in r) GlobalSettings[setting] = r[setting];
        },
        load: async () => {
            GlobalSettings.loadFrom(await GlobalBackground.get_settings());
        },
        onUpdate: getListenersObject(),
        onReady: getReadyObject(),
    };

    globalThis.GlobalTabId = {
        load: async () => {
            GlobalTabId.value = await GlobalBackground.get_tab_id();
        },
        onReady: getReadyObject(),
    }

    GlobalDefaults.load().then(GlobalDefaults.onReady.setReady).catch(() => {
        console.log('Unable to load global defaults, if this is from the background page you can ignore it')
    });

    GlobalSettings.load().then(GlobalSettings.onReady.setReady).catch(() => {
        console.log('Unable to load global settings, if this is from the background page you can ignore it')
    });

    GlobalTabId.load().then(GlobalTabId.onReady.setReady).catch(() => {
        console.log('Unable to load global tab id, if this is from the background page you can ignore it')
    });

    const onMessageListener = (message) => {
        if (message.type === 'settings_update') {
            GlobalSettings.loadFrom(message.settings);
            GlobalSettings.onUpdate.fireListeners(message.changes);
        }
    };

    // this should do nothing in the bg page i believe
    extension.runtime.onMessage.addListener(onMessageListener);
    globalThis.enableIsBackgroundPage = () => {
        extension.runtime.onMessage.removeListener(onMessageListener);
    }
})();