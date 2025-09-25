(() => {
    const script = document.createElement('script');
    script.onload = () => script.remove();
    script.src = chrome.runtime.getURL('/fetch-intercept.js');
    (document.head || document.documentElement).appendChild(script);
})();