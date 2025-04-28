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
                        mediaFromInstructions(JSON.parse(xhr.responseText)?.data
                            ?.threaded_conversation_with_injections_v2?.instructions);
                    } else if (responseURL.includes('HomeTimeline')) {
                        // tweets at home
                        mediaFromInstructions(JSON.parse(xhr.responseText)?.data?.home?.home_timeline_urt?.instructions);
                    }
                }
            }
        });
        return originalSend.call(this, body);
    };

    function mediaFromInstructions(instructions) {
        const media = instructions?.find?.(a => a?.type === "TimelineAddEntries")?.entries
            ?.filter(a => a?.entryId?.startsWith('tweet-'))?.map(getMediaInfo)?.filter(a => a != null);
        if (media.length > 0) postMedia(media);
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
                for (let index = 1; index <= tweet.length; ++index) {
                    const media = tweet[index], info = {index};
                    switch (media.type) {
                        case 'photo': {
                            const lastDot = media.media_url_https?.lastIndexOf('.');
                            info.url = `${media.media_url_https?.substring(0, lastDot)}?format=${media.media_url_https?.substring(lastDot + 1)}&name=orig`;
                            info.type = 'photo';
                            break;
                        }
                        case 'video': case 'animated_gif': {
                            info.url = getBestQuality(media.video_info?.variants);
                            info.type = 'video';
                            break;
                        }
                    }
                    mediaInfo.push(info);
                }
                return { id, media: mediaInfo };
            }
        }
    }
})();
