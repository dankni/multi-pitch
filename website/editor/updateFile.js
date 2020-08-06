
const fs = require('fs');
const dataLoc = '../website/data/data.json';
const file = require(dataLoc);

// const climbToUpdate = file.climbs.find(climb => climb.id === 1);
file.climbs[0].cliff = "new name";


fs.writeFile(dataLoc, JSON.stringify(file), function writeJSON(err) {
  if (err) return console.log(err);
  console.log(JSON.stringify(file));
  console.log('writing to ' + fileName);
});

