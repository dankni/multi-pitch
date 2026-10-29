import fs from 'fs';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';

// Makes a .webp next to every .jpg / .jpeg / .png under website/img.
// The .webp files are build output and are gitignored: only commit the original.
// A .webp is only rebuilt when it is missing or its source has changed, judged
// by a hash of the source's contents (and the settings) kept in HASH_FILE, so
// re-running is quick. Not by modified time: a CI checkout makes every source
// newer than the .webp files it restores from its cache.

const require = createRequire(import.meta.url);
const webp = require('webp-converter');
// webp-converter's own cwebp() wrapper splits arguments on spaces and swallows
// errors, so we only borrow its bundled cwebp binary and call it directly
const cwebpPath = require('webp-converter/src/cwebp.js')();
const run = promisify(execFile);

const IMG_FOLDER = './website/img';
const SOURCE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
// 75 matches the quality of the webp files that used to be committed;
// method 6 is cwebp's slowest / best compression, a few % smaller at the same quality
const QUALITY = '75';
const METHOD = '6';
const HASH_FILE = './.webp-hashes.json';

function findImages(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return findImages(fullPath);
        }
        return SOURCE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()) ? [fullPath] : [];
    });
}

function webpPathFor(imagePath) {
    return imagePath.slice(0, -path.extname(imagePath).length) + '.webp';
}

// the same on Windows as in CI
function hashKey(imagePath) {
    return imagePath.split(path.sep).join('/');
}

function sourceHash(imagePath) {
    return crypto.createHash('sha1').update(QUALITY + ' ' + METHOD + ' ').update(fs.readFileSync(imagePath)).digest('hex');
}

function readHashes() {
    try {
        return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
    } catch (err) {
        return {};
    }
}

// a .webp made before there were hashes counts if it is newer than its source
function isUpToDate(imagePath, hash, hashes) {
    const webpPath = webpPathFor(imagePath);
    if (!fs.existsSync(webpPath)) { return false; }
    if (hashes[hashKey(imagePath)] !== undefined) { return hashes[hashKey(imagePath)] === hash; }
    return fs.statSync(webpPath).mtimeMs >= fs.statSync(imagePath).mtimeMs;
}

async function convert(imagePath) {
    await run(cwebpPath, ['-quiet', '-q', QUALITY, '-m', METHOD, imagePath, '-o', webpPathFor(imagePath)]);
}

async function generate() {
    if (process.platform !== 'win32') {
        // the bundled binaries are not always marked executable on Linux / macOS
        webp.grant_permission();
    }

    const images = findImages(IMG_FOLDER);
    const hashes = readHashes();
    const newHashes = Object.fromEntries(images.map(imagePath => [hashKey(imagePath), sourceHash(imagePath)]));
    const toConvert = images.filter(imagePath => !isUpToDate(imagePath, newHashes[hashKey(imagePath)], hashes));
    console.log(`WebP: ${images.length} images, ${toConvert.length} to convert`);

    // a few cwebp processes at once, one per CPU
    const queue = [...toConvert];
    const failures = [];
    const workers = Array.from({ length: os.availableParallelism() }, async () => {
        while (queue.length > 0) {
            const imagePath = queue.shift();
            try {
                await convert(imagePath);
            } catch (err) {
                failures.push(`${imagePath}: ${err.message}`);
            }
        }
    });
    await Promise.all(workers);

    // a failed one keeps its old hash, or none, so it is tried again next time
    failures.forEach(failure => {
        const imagePath = hashKey(failure.slice(0, failure.indexOf(': ')));
        if (hashes[imagePath] === undefined) { delete newHashes[imagePath]; }
        else { newHashes[imagePath] = hashes[imagePath]; }
    });
    // sorted, so the file only changes when an image does - CI caches by its checksum
    fs.writeFileSync(HASH_FILE, JSON.stringify(Object.fromEntries(Object.keys(newHashes).sort().map(key => [key, newHashes[key]])), null, 1));

    if (failures.length > 0) {
        console.error(`WebP: ${failures.length} failed\n${failures.join('\n')}`);
        process.exit(1);
    }
    console.log('WebP: done');
}

generate();
