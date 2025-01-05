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

    function reverseFiles(dataTransfer) {
        for (const item of dataTransfer.items) if (item.kind === 'file' && (item.type.includes('image/') || item.type.includes('video/'))) reverseFile(item.getAsFile());
    }

    function reverseFile(file) {
        const name = file.name.split("-");
        if (name[0].includes('twitter')) chrome.tabs.create({url: `https://x.com/hello/status/${name[1].match(/\d+/)[0].trim()}`});
        else alert('Not a twitter file');
    }
})();