(() => {
    'use strict';

    const HideType = {
        DISPLAY: '{display:none!important;}',
        UNSET_DISPLAY: '{display:initial!important;}',
        VISIBILITY: '{visibility:hidden!important;pointer-events:none!important;}',
    };

    // Naming dependent on style
    const SelectorMap = {
        hide_notifications: {s: ['a[href="/notifications"]'], st: HideType.DISPLAY},
        hide_messages: {s: ['a[href="/messages"]'], st: HideType.DISPLAY},
        hide_chat: {s: ['a[href="/i/chat"]'], st: HideType.DISPLAY},
        hide_grok: {s: [
            'a[href="/i/grok"]',
            'button[aria-label="Grok actions"]',
            'div:has(> div[data-testid^="followups_"] + nav > div > div[data-testid="ScrollSnap-SwipeableList"])',
            'button[aria-label="Enhance your post with Grok"]',
            'button[aria-label="Profile Summary"]',
            'div.css-175oi2r.r-1777fci.r-1wzrnnt',
            'div[data-testid="GrokDrawer"]',
            'a[href^="/i/imagine"]',
            'a[href^="https://grok.com/imagine"]',
        ], st: HideType.DISPLAY},
        hide_jobs: {s: ['a[href="/jobs"]'], st: HideType.DISPLAY},
        hide_lists: {s: ['a[href$="/lists"]'], st: HideType.DISPLAY},
        hide_communities: {s: ['a[href$="/communities"]'], st: HideType.DISPLAY},
        hide_premium: {s: [
            'a[href="/i/premium_sign_up"]',
            'aside[aria-label*="Premium"]',
            'div:has(> * > aside[aria-label*="Premium"])',
            'div:has(> * > aside[aria-label="Ending today!"])',
            'div:has(> div > div[data-testid="super-upsell-UpsellCardRenderProperties"])',
            'a[href="/i/premium-business"]'
        ], st: HideType.DISPLAY},
        hide_verified_orgs: {s: ['a[href="/i/verified-orgs-signup"]'], st: HideType.DISPLAY},
        hide_monetization: {s: [
            'a[href="/settings/monetization"]',
            'a[href="/i/monetization"]'
        ], st: HideType.DISPLAY},
        hide_ads_button: {s: ['a[href*="https://ads.x.com"]'], st: HideType.DISPLAY},
        hide_todays_news: {s: [
            'div:has(> [data-testid="news_sidebar"])',
            'div:has(> div > div > button > a[href^="/explore"])',
            'div:has(> div > div > button > a[href^="/explore"]) + div:has(> div > div > [data-testid=trend])',
            'div:has(> div > div > [data-testid=trend]) + div:has(> div > div > :is([data-testid=trend], a[href^="/explore"]))',
            'div:has(> div > div > [data-testid=trend]) + div:has(> div > div > a[href^="/explore"]) + div'
        ], st: HideType.DISPLAY},
        hide_whats_happening: {s: ['div:has(> * > [aria-label="Timeline: Trending now"])'], st: HideType.DISPLAY},
        hide_who_to_follow: {s: [
            'div:has(> * > [aria-label="Who to follow"])',
            'div:has(> * > * > [aria-label="Loading recommendations for users to follow"])',
            '[aria-label="Timeline: Your Home Timeline"] div:has(+ div > div > div > button[data-testid="UserCell"])',
            '[aria-label="Timeline: Your Home Timeline"] div:has(> div > div > button[data-testid="UserCell"]:not([aria-label^="Switch to @"]))',
            '[aria-label="Timeline: Your Home Timeline"] div:has(> div > div > a[href^="/i/connect_people"])',
            '[aria-label="Timeline: Your Home Timeline"] div:has(> div > div > a[href^="/i/connect_people"]) + div',
            '[data-testid="whoToFollowSspAd"]',
        ], st: HideType.DISPLAY},
        hide_relevant_people: {s: ['div:has(> [aria-label="Relevant people"])'], st: HideType.DISPLAY},
        hide_create_your_space: {s: ['a[href="/i/spaces/start"]'], st: HideType.DISPLAY},
        hide_articles_sidebar: {s: ['a[href="/compose/articles"]'], st: HideType.DISPLAY},
        hide_post_button: {s: ['div:has(> a[href="/compose/post"]):not([data-testid="Dropdown"])'], st: HideType.DISPLAY},
        hide_creator_studio: {s: ['a[href="/i/jf/creators/studio"]'], st: HideType.DISPLAY},
        hide_follower_requests: {s: ['a[href="/follower_requests"]'], st: HideType.DISPLAY},
        hide_live_on_x: {s: [
            'div:has(> [data-testid="placementTracking"] > [aria-label^="Space,"])',
            'div:has(> [data-testid="placementTracking"] > [aria-label^="Broadcast, "])'
        ], st: HideType.DISPLAY},
        hide_post_reply_sections: {s: [
            'div:has(> div > div[role="progressbar"] + div > div > div > div > div > div > div[data-testid^="UserAvatar-Container"])',
            'div[aria-label="Home timeline"] > div:not(:last-child):has(> div > div[data-testid^="UserAvatar-Container"])',
            'div[aria-label="Home timeline"] > div:not(:last-child):has(> div > div[data-testid^="UserAvatar-Container"]) + div'
        ], st: HideType.DISPLAY},
        hide_sidebar_footer: {s: ['div:has(> [aria-label="Footer"])'], st: HideType.DISPLAY},
        hide_subscribe_buttons: {s: ['button[aria-label^="Subscribe to "]'], st: HideType.DISPLAY},

        hide_tweet_view_count: {s: CommonSelectors.views, st: HideType.VISIBILITY},
        hide_tweet_share_button: {s: CommonSelectors.share, st: HideType.VISIBILITY},
        hide_replies_button_tweet: {s: CommonSelectors.replies, st: HideType.VISIBILITY},
        hide_retweet_button_tweet: {s: CommonSelectors.retweets, st: HideType.VISIBILITY},
        hide_like_button_tweet: {s: CommonSelectors.likes, st: HideType.VISIBILITY},
        hide_bookmark_button_tweet: {s: CommonSelectors.bookmark, st: HideType.VISIBILITY},
        hide_discover_more: [
            // :has selector is the same for the first two here, and the first two in the next element
            // these selectors pick the "Discover more" element
            // the final set of selectors picks the "Probable spam" element which comes after
            // the probable spam element is either the expanded one or the button
            // these selectors are veery jank
            {s: [
                'div[data-testid="cellInnerDiv"]:has(> div > div > div > h2 + div)',
                'div[data-testid="cellInnerDiv"]:has(> div > div > div > h2 + div) ~ *'
                ], st: HideType.DISPLAY},
            {s: [
                'div[data-testid="cellInnerDiv"]:has(> div > div > div > h2 + div) ~ div[data-testid="cellInnerDiv"]:has(> div > div > div > h2, > div > div > button)',
                'div[data-testid="cellInnerDiv"]:has(> div > div > div > h2 + div) ~ div[data-testid="cellInnerDiv"]:has(> div > div > div > h2, > div > div > button) ~ *'
                ], st: HideType.UNSET_DISPLAY}
        ],

        more_media_icon_visible: {
            s: ['a[href$="/photo/1"] > div + svg', 'a[href$="/video/1"] > div + svg'],
            st: '{box-shadow:0 0 5px rgba(0,0,0,0.6)!important;background-color:rgba(0,0,0,0.3)!important;border-radius:4px!important;}'
        }
    };

    const start = () => {
        const enabled = GlobalSettings.style;

        // Apply new enabled styles
        let style = '';
        for (const setting in enabled) if (enabled[setting] === true) {
            const sm = SelectorMap?.[setting];
            if (!sm) continue;
            for (const t of Array.isArray(sm) ? sm : [sm]) {
                const {s, st} = t;
                for (const a of s) style += a + st;
            }
        }

        // Apply button ordering if exists
        const result = enabled.tweet_button_positions.match(/{([^}]+)}/g).map(match => match.replace(/[{}]/g, ''));
        for (let i = 0; i < result.length; ++i) {
            for (const s of CommonSelectors[result[i]] ?? []) style += `${s}{order:${i}!important}`;
        }

        if (style.length > 0) {
            const s = document.querySelector('[usyStyle]') || document.createElement('style');
            s.setAttribute('usyStyle', '');
            s.textContent = style;
            if (!s.isConnected) document.head.appendChild(s);
        }
    };

    GlobalSettings.onReady.promise.then(start);

    GlobalSettings.onUpdate.addListener((changes) => {
        if (Object.hasOwn(changes, 'style')) start();
    });
})();