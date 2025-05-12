chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    return { redirectUrl: "https://bsky.app/" };
  },
  { urls: ["*://x.com/*", "*://www.x.com/*"] },
  ["blocking"]
);
