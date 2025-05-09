'use strict';

(() => {
    if (typeof this.browser === 'undefined') {
        this.browser = chrome;
    }

    /** @returns {Promise<Settings>} */
    const loadSettings = () => browser.runtime.sendMessage({type: 'get_settings'});

    const HideType = {
        DISPLAY: '{display:none!important;}',
        VISIBILITY: '{visibility:hidden!important;pointer-events:none!important;}',
    }

    // Naming dependent on style.tweet_button_positions
    const CommonSelectors = {
        views: ['div:has(> a[href$="/analytics"])'],
        share: ['div:has(> div > button[aria-label="Share post"]:not([usy]))'],
        replies: ['div:has(> button[data-testid="reply"])'],
        retweets: ['div:has(> button[data-testid="retweet"])', 'div:has(> button[data-testid="unretweet"])'],
        likes: ['div:has(> button[data-testid="like"])', 'div:has(> button[data-testid="unlike"])'],
        bookmark: ['div:has(> button[data-testid="bookmark"])', 'div:has(> button[data-testid="removeBookmark"])'],

        copy: ['div[usy-copy]'],
        download: ['div[usy-download]']
    }

    // Naming dependent on style
    const SelectorMap = {
        hide_notifications: {s: ['a[href="/notifications"]'], st: HideType.DISPLAY},
        hide_messages: {s: ['a[href="/messages"]'], st: HideType.DISPLAY},
        hide_grok: {s: [
            'a[href="/i/grok"]',
            'button[aria-label="Grok actions"]',
            'div:has(> div[data-testid^="followups_"] + nav > div > div[data-testid="ScrollSnap-SwipeableList"])',
            'button[aria-label="Enhance your post with Grok"]',
            'button[aria-label="Profile Summary"]',
            'div.css-175oi2r.r-1777fci.r-1wzrnnt',
            'div[data-testid="GrokDrawer"]'
        ], st: HideType.DISPLAY},
        hide_jobs: {s: ['a[href="/jobs"]'], st: HideType.DISPLAY},
        hide_lists: {s: ['a[href$="/lists"]'], st: HideType.DISPLAY},
        hide_communities: {s: ['a[href$="/communities"]'], st: HideType.DISPLAY},
        hide_premium: {s: [
            'a[href="/i/premium_sign_up"]',
            'aside[aria-label*="Premium"]',
            'div:has(> * > aside[aria-label*="Premium"])',
            'div:has(> * > aside[aria-label="Ending today!"])',
            'div:has(> div > div[data-testid="super-upsell-UpsellCardRenderProperties"])'
        ], st: HideType.DISPLAY},
        hide_verified_orgs: {s: ['a[href="/i/verified-orgs-signup"]'], st: HideType.DISPLAY},
        hide_monetization: {s: [
            'a[href="/settings/monetization"]',
            'a[href="/i/monetization"]'
        ], st: HideType.DISPLAY},
        hide_ads_button: {s: ['a[href*="https://ads.x.com"]'], st: HideType.DISPLAY},
        hide_whats_happening: {s: ['div:has(> * > [aria-label="Timeline: Trending now"])'], st: HideType.DISPLAY},
        hide_who_to_follow: {s: [
            'div:has(> * > [aria-label="Who to follow"])',
            'div:has(> * > * > [aria-label="Loading recommendations for users to follow"])'
        ], st: HideType.DISPLAY},
        hide_relevant_people: {s: ['div:has(> [aria-label="Relevant people"])'], st: HideType.DISPLAY},
        hide_create_your_space: {s: ['a[href="/i/spaces/start"]'], st: HideType.DISPLAY},
        hide_post_button: {s: ['div:has(> a[href="/compose/post"])'], st: HideType.DISPLAY},
        hide_follower_requests: {s: ['a[href="/follower_requests"]'], st: HideType.DISPLAY},
        hide_live_on_x: {s: [
            'div:has(> [data-testid="placementTracking"] > [aria-label^="Space,"])',
            'div:has(> [data-testid="placementTracking"] > [aria-label^="Broadcast, "])'
        ], st: HideType.DISPLAY},
        hide_post_reply_sections: {s: [
            'div:has(> div > div[role="progressbar"] + div > div > div > div > div > div > div[data-testid^="UserAvatar-Container"])'
        ], st: HideType.DISPLAY},
        hide_sidebar_footer: {s: ['div:has(> [aria-label="Footer"])'], st: HideType.DISPLAY},
        hide_subscribe_buttons: {s: ['button[aria-label^="Subscribe to "]'], st: HideType.DISPLAY},

        hide_tweet_view_count: {s: CommonSelectors.views, st: HideType.VISIBILITY},
        hide_tweet_share_button: {s: CommonSelectors.share, st: HideType.VISIBILITY},
        hide_replies_button_tweet: {s: CommonSelectors.replies, st: HideType.VISIBILITY},
        hide_retweet_button_tweet: {s: CommonSelectors.retweets, st: HideType.VISIBILITY},
        hide_like_button_tweet: {s: CommonSelectors.likes, st: HideType.VISIBILITY},
        hide_bookmark_button_tweet: {s: CommonSelectors.bookmark, st: HideType.VISIBILITY},

        more_media_icon_visible: {
            s: ['a[href$="/photo/1"] > div + svg', 'a[href$="/video/1"] > div + svg'],
            st: '{box-shadow:0 0 5px rgba(0,0,0,0.6)!important;background-color:rgba(0,0,0,0.3)!important;border-radius:4px!important;}'
        }
    }

    const start = () => loadSettings().then((settings) => {
        const enabled = settings.style;
        // Remove current styles
        for (const s of document.querySelectorAll('style[usyStyle]')) s.remove();

        // Apply new enabled styles
        let style = '';
        for (const setting in enabled) if (enabled[setting] === true) {
            const sm = SelectorMap?.[setting];
            if (sm) {
                const {s, st} = sm;
                for (const a of s) style += a + st;
            }
        }

        // Apply button ordering if exists
        const result = enabled.tweet_button_positions.match(/{([^}]+)}/g).map(match => match.replace(/[{}]/g, ''));
        for (let i = 0; i < result.length; ++i) {
            for (const s of CommonSelectors[result[i]] ?? []) style += `${s}{order:${i}!important}`;
        }

        if (style.length > 0) {
            const s = document.createElement('style');
            s.setAttribute('usyStyle', '');
            s.textContent = style;
            document.head.appendChild(s);
        }
    });

    void start();

    browser.runtime.onMessage.addListener((message) => {
        if (message.type === 'settings_update' && message.changes.hasOwnProperty('style')) void start();
    });
})();