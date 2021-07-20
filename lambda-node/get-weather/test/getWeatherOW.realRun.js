const fs = require('fs');

const climbData = require('./climbing-data.json');

const {getWeather} = require("../getWeatherOW.js");



getWeather(climbData)
.then(resp => {
    const data = JSON.stringify(resp);
    fs.writeFileSync('resp.json', data);
})
.catch(error => console.error("Error: ",error))