/**
 LOAD CLIMB DETAILS CURRENT WEATHER
 **/
import { loadWeather, weatherUpToDateCheck, fullWeatherForOneClimb, updateSpecificClimbCurrentWeather } from "./modules/getWeather.js";

window.loadCurrentWeather = function() { // set as global function to be reused by non modular js
    const climbId = document.querySelector('meta[name="climbId"]')?.content;
    if (window.weatherData) {
        if(weatherUpToDateCheck(window.weatherData)){
            let localWeather = fullWeatherForOneClimb(window.weatherData, climbId);
            updateSpecificClimbCurrentWeather(localWeather);
        }
    } else {
        loadWeather().then(response => {
            if(weatherUpToDateCheck(response)){
                let localWeather = fullWeatherForOneClimb(response, climbId);
                updateSpecificClimbCurrentWeather(localWeather);
            }; 
        }).catch(error => {
            console.error("Error loading weather data:", error);   
        });
    }
}

loadCurrentWeather(); // load current weather from here the first time