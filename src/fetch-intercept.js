(() =>  {
    const URLs = ['TweetDetail', 'HomeTimeline', 'UserTweets'];

    const getBestQuality = (variants) => variants.filter(v => v?.content_type === "video/mp4").reduce((x, y) => +x?.bitrate > +y?.bitrate ? x : y).url;
    /** @param {MediaTransfer[]} media */
    const postMedia = (media) => {
        window.postMessage({ source: "ift", type: "media-urls", media }, "https://x.com");
    }

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;

        this.addEventListener("readystatechange",  () => {
            if (xhr.readyState === 4) {
                const responseURL = xhr.responseURL;
                if (xhr.status === 200) {
                    for (const url of URLs) {
                        if (responseURL.includes(url)) {
                            parseTweetMedia(xhr.responseText);
                            return;
                        }
                    }
                }
            }
        });
        return originalSend.call(this, body);
    };

    function parseTweetMedia(responseText) {
        const /** @type {MediaTransfer[]} */ media = [];
        for (const m of findTweets(JSON.parse(responseText))) {
            const r = getMediaFromTweetResult(m);
            r && media.push(/** @type {MediaTransfer} */ r);
        }
        if (media.length > 0) postMedia(media);
    }

    /**
     * @param tweet
     * @returns {MediaTransfer | void}
     */
    function getMediaFromTweetResult(tweet) {
        tweet = tweet.tweet ?? tweet;
        if (tweet) {
            const id = tweet.legacy?.retweeted_status_result?.result?.rest_id ?? tweet.rest_id;
            tweet = tweet.legacy?.entities?.media;
            if (id && tweet) {
                // has media
                const /** @type {MediaItem[]} */ mediaInfo = [];
                for (let index = 1; index <= tweet.length; ++index) {
                    const media = tweet[index - 1],
                        /** @type {MediaItem} */ info = {index, save_id: `${id}-${index}`, url: '', type: 'Image'};
                    switch (media.type) {
                        case 'photo': {
                            const lastDot = media.media_url_https?.lastIndexOf('.');
                            info.url = `${media.media_url_https?.substring(0, lastDot)}?format=${media.media_url_https?.substring(lastDot + 1)}&name=orig`;
                            break;
                        }
                        case 'video':
                        case 'animated_gif': {
                            info.url = getBestQuality(media.video_info?.variants);
                            info.type = 'Video';
                            break;
                        }
                    }
                    mediaInfo.push(info);
                }
                return {id, media: mediaInfo};
            }
        }
    }

    function findTweets(obj, result = []) {
        if (obj && typeof obj === 'object') {
            if (obj.__typename === 'Tweet' && obj.legacy) {
                result.push(obj);
            }

            for (const key in obj) {
                findTweets(obj[key], result);
            }
        }
        return result;
    }
})();
