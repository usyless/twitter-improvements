if (typeof browser === "undefined") {
    var browser = chrome;
}

const DIV = document.getElementById("settings");

const main = [
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
]

const options = {
    General: main
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