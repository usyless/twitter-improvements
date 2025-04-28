(() =>  {
    const getBestQuality = (variants) => variants.filter(v => v?.content_type === "video/mp4").reduce((x, y) => +x?.bitrate > +y?.bitrate ? x : y).url;
    const postMedia = (media) => {
        window.postMessage({
            source: "ift",
            type: "media-urls",
            media
        }, "https://x.com");
    }

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;

        this.addEventListener("readystatechange",  () => {
            if (xhr.readyState === 4) {
                const responseURL = xhr.responseURL;
                if (xhr.status === 200) {
                    if (responseURL.includes('TweetDetail')) {
                        // maximised tweet
                        let media = mediaFromInstructions(JSON.parse(xhr.responseText)?.data
                            ?.threaded_conversation_with_injections_v2?.instructions);
                        if (media.length > 0) postMedia(media);
                    } else if (responseURL.includes('HomeTimeline')) {
                        // tweets at home
                        let media = mediaFromInstructions(JSON.parse(xhr.responseText)?.data?.home?.home_timeline_urt
                            ?.instructions);
                        if (media.length > 0) postMedia(media);
                    }
                }
            }
        });
        return originalSend.call(this, body);
    };

    function mediaFromInstructions(instructions) {
        return instructions
            ?.find?.(a => a?.type === "TimelineAddEntries")?.entries
            ?.filter(a => a?.entryId?.startsWith('tweet-'))?.map(getMediaInfo)
            ?.filter(a => a != null);
    }

    function getMediaInfo(tweet) {
        tweet = tweet?.content?.itemContent?.tweet_results?.result;
        tweet = tweet?.tweet ?? tweet;
        if (tweet) {
            const id = tweet.rest_id;
            tweet = tweet.legacy?.entities?.media;
            if (id && tweet) {
                // has media
                const mediaInfo = [];
                for (let i = 1; i <= tweet.length; ++i) {
                    const media = tweet[i], info = {id: `${id}-${i}`};
                    switch (media.type) {
                        case 'photo': {
                            const lastDot = media.media_url_https?.lastIndexOf('.');
                            info.url = `${media.media_url_https?.substring(0, lastDot)}?format=${media.media_url_https?.substring(lastDot + 1)}&name=orig`;
                            break;
                        }
                        case 'video': case 'animated_gif': {
                            info.url = getBestQuality(media.video_info?.variants);
                            break;
                        }
                    }
                    mediaInfo.push(info);
                }
                return mediaInfo;
            }
        }
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
                if (id) results[id] = +results[id]?.bitrate > variant?.bitrate ? results[id] : variant;
            }
            for (const key in data) findVideos(data[key], results);
        }
        return results;
    }
})();
