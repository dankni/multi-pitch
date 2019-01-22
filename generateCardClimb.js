const fs = require('fs');
const path = require('path');


// given a climb id it will generate the html to display it
const OUTPUT_FOLDER = './website/climbs';
const climbCard = require('./website/components/climbCard').climbCard;
const allData = require('./website/data/data');
const climbsData = allData.climbsData;
const climbImgs = allData.climbImgs;
const weatherData = allData.weatherData;
const guideBooks = allData.guideBooks;
const getGraph = require('./website/js/graph').getGraph;
const navHTML = fs.readFileSync('./website/components/nav.html', 'utf8');
const footerHTML = fs.readFileSync('./website/components/footer.html', 'utf8');

const rootProject = "../../";

function generate() {
    const baseFolder = path.resolve(__dirname, OUTPUT_FOLDER);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder);
    }

    var climbsAndHtml = climbsData.climbs.map(climb => {
        var climbId = climb.id;
        var cImgs = climbImgs.imgs.filter(img => img.climbId === climbId);  //note find returns first vs filter returns all.
        var mapImg = cImgs.find(img => img.type === 'map'); // get the map img object
        var cragImg = cImgs.find(img => img.type === 'crag');
        var topoImg = cImgs.find(img => img.type === 'topo');
        var guideBook = guideBooks.books.find(book => book.climbId === climbId); // ToDo: update to filter then allow multiple to show
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

        if (climb.status === 'publish') {
            headHTML = headHTML.replace(regexTitle, climb.routeName + ' on ' + climb.cliff + ' | multi-pitch rock climbing');
            headHTML = headHTML.replace(regexUrl, 'https://www.multi-pitch.com/climbs/' + folderName + '/');
            headHTML = headHTML.replace(regexHero, 'https://www.multi-pitch.com/' + cragImg.url);
            headHTML = headHTML.replace(regexDesc, 'An overview of ' + climb.routeName + ', a ' + climb.length + 'm multi-pitch rock climb on ' + climb.cliff + ' in ' + climb.county + ', ' + climb.country + '. Includes detailed photo topo of the route and more info.');
        }


        return {
            climb: climb,
            html: headHTML + navHTML + climbCard(rootProject, climb, mapImg, cragImg, topoImg, guideBook, weatherData, getGraph) + footerHTML
        };
    });

    const promises = climbsAndHtml.map(climbAndHtml => {

        var folderName = "".concat(climbAndHtml.climb.routeName, '-on-', climbAndHtml.climb.cliff)
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