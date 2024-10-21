const requestMap = {
    image: saveImage,
    video: download_video,
    videoChoice: download_video_from_choices
}

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
    requestMap[request.type]?.(request, sendResponse);
    return true;
});

chrome?.runtime?.onInstalled?.addListener?.((details) => {
    if (details.reason === 'install') chrome.tabs.create({url: chrome.runtime.getURL('/settings/settings.html')});
});

chrome?.contextMenus?.create?.(
    {
        id: "save-image",
        title: "Save Image",
        contexts: ["image", "link"],
        documentUrlPatterns: ['https://x.com/*'],
        targetUrlPatterns: ['https://pbs.twimg.com/*']
    }
);

chrome?.contextMenus?.onClicked?.addListener?.((info) => {
    if (info.menuItemId === "save-image") saveImage({url: info.linkUrl ?? info.pageUrl, sourceURL: info.srcUrl});
});

function download(url, filename) {
    try {
        chrome.downloads.download({url, filename});
    } catch {
        sendToTab({type: 'download', url, filename});
    }
}

function sendToTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
}

function saveImage(request, sendResponse) {
    let filename = getFileName(request.url);
    download(request.sourceURL.replace(/name=[^&]*/, "name=orig"), filename + "." + getImageFileType(request.sourceURL));
    filename = filename.split("-");
    sendToTab({type: 'imageStore', store: `${filename[1].trim()}-${filename[2].trim()}`});
    sendResponse?.({status: "success"});
}

function getFileName(url) { // [twitter] <Username> - <Tweet ID> - <Number>
    url = url.split("/");
    return `[twitter] ${url[3]} - ${url[5]} - ${url[7] ?? ''}`; // id blank if not present
}

function getImageFileType(sourceURL) {
    return sourceURL.match(/format=(\w+)/)[1];
}

function getVideoFileType(url) {
    return url.includes(".mp4") ? ".mp4" : ".gif";
}

chrome.webRequest.onSendHeaders.addListener((details) => {
    const url = new URL(decodeURIComponent(details.url));
    const authorization = details.requestHeaders?.find?.(a => a.name === 'authorization');
    if (authorization?.value?.length > 0) {
        sendToTab({
            type: 'downloadDetails',
            detailsURL: `${url.origin}${url.pathname}`,
            authorization: authorization.value
        });
    }
}, { urls: ["https://x.com/i/api/graphql/*/TweetDetail*"] }, ["requestHeaders"]);


const getBestQuality = (variants) => variants.filter(v => v?.content_type === "video/mp4").reduce((x, y) => Number(x?.bitrate) > Number(y?.bitrate) ? x : y).url;
const defaultHeaders = {'x-twitter-client-language': 'en', 'x-twitter-active-user': 'yes', 'accept-language': 'en', 'content-type': 'application/json', 'X-Twitter-Auth-Type': 'OAuth2Session'};
const variables = {"with_rux_injections":false,"rankingMode":"Relevance","includePromotedContent":true,"withCommunity":true,"withQuickPromoteEligibilityTweetFields":true,"withBirdwatchNotes":true,"withVoice":true};
const fieldToggles = '{"withArticleRichContentState":true,"withArticlePlainText":false,"withGrokAnalyze":false,"withDisallowedReplyControls":false}';
const features = '{"rweb_tipjar_consumption_enabled":true,"responsive_web_graphql_exclude_directive_enabled":true,"verified_phone_label_enabled":false,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"articles_preview_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"creator_subscriptions_quote_tweet_preview_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"rweb_video_timestamps_enabled":true,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"responsive_web_enhance_cards_enabled":false}';
async function download_video(request, sendResponse) {
    const filename = getFileName(request.url), id = request.url.split("/").slice(-1)[0];
    try {
        const tweetDetailsURL = new URL(request.detailsURL);
        tweetDetailsURL.searchParams.set('variables', JSON.stringify({...variables, "focalTweetId": id}));
        tweetDetailsURL.searchParams.set('features', features);
        tweetDetailsURL.searchParams.set('fieldToggles', fieldToggles);
        const headers = {'user-agent': navigator.userAgent, 'x-csrf-token': request.cookie, 'authorization': request.authorization, ...defaultHeaders}; // Cookie sent by browser so no need to set myself
        const json = await (await fetch(tweetDetailsURL, { headers })).json();
        let urls = json?.data?.threaded_conversation_with_injections_v2?.instructions
            ?.find?.(a => a?.type === "TimelineAddEntries")?.entries?.find?.(a => a?.entryId?.includes?.(id))?.content
            ?.itemContent?.tweet_results?.result;
        urls = urls?.tweet ?? urls;
        urls = urls?.legacy?.entities?.media?.filter?.(m => ["video", "animated_gif"].includes?.(m?.type))
            ?.map?.(m => getBestQuality(m?.video_info?.variants));
        const download = () => {
            if (urls.length === 1) {
                downloadVideos(urls, filename);
                sendResponse({status: 'success'});
            } else sendResponse({status: 'choice', choices: {filename: filename, urls: urls}});
        }
        if (urls?.length > 0) download();
        else {
            console.log("Attempting to brute force video download");
            urls = []
            for (const tweet of findAllPotentialTweetsById(json, id)) {
                const videos = findVideos(tweet);
                for (const key in videos) urls.push(videos[key].url);
                if (urls.length > 0) {
                    download();
                    break;
                }
            }
            if (urls.length <= 0) throw new Error("failed to download");
        }
    } catch (error) {
        console.error(error);
        if (request.video_download_fallback) {
            sendResponse({status: 'newpage', copy: filename});
            chrome.tabs.create({url: `https://cobalt.tools/#${request.url}`});
        } else sendResponse({status: 'error'});
    }
}

function download_video_from_choices(request, sendResponse) {
    const choices = request.choices;
    if (request.choice != null) downloadVideos([choices.urls[request.choice]], choices.filename, request.choice + 1);
    else downloadVideos(choices.urls, choices.filename);
    sendResponse({status: 'success'});
}

function downloadVideos(urls, filename, id_override) {
    urls.forEach((url, i) => download(url, `${filename}${id_override ?? i + 1}${getVideoFileType(url)}`));
}

function findAllPotentialTweetsById(data, id, results=[]) {
    if (Array.isArray(data)) for (const item of data) findAllPotentialTweetsById(item, id, results);
    else if (typeof data === 'object' && data != null) {
        for (const val of Object.values(data)) {
            if (val.includes?.(id)) {
                results.push(data);
                break;
            }
        }
        for (const key in data) findAllPotentialTweetsById(data[key], id, results);
    }
    return results;
}

function findVideos(data, results = {}) {
    if (Array.isArray(data)) for (const item of data) findVideos(item, results);
    else if (typeof data === 'object' && data != null) {
        if (Array.isArray(data.variants)) for (const variant of data.variants) if (variant.bitrate && variant.url && variant.content_type === "video/mp4") {
            const id = variant.url.match(/ext_tw_video\/(\d+)\//)?.[1];
            if (id) results[id] = Number(results[id]?.bitrate) > variant?.bitrate ? results[id] : variant;
        }
        for (const key in data) findVideos(data[key], results);
    }
    return results;
}
