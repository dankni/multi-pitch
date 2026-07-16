// Hits the real Open-Meteo API and writes resp.json - only runs when
// explicitly requested: REAL_RUN=1 npx mocha test/getWeatherOM.realRun.js
// (mocha's default glob loads every file in test/, so this must be guarded)
// No API key needed - Open-Meteo is free for non-commercial use.
const fs = require('fs');

const climbData = require('./climbing-data-small.json');

const {getWeather} = require("../getWeatherOM.js");

if (process.env.REAL_RUN) {
    getWeather(climbData)
        .then(resp => {
            const data = JSON.stringify(resp);
            fs.writeFileSync('resp.json', data);
        })
        .catch(error => console.error("Error: ", error));
}
