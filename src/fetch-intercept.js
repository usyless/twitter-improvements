(() =>  {
    /** @type {Map<string, string>} */
    const USER_CACHE = new Map();

    const getQualities = (variants) => {
        if (variants) {
            variants = variants.filter(v => v.content_type === 'video/mp4');
            variants.sort((x, y) => (+y.bitrate) - (+x.bitrate));
            return variants.map(v => v.url);
        }
    }

    /** @param {InterceptedTweets} intercepted */
    const postNewData = (intercepted) => {
        window.postMessage({ ...intercepted, source: 'ift', type: 'ti-window-twt-data' }, 'https://x.com');
    }

    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
        const xhr = this;

        this.addEventListener('readystatechange',  () => {
            if (
                xhr.readyState === 4 && xhr.status === 200
                && (xhr.responseType === 'text' || xhr.responseType === '')
                && xhr.getResponseHeader('Content-Type')?.includes('application/json')
            ) {
                postNewData(findTweets(JSON.parse(xhr.responseText)));
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
            return mediaFromTweet(tweet.id_str, tweet.extended_entities.media,
                tweet.user?.id_str ?? tweet.user_id_str, tweet.user?.screen_name);
        } else { // most other tweets
            tweet = tweet.tweet ?? tweet;
            if (tweet) {
                let id = tweet.rest_id;
                tweet = tweet.legacy;
                let user_id = tweet.user_id_str;
                let retweet = tweet?.retweeted_status_result?.result;
                if (retweet) {
                    retweet = retweet.tweet ?? retweet;
                    id = retweet?.rest_id;
                    user_id = retweet?.legacy?.user_id_str;
                }
                tweet = retweet?.legacy?.extended_entities?.media ?? tweet?.extended_entities?.media;

                return mediaFromTweet(id, tweet, user_id);
            }
        }
    }

    const usernameReplaceRegex = /\/[^\/]+\/status/;
    function mediaFromTweet(id, media, user_id, user_name) {
        if (id && media) {
            const username = user_name ?? USER_CACHE.get(user_id);
            const usernameReplaceStr = `/${username}/status`;
            if (!username) console.warn("No username found for user_id: ", user_id, " Tweet id: ", id);
            // has media
            const /** @type {MediaItem[]} */ mediaInfo = [];
            for (let index = 1; index <= media.length; ++index) {
                const {media_url_https, video_info, type, expanded_url} = media[index - 1];
                const /** @type {MediaItem} */ info = {index, save_id: `${id}-${index}`, url: '', type: 'Image',
                    tweetURL: (username) ? expanded_url.replace(usernameReplaceRegex, usernameReplaceStr) : expanded_url};
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
                        info.isGif = (type === 'animated_gif');
                        break;
                    }
                }
                mediaInfo.push(info);
            }
            return [id, mediaInfo];
        }
    }

    /**
     * Searching result object containing the data captured in intercepted request.
     */
    class InterceptedTweets {
        /**
         * List of tweets containing pieces of media.
         * @type {MediaTransfer[]}
         */
        media = [];
        /**
         * Map of tweet IDs to the quoted tweet IDs.
         * @type {[tweetId, tweetId][]}
         */
        quotes = [];
        /**
         * Map of twitter shortened url's to their original url's.
         * @type {[string, string][]}
         */
        urls = [];
    }

    /**
     * Walk over the intercepted object and find all tweets mentioned in it. This function walks over the object
     * recursively.
     * Has a side effect of caching user id's to usernames
     *
     * @param {object} obj Object to walk over.
     * @param {string|null} parent Parent object key.
     * @param {InterceptedTweets} [result] Reference to the result object.
     *
     * @returns {InterceptedTweets} Final result of all intercepted tweets.
     */
    function findTweets(obj, parent = null, result = new InterceptedTweets()) {
        if (obj && typeof obj === 'object') {
            if (obj.__typename === 'User' && obj.rest_id && obj.core?.screen_name && !(USER_CACHE.has(obj.rest_id))) {
                USER_CACHE.set(obj.rest_id, obj.core.screen_name);
            }

            if (obj.screen_name && obj.id_str && !(USER_CACHE.has(obj.rest_id))) {
                USER_CACHE.set(obj.id_str, obj.screen_name);
            }

            if ((obj.__typename === 'Tweet' && obj.legacy?.extended_entities?.media)
                || (obj.__typename === 'TweetWithVisibilityResults' && obj.tweet?.legacy?.extended_entities?.media)
                || (parent !== 'legacy' && obj.extended_entities?.media)) {
                const maybeMediaTransfer = getMediaFromTweetResult(obj);
                maybeMediaTransfer && result.media.push(maybeMediaTransfer);
            }

            if (obj.__typename === 'Tweet' && obj.rest_id && obj.quoted_status_result?.result?.rest_id) {
                result.quotes.push([obj.rest_id, obj.quoted_status_result.result.rest_id]);
            }

            // fallback for quoted_status_result in legacy
            if (obj.quoted_status_id_str && obj.id_str) {
                result.quotes.push([obj.id_str, obj.quoted_status_id_str]);
            }

            if (obj.url && obj.expanded_url && obj.url.startsWith('https://t.co/')) {
                result.urls.push([obj.url, obj.expanded_url]);
            }

            for (const key in obj) {
                findTweets(obj[key], key, result);
            }
        }
        return result;
    }
})();
