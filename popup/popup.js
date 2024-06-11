assign_button_to_page(document.getElementById("reversing"), "reverse_page/image_to_source.html");
assign_button_to_page(document.getElementById("settings"), "settings/settings.html");

function assign_button_to_page(button, page_path) {
    button.addEventListener('click', () => {
        chrome.tabs.create({url: chrome.runtime.getURL(page_path)});
        window.close();
    })
}