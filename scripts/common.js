import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const __dirname = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const SRC_DIR = path.join(__dirname, "src");
export const RELEASES_DIR = path.join(__dirname, "releases");

export const makeQuoted = (a) => `"${a}"`;

export const joinWith = (dir) => a => path.join(dir, a);
export const joinWithSrc = joinWith(SRC_DIR);
export const joinWithReleases = joinWith(RELEASES_DIR);
export const joinWithDir = joinWith(__dirname);

export const joinWithQuoted = (jw) => a => makeQuoted(jw(a));

export const joinWithSrcQuoted = joinWithQuoted(joinWithSrc);
export const joinWithReleasesQuoted = joinWithQuoted(joinWithReleases);
export const joinWithDirQuoted = joinWithQuoted(joinWithDir);

export function isMain(importMeta) {
    return importMeta.url === pathToFileURL(process.argv[1]).href;
}