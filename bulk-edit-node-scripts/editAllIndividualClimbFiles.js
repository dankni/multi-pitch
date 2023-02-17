/**
 * This is a temp file for editing all dates in JSON files
 * Saving it in case we need to do similar global updates 
 **/

 const fs = require('fs');
 const clmbsFolder = '../website/data/climbs/';
 // const allData = fs.readFileSync("./website/data/data.json");
 // let allClimbData = JSON.parse(allData);
 
 
 fs.readdirSync(clmbsFolder).forEach(file => {
 //    console.log(file);
     let location = "../website/data/climbs/" + file 
     let climbFile = fs.readFileSync(location, 'utf8');
     let fileData = JSON.parse(climbFile);
     // fileData.climbData.lastUpdate = "2023-01-23T01:01:02.339Z"; // yy mm dd 
     try{
        delete fileData.climbData.mapImg.geo;
     } catch (e) {
        console.log("No map geo for this climb " + e);
     }
     fs.writeFile(location, JSON.stringify(fileData), {encoding:'utf8', flag:'w'}, function (err) {
        if (err) throw err;
     });
 
 });
 