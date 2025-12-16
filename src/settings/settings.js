(() => {
    'use strict';

    let chromeMode = false;
    // set browser to chrome if not in firefox
    /** @type {typeof browser} */
    const extension = typeof browser !== 'undefined' ? browser : (() => {
        chromeMode = true;
        return chrome;
    })();

    if (chromeMode) {
        document.body.classList.add('chrome');
    }

    document.getElementById('versionDisplay').textContent += extension?.runtime?.getManifest?.()?.version;

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

    const Background = {
        get_settings: () => extension.runtime.sendMessage({type: 'get_settings'}),
        get_default_settings: () => extension.runtime.sendMessage({type: 'get_default_settings'}),

        clear_download_history: () => extension.runtime.sendMessage({type: 'download_history_clear'}),
        download_history_get_all: () => extension.runtime.sendMessage({type: 'download_history_get_all'}),
        get_android: () => extension.runtime.sendMessage({type: 'get_android'}),
        validate_setting: (category, setting, value) => extension.runtime.sendMessage({type: 'validate_setting', category, setting, value})
    };

    Background.get_android().then((r) => {
        if (r) {
            document.body.classList.add('mobile');
        }
    });

    const BackgroundPorts = {
        download_history_add_all: (saved_images, progressCallback) => new Promise((resolve) => {
            const port = extension.runtime.connect({ name: 'download_history_add_all' });
            port.onMessage.addListener(progressCallback);
            port.onDisconnect.addListener(resolve);
            port.postMessage({ saved_images });
        })
    }

    const makeScreenOverlay = (text, progressBar) => {
        const full = document.createElement('div');
        full.classList.add('fullscreenOverlay', 'loading');
        const t = document.createElement('h1');
        t.textContent = text;
        full.appendChild(t);
        document.body.appendChild(full);
        full.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { delay: 400, duration: 200, easing: 'ease-in-out', fill: 'forwards' }
        );
        let bar, barText;
        if (progressBar) {
            bar = document.createElement('div');
            barText = document.createElement('span');
            bar.classList.add('progressBar');
            barText.textContent = `Progress: 0/0`;
            bar.appendChild(barText);
            full.appendChild(bar);
        }
        return {
            removeOverlay: () => full.remove(),
            progressCallback: (progress, total,  text) => {
                if (bar) {
                    if (text) {
                        bar.style.setProperty('--progress-width', '100%');
                        barText.textContent = text;
                    } else {
                        bar.style.setProperty('--progress-width', `${(progress / total) * 100}%`);
                        barText.textContent = `Progress: ${progress}/${total}`;
                    }
                }
            }
        }
    }

    const valueLoadedEvent = new CustomEvent('valueLoaded');
    const changeEvent = new Event('change');
    const resizeEvent = new Event('resize');

    const settingsElem = document.getElementById('settings').cloneNode(true);
    const panes = settingsElem.querySelector('#settings-panes');
    const header = settingsElem.querySelector('#settings-header');
    const pageWrapper = document.querySelector('.wrapper');

    // Make sure category is set for updatable objects
    const /** @type {Record<string, Record<string, option[]>>} */ options = {
        'Settings': {
            'Link Copying': [
                {
                    name: 'vx_button',
                    category: 'setting',
                    description: 'Show Copy Tweet as VX Button',
                },
                {
                    name: 'url_prefix',
                    category: 'vx_preferences',
                    description: 'URL prefix provider',
                    type: 'choice',
                    choices: [{name: 'VXTwitter', type: 'fixvx.com'}, {name: 'FXTwitter', type: 'fixupx.com'}, {name: 'Custom', type: 'x.com'}]
                },
                {
                    name: 'custom_url',
                    category: 'vx_preferences',
                    description: 'Custom copy URL (Set prefix to \'Custom\')',
                    type: 'text',
                },
                {
                    name: 'vx_copy_shortcut',
                    category: 'listeners',
                    description: 'Allow Ctrl+C to copy the url of the currently maximised tweet'
                }
            ],
            'Media Saving': [
                {
                    name: 'media_download_button',
                    category: 'setting',
                    description: 'Show download buttons on media',
                },
                {
                    name: 'inline_download_button',
                    category: 'setting',
                    description: 'Show download buttons within tweet bottom panel',
                },
                {
                    name: 'save_image',
                    category: 'contextmenu',
                    description: 'Show image download button in right click context menu'
                },
                {
                    name: 'hover_thumbnail_timeout',
                    category: 'download_preferences',
                    description: 'Hover over download button duration to show thumbnail (negative for disabled)',
                    type: 'number',
                    post: (elem) => elem.appendChild(document.createTextNode(' seconds')),
                    attributes: {step: '0.1'}
                },
                {
                    type: 'break'
                },
                {
                    name: 'download_all_near_click',
                    category: 'download_preferences',
                    description: 'Show "Download All" the download popup as the choice closest to your click',
                },
                {
                    name: 'download_all_override_saved',
                    category: 'download_preferences',
                    description: '"Download All" ignores saved files and downloads everything'
                },
                {
                    type: 'break'
                },
                {
                    name: 'image_button_position',
                    category: 'image_preferences',
                    description: 'Media download button position',
                    type: 'choice',
                    choices: [{name: 'Top Left', type: '0'}, {name: 'Top Right', type: '1'}, {name: 'Bottom Left', type: '2'}, {name: 'Bottom right', type: '3'}]
                },
                {
                    name: 'image_button_scale',
                    category: 'image_preferences',
                    description: 'Media download button scale',
                    type: 'number',
                    attributes: {step: '0.1'}
                },
                {
                    type: 'break'
                },
                {
                    name: 'image_button_width_value',
                    category: 'image_preferences',
                    description: 'Media download button width (1 for default)',
                    type: 'number',
                    post: (elem) => elem.appendChild(document.createTextNode('% (of Media width)')),
                    attributes: {step: '5'}
                },
                {
                    name: 'image_button_height_value',
                    category: 'image_preferences',
                    description: 'Media download button height (1 for default)',
                    type: 'number',
                    post: (elem) => elem.appendChild(document.createTextNode('% (of Media height)')),
                    attributes: {step: '5'}
                },
                {
                    name: 'image_button_height_value_small',
                    category: 'image_preferences',
                    description: 'Media download button height -> small images (1 for default)',
                    type: 'number',
                    post: (elem) => elem.appendChild(document.createTextNode('% (of Media height)')),
                    attributes: {step: '5'}
                },
                {
                    name: 'small_image_size_threshold',
                    category: 'image_preferences',
                    description: 'Height threshold in pixels for media to be considered small',
                    type: 'number',
                    post: (elem) => elem.appendChild(document.createTextNode('px')),
                    attributes: {step: '20'}
                },
                {
                    type: 'break'
                },
                {
                    name: 'more_media_icon_visible',
                    category: 'style',
                    description: 'Make the "more media" icon on the media pages of user profiles stand out more'
                },
                {
                    name: 'download_picker_on_media_page',
                    category: 'download_preferences',
                    description: 'Show download picker for multi-media tweets in the media page'
                },
            ],
            'Download History': [
                {
                    name: 'download_history_enabled',
                    category: 'download_preferences',
                    description: 'Enable download history (To remove: right click on a download or popup button)',
                },
                {
                    name: 'download_history_prevent_download',
                    category: 'download_preferences',
                    description: 'Prevent downloading of previously downloaded items',
                },
                {
                    type: 'break',
                },
                {
                    name: 'clear_download_history',
                    type: 'button',
                    button: 'Clear download history',
                    onclick: () => {
                        customPopup('Are you sure you want to clear your media download history?', true).then((result) => {
                            if (result) {
                                const {removeOverlay} = makeScreenOverlay('Deleting, please wait...');
                                Background.clear_download_history().then(() => {
                                    removeOverlay();
                                    void customPopup('Successfully cleared media download history');
                                });
                            }
                        });
                    }
                },
                {
                    name: 'import_download_history',
                    type: 'button',
                    button: 'Import download history from export (normal or binary)',
                    onclick: () => {
                        document.getElementById('download_history_input').click();
                    },
                    init: () => {
                        const i = document.createElement('input');
                        i.type = 'file';
                        i.id = 'download_history_input';
                        i.hidden = true;
                        i.accept = '.twitterimprovements,.twitterimprovementsbin,.twitterimprovementsgz';
                        i.addEventListener('change', () => {
                            const file = i.files[0];
                            if (!file) return;

                            const {removeOverlay, progressCallback} = makeScreenOverlay("Importing, please wait...", true);
                            const onFinish = () => {
                                removeOverlay();
                                i.value = ''; // fix for double identical file inputs
                                void customPopup('Successfully imported!');
                            }
                            const isGz = file.name.endsWith('.twitterimprovementsgz');
                            const isBinary = file.name.endsWith('.twitterimprovementsbin');
                            if (isGz || isBinary) {
                                /** @param {ArrayBuffer} buffer */
                                const onBuffer = (buffer) => {
                                    const ids = [];
                                    const view = new DataView(buffer);
                                    const max = view.byteLength;

                                    for (let offset = 0; offset < max; offset += 9) {
                                        ids.push(`${view.getBigUint64(offset, true)}-${view.getUint8(offset + 8)}`)
                                    }

                                    const length = ids.length;
                                    return BackgroundPorts.download_history_add_all(ids, ({progress, text}) => {
                                        progressCallback(progress, length, text);
                                    });
                                }
                                if (isBinary) file.arrayBuffer().then(onBuffer).then(onFinish);
                                else if (isGz) {
                                    if (!('DecompressionStream' in window)) {
                                        removeOverlay();
                                        i.value = '';
                                        void customPopup('Failed to import! File is compressed but no decompression available.');
                                        return;
                                    }
                                    new Response(file.stream().pipeThrough(new DecompressionStream("gzip")))
                                        .arrayBuffer().then(onBuffer).then(onFinish).catch(() => {
                                            removeOverlay();
                                            i.value = '';
                                            void customPopup('Failed to import! Bad file.');
                                    });
                                }
                            } else {
                                file.text().then((r) => {
                                    const split = r.split(' ');
                                    const length = split.length;
                                    return BackgroundPorts.download_history_add_all(split, ({progress, text}) => {
                                        progressCallback(progress, length, text);
                                    });
                                }).then(onFinish);
                            }
                        });
                        document.body.appendChild(i);
                    }
                },
                {
                    name: 'import_download_history_from_files',
                    type: 'button',
                    button: 'Import download history from saved files\n(File names must contain tweet id, then any character, then the tweet number)',
                    onclick: () => {
                        document.getElementById('download_history_files_input').click();
                    },
                    init: () => {
                        const i = document.createElement('input');
                        i.type = 'file';
                        i.id = 'download_history_files_input';
                        i.hidden = true;
                        i.multiple = true;
                        i.accept = 'image/*, video/*';
                        const validNums = new Set([1, 2, 3, 4]);
                        i.addEventListener('change', () => {
                            const {removeOverlay, progressCallback} = makeScreenOverlay("Importing, please wait...", true);
                            const saved_images = [];
                            for (const {name} of i.files) {
                                const id = name.match(/\d+/g)?.reduce((longest, current) => current.length > longest.length ? current : longest, '') ?? '';
                                if (id.length > 10) {
                                    const num = name.slice(name.indexOf(id) + id.length).match(/\d+/);
                                    if (validNums.has(+num)) saved_images.push(`${id}-${num}`);
                                }
                            }
                            const length = saved_images.length;
                            BackgroundPorts.download_history_add_all(saved_images, ({progress, text}) => {
                                progressCallback(progress, length, text);
                            }).then(() => {
                                removeOverlay();
                                i.value = ''; // fix for double identical file inputs
                                void customPopup(`Successfully imported ${saved_images.length} files!`);
                            });
                        });
                        document.body.appendChild(i);
                    }
                },
                {
                    name: 'export_download_history',
                    type: 'button',
                    button: 'Export download history\nExports as {tweet id}-{media number}',
                    onclick: () => {
                        const {removeOverlay} = makeScreenOverlay("Exporting, please wait...");
                        Background.download_history_get_all().then((r) => {
                            removeOverlay();
                            const url = URL.createObjectURL(new Blob([r.join(' ')], { type: 'application/octet-stream' }));
                            download(url, 'export.twitterimprovements');
                            URL.revokeObjectURL(url);
                        });
                    }
                },
                {
                    name: 'saved_image_count',
                    type: 'button',
                    button: 'Get saved media count',
                    onclick: () => {
                        const {removeOverlay} = makeScreenOverlay("Calculating, please wait...");
                        Background.download_history_get_all().then((r) => {
                            removeOverlay();
                            void customPopup(`You have downloaded approximately ${r.length} unique media`);
                        });
                    }
                }
            ],
            'Extras': [
                {
                    name: 'bookmark_on_photo_page',
                    category: 'setting',
                    description: 'Show bookmark button on the enlarged photo page',
                },
                {
                    name: 'replace_tweet_urls',
                    category: 'setting',
                    description: "Replace URL's with their original URL's rather than the shortened ones"
                },
                {
                    name: 'use_download_progress',
                    category: 'download_preferences',
                    description: 'Show downloads on screen in queue, rather than auto downloading (Mobile exclusive)'
                },
                {
                    name: 'hide_bottom_bar_completely',
                    category: 'setting',
                    description: 'Hide navigation bar completely when scrolling down'
                },
                {
                    type: 'break'
                },
                {
                    name: 'reset_all_settings',
                    type: 'button',
                    button: 'Reset to DEFAULT settings (excluding download history)\nYou can reset single settings by right clicking them',
                    class: ['warning'],
                    onclick: () => {
                        customPopup('Are you sure you want to RESET this extensions settings?', true).then((result) => {
                            if (result) clearStorage().then(() => {
                                window.location.reload();
                            });
                        })
                    }
                }
            ],
            'Advanced': [
                {
                    name: 'export_settings_json',
                    type: 'button',
                    button: 'Export Settings',
                    onclick: () => {
                        getStorage().then((r) => {
                            const url = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
                            download(url, 'twitterimprovements.json');
                            URL.revokeObjectURL(url);
                        })
                    }
                },
                {
                    name: 'import_settings_json',
                    type: 'button',
                    button: 'Import Settings\n(May not apply all settings if export is from a different version)',
                    onclick: () => {
                        document.getElementById('import_settings_json_input').click();
                    },
                    init: () => {
                        const i = document.createElement('input');
                        i.type = 'file';
                        i.id = 'import_settings_json_input';
                        i.hidden = true;
                        i.multiple = false;
                        i.accept = 'application/json';
                        i.addEventListener('change', () => {
                            const file = i.files[0];
                            if (!file) return;
                            file.text()
                                .then(async (r) => {
                                    i.value = ''; // fix for double identical file inputs
                                    const j = JSON.parse(r);
                                    // order important here
                                    await clearStorage();
                                    await setStorage(j);
                                })
                                .then(() => customPopup('Imported Settings').then(location.reload.bind(location)))
                                .catch((e) => customPopup(`Failed to parse JSON: ${e.toString()}`));
                        });
                        document.body.appendChild(i);
                    }
                },
                {
                    type: 'break'
                },
                {
                    name: 'export_download_history_binary',
                    type: 'button',
                    button: 'Export download history\n(Binary - for a smaller file size)',
                    onclick: () => {
                        const {removeOverlay} = makeScreenOverlay("Exporting, please wait...");
                        Background.download_history_get_all().then((r) => {
                            const buffers = [];
                            for (const /** @type {saveId} */ saveId of r) {
                                const [tweetId, tweetNum] = saveId.split('-');
                                if (tweetId && tweetNum) {
                                    const buffer = new ArrayBuffer(9);
                                    const view = new DataView(buffer);

                                    view.setBigUint64(0, BigInt(tweetId), true);
                                    view.setUint8(8, +tweetNum);
                                    buffers.push(buffer);
                                }
                            }

                            const buffer = new Uint8Array(buffers.length * 9);
                            let offset = 0;
                            for (const buf of buffers) {
                                buffer.set(new Uint8Array(buf), offset);
                                offset += 9;
                            }

                            const downloadBlob = (blob, gz = true) => {
                                removeOverlay();
                                const url = URL.createObjectURL(blob);
                                download(url, 'export.twitterimprovements' + ((gz) ? 'gz' : 'bin'));
                                URL.revokeObjectURL(url);
                            }

                            const blob = new Blob([buffer], { type: 'application/octet-stream' });
                            if ('CompressionStream' in window) {
                                new Response(
                                    blob.stream().pipeThrough(new CompressionStream('gzip')), {
                                        headers: { 'Content-Type': 'application/octet-stream' }
                                    }
                                ).blob().then(downloadBlob);
                            } else {
                                downloadBlob(blob, false);
                            }
                        });
                    }
                },
                {
                    type: 'break'
                },
                {
                    name: 'info',
                    category: 'logging',
                    description: 'Enable informational logging in the console',
                },
                {
                    name: 'error',
                    category: 'logging',
                    description: 'Enable error logging in the console',
                },
            ]
        },
        'Hidden Elements': {
            'Global': [
                {
                    name: 'hide_grok',
                    category: 'style',
                    description: 'Everything "Grok"',
                },
                {
                    name: 'hide_premium',
                    category: 'style',
                    description: '"Premium" button and additional Premium ads',
                },
                {
                    name: 'hide_post_reply_sections',
                    category: 'style',
                    description: '"Post" and "Reply" sections',
                },
                {
                    name: 'hide_subscribe_buttons',
                    category: 'style',
                    description: '"Subscribe" buttons',
                }
            ],
            'Tweets': [
                {
                    name: 'hide_tweet_view_count',
                    category: 'style',
                    description: 'View counts',
                },
                {
                    name: 'hide_tweet_share_button',
                    category: 'style',
                    description: 'Share button',
                },
                {
                    name: 'hide_replies_button_tweet',
                    category: 'style',
                    description: 'Replies button',
                },
                {
                    name: 'hide_retweet_button_tweet',
                    category: 'style',
                    description: 'Retweet button',
                },
                {
                    name: 'hide_like_button_tweet',
                    category: 'style',
                    description: 'Like button',
                },
                {
                    name: 'hide_bookmark_button_tweet',
                    category: 'style',
                    description: 'Bookmark button',
                }
            ],
            'Left Sidebar': [
                {
                    name: 'hide_notifications',
                    category: 'style',
                    description: '"Notifications" button',
                },
                {
                    name: 'hide_messages',
                    category: 'style',
                    description: '"Messages" button',
                },
                {
                    name: 'hide_chat',
                    category: 'style',
                    description: '"Chat" button'
                },
                {
                    name: 'hide_jobs',
                    category: 'style',
                    description: '"Jobs" button',
                },
                {
                    name: 'hide_lists',
                    category: 'style',
                    description: '"Lists" button',
                },
                {
                    name: 'hide_communities',
                    category: 'style',
                    description: '"Communities" button',
                },
                {
                    name: 'hide_premium_business',
                    category: 'style',
                    description: '"Business" button',
                },
                {
                    name: 'hide_create_your_space',
                    category: 'style',
                    description: '"Create your space" button',
                },
                {
                    name: 'hide_post_button',
                    category: 'style',
                    description: '"Post" button',
                },
                {
                    name: 'hide_follower_requests',
                    category: 'style',
                    description: '"Follower requests" button',
                },
                                {
                    name: 'hide_verified_orgs',
                    category: 'style',
                    description: '"Verified Orgs" button',
                },
                {
                    name: 'hide_monetization',
                    category: 'style',
                    description: '"Monetization" button',
                },
                {
                    name: 'hide_ads_button',
                    category: 'style',
                    description: '"Ads" button',
                },
            ],
            'Right Sidebar': [
                {
                    name: 'hide_todays_news',
                    category: 'style',
                    description: "Today's News tab"
                },
                {
                    name: 'hide_whats_happening',
                    category: 'style',
                    description: "What's Happening tab",
                },
                {
                    name: 'hide_who_to_follow',
                    category: 'style',
                    description: 'Who To Follow tab',
                },
                {
                    name: 'hide_relevant_people',
                    category: 'style',
                    description: 'Relevant people tab',
                },
                {
                    name: 'hide_live_on_x',
                    category: 'style',
                    description: 'Live on X tab',
                },
                {
                    name: 'hide_sidebar_footer',
                    category: 'style',
                    description: 'Additional sidebar urls, under the search bar',
                }
            ],
        },
        'Downloading': {
            'Download Options': [
                {
                    name: 'save_directory',
                    category: 'download_preferences',
                    description: 'Relative file save directory',
                    type: 'text',
                },
                {
                    name: 'save_as_prompt',
                    category: 'download_preferences',
                    description: 'Prompt to "Save As" when saving files with this extension',
                    type: 'choice',
                    choices: [{name: 'Follow browser setting', type: 'browser'}, {name: 'Don\'t prompt', type: 'off'}, {name: 'Prompt', type: 'on'}],
                },
                {
                    type: 'break',
                },
                {
                    name: 'save_directory_shift',
                    category: 'download_preferences',
                    description: 'Holding shift: Relative file save directory',
                    type: 'text',
                },
                {
                    name: 'save_as_prompt_shift',
                    category: 'download_preferences',
                    description: 'Holding shift: Prompt to "Save As" when saving files with this extension',
                    type: 'choice',
                    choices: [{name: 'Follow browser setting', type: 'browser'}, {name: 'Don\'t prompt', type: 'off'}, {name: 'Prompt', type: 'on'}],
                },
                {
                    type: 'break',
                },
                {
                    name: 'save_directory_ctrl',
                    category: 'download_preferences',
                    description: 'Holding ctrl: Relative file save directory',
                    type: 'text',
                },
                {
                    name: 'save_as_prompt_ctrl',
                    category: 'download_preferences',
                    description: 'Holding ctrl: Prompt to "Save As" when saving files with this extension',
                    type: 'choice',
                    choices: [{name: 'Follow browser setting', type: 'browser'}, {name: 'Don\'t prompt', type: 'off'}, {name: 'Prompt', type: 'on'}],
                },
                {
                    type: 'break',
                },
                {
                    name: 'save_directory_alt',
                    category: 'download_preferences',
                    description: 'Holding alt: Relative file save directory',
                    type: 'text',
                },
                {
                    name: 'save_as_prompt_alt',
                    category: 'download_preferences',
                    description: 'Holding alt: Prompt to "Save As" when saving files with this extension',
                    type: 'choice',
                    choices: [{name: 'Follow browser setting', type: 'browser'}, {name: 'Don\'t prompt', type: 'off'}, {name: 'Prompt', type: 'on'}],
                },
            ],
            'Save file name': [
                {
                    name: 'save_format',
                    category: 'download_preferences',
                    description: 'Changing this might break image reversing! (Make sure to keep the Tweet ID present)',
                    type: 'quickPick',
                    quickPicks: [['username', 'USERNAME'], ['tweetId', 'TWEET ID'], ['tweetNum', 'IMAGE NUMBER'], ['extension', 'FILE EXTENSION'], ['imageId', 'IMAGE ID (from image source url)']],
                    post: (elem) => {
                        const inputWrap = document.createElement('div');
                        inputWrap.classList.add('inputWrap');
                        inputWrap.append(elem.querySelector('input'), document.createTextNode('.{extension}'));

                        elem.firstElementChild.after(document.createTextNode('If you want to keep saved image importing working, put the IMAGE NUMBER after TWEET ID, separating it by a character\nQuick Picks: '));
                        elem.appendChild(inputWrap);
                    }
                }
            ]
        },
        'Extras': {
            'Tweet Button Positions': [
                {
                    name: 'tweet_button_positions',
                    category: 'style',
                    description: 'Rearrange the button positions by dragging them to the desired positions. (Hidden buttons still affect placement)',
                    noDefaultListener: true,
                    type: 'quickPick',
                    quickPicks: [['replies', '💭 Reply'], ['retweets', '🔁 Retweet'], ['likes', '❤️ Likes'], ['views', '📈 Views'], ['bookmark', '🔖 Bookmark'], ['share', '⬆️ Share'], ['download', '⬇️ Download'], ['copy', '📋 Copy link']],
                    class: ['hidden'],
                    post: (elem) => {
                        const quickPicks = elem.querySelector('.quickPicks');
                        elem.addEventListener('valueLoaded', () => {
                            // Parse into values
                            const result = elem.querySelector('input').value.match(/{([^}]+)}/g).map(match => match.replace(/[{}]/g, ''));
                            for (let i = 0; i < result.length; ++i) {
                                quickPicks.appendChild(elem.querySelector(`[data-item="${result[i]}"]`));
                            }
                        });

                        let dragged, draggedClone, xOffset, yOffset;
                        const input = elem.querySelector('input');
                        quickPicks.classList.add('draggableWrapper');
                        const moveEvent = (e) => {
                            if (dragged) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();

                                draggedClone.style.top = `${e.clientY - yOffset}px`;
                                draggedClone.style.left = `${e.clientX - xOffset}px`;

                                for (const target of document.elementsFromPoint(e.clientX, e.clientY)) {
                                    if (target.closest('button:not(.draggingClone)') && target !== dragged) {
                                        const rect = target.getBoundingClientRect();
                                        target[e.clientX >= rect.left + (rect.width / 2) ? 'after' : 'before'](dragged);
                                        break;
                                    }
                                }
                            }
                        }
                        const upEvent = (e) => {
                            if (dragged) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                window.removeEventListener('pointermove', moveEvent);
                                window.removeEventListener('pointerup', upEvent);
                                window.removeEventListener('pointercancel', upEvent);

                                dragged.classList.remove('dragging');
                                dragged = null;

                                draggedClone.remove();
                                draggedClone = null;

                                input.value = '';
                                input.value = Array.from(quickPicks.children).map((item) => `{${item.dataset.item}}`).join('');
                                input.dispatchEvent(changeEvent);
                            }
                        }
                        quickPicks.addEventListener('pointerdown', (e) => {
                            const btn = e.target.closest('button');
                            if (btn) {
                                dragged = btn;
                                const box = dragged.getBoundingClientRect();
                                yOffset = e.clientY - box.top;
                                xOffset = e.clientX - box.left;

                                draggedClone = dragged.cloneNode(true);
                                draggedClone.classList.add('draggingClone');
                                draggedClone.style.width = `${box.width}px`;
                                draggedClone.style.height = `${box.height}px`;
                                draggedClone.style.top = `${e.clientY - yOffset}px`;
                                draggedClone.style.left = `${e.clientX - xOffset}px`;
                                document.body.appendChild(draggedClone);

                                dragged.classList.add('dragging');

                                window.addEventListener('pointermove', moveEvent);
                                window.addEventListener('pointerup', upEvent, {once: true});
                                window.addEventListener('pointercancel', upEvent, {once: true});
                            }
                        });
                    }
                }
            ],
            'Hidden Extension Notifications': [
                {
                    name: 'save_media',
                    category: 'hidden_extension_notifications',
                    description: 'Saving image',
                },
                {
                    name: 'save_media_duplicate',
                    category: 'hidden_extension_notifications',
                    description: 'Saving image duplicate',
                },
                {
                    name: 'history_remove',
                    category: 'hidden_extension_notifications',
                    description: 'Removing from history',
                },
                {
                    name: 'history_add',
                    category: 'hidden_extension_notifications',
                    description: 'Adding to history',
                },
                {
                    name: 'copied_url',
                    category: 'hidden_extension_notifications',
                    description: 'URL Copy',
                }
            ],

            'Hidden Download Error Notifications': [
                {
                    name: 'disable_cancelled_download_notification',
                    category: 'download_preferences',
                    description: 'Cancelled download from save as'
                }
            ]
        },
    }

    const valuesToUpdate = [];
    const typeMap = {
        choice: (e) => {
            const [outer, select] = get_generic_setting(e, 'select');
            for (const opt of e.choices) {
                const o = document.createElement('option');
                o.setAttribute('value', opt.type);
                o.textContent = opt.name;
                select.appendChild(o);
            }
            e.valueProperty = 'value';
            valuesToUpdate.push({obj: e, func: (v) => select.value = v});
            select.addEventListener('change', update_value);
            return outer;
        },
        text: (e) => {
            const [outer, input] = get_generic_setting(e, 'input');
            input.type = "text";
            valuesToUpdate.push({obj: e, func: (v) => input.value = v});
            e.valueProperty = 'value';
            input.addEventListener('change', update_value);
            return outer;
        },
        button: (e) => {
            const [outer, button] = get_generic_setting(e, 'button');
            outer.dataset.noDefault = '';
            button.textContent = e.button;
            button.addEventListener('click', e.onclick);
            return outer;
        },
        checkbox: (e) => {
            const [outer, checkbox] = get_generic_setting(e, 'input', true);
            checkbox.setAttribute('type', 'checkbox');
            valuesToUpdate.push({obj: e, func: (v) => checkbox.checked = v});
            e.valueProperty = 'checked';
            checkbox.addEventListener('change', update_value);
            return outer;
        },
        number: (e) => {
            const [outer, input] = get_generic_setting(e, 'input');
            input.type = 'number';
            valuesToUpdate.push({obj: e, func: (v) => input.value = v});
            e.valueProperty = 'value';
            input.addEventListener('change', async (ev) => {
                const currentTarget = ev.currentTarget;
                if (await Background.validate_setting(e.category, e.name, input.value)) update_value(ev, currentTarget);
                else input.value = Defaults[e.category][e.name].default;
            });
            return outer;
        },
        quickPick: (e) => {
            const outer = typeMap.text(e);
            outer.classList.add('quickPicksWrapper');

            const quickPicks = document.createElement('div');
            quickPicks.classList.add('quickPicks');
            for (const [item, name] of e.quickPicks) {
                const btn = document.createElement('button');
                btn.textContent = name;
                btn.dataset.item = item;
                quickPicks.appendChild(btn);
            }

            if (!e.noDefaultListener) {
                const input = outer.querySelector('input');
                quickPicks.addEventListener('click', (e) => {
                    const btn = e.target.closest('button');
                    if (btn) {
                        input.value += `{${btn.dataset.item}}`;
                        input.dispatchEvent(changeEvent);
                    }
                });
            }

            outer.firstElementChild.after(quickPicks);
            return outer;
        },
        break: () => document.createElement('br')
    }

    for (const category in options) {
        const cat = document.createElement('div'), pane = document.createElement('div');
        cat.textContent = pane.dataset.pane = cat.dataset.pane = category;

        const opt = options[category];
        for (const section in opt) {
            const outer = document.createElement('div');
            if (section.length > 0) {
                const h = document.createElement('h3');
                h.textContent = section;
                outer.appendChild(h);
            }
            for (const inner in opt[section]) outer.appendChild(create(opt[section][inner]));
            pane.appendChild(outer);
        }

        header.appendChild(cat);
        panes.appendChild(pane);
    }

    // Now that the building is done, append to the page
    document.getElementById('settings').replaceWith(settingsElem);

    Promise.all([Defaults.loadDefaults(), Settings.loadSettings()])
        .then(() => {
        for (const {obj, func} of valuesToUpdate) {
            const value = Settings[obj.category][obj.name];
            if (value == null) void customPopup(`Warning: Value is ${value} for ${obj.name} in ${obj.category}`);
            func(value);
            obj.element?.dispatchEvent(valueLoadedEvent);
        }
        valuesToUpdate.length = 0;

        // icon switching
        let counter = 0, altSet = Settings.extension_icon.custom;

        const setIcon = () => document.querySelector('link[rel="icon"]').href = (altSet) ? '../icons/alt/icon.svg' : '../icons/icon.svg';
        setIcon();
        document.getElementById('madeText').addEventListener('click', () => {
            if (++counter >= 5) {
                counter = 0;
                setStorage({extension_icon: {custom: !altSet}});
                altSet = !altSet;
                setIcon();
            }
        });
    });

    { // Settings panes scrolling
        let lastPane;

        panes.scrollLeft = 0;
        header.firstElementChild.classList.add('selected');
        header.addEventListener('click', (e) => {
            const t = e.target.closest('div[data-pane]');
            if (t) window.location.hash = t.dataset.pane;
        });

        let touchStartX = 0, disableTouch = false;
        pageWrapper.addEventListener('touchstart', (e) => {
            if (e.target.closest('button') || e.target.closest('input')) {
                scrollToLastPane(true);
                disableTouch = true;
            } else {
                touchStartX = e.changedTouches[0].screenX;
            }
        });
        pageWrapper.addEventListener('touchmove', (e) => {
            if (disableTouch && !e.target.closest('input[type="text"]')) e.preventDefault();
        }, {passive: false});
        pageWrapper.addEventListener('touchend', (e) => {
            if (disableTouch) {
                scrollToLastPane();
                disableTouch = false;
            } else {
                const touchEndX = e.changedTouches[0].screenX;
                if (Math.abs(touchStartX - touchEndX) > 50) changePane(touchStartX - touchEndX > 50);
                else scrollToLastPane();
            }
        });
        pageWrapper.addEventListener('wheel', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                changePane(e.deltaY > 0);
            }
        }, {passive: false});
        function changePane(next) {
            const currPane = header.querySelector('.selected');
            const nextPane = next ? currPane.nextElementSibling : currPane.previousElementSibling;
            if (nextPane) window.location.hash = nextPane.dataset.pane;
        }

        const hashchangeHandler = (_, instant) => {
            const hash = decodeURIComponent(window.location.hash.substring(1));
            if (Object.hasOwn(options, hash)) {
                lastPane = hash;
                header.querySelector('.selected')?.classList.remove('selected');
                header.querySelector(`div[data-pane="${hash}"]`).classList.add('selected');
                if (instant === true) panes.style.scrollBehavior = 'auto';
                scrollToLastPane(instant);
                if (instant === true) panes.style.removeProperty('scroll-behavior');
                setHeight();
            }
        }
        panes.firstElementChild.classList.add('focused');
        hashchangeHandler(null, true);
        window.addEventListener('hashchange', hashchangeHandler);

        function scrollToLastPane(instant) {
            const p = panes.querySelector(`div[data-pane="${lastPane}"]`);
            if (p) {
                for (const f of panes.querySelectorAll('.focused')) f.classList.remove('focused');
                p.classList.add('focused');
                if (chromeMode) {
                    panes.style.transform = `translateX(-${p.offsetLeft}px)`;
                } else {
                    panes.scroll({left: p.offsetLeft, behavior: (instant) ? 'instant' : 'smooth'});
                }
            }
        }

        function setHeight() {
            const currPane = panes.querySelector(`div[data-pane="${header.querySelector('.selected').dataset.pane}"]`)
            panes.style.height = `${currPane.lastElementChild.getBoundingClientRect().bottom - currPane.getBoundingClientRect().top + 20}px`;
        }

        const setHeightDelay = ()=>  setTimeout(setHeight, 200);
        const scrollLastPaneDelay = () => setTimeout(scrollToLastPane, 200);
        setHeight();
        setHeightDelay(); // Fix initial install height

        window.addEventListener('resize', scrollLastPaneDelay);
        window.addEventListener('resize', setHeightDelay);
    }

    { // Resetting single settings to defaults
        panes.addEventListener('contextmenu', (e) => {
            const setting = e.target.closest('[data-setting]');
            if (setting && setting.dataset?.noDefault !== '') {
                e.preventDefault();

                setting.classList.add('highlighted');
                window.dispatchEvent(resizeEvent);

                const outer = document.createElement('div'),
                    d = document.createElement('button');
                outer.classList.add('fullscreenOverlay');
                d.textContent = 'Reset this setting to its default';
                d.classList.add('contextmenu');
                d.style.top = `${e.clientY}px`;
                d.style.left = `${e.clientX}px`;

                outer.addEventListener('click', (ev) => {
                    if (!ev.target.closest('.contextmenu')) {
                        outer.remove();
                        setting.classList.remove('highlighted');
                        window.dispatchEvent(resizeEvent);
                    }
                });

                d.addEventListener('click', () => {
                    const props = setting.properties;
                    props.valueElement[props.valueProperty] = Defaults[props.category][props.name].default;
                    props.element.dispatchEvent(valueLoadedEvent);
                    props.valueElement.dispatchEvent(changeEvent);
                    outer.click();
                });

                outer.appendChild(d);
                document.body.appendChild(outer);
            }
        });
    }

    function create(elem) {
        elem.init?.();
        const m = typeMap[elem.type ?? 'checkbox'](elem);
        elem.post?.(m);
        return m;
    }

    function get_generic_setting(e, element, flipOrder) {
        const outer = document.createElement('div'), label = document.createElement('label'), elem = document.createElement(element);
        outer.properties = e;
        outer.dataset.setting = '';
        e.element = outer;
        e.valueElement = elem;
        label.textContent = e.description || '';
        label.htmlFor = e.name;
        elem.id = e.name;
        if (e.class) elem.classList.add(...e.class);
        if (e.attributes) {
            const attrs = e.attributes;
            for (const attribute in attrs) {
                const attr = attrs[attribute];
                if (typeof attr === 'boolean') elem[attr ? 'setAttribute' : 'removeAttribute'](attribute, '');
                else elem.setAttribute(attribute, attr);
            }
        }
        if (flipOrder) outer.append(elem, label);
        else outer.append(label, elem);
        return [outer, elem];
    }

    /** @param {Event} ev
     *  @param {HTMLInputElement} [currentTarget]
     */
    function update_value(ev, currentTarget) {
        window.dispatchEvent(resizeEvent);
        const obj = (ev.currentTarget || currentTarget).closest('[data-setting]').properties;
        getStorage([obj.category]).then((r) => {
            if (r[obj.category] == null) r[obj.category] = {};
            r[obj.category][obj.name] = obj.valueElement[obj.valueProperty];
            setStorage(r);
        });
    }

    function setStorage(data) {
        return extension.storage.local.set(data); // potentially add little saved message with .then
    }

    function clearStorage() {
        return extension.storage.local.clear();
    }

    function getStorage(data) {
        return extension.storage.local.get(data);
    }

    function download(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    }

    /**
     * @param {string} text
     * @param {boolean} [choice]
     * @returns {Promise<boolean>}
     */
    function customPopup(text, choice) {
        const outer = document.createElement('div'),
            notifOuter = document.createElement('div'),
            notifInner = document.createElement('div'),
            buttonContainer = document.createElement('div');
        outer.classList.add('fullscreenOverlay');
        notifOuter.classList.add('notifOuter');
        notifInner.textContent = text;

        const btn = document.createElement('button');
        btn.dataset.type = 'yes';
        btn.textContent = "Ok";
        buttonContainer.appendChild(btn);

        if (choice) {
            const btn2 = document.createElement('button');
            btn2.dataset.type = 'no';
            btn2.textContent = "Cancel";
            buttonContainer.firstElementChild.before(btn2);
        }

        outer.appendChild(notifOuter);
        notifOuter.append(notifInner, buttonContainer);
        document.body.appendChild(outer);

        return new Promise((resolve) => {
            buttonContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) {
                    resolve(btn.dataset.type === 'yes');
                    outer.remove();
                }
            });
            outer.addEventListener('click', (ev) => {
                if (!ev.target.closest('.notifOuter')) {
                    resolve(false);
                    outer.remove();
                }
            });
        });
    }
})();