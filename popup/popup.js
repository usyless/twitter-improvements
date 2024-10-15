document.addEventListener("click", (e) => {
    if (e.target.nodeName === "A") setTimeout(() => {
        window.close();
    }, 10);
});