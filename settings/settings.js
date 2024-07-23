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
            name: "video_button",
            description: "Enable Video/GIF Download Buttons",
            default: true
        },
        {
            name: "image_button",
            description: "Show Image Download Buttons",
            default: true
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
            name: "hide_whats_happening",
            description: "Hide the Whats Happening tab (imperfect)",
            default: false
        },
        {
            name: "hide_who_to_follow",
            description: "Hide the Who To Follow tab (imperfect)",
            default: false
        },
    ]
}

for (const section in options) {
    const outer = document.createElement("div"), h = document.createElement("h2");
    h.innerText = section + ":";
    outer.appendChild(h);
    for (const inner in options[section]) create_button(options[section][inner]).then(node => outer.appendChild(node));
    DIV.appendChild(outer);
}

async function create_button(button) {
    const outer = document.createElement("div"),
        label = document.createElement("label"),
        checkbox = document.createElement("input");
    label.innerText = button.description;
    label.setAttribute("for", button.name);
    checkbox.setAttribute("type", "checkbox");
    checkbox.id = button.name;
    checkbox.checked = await get_value(button.name, button.default);
    outer.append(label, checkbox);
    checkbox.addEventListener('change', toggle_value)
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