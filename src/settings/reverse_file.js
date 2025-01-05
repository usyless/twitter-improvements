'use strict';

(() => {
    document.getElementById('reverseFile').addEventListener('click', () => {
        document.getElementById('reverseFileInput').click();
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
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        reverseFiles(e.dataTransfer);
    });

    function reverseFiles(dataTransfer) {
        for (const item of dataTransfer.items) if (item.kind === 'file' && (item.type.includes('image/') || item.type.includes('video/'))) reverseFile(item.getAsFile());
    }

    function reverseFile(file) {
        const name = file.name.split("-");
        if (name[0].includes('twitter')) chrome.tabs.create({url: `https://x.com/hello/status/${name[1].match(/\d+/)[0].trim()}`});
        else alert('Not a twitter file');
    }
})();