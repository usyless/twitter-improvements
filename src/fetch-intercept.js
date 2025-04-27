(() =>  {
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;

        this.addEventListener("readystatechange",  () => {
            if (xhr.readyState === 4) {
                const responseURL = xhr.responseURL;
                if (responseURL.includes('TweetDetail') && xhr.status === 200) {
                    const json = JSON.parse(xhr.responseText),
                        id = JSON.parse(new URL(decodeURIComponent(responseURL)).searchParams.get('variables')).focalTweetId;

                    // use this for more than videos later on, fix scroll on the fullscreen images

                    let urls = json?.data?.threaded_conversation_with_injections_v2?.instructions
                        ?.find?.(a => a?.type === "TimelineAddEntries")?.entries?.find?.(a => a?.entryId?.includes?.(id))?.content
                        ?.itemContent?.tweet_results?.result;
                    urls = urls?.tweet ?? urls;
                    urls = urls?.legacy?.entities?.media?.filter?.(m => ["video", "animated_gif"].includes?.(m?.type))
                        ?.map?.(m => getBestQuality(m?.video_info?.variants));

                    if (urls?.length === 0) {
                        console.log("Attempting to brute force video download");
                        urls = []
                        for (const tweet of findAllPotentialTweetsById(json, id)) {
                            const videos = findVideos(tweet);
                            for (const key in videos) urls.push(videos[key].url);
                        }
                    }

                    if (urls?.length > 0) {
                        // we have the videos in the tweet
                        window.postMessage({
                            source: "ift",
                            type: "media-urls",
                            id,
                            urls
                        }, "https://x.com");
                    }
                }
            }
        });
        return originalSend.call(this, body);
    };
    const getBestQuality = (variants) => variants.filter(v => v?.content_type === "video/mp4").reduce((x, y) => +x?.bitrate > +y?.bitrate ? x : y).url;


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
