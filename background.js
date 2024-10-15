const requestMap = {
    image: saveImage,
    video: download_cobalt
}

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    const f = requestMap[request.type];
    if (f) f(request, sendResponse);
    return true;
});

chrome.contextMenus.create(
    {
        id: "save-image",
        title: "Save Image",
        contexts: ["image", "link"],
        documentUrlPatterns: ['https://x.com/*'],
        targetUrlPatterns: ['https://pbs.twimg.com/*']
    }
);

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "save-image") saveImage({url: getCorrespondingUrl(info), sourceURL: info.srcUrl});
});

function getCorrespondingUrl(info) {
    if (info.linkUrl == null) return info.pageUrl;
    else return info.linkUrl;
}

function download(url, name) {
    chrome.downloads.download({url: url, filename: name});
}

function sendToTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
}

function saveImage(request) {
    let filename = getFileName(request.url);
    download(request.sourceURL.replace(/name=[^&]*/, "name=orig"), filename + "." + getImageFileType(request.sourceURL));
    filename = filename.split("-");
    sendToTab({store: `${filename[1].trim()}-${filename[2].trim()}`});
}

function getFileName(url) { // [twitter] <Username> - <Tweet ID> - <Number>
    url = url.split("/");
    let id = url[7];
    if (id == null) id = '';
    return "[twitter] " + url[3] + " - " + url[5] + " - " + id;
}

function getImageFileType(sourceURL) {
    return sourceURL.match(/format=(\w+)/)[1];
}

function getVideoFileType(url) {
    if (url.includes(".mp4")) return ".mp4";
    else return ".gif";
}

async function download_cobalt(request, sendResponse, count=0) {
    const data = {
        videoQuality: "max",
        filenameStyle: "nerdy",
        twitterGif: true,
        url: request.url
    }, requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
    };
    if (request.cobalt_api_key?.length > 0) requestOptions.headers['Authorization'] = `Api-Key ${request.cobalt_api_key}`;
    const filename = getFileName(request.url);
    try {
        const response = await fetch(request.cobalt_url, requestOptions);
        if (response.status === 200) {
            const json = await response.json();
            let picker = json.picker;
            if (!picker) picker = [{url: json.url}];
            let id = 1;
            for (const d of picker) {
                download(d.url, filename + id + getVideoFileType(d.url));
                ++id;
            }
            sendResponse({status: 'success'});
            return;
        } else {
            if (count < 5) setTimeout(() => download_cobalt(request, sendResponse, ++count), 100);
        }
    } catch {}
    if (count >= 5) {
        sendResponse({status: 'newpage', copy: filename});
        chrome.tabs.create({
            url: `https://cobalt.tools/#${request.url}`
        });
    }
}
