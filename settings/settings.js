if (typeof browser === "undefined") {
    var browser = chrome;
}

const DIV = document.getElementById("settings");

const options = {
    "Link Copying": [
        {
            name: "vx_button",
            description: "Enable Share as VX Button",
            default: true
        },
        {
            name: "url_prefix",
            description: "Set url prefix provider",
            default: 'fixvx.com',
            type: 'choice',
            choices: [{name: 'VXTwitter (fixvx/vxtwitter)', type: 'fixvx.com'}, {name: 'FXTwitter (fixupx/fxtwitter)', type: 'fixupx.com'}, {name: 'Custom (Enter in advanced)', type: 'x.com'}]
        },
        {
            name: "custom_url",
            description: "Set custom copy link url (make sure to set prefix to 'Custom' above) format as: fixupx.com for fxtwitter manually",
            default: '',
            type: 'text',
        },
    ],
    "Video/GIF Saving": [
        {
            name: "video_button",
            description: "Enable Video/GIF Download Buttons (Doesn't work on mobile)",
            default: !/Android/i.test(navigator.userAgent)
        },
        {
            type: 'break',
        },
        {
            name: "cobalt_url",
            description: "Set the cobalt api provider, must be cobalt 10 (default: https://api.cobalt.tools/api/json)",
            default: 'https://api.cobalt.tools/api/json',
            type: 'text',
        },
        {
            name: "cobalt_api_key",
            description: "Set the Api-Key authorization for cobalt (blank for none)",
            default: '',
            type: 'text',
        },
    ],
    "Image Saving": [
        {
            name: "image_button",
            description: "Show Image Download Buttons (Doesn't work on mobile)",
            default: !/Android/i.test(navigator.userAgent)
        },
        {
            name: "download_history_enabled",
            description: "Store image download history (local), right click on a download button to remove from history",
            default: true
        },
        {
            name: "download_history_prevent_download",
            description: "Prevent downloading of previously downloaded items",
            default: false
        },
        {
            type: 'break',
        },
        {
            name: "clear_download_history",
            description: "Clear downloaded image history",
            type: 'button',
            button: 'Clear History',
            onclick: () => {
                if (confirm("Are you sure you want to clear your image download history?")) setStorage({download_history: {}});
            }
        },
        {
            name: "import_download_history",
            description: "Import downloaded image history (formatted as {tweet id}-{image number} deliminated by spaces, without curly brackets)",
            type: 'button',
            button: 'Import History',
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
                            const items = r.target.result.split(' '), result = {};
                            for (const i of items) result[i] = true;
                            setStorage({download_history: {...(await get_value('download_history', {}, true)), ...result}});
                            alert("Successfully imported!");
                        };
                        reader.readAsText(file);
                });
                document.body.appendChild(i);
            }
        },
        {
            name: "import_download_history_from_files",
            description: "Import download history from files",
            type: 'button',
            button: 'Import History From Files',
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
                    const result = {};
                    let accepted = 0;
                    for (const file of e.target.files) {
                        const n = file.name.split('-');
                        if (n[0].includes('twitter')) try {result[`${n[1].replace(/\D/g, '')}-${n[2].split('.')[0].replace(/\D/g, '')[0]}`] = true;++accepted;} catch {}
                    }
                    setStorage({download_history: {...(await get_value('download_history', {}, true)), ...result}});
                    alert(`Successfully imported ${accepted} files!`);
                });
                document.body.appendChild(i);
            }
        },
        {
            name: "export_download_history",
            description: "Export downloaded image history",
            type: 'button',
            button: 'Export History',
            onclick: async () => {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(new Blob([Object.keys(await get_value('download_history', {}, true)).join(" ")], { type: "text/plain" }));
                link.download = 'export.twitterimprovements';
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }
    ],
    "Hide Sections": [
        {
            name: "hide_notifications",
            description: "Hide Notifications button",
            default: false
        },
        {
            name: "hide_messages",
            description: "Hide Messages button",
            default: false
        },
        {
            name: "hide_grok",
            description: "Hide Grok button",
            default: false
        },
        {
            name: "hide_jobs",
            description: "Hide Jobs button",
            default: false
        },
        {
            name: "hide_lists",
            description: "Hide Lists button",
            default: false
        },
        {
            name: "hide_communities",
            description: "Hide Communities button",
            default: false
        },
        {
            name: "hide_premium",
            description: "Hide Premium button and additional Premium ads",
            default: false
        },
        {
            name: "hide_verified_orgs",
            description: "Hide Verified Orgs button",
            default: false
        },
        {
            name: "hide_monetization",
            description: "Hide Monetization button",
            default: false
        },
        {
            name: "hide_ads_button",
            description: "Hide Ads button",
            default: false
        },
        {
            name: "hide_whats_happening",
            description: "Hide the Whats Happening tab (imperfect)",
            default: false
        },
        {
            name: "hide_who_to_follow",
            description: "Hide the Who To Follow tab (imperfect)",
            default: false
        },
    ],
    "Extras": [
        {
            name: "show_hidden",
            description: "Automatically show all hidden media",
            default: false
        },
    ]
}
const typeMap = {
    choice: create_choice,
    text: create_text,
    button: create_button,
    break: create_break,
}
let values;
for (const section in options) {
    const outer = document.createElement("div"), h = document.createElement("h2");
    h.innerText = section + ":";
    outer.appendChild(h);
    for (const inner in options[section]) outer.appendChild(create(options[section][inner]));
    DIV.appendChild(outer);
}

function create(elem) {
    elem.init?.();
    return typeMap[elem.type]?.(elem) ?? create_checkbox(elem);
}

function create_checkbox(e) {
    const outer = document.createElement("div"),
        label = document.createElement("label"),
        checkbox = document.createElement("input");
    label.textContent = e.description;
    label.setAttribute("for", e.name);
    checkbox.setAttribute("type", "checkbox");
    checkbox.id = e.name;
    get_value(e.name, e.default).then(v => checkbox.checked = v);
    outer.append(label, checkbox);
    checkbox.addEventListener('change', toggle_value)
    return outer;
}

function create_choice(e) {
    const outer = document.createElement("div"),
        label = document.createElement("label"),
        select = document.createElement("select");
    label.textContent = e.description;
    label.setAttribute("for", e.name);
    select.id = e.name;
    for (const opt of e.choices) {
        const o = document.createElement('option');
        o.setAttribute("value", opt.type);
        o.textContent = opt.name;
        select.appendChild(o);
    }
    get_value(e.name, e.default).then(v => select.value = v);
    outer.append(label, select);
    select.addEventListener('change', update_value);
    return outer;
}

function create_text(e) {
    const outer = document.createElement("div"),
        label = document.createElement("label"),
        input = document.createElement("input");
    label.textContent = e.description;
    label.setAttribute("for", e.name);
    input.id = e.name;
    get_value(e.name, e.default).then(v => input.value = v);
    outer.append(label, input);
    input.addEventListener('change', update_value);
    return outer;
}

function create_button(e) {
    const outer = document.createElement("div"),
        label = document.createElement("label"),
        button = document.createElement("button");
    label.textContent = e.description;
    label.setAttribute("for", e.name);
    button.id = e.name;
    outer.append(label, button);
    button.textContent = e.button;
    button.addEventListener('click', e.onclick);
    return outer;
}

function create_break(e) {
    return document.createElement("br");
}

async function get_value(value, def, refresh=false) {
    if (!values || refresh) values = await browser.storage.local.get();
    return values[value] ?? def;
}

function toggle_value(e) {
    const data = {};
    data[e.target.id] = e.target.checked;
    setStorage(data);
}

function update_value(e) {
    const data = {};
    data[e.target.id] = e.target.value;
    setStorage(data);
}

function setStorage(data) {
    chrome.storage.local.set(data)
}