const fs = require('fs');
const path = require('path');


// given a climb id it will generate the html to display it
const OUTPUT_FOLDER = './website/climbs';
const climbCard = require('./website/components/climbCard').climbCard;
const allData = require('./website/data/data.json');
var climbsData = allData;
climbsData = climbsData.climbs.filter(climb => climb.status === 'publish');
const navHTML = fs.readFileSync('./website/components/nav.html', 'utf8');
const footerHTML = fs.readFileSync('./website/components/footer.html', 'utf8');

function generate() {
    const baseFolder = path.resolve(__dirname, OUTPUT_FOLDER);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder);
    }

    var climbsAndHtml = climbsData.map(climb => {

        var climbId = climb.id;
        let thisClimb = require('./website/data/climbs/' + climbId + '.json').climbData;
        var folderName = "".concat(climb.routeName, '-on-', climb.cliff + '/')
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/\//g, "")
            .replace(/ /g, "-");
        climb.folderLocation = folderName;

        var headHTML = fs.readFileSync('./website/components/head.html', 'utf8');
        var regexTitle = /{{title}}/gi;
        var regexUrl = /{{cannonical}}/gi;
        var regexHero = /{{heroJpg}}/gi;
        var regexDesc = /{{description}}/gi;
        var regexId = /{{id}}/gi;

        if (climb.status === 'publish') {
            headHTML = headHTML.replace(regexTitle, climb.routeName + ' on ' + climb.cliff + ' | multi-pitch rock climbing');
            headHTML = headHTML.replace(regexUrl, 'https://www.multi-pitch.com/climbs/' + folderName + '/');
            headHTML = headHTML.replace(regexHero, 'https://www.multi-pitch.com/' + climb.tileImage.url);
            headHTML = headHTML.replace(regexDesc, 'An overview of ' + climb.routeName + ', a ' + climb.length + 'm multi-pitch rock climb on ' + climb.cliff + ' in ' + climb.county + ', ' + climb.country + '. Includes detailed photo topo of the route and more info.');
            headHTML = headHTML.replace(regexId, climbId);
        }

        return {
            climb: climb,
            html: headHTML + navHTML + climbCard(thisClimb) + footerHTML
        };
    });

    const promises = climbsAndHtml.map(climbAndHtml => {

        var folderName = "".concat(climbAndHtml.climb.routeName.trim(), '-on-', climbAndHtml.climb.cliff.trim())
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/\//g, "")
            .replace(/ /g, "-");
        folderName = folderName + '/';

        const folderLocation = path.resolve(baseFolder, folderName);
        if (!fs.existsSync(folderLocation)) {
            fs.mkdirSync(folderLocation);
        }
        const fileLocation = path.resolve(folderLocation, 'index.html');
        return new Promise((resolve, reject) => {
            fs.writeFile(fileLocation, climbAndHtml.html, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            })
        })
    });

    Promise.all(promises)
        .then(_ => console.log("All good man :)) file saved in here: " + OUTPUT_FOLDER))
        .catch(err => console.error(`Some shit happen.... ${err}`));

}

generate();