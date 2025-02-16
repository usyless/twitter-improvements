if (typeof this.browser === 'undefined') {
    this.browser = chrome;
}

browser.tabs.create({url: browser.runtime.getURL('/settings/settings.html')});
window.close();