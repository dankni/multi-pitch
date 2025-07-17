// ONLY LOADS STUFF NEEDED ON HOMPAGE AFER PAGELOAD EVENT 

/**
 LOAD HOMEPAGE WEATHER
 **/
import { loadWeather, weatherUpToDateCheck, updateWeatherOnHP, generateWeatherScore } from "./modules/getWeather.js";

if (window.weatherData) {
    if(weatherUpToDateCheck(window.weatherData)){
        // the loaded weather data is up to date, so we can use it
        updateWeatherOnHP(response);
        generateWeatherScore(response);
    }
} else {
    loadWeather().then(response => {
        if(weatherUpToDateCheck(response)){
            updateWeatherOnHP(response);
            generateWeatherScore(response);
        };
    });
}


/**
 LOAD RANGE SLIDERS
 **/
import {attachInputRangeListeners } from "./modules/rangeSliders.js";
attachInputRangeListeners();