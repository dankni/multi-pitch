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

function getOtherClimbs(climbGeo){
    var climbsData = allData;
    var nearbyClimbs = [];
    for (var i = 0; i < climbsData.climbs.length; i++) {
        var compClimb = climbsData.climbs[i]; //comparison climb
        if(compClimb.status === "publish") { // ensures unpublished climbs are not processed
            // Get distance in KM between two lat,lon's
            var dLat = (climbGeo.split(',')[0] - compClimb.geoLocation.split(',')[0]) * Math.PI / 180;
            var dLon = (climbGeo.split(',')[1] - compClimb.geoLocation.split(',')[1]) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(compClimb.geoLocation.split(',')[0] * Math.PI / 180) * 
                Math.cos(climbGeo.split(',')[0] * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = 6371 * c; // 6371 = km
            var distance = d.toFixed(1);
            
            if((distance <= 40) && (distance != 0)){
                var nearbyClimb = {}
                nearbyClimb.distance = distance;
                nearbyClimb.id = compClimb.id;
                nearbyClimb.tileImg = compClimb.tileImage;
                nearbyClimb.cliff = compClimb.cliff;
                nearbyClimb.routeName = compClimb.routeName;
                nearbyClimb.grade = compClimb.originalGrade;
                nearbyClimb.length = compClimb.length;
                nearbyClimbs.push(nearbyClimb);
            }
        } 
    }
    return nearbyClimbs;
}

function returnClimbURL(route, cliff){
    var folderName = "".concat(route.trim(), '-on-', cliff.trim())
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/\//g, "")
            .replace(/ /g, "-");
        folderName = folderName + '/';
    return folderName;
}

function generate() {
    const baseFolder = path.resolve(__dirname, OUTPUT_FOLDER);

    if (!fs.existsSync(baseFolder)) {
        fs.mkdirSync(baseFolder);
    }

    var climbsAndHtml = climbsData.map(climb => {

        var climbId = climb.id;
        var thisClimb = require('./website/data/climbs/' + climbId + '.json');
        climb.folderLocation = returnClimbURL(climb.routeName, climb.cliff);

        var headHTML = fs.readFileSync('./website/components/head.html', 'utf8');
        var regexTitle = /{{title}}/gi;
        var regexUrl = /{{cannonical}}/gi;
        var regexHero = /{{heroJpg}}/gi;
        var regexDesc = /{{description}}/gi;
        var regexId = /{{id}}/gi;

        if (climb.status === 'publish') {
            headHTML = headHTML.replace(regexTitle, climb.routeName + ' on ' + climb.cliff + ' | multi-pitch rock climbing');
            headHTML = headHTML.replace(regexUrl, 'https://www.multi-pitch.com/climbs/' + climb.folderLocation);
            headHTML = headHTML.replace(regexHero, 'https://www.multi-pitch.com/' + climb.tileImage.url);
            headHTML = headHTML.replace(regexDesc, 'An overview of ' + climb.routeName + ', a ' + climb.length + 'm multi-pitch rock climb on ' + climb.cliff + ' in ' + climb.county + ', ' + climb.country + '. Includes detailed photo topo of the route and more info.');
            headHTML = headHTML.replace(regexId, climbId);
        }
        var nearbyClimbsData = getOtherClimbs(climb.geoLocation);
        return {
            climb: climb,
            html: headHTML + navHTML + climbCard(thisClimb, nearbyClimbsData) + footerHTML
        };
    });

    const promises = climbsAndHtml.map(climbAndHtml => {

        var folderName = returnClimbURL(climbAndHtml.climb.routeName, climbAndHtml.climb.cliff);

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