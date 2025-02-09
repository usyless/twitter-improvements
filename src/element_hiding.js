'use strict';

(() => {
    const loadSettings = () => new Promise((resolve) => {
        chrome.storage.local.get(['style'], (s) => resolve(s.style ?? {}));
    });

    const Styles = {
        DISPLAY: '{display:none!important;}',
        OPACITY: '{opacity:0!important;pointer-events: none!important;}',
    }

    const StyleMap = {
        hide_notifications: {s: ['a[href="/notifications"]'], st: Styles.DISPLAY},
        hide_messages: {s: ['a[href="/messages"]'], st: Styles.DISPLAY},
        hide_grok: {s: [
            'a[href="/i/grok"]',
            'button[aria-label="Grok actions"]',
            'div:has(> div[data-testid^="followups_"] + nav > div > div[data-testid="ScrollSnap-SwipeableList"])',
            'button[aria-label="Enhance your post with Grok"]',
            'button[aria-label="Profile Summary"]',
            'div.css-175oi2r.r-1777fci.r-1wzrnnt',
            'div[data-testid="GrokDrawer"]'
        ], st: Styles.DISPLAY},
        hide_jobs: {s: ['a[href="/jobs"]'], st: Styles.DISPLAY},
        hide_lists: {s: ['a[href*="/lists"]'], st: Styles.DISPLAY},
        hide_communities: {s: ['a[href*="/communities"]'], st: Styles.DISPLAY},
        hide_premium: {s: [
            'a[href="/i/premium_sign_up"]',
            'aside[aria-label*="Premium"]',
            'div:has(> * > aside[aria-label*="Premium"])'
        ], st: Styles.DISPLAY},
        hide_verified_orgs: {s: ['a[href="/i/verified-orgs-signup"]'], st: Styles.DISPLAY},
        hide_monetization: {s: [
            'a[href="/settings/monetization"]',
            'a[href="/i/monetization"]'
        ], st: Styles.DISPLAY},
        hide_ads_button: {s: ['a[href*="https://ads.x.com"]'], st: Styles.DISPLAY},
        hide_whats_happening: {s: ['div:has(> * > [aria-label="Timeline: Trending now"])'], st: Styles.DISPLAY},
        hide_who_to_follow: {s: [
            'div:has(> * > [aria-label="Who to follow"])',
            'div:has(> * > * > [aria-label="Loading recommendations for users to follow"])'
        ], st: Styles.DISPLAY},
        hide_relevant_people: {s: ['div:has(> [aria-label="Relevant people"])'], st: Styles.DISPLAY},
        hide_create_your_space: {s: ['a[href="/i/spaces/start"]'], st: Styles.DISPLAY},
        hide_post_button: {s: ['div:has(> a[href="/compose/post"])'], st: Styles.DISPLAY},
        hide_follower_requests: {s: ['a[href="/follower_requests"]'], st: Styles.DISPLAY},
        hide_live_on_x: {s: [
            'div:has(> [data-testid="placementTracking"] > [aria-label^="Space,"])',
            'div:has(> [data-testid="placementTracking"] > [aria-label^="Broadcast, "])'
        ], st: Styles.DISPLAY},
        hide_post_reply_sections: {s: [
            'div:has(> div > div[role="progressbar"] + div > div > div > div > div > div > div[data-testid^="UserAvatar-Container"])'
        ], st: Styles.DISPLAY},
        hide_sidebar_footer: {s: ['div:has(> [aria-label="Footer"])'], st: Styles.DISPLAY},

        hide_tweet_view_count: {s: ['div:has(> a[href$="/analytics"])'], st: Styles.OPACITY},
        hide_tweet_share_button: {s: ['div:has(> div > button[aria-label="Share post"]:not([usy]))'], st: Styles.OPACITY},
        hide_replies_button_tweet: {s: ['div:has(> button[data-testid="reply"])'], st: Styles.OPACITY},
        hide_retweet_button_tweet: {s: ['div:has(> button[data-testid="retweet"])'], st: Styles.OPACITY},
        hide_like_button_tweet: {s: ['div:has(> button[data-testid="like"])'], st: Styles.OPACITY},
        hide_bookmark_button_tweet: {s: [
                'div:has(> button[data-testid="bookmark"])',
                'div:has(> button[data-testid="removeBookmark"])'
            ], st: Styles.OPACITY}
    }

    const start = () => loadSettings().then((enabled) => {
        // Remove current styles
        for (const s of document.querySelectorAll('style[usyStyle]')) s.remove();

        // Apply new enabled styles
        let style = '';
        for (const setting in enabled) if (enabled[setting] === true) {
            const st = StyleMap?.[setting], styler = st.st;
            for (const s of st.s) style += s + styler;
        }
        if (style.length > 0) {
            const s = document.createElement('style');
            s.setAttribute('usyStyle', '');
            s.appendChild(document.createTextNode(style));
            document.head.appendChild(s);
        }
    });

    void start();

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && changes.hasOwnProperty('style')) void start();
    });
})();