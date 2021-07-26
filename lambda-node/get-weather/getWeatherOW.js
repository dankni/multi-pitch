const axios = require('axios');

const owKey = process.env.O_W_KEY;

const weatherConditionCodes = {}


// We could use the OW icons from here: https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
function mapOWicon(owIcon){
      
    // rain + thunderstorm
    // let's remoev the d or n at the end (day or night)
    owIcon= owIcon.substr(0,2)
    return  {
        "13" : "rain",
        "11" : "rain",
        "10" : "rain",
        "09" : "rain",

        "01": "clear-day",

        "02" : "partly-cloudy-day",
        "03" : "partly-cloudy-day",
        "04" : "partly-cloudy-day",

        "50": "fog",
        "13": "sleet",
        "13": "snow",
        "50": "wind"

    }[owIcon] || "03" // what is a good default?


} 

function mapToMultipitcherDomainFromAlerts(owAlerts = []){
    return owAlerts.map(a => {
            return {
                "sender_name" : a.sender_name,
                "event" : a.event,
                "start" : a.start,
                "end" : a.end,
                "description" : a.description
            }
        })
}


function mapToMultipitcherDomainFromMinutely(owMinutely){
    // Data From the past are coming has hourly 
    // contains hourly historical data starting at 00:00 on the requested day and continues until 23:59 on the same day (UTC time)
    // Maybe take the time at 12??
    return {
        "time": owMinutely.dt,
        "precipitation": owMinutely.precipitation
    }
}

function mapToMultipitcherDomainFromHourly(owHourly){
    // Data From the past are coming has hourly 
    // contains hourly historical data starting at 00:00 on the requested day and continues until 23:59 on the same day (UTC time)
    // Maybe take the time at 12??
    return {
        "time": owHourly.dt,
        "temperature": owHourly.temp,
        "feels_like": owHourly.feels_like,
        "pressure": owHourly.pressure,
        "humidity": owHourly.humidity / 100,
        "dew_point": owHourly.dew_point, //Atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form. Units – default: kelvin, metric: Celsius, imperial: Fahrenheit
        "uvi": owHourly.uvi,
        "clouds":owHourly.clouds,
        "visibility":owHourly.visibility,
        "wind_speed": owHourly.wind_speed,
        "wind_deg": owHourly.wind_deg * 10,
        "wind_gust": owHourly.wind_gust,
        "weather": owHourly.weather.map(w => {
            return {"id": w.id, 
                    "main": w.main,
                    "description": w.description,
                    "icon": w.icon}
        }),
        "rain_volume_last_1_h": owHourly.rain && owHourly.rain["1h"],
        "snow_volume_last_1_h": owHourly.snow && owHourly.snow["1h"]
      }
}
function mapToMultipitcherDomainFromDaily(owDaily) {
    

    return {
        "time": owDaily.dt,
        // TODO map Icons or use weather.id
        "icon": mapOWicon(owDaily.weather[0].icon),
        "description": owDaily.weather[0].description,
        // This works only for the Forcasting. The historical value doesn't have it but we take it from the hourly measurements.
        // Even if the Docs says that they have it. 
        "precipIntensity": owDaily.rain || owDaily.snow || 0,
        "precipProbability": owDaily.pop || 0,

        "temperatureHigh": owDaily.temp.max || 0,
        "temperatureMin": owDaily.temp.min || 0,

        "pressure": owDaily.pressure,
        "humidity": owDaily.humidity / 100 ,

        "cloudCover": owDaily.clouds,
    	"windGust": owDaily.wind_gust || 0,
    	"windBearing": owDaily.wind_deg * 10 || 0,
    	"windSpeed": owDaily.wind_speed || 0,
    	"uvIndex": owDaily.uvi,
    	"sunriseTime": owDaily.sunrise,
    	"sunsetTime": owDaily.sunset,

        "new_fields": {
            "moonrise": owDaily.moonrise,
            "moonset": owDaily.moonset,
            "moonPhase": owDaily.moon_phase,
            "moonPhaseDescription": "Moon phase. 0 and 1 are 'new moon', 0.25 is 'first quarter moon', 0.5 is 'full moon' and 0.75 is 'last quarter moon'. The periods in between are called 'waxing crescent', 'waxing gibous', 'waning gibous', and 'waning crescent', respectively.",
            
            "temperature": {
                "morning" : owDaily.temp.morn,
                "day" : owDaily.temp.day,
                "evening" : owDaily.temp.eve,
                "night" : owDaily.temp.night,
                "min" : owDaily.temp.min,
                "max" : owDaily.temp.max
            },
            "feelsLike": {
                "morning" : owDaily.feels_like.morn,
                "day" : owDaily.feels_like.day,
                "evening" : owDaily.feels_like.eve,
                "night" : owDaily.feels_like.night,
                "min" : owDaily.feels_like.min,
                "max" : owDaily.feels_like.max
            },
            "weather": owDaily.weather.map(w => {
                return {"id": w.id, 
                        "main": w.main,
                        "icon": w.icon}
            })
        }
    };
}


function mapTodayAndFutureToMultipitcherDomain(owResponse){
    const [weatherToday, ...weatherOffset] = owResponse.daily;
    todayDaily = mapToMultipitcherDomainFromDaily(weatherToday)
    todayHourly = owResponse.hourly.map(mapToMultipitcherDomainFromHourly)
    todayMinutely = owResponse.minutely && owResponse.minutely.map(mapToMultipitcherDomainFromMinutely)
    // TODO we can add it but I am removing it otherwise the response to the client will be to big
    // todayDaily["hourly"] = todayHourly
    // todayDaily["minutely"] = todayMinutely
    todayDaily["alerts"] = mapToMultipitcherDomainFromAlerts(owResponse.alerts)
    
    response = {}
    response["currently"] = todayDaily

    return weatherOffset.reduce((acc, ow, index) => {
        const offsetKey = `offsetPlus${index + 1}`;
        acc[offsetKey] = mapToMultipitcherDomainFromDaily(ow);
        return acc
    }, response);
    
}

function mapPastToMultipitcherDomain(owResponses){
    return owResponses.reduce((acc, owResponse, index) => {
        const offsetKey = `offsetMinus${index + 1}`;
        pastDaily = mapToMultipitcherDomainFromDaily(owResponse.current)
        pastHourly = owResponse.hourly.map(mapToMultipitcherDomainFromHourly)
        // For the past API the precipitation intesity comes from the hourly measurement.
        // So I need to adds them up 
        allPastPrecipIntensity = owResponse.hourly.reduce( (acc,x) => acc + ( 
                                                                                (x.rain && x.rain["1h"]) ||  // Check if it was raining
                                                                                (x.snow && x.snow["1h"]) ||  // or snowing 
                                                                                0                            // default to zero if any of the above
                                                                            ) , 0)
        pastDaily["precipIntensity"] = allPastPrecipIntensity
        // Response is too big and the &exclude=hourly did not exclude it from the OW response. 
        // So manually I don't add in here
        // pastDaily["hourly"] = pastHourly
        acc[offsetKey] = pastDaily
        return acc
    }, {});
     
}

function isValidGeo(climb) {
    const [lat, lon] = climb.geoLocation.split(",");
    isValid = lat && lon && lat.length != 0 && lon.length != 0
    if (!isValidGeo) {
        console.error(`climb: ${climb}, has invalid geo location`)
    } 

    return isValid

}

function getWeather(climbsData) {
    let pastAndCurrentFuture = climbsData.climbs
        .filter(climb =>
            climb.status == 'publish'
            &&
            isValidGeo(climb)
        ).map(climb => {
            const geoLocation = climb.geoLocation;
            const [lat_raw, lon_raw] = geoLocation.split(",");
            const lat = lat_raw.trim()
            const lon = lon_raw.trim()
            const owPastPromises = [1, 2, 3, 4].map(value => {
                let d = new Date();
                d.setDate(d.getDate() - value);
                const tsInSeconds = (d.getTime() / 1000).toFixed(0);
                const owPastUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${tsInSeconds}&units=metric&appid=${owKey}`;
                
                console.log("going to call Past", owPastUrl);
                return axios.get(owPastUrl);
            });
            
            const owCurrentlyAndFutureUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${owKey}`;
            console.log("going to call Current and Future", owCurrentlyAndFutureUrl);
            const owCurrentlyAndFuturePromise = axios.get(owCurrentlyAndFutureUrl);
    
            return [owPastPromises, owCurrentlyAndFuturePromise, climb.id]
    });

    const p = pastAndCurrentFuture.map( triple => {
        const [pastPromises, currentAndFuturePromise, climbId] = triple;
        console.log("going to process climb with id: " + climbId);
        return axios.all(pastPromises)
            .then(axiosResponses => axiosResponses.map(r => r.data))
            .then(mapPastToMultipitcherDomain)
            .then(pastResults =>
                currentAndFuturePromise
                .then(axiosResponse => axiosResponse.data)
                .then(mapTodayAndFutureToMultipitcherDomain)
                    .then(currentlyAndOffset => {
                        return {
                            climbId: climbId,
                            ...currentlyAndOffset,
                            ...pastResults
                        }
                    })
                    .catch(err => {
                        console.error("ERRRRORORRO", err)
                        return {
                            "error_message": err.message,
                            "routes": [],
                            "status": "REQUEST_DENIED"
                        }
                    })
            ).catch(err => {
                console.error("ERRRRORORRO", err)
                return {
                    "error_message": err.message,
                    "routes": [],
                    "status": "REQUEST_DENIED"
                }
            });
    });

    return axios.all(p)

}

module.exports = {getWeather,  mapTodayAndFutureToMultipitcherDomain, mapPastToMultipitcherDomain};
