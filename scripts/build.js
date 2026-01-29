import fs from "node:fs/promises";
import fs_sync from "node:fs";
import { execSync } from "node:child_process";
import * as common from './common.js';
import { isFirefoxManifest, swapManifests, main_manifest, chrome_manifest,
    chrome_manifest_name, firefox_manifest_name } from "./swap-manifests.js";

import pkg from "../package.json" with { type: "json" }

async function mkdir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {
        // ignore if exists
    }
}

const firefox_id_to_replace = "twitter-improvements@usyless.uk";
const firefox_id_to_replace_to  = "{49f6525f-921e-4ff0-804d-a85f95ad3233}";

function fixFirefoxManifest() {
    let text = fs_sync.readFileSync(main_manifest, "utf8");
    text = text.replaceAll(firefox_id_to_replace, firefox_id_to_replace_to);
    fs_sync.writeFileSync(main_manifest, text);
}

function undoFirefoxManifest() {
    let text = fs_sync.readFileSync(main_manifest, "utf8");
    text = text.replaceAll(firefox_id_to_replace_to, firefox_id_to_replace);
    fs_sync.writeFileSync(main_manifest, text);
}

function run(cmd, options = {}) {
    console.log(`> ${cmd}`);
    execSync(cmd, { stdio: "inherit", ...options });
}

function makeZip(output, directory) {
    if (process.platform === "win32") { // use 7z
        run(`7z a ${output} .`, { cwd: directory });
    } else { // use zip
        if (fs_sync.existsSync(output)) fs_sync.unlinkSync(output);
        run(`zip -r ${output} .`, { cwd: directory });
    }
}

async function makeReleaseFor(platform, version) {
    console.log(`Making release for: ${platform}`);

    makeZip(common.joinWithReleasesQuoted(`${pkg.name} ${platform} v${version}.zip`), common.SRC_DIR);

    console.log(`Finished making release for: ${platform}`);
}

await (async () => {
    await mkdir(common.RELEASES_DIR);

    console.log("\nMaking Release\n");

    // make it firefox
    if (!isFirefoxManifest()) {
        swapManifests();
    }

    const json = JSON.parse(await fs.readFile(main_manifest, 'utf8'));

    const version = json.version;
    if (!version) {
        console.error('Failed to read version!');
        return;
    }

    console.log(`Version: ${version}`);

    const chrome_manifest_temp = common.joinWithDir(chrome_manifest_name);
    const firefox_manifest_temp = common.joinWithDir(firefox_manifest_name);

    try {
        fs_sync.renameSync(chrome_manifest, chrome_manifest_temp);

        fixFirefoxManifest();
        await makeReleaseFor('firefox', version);
        undoFirefoxManifest();

        fs_sync.renameSync(main_manifest, firefox_manifest_temp);
        fs_sync.renameSync(chrome_manifest_temp, main_manifest);

        await makeReleaseFor('chromium', version);

        fs_sync.renameSync(main_manifest, chrome_manifest);
        fs_sync.renameSync(firefox_manifest_temp, main_manifest);
    } catch (e) {
        console.error('Failed to make release! Make sure you have 7zip installed if on windows and zip if on linux.\nError:', e);
        // this will mess up files for now but that can be fixed eventually
    }

    console.log("\nRelease Finished\n");
})();