(() => {
    console.log("hi from common");

    window.chromeMode = false;
    window.firefoxMode = false;
    // set browser to chrome if not in firefox
    /** @type {typeof browser} */
    window.extension = (typeof browser !== 'undefined' ? (() => {
        window.firefoxMode = true;
        return browser;
    }) : (() => {
        window.chromeMode = true;
        return chrome;
    }))();

    window.CommonSelectors = {
        views: ['div:has(> a[href$="/analytics"])', 'div:has(> button[aria-label="View post analytics"])'],
        share: [
            'div:has(> div > button[aria-label="Share post"]:not([usy]))',
            'div:has(> div > button > div > div > svg > g > path[d^="M17 4c-1.1 0-2 .9-2 2 0 .33.08.65.22.92C15.56 7.56"])',
        ],
        replies: ['div:has(> button[data-testid="reply"])'],
        retweets: ['div:has(> button[data-testid="retweet"])', 'div:has(> button[data-testid="unretweet"])'],
        likes: ['div:has(> button[data-testid="like"])', 'div:has(> button[data-testid="unlike"])'],
        bookmark: ['div:has(> button[data-testid="bookmark"])', 'div:has(> button[data-testid="removeBookmark"])'],

        copy: ['div[usy-copy]'],
        download: ['div[usy-download]']
    };
})();