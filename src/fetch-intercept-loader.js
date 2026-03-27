(() => {
    const script = document.createElement('script');
    script.onload = () => script.remove();
    script.src = chrome.runtime.getURL('/fetch-intercept.js');
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('ti-window-twt-data', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.detail && globalThis.ti_on_intercepted) globalThis.ti_on_intercepted(JSON.parse(e.detail));
    }, { capture: true });
})();