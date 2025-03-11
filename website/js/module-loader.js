// ONLY LOADS STUFF NEEDED ON HOMPAGE AFER PAGELOAD EVENT 

/**
 LOAD HOMEPAGE WEATHER
 **/
import { loadWeather, weatherUpToDateCheck, updateWeatherOnHP, generateWeatherScore } from "./modules/getWeather.js";

loadWeather().then(response => {
    if(weatherUpToDateCheck(response)){
        updateWeatherOnHP(response);
        generateWeatherScore(response);
    };
});


/**
 LOAD RANGE SLIDERS
 **/
import {attachInputRangeListeners } from "./modules/rangeSliders.js";
attachInputRangeListeners();