import fs from 'node:fs';
import * as common from "./common.js";

export const chrome_manifest_name = 'manifest_chrome.json';
export const firefox_manifest_name = 'manifest_firefox.json';
export const main_manifest_name = 'manifest.json';

export const chrome_manifest = common.joinWithSrc(chrome_manifest_name);
export const firefox_manifest = common.joinWithSrc(firefox_manifest_name);
export const main_manifest = common.joinWithSrc(main_manifest_name);

export function isFirefoxManifest() {
    return fs.existsSync(chrome_manifest);
}

export function isChromeManifest() {
    return fs.existsSync(firefox_manifest);
}

export function swapManifests() {
    if (isFirefoxManifest()) { // make chrome
        fs.renameSync(main_manifest, firefox_manifest);
        fs.renameSync(chrome_manifest, main_manifest);
        console.log('Switched to Chrome manifest');
    } else if (isChromeManifest()) { // make firefox
        fs.renameSync(main_manifest, chrome_manifest);
        fs.renameSync(firefox_manifest, main_manifest);
        console.log('Switched to Firefox manifest');
    } else {
        console.error('No alternate manifest files found.');
    }
}

if (common.isMain(import.meta)) {
    swapManifests();
}