> Historical note: this documents the DarkSky → OpenWeatherMap migration that is **already complete** — getWeatherOW.js implements it. Kept for the field-mapping reference.

# get climbing weather 
*Showing weather forcast for all our climbing*

## Requirements 

Current + Future
Current weather, minute forecast for 1 hour, hourly forecast for 48 hours, daily forecast for 7 days and government weather alerts:

https://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&exclude={part}&appid={API key}

Historical
historical weather data for the previous 5 days:
Please note that in order to get historical data for the last five days, you need to make five API calls (one call for each day).
https://api.openweathermap.org/data/2.5/onecall/timemachine?lat={lat}&lon={lon}&dt={time}&appid={API key}



* Overview: 4 days in the past + Today + 7 futures
* Current: hourly weather? from 00:00am to 23:00pm 
* Adds on:
    government weather alerts

    feels_like
    

* Existent fields:

    "time": darkSkyData.time,
    "icon": darkSkyData.icon,
    "precipIntensity": darkSkyData.precipIntensity,
    "precipProbability": darkSkyData.precipProbability,
    "description": darkSkyData.description,
    "temperatureHigh": darkSkyData.temperatureHigh,
    "temperatureMin": darkSkyData.temperatureMin,
    "pressure": darkSkyData.pressure,
    "humidity": darkSkyData.humidity,
    "cloudCover": darkSkyData.cloudCover,
    "windGust": darkSkyData.windGust,
    "windBearing": darkSkyData.windBearing,
    "windSpeed": darkSkyData.windSpeed,
    "uvIndex": darkSkyData.uvIndex,
    "sunriseTime": darkSkyData.sunriseTime,
    "sunsetTime": darkSkyData.sunsetTime

