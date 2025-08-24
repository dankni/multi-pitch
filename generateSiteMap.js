import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { returnClimbURL } from "./website/js/modules/convertNameToURL.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FOLDER = './website';
const FILE_NAME = 'sitemap.xml';

// Import JSON directly (Node >=17.5, with "type": "module" in package.json)
const allData = JSON.parse(fs.readFileSync('./website/data/data.json'));
const climbsData = allData.climbs.filter(climb => climb.status === 'publish');
//import climbsDataJson from './website/data/data.json' assert { type: 'json' };
//const climbsData = climbsDataJson;

function generate() {
    const urlsEntry = climbsData.map(climb => {
        const loc = "https://www.multi-pitch.com/climbs/" + returnClimbURL(climb.routeName, climb.cliff);
        let lastmod;
        if (climb.lastUpdate !== null) {
            lastmod = climb.lastUpdate.substring(0, 10);
        } else {
            lastmod = '2019-09-04';
        }
        return `
        <url>
            <loc>${loc}</loc>
            <lastmod>${lastmod}</lastmod>
            <priority>0.80</priority>
        </url>`;
    });
    let date = (new Date()).toISOString().substring(0, 10);
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
        <url>
            <loc>https://www.multi-pitch.com/</loc>
            <lastmod>${date}</lastmod>
            <priority>1.0</priority>
        </url>
        <url>
            <loc>https://www.multi-pitch.com/about/</loc>
            <lastmod>2020-04-04</lastmod>
            <priority>0.8</priority>
        </url>
        <url>
            <loc>https://www.multi-pitch.com/map/</loc>
            <lastmod>${date}</lastmod>
            <priority>0.6</priority>
        </url>
        <url>
            <loc>https://www.multi-pitch.com/climbing-tips/</loc>
            <lastmod>2020-04-08</lastmod>
            <priority>0.7</priority>
        </url>
        <url>
            <loc>https://www.multi-pitch.com/climbing-tips/climbing-grades/</loc>
            <lastmod>2020-03-31</lastmod>
            <priority>0.7</priority>
        </url>
        <url>
            <loc>https://www.multi-pitch.com/climbing-tips/rock-types/</loc>
            <lastmod>2020-04-08</lastmod>
            <priority>0.7</priority>
        </url>
        <url>
            <loc>https://www.multi-pitch.com/climbing-tips/climbing-gear/</loc>
            <lastmod>2020-04-15</lastmod>
            <priority>0.7</priority>
        </url>${urlsEntry.join('')}
    </urlset>`;

    const fileLocation = path.resolve(__dirname, OUTPUT_FOLDER, FILE_NAME);
    return new Promise((resolve, reject) => {
        fs.writeFile(fileLocation, sitemap, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

generate()
    .then(_ => console.log("All good man :)) file saved in here: " + OUTPUT_FOLDER))
    .catch(err => console.error(`Some error happened.... ${err}`));
