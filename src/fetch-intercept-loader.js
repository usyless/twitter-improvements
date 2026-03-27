(() => {
    const script = document.createElement('script');
    script.onload = () => script.remove();
    script.src = chrome.runtime.getURL('/fetch-intercept.js');
    (document.head || document.documentElement).appendChild(script);

    const queue = [];
    const initialListener = (e) => {
        e.stopPropagation();
        if (e.detail) {
            if (globalThis.ti_on_intercepted) {
                if (queue.length > 0) {
                    for (const data of queue) globalThis.ti_on_intercepted(data);
                    queue.length = 0;
                }
                window.removeEventListener('ti-window-twt-data', initialListener, { capture: true });
            } else {
                queue.push(JSON.parse(e.detail));
            }
        }
    };

    window.addEventListener('ti-window-twt-data', initialListener, { capture: true });
    window.addEventListener('ti-window-twt-data', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.detail && globalThis.ti_on_intercepted) globalThis.ti_on_intercepted(JSON.parse(e.detail));
    }, { capture: true });
})();