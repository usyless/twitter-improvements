(() =>  {
    const getBestQuality = (variants) => variants.filter(v => v?.content_type === "video/mp4").reduce((x, y) => +x?.bitrate > +y?.bitrate ? x : y).url;
    /** @param {MediaTransfer[]} media */
    const postMedia = (media) => {
        window.postMessage({ source: "ift", type: "media-urls", media }, "https://x.com");
    }

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;

        this.addEventListener("readystatechange",  () => {
            if (xhr.readyState === 4 && xhr.status === 200
                && xhr.getResponseHeader("Content-Type").includes('application/json')
                && (xhr.responseType === 'text' || xhr.responseType === '')) {
                parseTweetMedia(xhr.responseText);
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
                    const {media_url_https, video_info, type} = tweet[index - 1],
                        /** @type {MediaItem} */ info = {index, save_id: `${id}-${index}`, url: '', type: 'Image'};
                    switch (type) {
                        case 'photo': {
                            const lastDot = media_url_https?.lastIndexOf('.');
                            info.url = `${media_url_https?.substring(0, lastDot)}?format=${media_url_https?.substring(lastDot + 1)}&name=orig`;
                            break;
                        }
                        case 'video':
                        case 'animated_gif': {
                            info.url = getBestQuality(video_info?.variants);
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
            if ((obj.__typename === 'Tweet' && obj.legacy?.entities?.media)
                || (obj.__typename === 'TweetWithVisibilityResults' && obj.tweet?.legacy?.entities?.media)) {
                result.push(obj);
            }

            for (const key in obj) {
                findTweets(obj[key], result);
            }
        }
        return result;
    }
})();
