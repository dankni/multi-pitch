// Hits the real OpenWeatherMap API and writes resp.json - only runs when
// explicitly requested: REAL_RUN=1 O_W_KEY=... npx mocha test/getWeatherOW.realRun.js
// (mocha's default glob loads every file in test/, so this must be guarded)
const fs = require('fs');

const climbData = require('./climbing-data-small.json');

const {getWeather} = require("../getWeatherOW.js");

if (process.env.REAL_RUN) {
    getWeather(climbData)
        .then(resp => {
            const data = JSON.stringify(resp);
            fs.writeFileSync('resp.json', data);
        })
        .catch(error => console.error("Error: ", error));
}
