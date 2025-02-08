'use strict';

(() => {
    document.getElementById('reverseFile').parentElement.addEventListener('click', (e) => {
        if (e.target.id === 'reverseFile' || e.target === e.currentTarget) {
            document.getElementById('reverseFileInput').click();
        }
    });
    document.getElementById('reverseFileInput').addEventListener('change', (e) => {
        const d = new DataTransfer();
        for (const file of e.target.files) d.items.add(file);
        reverseFiles(d);
    });
    window.addEventListener('paste', (e) => {
        e.preventDefault();
        reverseFiles(e.clipboardData);
    });
    window.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy';
        document.body.classList.add('active');
    });
    const removeHover = () => document.body.classList.remove('active');
    window.addEventListener('dragleave', removeHover);
    window.addEventListener('dragend', removeHover);
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        removeHover();
        reverseFiles(e.dataTransfer);
    });

    const longestIntegerSubstring = (str) =>
        str.match(/\d+/g)?.reduce((longest, current) => current.length > longest.length ? current : longest, '') ?? '';

    function reverseFiles(dataTransfer) {
        for (const item of dataTransfer.items) {
            if (item.kind === 'file' && (item.type.includes('image/') || item.type.includes('video/'))) {
                const id = longestIntegerSubstring(item.getAsFile().name);
                // Should be fine for any new tweet id's, no images likely being saved before 2009
                if (id.length > 10) {
                    chrome.tabs.create({url: `https://x.com/hello/status/${id}`});
                } else {
                    alert(`Error parsing file name for ${item.getAsFile().name}, are you sure this file has a tweet id in the name?`);
                }
            }
        }
    }
})();