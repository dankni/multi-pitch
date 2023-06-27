/**
 * This is a temp file for editing all dates in JSON files
 * it will upadate all climbs by 10 seconds to keep the order but bust the cache
 **/

const fs = require('fs');
const clmbsFolder = '../website/data/climbs/';
let newTime;
const allData = fs.readFileSync("../website/data/data.json");
let allClimbData = JSON.parse(allData);


fs.readdirSync(clmbsFolder).forEach(file => {
   let location = clmbsFolder + file 
   let climbFile = fs.readFileSync(location, 'utf8');
   let fileData = JSON.parse(climbFile);
   
   try{
      let d = new Date(fileData.climbData.lastUpdate);
      d.setSeconds(d.getSeconds() + 10);
      newTime = d;
      fileData.climbData.lastUpdate = d
    } catch (e) {
       console.log("Error: " + e);
    }

   let climbToFind = allClimbData.climbs.find(climb => climb.id === parseInt(fileData.climbData.id));
   try{
      climbToFind.lastUpdate = newTime;
   } catch (e) {
      console.log("error: " + e + " -- No last update for climb " + fileData.climbData.id);
   }

   fs.writeFile(location, JSON.stringify(fileData), {encoding:'utf8', flag:'w'}, function (err) {
      if (err) throw err;
   });
});


allClimbData.lastUpdate = new Date();

//update the main file
fs.writeFile("../website/data/data.json", JSON.stringify(allClimbData), {encoding:'utf8', flag:'w'}, function (err) {
   if (err) throw err;
});