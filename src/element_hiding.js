'use strict';

(() => {
    const Settings = {
        style: {
            hide_notifications: false,
            hide_messages: false,
            hide_grok: false,
            hide_grok_explain: false,
            hide_jobs: false,
            hide_lists: false,
            hide_communities: false,
            hide_premium: false,
            hide_verified_orgs: false,
            hide_monetization: false,
            hide_ads_button: false,
            hide_whats_happening: false,
            hide_who_to_follow: false,
            hide_relevant_people: false,
            hide_create_your_space: false,
            hide_post_button: false,
            hide_follower_requests: false,
            hide_live_on_x: false,
            hide_post_reply_sections: false,
            hide_sidebar_footer: false
        },

        loadSettings: async () => {
            const data = await chrome.storage.local.get();
            for (const s in Settings.style) Settings.style[s] = data[s] ?? Settings.style[s];
        }
    }

    const Styles = {
        styleMap: {
            hide_notifications: ['a[href="/notifications"]'],
            hide_messages: ['a[href="/messages"]'],
            hide_grok: ['a[href="/i/grok"]', 'button[aria-label="Grok actions"]', 'div:has(> div[data-testid^="followups_"] + nav > div > div[data-testid="ScrollSnap-SwipeableList"])'],
            hide_jobs: ['a[href="/jobs"]'],
            hide_lists: ['a[href*="/lists"]'],
            hide_communities: ['a[href*="/communities"]'],
            hide_premium: ['a[href="/i/premium_sign_up"]', 'aside[aria-label*="Premium"]', 'div:has(> * > aside[aria-label*="Premium"])'],
            hide_verified_orgs: ['a[href="/i/verified-orgs-signup"]'],
            hide_monetization: ['a[href="/settings/monetization"]', 'a[href="/i/monetization"]'],
            hide_ads_button: ['a[href*="https://ads.x.com"]'],
            hide_whats_happening: ['div:has(> * > [aria-label="Timeline: Trending now"])'],
            hide_who_to_follow: ['div:has(> * > [aria-label="Who to follow"])', 'div:has(> * > * > [aria-label="Loading recommendations for users to follow"])'],
            hide_relevant_people: ['div:has(> [aria-label="Relevant people"])'],
            hide_create_your_space: ['a[href="/i/spaces/start"]'],
            hide_post_button: ['div:has(> a[href="/compose/post"])'],
            hide_follower_requests: ['a[href="/follower_requests"]'],
            hide_live_on_x: ['div:has(> [data-testid="placementTracking"] > [aria-label^="Space,"])'],
            hide_post_reply_sections: ['div:has(> div > div[role="progressbar"] + div > div > div > div > div > div > div[data-testid^="UserAvatar-Container"])'],
            hide_sidebar_footer: ['div:has(> [aria-label="Footer"])']
        },
        start: () => {
            document.querySelectorAll('style[usyStyle]').forEach((e) => e.remove());
            let style = '';
            for (const setting in Settings.style) if (Settings.style[setting]) for (const s of Styles.styleMap[setting]) style += s + '{display:none;}';
            if (style.length > 0) {
                const s = document.createElement('style');
                s.setAttribute('usyStyle', '');
                s.appendChild(document.createTextNode(style));
                document.head.appendChild(s);
            }
        }
    }

    const start = () => Settings.loadSettings().then(Styles.start);

    start();

    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local') {
            const style = Settings.style;
            for (const key in changes) {
                if (style.hasOwnProperty(key)) {
                    start();
                    break;
                }
            }
        }
    });
})();