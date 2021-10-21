/**
 * This is a temp file for merging topo.js int climb.json
 * Saving it in case we need to do similar global updates 
 **/

const fs = require('fs');
const topoFolder = './website/data/topos/';
const allData = fs.readFileSync("./website/data/data.json");
let allClimbData = JSON.parse(allData);


fs.readdirSync(topoFolder).forEach(file => {
    let location = "./website/data/climbs/" + file + "on"
    let climbFile = fs.readFileSync(location, 'utf8');
    let fileData = JSON.parse(climbFile);

    let currentTopo = fs.readFileSync(topoFolder + file, 'utf8');
    currentTopo = currentTopo.replace("var topoData = ", "").trim();
    currentTopo = currentTopo.replace(";","");
    let topoJS = JSON.parse(currentTopo);
    fileData.topoData = topoJS;

    let lastUpdate = Date.parse(fileData.climbData.lastUpdate);
    lastUpdate = new Date(lastUpdate + (1000 * 60 * 60 * 24)); // add a day
    fileData.climbData.lastUpdate = lastUpdate;

    let climbToFind = allClimbData.climbs.find(climb => climb.id === parseInt(file.replace(".js", "")));
    if(new Date(climbToFind.lastUpdate) >= lastUpdate){
        fileData.climbData.lastUpdate = climbToFind.lastUpdate;
    } else {
        climbToFind.lastUpdate = lastUpdate;
    }
  
    
    fs.writeFile(location, JSON.stringify(fileData), {encoding:'utf8', flag:'w'}, function (err) {
       if (err) throw err;
    });

});

//console.log(allClimbData);

//update the main file
fs.writeFile("./website/data/data.json", JSON.stringify(allClimbData), {encoding:'utf8', flag:'w'}, function (err) {
    if (err) throw err;
});