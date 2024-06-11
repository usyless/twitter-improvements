document.getElementById('file').addEventListener('change', (e) => reverseFile(e.target.files[0]));

function reverseFile(file) {
    const name = file.name.split("-");
    if (name[0].includes('twitter')) chrome.tabs.create({url: `https://twitter.com/hello/status/${name[1].match(/\d+/)[0].trim()}`});
    else alert('Not a twitter file');
}