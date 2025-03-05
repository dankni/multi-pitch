// ONLY LOADS STUFF NEEDED ON HOMPAGE AFER PAGELOAD EVENT 

/**
 LOAD HOMEPAGE WEATHER
 **/
 import { loadWeather, weatherUpToDateCheck, updateWeatherOnHP, generateWeatherScore } from "./modules/getWeather.js";
let weather = await loadWeather();
if(weatherUpToDateCheck(weather)){
    updateWeatherOnHP(weather);
    generateWeatherScore(weather);
}; 
/**
 LOAD RANGE SLIDERS
 **/
 import {attachInputRangeListeners } from "./modules/rangeSliders.js";
 attachInputRangeListeners();