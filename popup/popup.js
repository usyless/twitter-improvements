document.addEventListener("click", (e) => {
    e.target.nodeName === "A" && setTimeout(() => window.close(), 10);
});