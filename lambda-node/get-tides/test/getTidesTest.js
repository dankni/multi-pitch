const mockAxios = require("axios");

const tidesJson = require('./get_tides.json');
const climbData = require('./climbing-data.json');

const getTides = require("../getTides.js");


getTides(climbData)
    .then(r => r.map(t=>console.log(t)))
    .catch(e => console.log(e))



