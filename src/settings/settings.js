'use strict';

(() => {
    if (typeof this.browser === 'undefined') {
        this.browser = chrome;
    }

    document.getElementById('versionDisplay').textContent += browser?.runtime?.getManifest?.()?.version;

    if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile');
    }

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
        get_settings: () => browser.runtime.sendMessage({type: 'get_settings'}),
        get_default_settings: () => browser.runtime.sendMessage({type: 'get_default_settings'}),

        clear_download_history: () => browser.runtime.sendMessage({type: 'download_history_clear'}),
        download_history_add_all: (saved_images) => browser.runtime.sendMessage({type: 'download_history_add_all', saved_images}),
        download_history_get_all: () => browser.runtime.sendMessage({type: 'download_history_get_all'})
    };

    const valueLoadedEvent = new CustomEvent('valueLoaded');
    const changeEvent = new Event('change');
    const resizeEvent = new Event('resize');

    const settingsElem = document.getElementById('settings').cloneNode(true);
    const panes = settingsElem.querySelector('#settings-panes');
    const header = settingsElem.querySelector('#settings-header');
    const pageWrapper = document.querySelector('.wrapper');

    // Make sure category is set for updatable objects
    const options = {
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
            ],
            'Video/GIF Saving': [
                {
                    name: 'video_button',
                    category: 'setting',
                    description: 'Show Video/GIF Download Buttons',
                },
                {
                    name: 'video_download_fallback',
                    category: 'video_preferences',
                    description: 'Open download url in new cobalt.tools tab if download fails',
                }
            ],
            'Image Saving': [
                {
                    name: 'image_button',
                    category: 'setting',
                    description: 'Show Image Download Buttons on images',
                },
                {
                    name: 'inline_image_button',
                    category: 'setting',
                    description: 'Show image downloads with video download buttons',
                },
                {
                    type: 'break'
                },
                {
                    name: 'image_button_position',
                    category: 'image_preferences',
                    description: 'Image download button position',
                    type: 'choice',
                    choices: [{name: 'Top Left', type: '0'}, {name: 'Top Right', type: '1'}, {name: 'Bottom Left', type: '2'}, {name: 'Bottom right', type: '3'}]
                },
                {
                    name: 'image_button_scale',
                    category: 'image_preferences',
                    description: 'Image download button scale',
                    type: 'number',
                    validate: (value) => value > 0,
                    attributes: {step: '0.1'}
                },
                {
                    type: 'break'
                },
                {
                    name: 'image_button_width_value',
                    category: 'image_preferences',
                    description: 'Image download button width (1 for default)',
                    type: 'number',
                    validate: (value) => value > 0 && value <= 100,
                    post: (elem) => elem.appendChild(document.createTextNode('% (of Image width)')),
                    attributes: {step: '5'}
                },
                {
                    name: 'image_button_height_value',
                    category: 'image_preferences',
                    description: 'Image download button height (1 for default)',
                    type: 'number',
                    validate: (value) => value > 0 && value <= 100,
                    post: (elem) => elem.appendChild(document.createTextNode('% (of Image height)')),
                    attributes: {step: '5'}
                },
                {
                    name: 'image_button_height_value_small',
                    category: 'image_preferences',
                    description: 'Image download button height -> small images (1 for default)',
                    type: 'number',
                    validate: (value) => value > 0 && value <= 100,
                    post: (elem) => elem.appendChild(document.createTextNode('% (of Image height)')),
                    attributes: {step: '5'}
                },
                {
                    name: 'small_image_size_threshold',
                    category: 'image_preferences',
                    description: 'Height threshold in pixels for an image to be considered small',
                    type: 'number',
                    validate: (value) => value > 0,
                    post: (elem) => elem.appendChild(document.createTextNode('px')),
                    attributes: {step: '20'}
                }
            ],
            'Download History': [
                {
                    name: 'download_history_enabled',
                    category: 'image_preferences',
                    description: 'Enable download history (To remove: right click on a download or popup button)',
                },
                {
                    name: 'download_history_prevent_download',
                    category: 'image_preferences',
                    description: 'Prevent downloading of previously downloaded items',
                },
                {
                    type: 'break',
                },
                {
                    name: 'clear_download_history',
                    description: '',
                    type: 'button',
                    button: 'Clear download history',
                    onclick: () => {
                        customPopup('Are you sure you want to clear your media download history?', true).then((result) => {
                            if (result) Background.clear_download_history();
                        });
                    }
                },
                {
                    name: 'import_download_history',
                    description: '',
                    type: 'button',
                    button: 'Import download history from export',
                    onclick: () => {
                        document.getElementById('download_history_input').click();
                    },
                    init: () => {
                        const i = document.createElement('input');
                        i.type = 'file';
                        i.id = 'download_history_input';
                        i.hidden = true;
                        i.accept = '.twitterimprovements';
                        i.addEventListener('change', (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (r) => {
                                Background.download_history_add_all(r.target.result.split(' '))
                                    .then(() => customPopup('Successfully imported!'));
                            };
                            reader.readAsText(file);
                        });
                        document.body.appendChild(i);
                    }
                },
                {
                    name: 'import_download_history_from_files',
                    description: '',
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
                        i.addEventListener('change', (e) => {
                            const saved_images = [];
                            for (const {name} of e.target.files) {
                                const id = name.match(/\d+/g)?.reduce((longest, current) => current.length > longest.length ? current : longest, '') ?? '';
                                if (id.length > 10) {
                                    const num = name.slice(name.indexOf(id) + id.length).match(/\d+/);
                                    if (validNums.has(+num)) saved_images.push(`${id}-${num}`);
                                }
                            }
                            Background.download_history_add_all(saved_images)
                                .then(() => customPopup(`Successfully imported ${saved_images.length} files!`));
                        });
                        document.body.appendChild(i);
                    }
                },
                {
                    name: 'export_download_history',
                    description: '',
                    type: 'button',
                    button: 'Export downloaded history\nExports as {tweet id}-{media number}',
                    onclick: () => {
                        Background.download_history_get_all().then((r) => {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(new Blob([r.join(' ')], { type: 'text/plain' }));
                            link.download = 'export.twitterimprovements';
                            link.click();
                            URL.revokeObjectURL(link.href);
                        });
                    }
                },
                {
                    name: 'saved_image_count',
                    description: '',
                    type: 'button',
                    button: 'Get saved media count',
                    onclick: () => {
                        Background.download_history_get_all().then((r) => {
                            customPopup(`You have downloaded approximately ${r.length} unique medias`);
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
                    name: 'download_all_near_click',
                    category: 'download_preferences',
                    description: 'Show "Download All" the download popup as the choice closest to your click',
                },
                {
                    name: 'reset_all_settings',
                    description: '',
                    type: 'button',
                    button: 'Reset to DEFAULT settings (excluding download history)\nYou can reset single settings by right clicking them',
                    class: ['warning'],
                    onclick: () => {
                        customPopup('Are you sure you want to RESET this extensions settings?', true).then((result) => {
                            if (result) {
                                clearStorage();
                                window.location.reload();
                            }
                        })
                    }
                }
            ],
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
            '': [
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
            ],
            'Save file name': [
                {
                    name: 'save_format',
                    category: 'download_preferences',
                    description: 'Changing this might break image reversing! (Make sure to keep the Tweet ID present)',
                    type: 'quickPick',
                    quickPicks: [['username', 'USERNAME'], ['tweetId', 'TWEET ID'], ['tweetNum', 'IMAGE NUMBER'], ['extension', 'FILE EXTENSION']],
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
        'Button Positions': {
            'Tweet': [
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
            ]
        },
        'Hidden Notifications': {
            'This Extension': [
                {
                    name: 'save_image',
                    category: 'hidden_extension_notifications',
                    description: 'Saving image',
                },
                {
                    name: 'save_image_duplicate',
                    category: 'hidden_extension_notifications',
                    description: 'Saving image duplicate',
                },
                {
                    name: 'save_video',
                    category: 'hidden_extension_notifications',
                    description: 'Saving video',
                },
                {
                    name: 'save_video_duplicate',
                    category: 'hidden_extension_notifications',
                    description: 'Saving video duplicate',
                },
                {
                    name: 'history_remove',
                    category: 'hidden_extension_notifications',
                    description: 'Removing from history',
                },
                {
                    name: 'copied_url',
                    category: 'hidden_extension_notifications',
                    description: 'URL Copy',
                }
            ]
        }
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
            input.addEventListener('change', (ev) => {
                if (e.validate(input.value)) update_value(ev);
                else input.value = Defaults[e.category][e.name];
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
            func(Settings[obj.category][obj.name]);
            obj.element?.dispatchEvent(valueLoadedEvent);
        }
        valuesToUpdate.length = 0;
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
            if (options.hasOwnProperty(hash)) {
                lastPane = hash;
                header.querySelector('.selected')?.classList.remove('selected');
                header.querySelector(`div[data-pane="${hash}"]`).classList.add('selected');
                if (instant === true) panes.style.scrollBehavior = 'auto';
                scrollToLastPane(instant);
                if (instant === true) panes.style.removeProperty('scroll-behavior');
                setHeight();
            }
        }
        hashchangeHandler(null, true);
        window.addEventListener('hashchange', hashchangeHandler);

        function scrollToLastPane(instant) {
            const p = panes.querySelector(`div[data-pane="${lastPane}"]`)
            if (p) panes.scroll({left: p.offsetLeft, behavior: (instant) ? 'instant' : 'smooth'});
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
                    props.valueElement[props.valueProperty] = Defaults[props.category][props.name];
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
        label.textContent = e.description;
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

    function update_value(ev) {
        window.dispatchEvent(resizeEvent);
        const obj = ev.currentTarget.closest('[data-setting]').properties;
        browser.storage.local.get([obj.category]).then((r) => {
            if (r[obj.category] == null) r[obj.category] = {};
            r[obj.category][obj.name] = obj.valueElement[obj.valueProperty];
            setStorage(r);
        });
    }

    function setStorage(data) {
        browser.storage.local.set(data); // potentially add little saved message with .then
    }

    function clearStorage() {
        browser.storage.local.clear();
    }

    function customPopup(text, choice) {
        const outer = document.createElement('div'),
            notifOuter = document.createElement('div'),
            notifInner = document.createElement('div'),
            buttonContainer = document.createElement('div');
        outer.classList.add('fullscreenOverlay');
        notifOuter.classList.add('notifOuter');
        notifInner.textContent = text;

        outer.addEventListener('click', (ev) => {
            if (!ev.target.closest('.notifOuter')) outer.remove();
        });

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
                    console.log(btn.dataset.type)
                    resolve(btn.dataset.type === 'yes');
                    outer.remove();
                }
            });
        });
    }
})();