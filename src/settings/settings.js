document.getElementById('versionDisplay').textContent += chrome?.runtime?.getManifest?.()?.version;

const DIV = document.getElementById('settings');

const options = {
    'Link Copying': [
        {
            name: 'vx_button',
            category: 'setting',
            description: 'Enable Share as VX Button',
            default: true
        },
        {
            name: 'url_prefix',
            category: 'preferences',
            description: 'Set url prefix provider',
            default: 'fixvx.com',
            type: 'choice',
            choices: [{name: 'VXTwitter', type: 'fixvx.com'}, {name: 'FXTwitter', type: 'fixupx.com'}, {name: 'Custom', type: 'x.com'}]
        },
        {
            name: 'custom_url',
            category: 'preferences',
            description: 'Custom copy link host (Set prefix to \'Custom\')',
            default: '',
            type: 'text',
        },
    ],
    'Video/GIF Saving': [
        {
            name: 'video_button',
            category: 'setting',
            description: 'Enable Video/GIF Download Buttons',
            default: true
        },
        {
            name: 'video_download_fallback',
            category: 'preferences',
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
            name: 'long_image_button',
            category: 'preferences',
            description: 'Stretch image download button across width of image',
            default: false,
        },
        {
            name: 'download_history_enabled',
            category: 'preferences',
            description: 'Store image download history (local), right click on a download button to remove from history',
            default: true
        },
        {
            name: 'download_history_prevent_download',
            category: 'preferences',
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
                if (confirm('Are you sure you want to clear your image download history?')) setStorage({download_history: {}});
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
            init: function () {
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
                            const items = r.target.result.split(' '), result = {};
                            for (const i of items) result[i] = true;
                            setStorage({download_history: {...(await get_value(this)), ...result}});
                            alert('Successfully imported!');
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
            button: 'Import download history from files',
            onclick: () => {
                document.getElementById('download_history_files_input').click();
            },
            init: function() {
                const i = document.createElement('input');
                i.type = 'file';
                i.id = 'download_history_files_input';
                i.hidden = true;
                i.multiple = true;
                i.accept = 'image/*';
                i.addEventListener('change', async (e) => {
                    const result = {};
                    let accepted = 0;
                    for (const file of e.target.files) {
                        const n = file.name.split('-');
                        if (n[0].includes('twitter')) try {result[`${n[1].replace(/\D/g, '')}-${n[2].split('.')[0].replace(/\D/g, '')[0]}`] = true;++accepted;} catch {}
                    }
                    setStorage({download_history: {...(await get_value(this)), ...result}});
                    alert(`Successfully imported ${accepted} files!`);
                });
                document.body.appendChild(i);
            }
        },
        {
            name: 'export_download_history',
            description: '',
            type: 'button',
            button: 'Export downloaded history (Exported as {tweet id}-{image number})',
            onclick: async function() {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(new Blob([Object.keys(await get_value(this)).join(' ')], { type: 'text/plain' }));
                link.download = 'export.twitterimprovements';
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }
    ],
    'Hide Elements': [
        {
            name: 'hide_grok',
            category: 'style',
            description: 'Everything "Grok"',
            default: false
        },
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
            name: 'hide_premium',
            category: 'style',
            description: '"Premium" button and additional Premium ads',
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
        {
            type: 'break'
        },
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
            name: 'hide_post_reply_sections',
            category: 'style',
            description: '"Post" and "Reply" sections',
            default: false
        },
        {
            name: 'hide_sidebar_footer',
            category: 'style',
            description: 'Additional sidebar urls, under the search bar',
            default: false
        }
    ],
    "Extras": [
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
            button: 'Reset to DEFAULT settings',
            class: ['warning'],
            onclick: () => {
                if (confirm('Are you sure you want to RESET this extensions settings?')) {
                    clearStorage();
                    window.location.reload();
                }
            }
        }
    ]
}
const typeMap = {
    choice: (e) => {
        const [outer, select] = get_generic_setting(e, 'select');
        for (const opt of e.choices) {
            const o = document.createElement('option');
            o.setAttribute('value', opt.type);
            o.textContent = opt.name;
            select.appendChild(o);
        }
        get_value(e).then(v => select.value = v);
        select.addEventListener('change', (ev) => update_value(ev, e, 'value'));
        return outer;
    },
    text: (e) => {
        const [outer, input] = get_generic_setting(e, 'input');
        input.type = "text";
        get_value(e).then(v => input.value = v);
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
        get_value(e).then(v => checkbox.checked = v);
        checkbox.addEventListener('change', (ev) => update_value(ev, e, 'checked'));
        return outer;
    },
    break: () => document.createElement('br')
}

for (const section in options) {
    const outer = document.createElement('div'), h = document.createElement('h3');
    h.textContent = section;
    outer.appendChild(h);
    for (const inner in options[section]) outer.appendChild(create(options[section][inner]));
    DIV.appendChild(outer);
}

function create(elem) {
    elem.init?.();
    return typeMap[elem.type ?? 'checkbox'](elem);
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

function get_value(obj) {
    return new Promise((resolve) => {
        if (obj.category != null) chrome.storage.local.get([obj.category], (r) => resolve(r[obj.category]?.[obj.name] ?? obj.default));
        else chrome.storage.local.get([obj.name], (r) => resolve(r[obj.name] ?? obj.default));
    });
}

function update_value(e, obj, property) {
    if (obj.category != null) chrome.storage.local.get([obj.category], (r) => {
        if (r[obj.category] == null) r[obj.category] = {};
        r[obj.category][obj.name] = e.target[property];
        setStorage(r);
    });
    else chrome.storage.local.get([obj.name], (r) => {
        r[obj.name] = e.target[property];
        setStorage(r);
    });
}

function setStorage(data) {
    chrome.storage.local.set(data);
}

function clearStorage() {
    chrome.storage.local.clear();
}