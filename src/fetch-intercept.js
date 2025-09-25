(() =>  {
    const getQualities = (variants) => {
        if (variants) {
            variants = variants.filter(v => v.content_type === "video/mp4");
            variants.sort((x, y) => (+y.bitrate) - (+x.bitrate));
            return variants.map(v => v.url);
        }
    }
    /** @param {MediaTransfer[]} media */
    const postMedia = (media) => {
        window.postMessage({ source: "ift", type: "media-urls", media }, "https://x.com");
    }

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;

        this.addEventListener("readystatechange",  () => {
            if (
                xhr.readyState === 4 && xhr.status === 200
                && (xhr.responseType === 'text' || xhr.responseType === '')
                && xhr.getResponseHeader("Content-Type")?.includes('application/json')
            ) {
                const /** @type {MediaTransfer[]} */ media = [];
                for (const m of findTweets(JSON.parse(xhr.responseText))) {
                    const r = getMediaFromTweetResult(m);
                    r && media.push(/** @type {MediaTransfer} */ r);
                }
                if (media.length > 0) postMedia(media);
            }
        });
        return originalSend.call(this, body);
    };

    /**
     * @param tweet
     * @returns {MediaTransfer | void}
     */
    function getMediaFromTweetResult(tweet) {
        if (tweet.extended_entities) { // this would be the notification timeline ones, idk where else
            return mediaFromTweet(tweet.id_str, tweet.extended_entities.media);
        } else { // most other tweets
            tweet = tweet.tweet ?? tweet;
            if (tweet) {
                let id = tweet.rest_id;
                tweet = tweet.legacy;
                let retweet = tweet?.retweeted_status_result?.result;
                if (retweet) {
                    retweet = retweet.tweet ?? retweet;
                    id = retweet?.rest_id;
                }
                tweet = retweet?.legacy?.extended_entities?.media ?? tweet?.extended_entities?.media;

                return mediaFromTweet(id, tweet);
            }
        }
    }

    function mediaFromTweet(id, media) {
        if (id && media) {
            // has media
            const /** @type {MediaItem[]} */ mediaInfo = [];
            for (let index = 1; index <= media.length; ++index) {
                const {media_url_https, video_info, type, expanded_url} = media[index - 1],
                    /** @type {MediaItem} */ info = {index, save_id: `${id}-${index}`, url: '', type: 'Image', tweetURL: expanded_url};
                switch (type) {
                    case 'photo': {
                        const lastDot = media_url_https?.lastIndexOf('.');
                        info.url = `${media_url_https?.substring(0, lastDot)}?format=${media_url_https?.substring(lastDot + 1)}&name=orig`;
                        break;
                    }
                    case 'video':
                    case 'animated_gif': {
                        const qualities = getQualities(video_info?.variants);
                        info.url = qualities?.[0];
                        info.url_lowres = qualities?.[qualities.length - 1];
                        info.type = 'Video';
                        if (type === 'animated_gif') info.isGif = true;
                        break;
                    }
                }
                mediaInfo.push(info);
            }
            return {id, media: mediaInfo};
        }
    }

    function findTweets(obj, parent = null, result = []) {
        if (obj && typeof obj === 'object') {
            if ((obj.__typename === 'Tweet' && obj.legacy?.extended_entities?.media)
                || (obj.__typename === 'TweetWithVisibilityResults' && obj.tweet?.legacy?.extended_entities?.media)
                || (parent !== 'legacy' && obj.extended_entities?.media)) {
                result.push(obj);
            }

            for (const key in obj) {
                findTweets(obj[key], key, result);
            }
        }
        return result;
    }
})();
