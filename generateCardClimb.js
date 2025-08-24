import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { climbCard } from './website/components/climbCard.js';
import { returnClimbURL } from "./website/js/modules/convertNameToURL.js";

// Path helpers for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FOLDER = './website/climbs';

const allData = JSON.parse(fs.readFileSync('./website/data/data.json'));
const climbsData = allData.climbs.filter(climb => climb.status === 'publish');
const navHTML = fs.readFileSync('./website/components/nav.html', 'utf8');
const footerHTML = fs.readFileSync('./website/components/footer.html', 'utf8');

function getOtherClimbs(climbGeo) {
    const nearbyClimbs = [];
    for (const compClimb of allData.climbs) {
        if (compClimb.status === "publish") {
            const dLat = (climbGeo.split(',')[0] - compClimb.geoLocation.split(',')[0]) * Math.PI / 180;
            const dLon = (climbGeo.split(',')[1] - compClimb.geoLocation.split(',')[1]) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(compClimb.geoLocation.split(',')[0] * Math.PI / 180) *
                Math.cos(climbGeo.split(',')[0] * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = 6371 * c;
            const distance = d.toFixed(1);

            if ((distance <= 40) && (distance != 0)) {
                nearbyClimbs.push({
                    distance,
                    id: compClimb.id,
                    tileImg: compClimb.tileImage,
                    cliff: compClimb.cliff,
                    routeName: compClimb.routeName,
                    grade: compClimb.originalGrade,
                    length: compClimb.length
                });
            }
        }
    }
    return nearbyClimbs;
}

function generate() {
    const baseFolder = path.resolve(__dirname, OUTPUT_FOLDER);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder);
    }

    const climbsAndHtml = climbsData.map(climb => {
        const climbId = climb.id;
        const thisClimb = JSON.parse(fs.readFileSync(`./website/data/climbs/${climbId}.json`));
        climb.folderLocation = returnClimbURL(climb.routeName, climb.cliff);

        let headHTML = fs.readFileSync('./website/components/head.html', 'utf8');
        headHTML = headHTML.replace(/{{title}}/gi, `${climb.routeName} on ${climb.cliff} | multi-pitch rock climbing`)
            .replace(/{{cannonical}}/gi, `https://www.multi-pitch.com/climbs/${climb.folderLocation}`)
            .replace(/{{heroJpg}}/gi, `https://www.multi-pitch.com/${climb.tileImage.url}`)
            .replace(/{{description}}/gi, `An overview of ${climb.routeName}, a ${climb.length}m multi-pitch rock climb on ${climb.cliff} in ${climb.county}, ${climb.country}. Includes detailed photo topo of the route and more info.`)
            .replace(/{{id}}/gi, climbId);

        const nearbyClimbsData = getOtherClimbs(climb.geoLocation);
        return {
            climb,
            html: headHTML + navHTML + climbCard(thisClimb, nearbyClimbsData) + footerHTML
        };
    });

    const promises = climbsAndHtml.map(climbAndHtml => {
        const folderName = returnClimbURL(climbAndHtml.climb.routeName, climbAndHtml.climb.cliff);
        const folderLocation = path.resolve(baseFolder, folderName);
        if (!fs.existsSync(folderLocation)) {
            fs.mkdirSync(folderLocation);
        }
        const fileLocation = path.resolve(folderLocation, 'index.html');
        return new Promise((resolve, reject) => {
            fs.writeFile(fileLocation, climbAndHtml.html, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    });

    Promise.all(promises)
        .then(() => console.log(`All good man :)) file saved in here: ${OUTPUT_FOLDER}`))
        .catch(err => console.error(`Some error happened.... ${err}`));
}

generate();