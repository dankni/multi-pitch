const fs = require('fs');
const path = require('path');

const OUTPUT_FOLDER = './website';
const FILE_NAME = 'sitemap.xml';

const allData = require('./website/data/data');
const climbsData = allData.climbsData;


function generate() {

    const urlsEntry = climbsData.climbs.map(climb => {
        const loc = "https://www.multi-pitch.com/climbs/"
            .concat(climb.routeName, '-on-', climb.cliff + '/')
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/ /g, "-");
        const lastmod = (new Date()).toISOString().split('T')[0];


        return `
            <url>
                <loc>${loc}</loc>
                <lastmod>${lastmod}</lastmod>
                <priority>0.80</priority>
            </url>`
    });
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
        ${urlsEntry.join('')}
    </urlset>`;


    const fileLocation = path.resolve(__dirname, OUTPUT_FOLDER, FILE_NAME);
    return new Promise((resolve, reject) => {
        fs.writeFile(fileLocation, sitemap, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        })
    })
}

generate()
    .then(_ => console.log("All good man :)) file saved in here: " + OUTPUT_FOLDER))
    .catch(err => console.error(`Some shit happen.... ${err}`));
