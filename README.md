<h1 align="center"><a href="#"><img src="https://github.com/usyless/twitter-improvements/blob/main/src/icons/icon.svg?raw=true" width="160" height="160" alt="logo"></a><br>Improvements for Twitter</h1>

| ![](https://github.com/usyless/twitter-improvements/blob/main/assets/cover.png?raw=true)     | ![](https://github.com/usyless/twitter-improvements/blob/main/assets/features.png?raw=true)  |
|---------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| ![](https://github.com/usyless/twitter-improvements/blob/main/assets/settings1.png?raw=true) | ![](https://github.com/usyless/twitter-improvements/blob/main/assets/settings2.png?raw=true) |

A simple web extension which brings a few quality of life features to twitter/X. 

# Features

Copy as VX/FX/Custom Button
- Each tweet will display a button to copy the link to the tweet directly using VXTwitter, FXTwitter, or a custom prefix to allow for better embedding when sending on other platforms.

Image Save Button
- Shows a download button in the top left corner of each image, which saves the image in the highest quality available and with custom reversible filenames.

Video Download Button
- Displays next to the Copy as VX button on each tweet with a video or a gif, and clicking it allows you to save all media in that tweet with the same good naming scheme!
- Downloads videos locally.

Image/Video Download History
- Can keep track of downloaded files, and even prevent you from re-saving them if enabled!
- Can import previously downloaded files to keep track, and export downloaded files list to re-import

Image/Video full thumbnail previews
- Hover/click button in download picker to show media that may be obscured/not fully visible!
- Setting to set timeout for full media thumbnails on hovering over download buttons

Hide various unnecessary buttons or tabs (such as premium, verified orgs, etc.)

Rearrange the buttons on tweets (like, reply, retweet, etc.)

Display bookmark button on enlarged image/video view

Save Image Context Menu
- A right click context menu for all images on Twitter to save them, just like with the button

**All of the above and more are toggleable with the extensions settings**

Saved Image/Video Reversing
- Allows you to upload any image or video saved by this extension and retrieve the original tweet it was saved from.

# Installation

<a href="https://addons.mozilla.org/en-GB/firefox/addon/improvements-for-twitter/"><img src="https://github.com/usyless/twitter-improvements/blob/main/assets/3rdparty/firefox-addons.webp?raw=true" alt="Firefox Addons Link"></a>


<a href="https://chromewebstore.google.com/detail/improvements-for-twitter/joficcmkfcceifjloncilgpnljofjfdc"><img src="https://github.com/usyless/twitter-improvements/blob/main/assets/3rdparty/chrome-web-store.png?raw=true" alt="Chrome Web Store Link"></a>


**Edge Mobile Canary**
1. Download the latest release from the releases tab
2. Within the `src` directory, delete manifest.bat, and rename `manifest_chrome.bat` to `manifest.bat`
3. Open a desktop chromium browser, navigate to `chrome://extensions`, click on `Pack extension`
4. Choose the `src` directory as the root, then click pack to get a `.crx` file
5. Transfer this file to your phone, then within edge canary go to Settings > Developer Options > Extension install by crx
6. Select the `.crx` file, and your extension is installed! Though this will require manual updating...
