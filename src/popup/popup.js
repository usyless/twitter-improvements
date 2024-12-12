document.addEventListener("click", (e) => {
    chrome.tabs.create({url: e.target.dataset.href});
    window.close();
});