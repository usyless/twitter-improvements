'use strict';

if (typeof browser === 'undefined') {
    var browser = chrome;
}

(() => {
    document.getElementById('versionDisplay').textContent += chrome?.runtime?.getManifest?.()?.version;

    if (/Mobi|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile');
    }

    let defaults;

    const valueLoadedEvent = new CustomEvent('valueLoaded');
    const changeEvent = new Event('change');

    const settingsElem = document.getElementById('settings').cloneNode(true);
    const panes = settingsElem.querySelector('#settings-panes');
    const header = settingsElem.querySelector('#settings-header');

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
                    description: 'Fallback to opening video in new cobalt.tools tab if local download fails',
                }
            ],
            'Image Saving': [
                {
                    name: 'image_button',
                    category: 'setting',
                    description: 'Show Image Download Buttons',
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
                    validate: (value) => value > 0
                },
                {
                    name: 'image_button_height_value',
                    category: 'image_preferences',
                    description: 'Image download button height (1 for default)',
                    type: 'number',
                    validate: (value) => value > 0 && value <= 100,
                    post: (elem) => {
                        elem.appendChild(document.createTextNode('% (of Image height)'))
                    }
                },
                {
                    name: 'image_button_width_value',
                    category: 'image_preferences',
                    description: 'Image download button width (1 for default)',
                    type: 'number',
                    validate: (value) => value > 0 && value <= 100,
                    post: (elem) => {
                        elem.appendChild(document.createTextNode('% (of Image width)'))
                    }
                },
                {
                    name: 'download_history_enabled',
                    category: 'image_preferences',
                    description: 'Enable local image download history, right click on a download button to remove from history',
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
                    name: 'bookmark_on_photo_page',
                    category: 'setting',
                    description: 'Show bookmark button on the enlarged photo page',
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

                        elem.firstElementChild.after(document.createTextNode('Quick Picks:'));
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
                        }, {once: true});

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
        number: (e) => {
            const [outer, input] = get_generic_setting(e, 'input');
            input.type = 'number';
            valuesToUpdate.push({obj: e, func: (v) => input.value = v});
            input.addEventListener('input', (ev) => {
                if (e.validate(input.value)) update_value(ev, e, 'value');
                else input.value = defaults[e.category][e.name];
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

    Promise.all([
        browser.runtime.sendMessage({type: 'get_default_settings'}),
        browser.storage.local.get(valuesToUpdate.map(i => i.obj.category))
    ]).then(([d, storage]) => {
        defaults = d;
        for (const {obj, func} of valuesToUpdate) {
            func(storage[obj.category]?.[obj.name] ?? defaults[obj.category][obj.name]);
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

        let touchStartX = 0;
        let disableTouch = false;
        window.addEventListener('touchstart', (e) => {
            if (e.target.closest('button') || e.target.closest('input[type="text"]')) {
                e.preventDefault();
                disableTouch = true;
            } else {
                touchStartX = e.changedTouches[0].screenX;
            }
        });
        window.addEventListener('touchmove', (e) => {
            if (disableTouch) e.preventDefault();
        });
        window.addEventListener('touchend', (e) => {
            if (disableTouch) {
                e.preventDefault();
                disableTouch = false;
            } else {
                const touchEndX = e.changedTouches[0].screenX;
                if (Math.abs(touchStartX - touchEndX) > 50) changePane(touchStartX - touchEndX > 50);
                else scrollToLastPane();
            }
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
                lastPane = hash;
                header.querySelector('.selected')?.classList.remove('selected');
                header.querySelector(`div[data-pane="${hash}"]`).classList.add('selected');
                if (instant === true) panes.style.scrollBehavior = 'auto';
                scrollToLastPane();
                if (instant === true) panes.style.removeProperty('scroll-behavior');
                setHeight();
            }
        }
        hashchangeHandler(null, true);
        window.addEventListener('hashchange', hashchangeHandler);

        function scrollToLastPane() {
            const p = panes.querySelector(`div[data-pane="${lastPane}"]`)
            if (p) panes.scrollLeft = p.offsetLeft;
        }

        function setHeight() {
            const currPane = panes.querySelector(`div[data-pane="${header.querySelector('.selected').dataset.pane}"]`)
            panes.style.height = `${currPane.lastElementChild.getBoundingClientRect().bottom - currPane.getBoundingClientRect().top + 20}px`;
        }

        const setHeightDelay = ()=>  setTimeout(setHeight, 300);
        const scrollLastPaneDelay = () => setTimeout(scrollToLastPane, 300);
        setHeight();
        setHeightDelay(); // Fix initial install height

        window.addEventListener('resize', scrollLastPaneDelay);
        window.addEventListener('resize', setHeightDelay);
    }

    function create(elem) {
        elem.init?.();
        const m = typeMap[elem.type ?? 'checkbox'](elem);
        elem.element = m;
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
        chrome.storage.local.get([obj.category], (r) => {
            if (r[obj.category] == null) r[obj.category] = {};
            r[obj.category][obj.name] = e.target[property];
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