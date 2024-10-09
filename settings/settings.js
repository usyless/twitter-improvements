if (typeof browser === "undefined") {
    var browser = chrome;
}

const DIV = document.getElementById("settings");

const options = {
    General: [
        {
            name: "vx_button",
            description: "Enable Share as VX Button",
            default: true
        },
        {
            name: "url_prefix",
            description: "Set url prefix provider",
            default: 'vx',
            type: 'choice',
            choices: [{name: 'VXTwitter (fixvx/vxtwitter)', type: 'vx'}, {name: 'FXTwitter (fixupx/fxtwitter)', type: 'fx'}]
        },
        {
            name: "video_button",
            description: "Enable Video/GIF Download Buttons (Doesn't work on mobile)",
            default: !/Android/i.test(navigator.userAgent)
        },
        {
            name: "image_button",
            description: "Show Image Download Buttons (Doesn't work on mobile)",
            default: !/Android/i.test(navigator.userAgent)
        },
        {
            name: "show_hidden",
            description: "Automatically show all hidden media",
            default: false
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
    Advanced: [
        {
            name: "cobalt_url",
            description: "Set the cobalt api provider (default: https://api.cobalt.tools/api/json)",
            default: 'https://api.cobalt.tools/api/json',
            type: 'text',
        },
    ]
}

for (const section in options) {
    const outer = document.createElement("div"), h = document.createElement("h2");
    h.innerText = section + ":";
    outer.appendChild(h);
    for (const inner in options[section]) outer.appendChild(create(options[section][inner]));
    DIV.appendChild(outer);
}

function create(elem) {
    if (elem.type == null) return create_button(elem);
    else if (elem.type === 'choice') return create_choice(elem);
    else if (elem.type === 'text') return create_text(elem);
}

function create_button(e) {
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

async function get_value(value, def) {
    let enabled = (await browser.storage.local.get([value]))[value];
    if (enabled == null) enabled = def;
    return enabled;
}

function toggle_value(e) {
    const data = {};
    data[e.target.id] = e.target.checked;
    chrome.storage.local.set(data);
}

function update_value(e) {
    const data = {};
    data[e.target.id] = e.target.value;
    chrome.storage.local.set(data);
}