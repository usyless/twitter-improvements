'use strict';

if (typeof browser === 'undefined') {
    var browser = chrome;
}

(() => {
    document.getElementById('versionDisplay').textContent += chrome?.runtime?.getManifest?.()?.version;

    if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile');
    }

    const panes = document.getElementById('settings-panes');
    const header = document.getElementById('settings-header');

    const options = {
        'Settings': {
            'Link Copying': [
                {
                    name: 'vx_button',
                    category: 'setting',
                    description: 'Show Copy Tweet as VX Button',
                    default: true
                },
                {
                    name: 'url_prefix',
                    category: 'vx_preferences',
                    description: 'URL prefix provider',
                    default: 'fixvx.com',
                    type: 'choice',
                    choices: [{name: 'VXTwitter', type: 'fixvx.com'}, {name: 'FXTwitter', type: 'fixupx.com'}, {name: 'Custom', type: 'x.com'}]
                },
                {
                    name: 'custom_url',
                    category: 'vx_preferences',
                    description: 'Custom copy URL (Set prefix to \'Custom\')',
                    default: '',
                    type: 'text',
                },
            ],
            'Video/GIF Saving': [
                {
                    name: 'video_button',
                    category: 'setting',
                    description: 'Show Video/GIF Download Buttons',
                    default: true
                },
                {
                    name: 'video_download_fallback',
                    category: 'video_preferences',
                    description: 'Fallback to opening video in new cobalt.tools tab if local download fails',
                    default: true,
                }
            ],
            'Image Saving': [
                {
                    name: 'image_button',
                    category: 'setting',
                    description: 'Show Image Download Buttons',
                    default: true
                },
                {
                    name: 'image_button_position',
                    category: 'image_preferences',
                    description: 'Image download button position',
                    type: 'choice',
                    default: '0',
                    choices: [{name: 'Top Left', type: '0'}, {name: 'Top Right', type: '1'}, {name: 'Bottom Left', type: '2'}, {name: 'Bottom right', type: '3'}, {name: 'Inline (Experimental)', type: '4'}]
                },
                {
                    name: 'long_image_button',
                    category: 'image_preferences',
                    description: 'Stretch image download button across width of image (if not inline)',
                    default: false,
                },
                {
                    name: 'download_history_enabled',
                    category: 'image_preferences',
                    description: 'Enable local image download history, right click on a download button to remove from history',
                    default: true
                },
                {
                    name: 'download_history_prevent_download',
                    category: 'image_preferences',
                    description: 'Prevent downloading of previously downloaded items',
                    default: false
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
                        if (confirm('Are you sure you want to clear your image download history?')) {
                            browser.runtime.sendMessage({type: 'download_history_clear'});
                        }
                    }
                },
                {
                    name: 'import_download_history',
                    description: '',
                    type: 'button',
                    button: 'Import download history (Follow format from export)',
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
                                reader.onload = async (r) => {
                                    browser.runtime.sendMessage({
                                        type: 'download_history_add_all', saved_images: r.target.result.split(' ')
                                    }).then(() => alert('Successfully imported!'));
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
                    button: 'Import download history from saved images',
                    onclick: () => {
                        document.getElementById('download_history_files_input').click();
                    },
                    init: () => {
                        const i = document.createElement('input');
                        i.type = 'file';
                        i.id = 'download_history_files_input';
                        i.hidden = true;
                        i.multiple = true;
                        i.accept = 'image/*';
                        i.addEventListener('change', async (e) => {
                            const saved_images = [];
                            let accepted = 0;
                            for (const file of e.target.files) {
                                const n = file.name.split('-');
                                if (n[0].includes('twitter')) try {
                                    saved_images.push(`${n[1].replace(/\D/g, '')}-${n[2].split('.')[0].replace(/\D/g, '')[0]}`);
                                    ++accepted;
                                } catch {}
                            }
                            browser.runtime.sendMessage({
                                type: 'download_history_add_all', saved_images
                            }).then(() => alert(`Successfully imported ${accepted} files!`));
                        });
                        document.body.appendChild(i);
                    }
                },
                {
                    name: 'export_download_history',
                    description: '',
                    type: 'button',
                    button: 'Export downloaded history (Exported as {tweet id}-{image number})',
                    onclick: () => {
                        browser.runtime.sendMessage({type: 'download_history_get_all'}).then((r) => {
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
                    button: 'Get saved image count',
                    onclick: () => {
                        browser.runtime.sendMessage({type: 'download_history_get_all'}).then((r) => {
                            alert(`You have downloaded approximately ${r.length} unique image(s)`);
                        });
                    }
                }
            ],
            'Extras': [
                {
                    name: 'show_hidden',
                    category: 'setting',
                    description: 'Show all hidden media',
                    default: false
                },
                {
                    name: 'reset_all_settings',
                    description: '',
                    type: 'button',
                    button: 'Reset to DEFAULT settings (excluding download history)',
                    class: ['warning'],
                    onclick: () => {
                        if (confirm('Are you sure you want to RESET this extensions settings?')) {
                            clearStorage();
                            window.location.reload();
                        }
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
                    default: false
                },
                {
                    name: 'hide_premium',
                    category: 'style',
                    description: '"Premium" button and additional Premium ads',
                    default: false
                },
                {
                    name: 'hide_post_reply_sections',
                    category: 'style',
                    description: '"Post" and "Reply" sections',
                    default: false
                },
            ],
            'Tweets': [
                {
                    name: 'hide_tweet_view_count',
                    category: 'style',
                    description: 'View counts',
                    default: false
                },
                {
                    name: 'hide_tweet_share_button',
                    category: 'style',
                    description: 'Share button',
                    default: false
                },
                {
                    name: 'hide_replies_button_tweet',
                    category: 'style',
                    description: 'Replies button',
                    default: false
                },
                {
                    name: 'hide_retweet_button_tweet',
                    category: 'style',
                    description: 'Retweet button',
                    default: false
                },
                {
                    name: 'hide_like_button_tweet',
                    category: 'style',
                    description: 'Like button',
                    default: false
                },
                {
                    name: 'hide_bookmark_button_tweet',
                    category: 'style',
                    description: 'Bookmark button',
                    default: false
                }
            ],
            'Left Sidebar': [
                {
                    name: 'hide_notifications',
                    category: 'style',
                    description: '"Notifications" button',
                    default: false
                },
                {
                    name: 'hide_messages',
                    category: 'style',
                    description: '"Messages" button',
                    default: false
                },
                {
                    name: 'hide_jobs',
                    category: 'style',
                    description: '"Jobs" button',
                    default: false
                },
                {
                    name: 'hide_lists',
                    category: 'style',
                    description: '"Lists" button',
                    default: false
                },
                {
                    name: 'hide_communities',
                    category: 'style',
                    description: '"Communities" button',
                    default: false
                },
                {
                    name: 'hide_create_your_space',
                    category: 'style',
                    description: '"Create your space" button',
                    default: false
                },
                {
                    name: 'hide_post_button',
                    category: 'style',
                    description: '"Post" button',
                    default: false
                },
                {
                    name: 'hide_follower_requests',
                    category: 'style',
                    description: '"Follower requests" button',
                    default: false
                },
                                {
                    name: 'hide_verified_orgs',
                    category: 'style',
                    description: '"Verified Orgs" button',
                    default: false
                },
                {
                    name: 'hide_monetization',
                    category: 'style',
                    description: '"Monetization" button',
                    default: false
                },
                {
                    name: 'hide_ads_button',
                    category: 'style',
                    description: '"Ads" button',
                    default: false
                },
            ],
            'Right Sidebar': [
                {
                    name: 'hide_whats_happening',
                    category: 'style',
                    description: "What's Happening tab",
                    default: false
                },
                {
                    name: 'hide_who_to_follow',
                    category: 'style',
                    description: 'Who To Follow tab',
                    default: false
                },
                {
                    name: 'hide_relevant_people',
                    category: 'style',
                    description: 'Relevant people tab',
                    default: false
                },
                {
                    name: 'hide_live_on_x',
                    category: 'style',
                    description: 'Live on X tab',
                    default: false
                },
                {
                    name: 'hide_sidebar_footer',
                    category: 'style',
                    description: 'Additional sidebar urls, under the search bar',
                    default: false
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
                    default: ''
                },
                {
                    type: 'break'
                },
            ],
            'Save file name': [
                {
                    name: 'save_format',
                    category: 'download_preferences',
                    description: 'Remember to include the \'.\' before the extension!',
                    type: 'text',
                    default: '[twitter] {username} - {tweetId} - {tweetNum}.{extension}',
                    class: ['wideText'],
                    post: (elem) => {
                        elem.style.flexDirection = 'column';
                        elem.style.alignItems = 'flex-start';
                        elem.style.rowGap = '10px';

                        const quickPicks = document.createElement('div');
                        quickPicks.classList.add('quickPicks');
                        for (const [item, name] of [['username', 'USERNAME'], ['tweetId', 'TWEET ID'], ['tweetNum', 'IMAGE NUMBER'], ['extension', 'FILE EXTENSION']]) {
                            const btn = document.createElement('button');
                            btn.textContent = name;
                            btn.dataset.item = item;
                            quickPicks.appendChild(btn);
                        }

                        const input = elem.querySelector('input');
                        quickPicks.addEventListener('click', (e) => {
                            const btn = e.target.closest('button');
                            if (btn) {
                                input.value += `{${btn.dataset.item}}`;
                            }
                        });

                        elem.firstElementChild.after(
                            document.createTextNode('Changing this might break image reversing! (Make sure to keep the Tweet ID present)'),
                            document.createElement('br'),
                            document.createTextNode('Quick Picks:'),
                            quickPicks
                        );
                    }
                }
            ]
        },
        'Experimental': {
            'These may not work as intended for now!': [
                {
                    name: 'bookmark_on_photo_page',
                    category: 'setting',
                    description: 'Show bookmark button on the enlarged photo page',
                    default: false
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
            valuesToUpdate.push({obj: e, func: (v) => select.value = v});
            select.addEventListener('change', (ev) => update_value(ev, e, 'value'));
            return outer;
        },
        text: (e) => {
            const [outer, input] = get_generic_setting(e, 'input');
            input.type = "text";
            valuesToUpdate.push({obj: e, func: (v) => input.value = v});
            input.addEventListener('change', (ev) => update_value(ev, e, 'value'));
            return outer;
        },
        button: (e) => {
            const [outer, button] = get_generic_setting(e, 'button');
            button.textContent = e.button;
            button.addEventListener('click', e.onclick);
            return outer;
        },
        checkbox: (e) => {
            const [outer, checkbox] = get_generic_setting(e, 'input', true);
            checkbox.setAttribute('type', 'checkbox');
            valuesToUpdate.push({obj: e, func: (v) => checkbox.checked = v});
            checkbox.addEventListener('change', (ev) => update_value(ev, e, 'checked'));
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

    { // Settings panes scrolling
        panes.scrollLeft = 0;
        header.firstElementChild.classList.add('selected');
        header.addEventListener('click', (e) => {
            const t = e.target.closest('div[data-pane]');
            if (t) window.location.hash = t.dataset.pane;
        });

        let touchStartX = 0;
        window.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        window.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) changePane(true);
            if (touchEndX - touchStartX > 50) changePane(false);
        });
        window.addEventListener('wheel', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                changePane(e.deltaY > 0);
            }
        });
        function changePane(next) {
            const currPane = header.querySelector('.selected');
            const nextPane = next ? currPane.nextElementSibling : currPane.previousElementSibling;
            if (nextPane) window.location.hash = nextPane.dataset.pane;
        }

        const hashchangeHandler = (_, instant) => {
            const hash = decodeURIComponent(window.location.hash.substring(1));
            if (options.hasOwnProperty(hash)) {
                header.querySelector('.selected')?.classList.remove('selected');
                header.querySelector(`div[data-pane="${hash}"]`).classList.add('selected');
                if (instant === true) panes.style.scrollBehavior = 'auto';
                panes.scrollLeft = panes.querySelector(`div[data-pane="${hash}"]`).offsetLeft;
                if (instant === true) panes.style.removeProperty('scroll-behavior');
                setHeight();
            }
        }
        hashchangeHandler(null, true);
        window.addEventListener('hashchange', hashchangeHandler);

        function setHeight() {
            const currPane = panes.querySelector(`div[data-pane="${header.querySelector('.selected').dataset.pane}"]`)
            const top = currPane.getBoundingClientRect().top;
            const bottom = currPane.lastElementChild.getBoundingClientRect().bottom;
            panes.style.height = `${bottom - top + 20}px`;
        }

        const setHeightDelay = ()=>  setTimeout(setHeight, 300);
        setHeight();

        window.addEventListener('resize', setHeightDelay);
    }

    chrome.storage.local.get(valuesToUpdate.map(i => i.obj.category ?? i.obj.name), (s) => {
        for (const {obj, func} of valuesToUpdate) {
            if (obj.category != null) func(s[obj.category]?.[obj.name] ?? obj.default);
            else func(s[obj.name] ?? obj.default);
        }
        valuesToUpdate.length = 0;
    });

    function create(elem) {
        elem.init?.();
        const m = typeMap[elem.type ?? 'checkbox'](elem);
        elem.post?.(m);
        return m;
    }

    function get_generic_setting(e, element, flipOrder) {
        const outer = document.createElement('div'), label = document.createElement('label'), elem = document.createElement(element);
        label.textContent = e.description;
        label.setAttribute('for', e.name);
        elem.id = e.name;
        if (e.class) elem.classList.add(...e.class);
        if (flipOrder) outer.append(elem, label);
        else outer.append(label, elem);
        return [outer, elem];
    }

    function update_value(e, obj, property) {
        chrome.storage.local.get([obj.category ?? obj.name], (r) => {
            if (obj.category != null) {
                if (r[obj.category] == null) r[obj.category] = {};
                r[obj.category][obj.name] = e.target[property];
            } else {
                r[obj.name] = e.target[property];
            }
            setStorage(r);
        });
    }

    function setStorage(data) {
        chrome.storage.local.set(data); // potentially add little saved message with .then
    }

    function clearStorage() {
        chrome.storage.local.clear();
    }
})();