import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';

// Makes a .webp next to every .jpg / .jpeg / .png under website/img.
// The .webp files are build output and are gitignored: only commit the original.
// A .webp is only rebuilt when it is missing or older than its source image,
// so re-running locally is quick. In CI every checkout starts without them.

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

function isUpToDate(imagePath) {
    const webpPath = webpPathFor(imagePath);
    return fs.existsSync(webpPath) && fs.statSync(webpPath).mtimeMs >= fs.statSync(imagePath).mtimeMs;
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
    const toConvert = images.filter(imagePath => !isUpToDate(imagePath));
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

    if (failures.length > 0) {
        console.error(`WebP: ${failures.length} failed\n${failures.join('\n')}`);
        process.exit(1);
    }
    console.log('WebP: done');
}

generate();
