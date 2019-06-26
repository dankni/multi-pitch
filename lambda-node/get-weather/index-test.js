const getWeather = require('./getWeatherDarkSky.js');
const climbsData = require("./climbing-data.json");

getWeather(climbsData)
    .then(resp => console.log(JSON.stringify(resp), ",,,resp"))
    .catch(err => console.log(err + ",,,err"));
