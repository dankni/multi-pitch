/**
 * This is a temp file for editing all dates in JSON files
 * Saving it in case we need to do similar global updates 
 **/

 const fs = require('fs');
 const clmbsFolder = './website/data/climbs/';
 const allData = fs.readFileSync("./website/data/data.json");
 let allClimbData = JSON.parse(allData);
 
 
 fs.readdirSync(clmbsFolder).forEach(file => {
 //    console.log(file);
     let location = "./website/data/climbs/" + file 
     let climbFile = fs.readFileSync(location, 'utf8');
     let fileData = JSON.parse(climbFile);
     fileData.climbData.lastUpdate = "2021-10-15T01:01:02.339Z";
     fs.writeFile(location, JSON.stringify(fileData), {encoding:'utf8', flag:'w'}, function (err) {
        if (err) throw err;
     });
 
 });
 