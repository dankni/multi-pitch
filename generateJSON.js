/**
 * This is a temp file until the CMS is up and running
 **/

const fs = require('fs');
const allData = require('./website/data/all-data.js');
const climbsData = allData.climbsData;
const climbImgs = allData.climbImgs;
const weatherData = allData.weatherData;
const allGuidebooks = allData.guideBooks;
const referances = allData.referances;

for(let i = 0; i < climbsData.climbs.length; i++) {
    if(climbsData.climbs[i].status === 'publish'){

        var climb = climbsData.climbs[i]; // get the climb object by id
        var cImgs = climbImgs.imgs.filter(img => img.climbId === climbsData.climbs[i].id);  //note find returns first vs filter returns all.
        var referanceLines = referances.referanceLines.filter(refline => refline.climbId === climbsData.climbs[i].id);
        var correctGuideBooks = allGuidebooks.books.filter(book => book.climbId === climbsData.climbs[i].id); 
        var weatherLines =  weatherData.weatherLines.filter(wl => wl.climbId === climbsData.climbs[i].id);

        var topoImg = cImgs.find(img => img.type === 'topo');
        var mapImage = cImgs.find(img => img.type === 'map');

        let location = './website/data/climbs/' + climbsData.climbs[i].id + '.json';

        // output in clean format
        let currentClimb = {};
        currentClimb.climbData = climb;
        currentClimb.climbData.weatherData = weatherLines;
        currentClimb.climbData.mapImg = mapImage;
        currentClimb.climbData.mapImg.geo  = climb.geoLocation;
        currentClimb.climbData.topo = topoImg;
        currentClimb.climbData.referances = referanceLines;
        currentClimb.climbData.guideBooks = correctGuideBooks
        delete currentClimb.climbData.mapImg.climbId;
        delete currentClimb.climbData.mapImg.concatHelper;
        delete currentClimb.climbData.mapImg.type;
        delete currentClimb.climbData.mapImg.dataFile;
        delete currentClimb.climbData.flag;
        delete currentClimb.climbData.topo.climbId;
        delete currentClimb.climbData.topo.concatHelper;
        delete currentClimb.climbData.topo.type;
        delete currentClimb.climbData.updateTimestamp;
        currentClimb.climbData.lastUpdate = currentClimb.climbData.lastUpdate === null ? "2019-04-09T12:00:00.000Z" : currentClimb.climbData.lastUpdate;
        for(let i = 0; i < currentClimb.climbData.referances.length; i++){
            delete currentClimb.climbData.referances[i].climbId;
            delete currentClimb.climbData.referances[i].description;
        }
        for(let i = 0; i < currentClimb.climbData.guideBooks.length; i++){
            delete currentClimb.climbData.guideBooks[i].climbId;
        }
        for(let i = 0; i < currentClimb.climbData.weatherData.length; i++){
            delete currentClimb.climbData.weatherData[i].climbId;
        }
        let data = JSON.stringify(currentClimb);
        fs.writeFile(location, data, {encoding:'utf8', flag:'w'}, function (err) {
            if (err) throw err;
        });
    } 
}