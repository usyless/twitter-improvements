document.getElementById('file').addEventListener('change', (e) => {
    const d = new DataTransfer();
    for (const file of e.target.files) d.items.add(file);
    reverseFiles(d);
});
document.addEventListener('paste', (e) => {
    e.preventDefault();
    reverseFiles(e.clipboardData);
});
document.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy';
});
document.addEventListener('drop', (e) => {
    e.preventDefault();
    reverseFiles(e.dataTransfer);
});

function reverseFiles(dataTransfer) {
    for (const item of dataTransfer.items) if (item.kind === 'file' && item.type.includes('image/')) reverseFile(item.getAsFile());
}

function reverseFile(file) {
    const name = file.name.split("-");
    if (name[0].includes('twitter')) chrome.tabs.create({url: `https://x.com/hello/status/${name[1].match(/\d+/)[0].trim()}`});
    else alert('Not a twitter file');
}