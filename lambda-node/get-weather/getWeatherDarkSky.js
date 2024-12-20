const axios = require('axios');

const darkSkyKey = process.env.DARK_SKY_KEY;

function toMultipitchWeatherData(darkSkyData) {
    return {
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
    };
}

function isValidGeo(geoLocation) {
    const [lat, lon] = geoLocation.split(",");
    return lat && lon && lat.length != 0 && lon.length != 0
}

function getWeather(climbsData) {
    let pastAndCurrentFuture = climbsData.climbs
        .filter(climb =>
            climb.status == 'publish'
            &&
            isValidGeo(climb.geoLocation)
        ).map(climb => {
            const geoLocation = climb.geoLocation;
            const darkSkyPastPromises = [1, 2, 3, 4].map(value => {
                let d = new Date();
                d.setDate(d.getDate() - value);
                const tsInSeconds = (d.getTime() / 1000).toFixed(0);
                const darkSkyPastUrl = `https://api.darksky.net/forecast/${darkSkyKey}/${climb.geoLocation},${tsInSeconds}?exclude=currently,flags,minutely,hourly,alerts&units=si`;
                console.log("going to call Past", darkSkyPastUrl);
                return axios.get(darkSkyPastUrl);
            });
    
            const darkSkyCurrentlyAndFutureUrl = `https://api.darksky.net/forecast/${darkSkyKey}/${geoLocation}?exclude=currently,flags,minutely,hourly,alerts&units=si`;
            console.log("going to call Current and Future", darkSkyCurrentlyAndFutureUrl);
            const darkSkyCurrentlyAndFuturePromise = axios.get(darkSkyCurrentlyAndFutureUrl);
    
            return [darkSkyPastPromises, darkSkyCurrentlyAndFuturePromise, climb.id]
    });

    const p = pastAndCurrentFuture.map( tuple => {
        const [pastPromises, currentAndFuturePromise, climbId] = tuple;
        console.log("going to process climb with id: " + climbId);
        return axios.all(pastPromises)
            .then(axiosResponse => axiosResponse.map(resp => resp.data))
            .then(darkSkyResponses => {
                return darkSkyResponses.reduce((acc, darkSky, index) => {
                    const offsetKey = `offsetMinus${index + 1}`;
                    acc[offsetKey] = toMultipitchWeatherData(darkSky.daily.data[0]);
                    return acc
                }, {});
            })
            .then(pastResults =>
                currentAndFuturePromise
                    .then(axiosResponse => axiosResponse.data)
                    .then(darkSkyResponse => {

                        const [weatherToday, ...weatherOffset] = darkSkyResponse.daily.data;

                        let currently = {
                            currently: toMultipitchWeatherData(weatherToday)
                        };

                        return weatherOffset.reduce((acc, darkSky, index) => {
                            const offsetKey = `offsetPlus${index + 1}`;
                            acc[offsetKey] = toMultipitchWeatherData(darkSky);
                            return acc
                        }, currently);
                    })
                    .then(currentlyAndOffset => {
                        return {
                            climbId: climbId,
                            ...currentlyAndOffset,
                            ...pastResults
                        }
                    })
                    .catch(err => {
                        return {
                            "error_message": err.message,
                            "routes": [],
                            "status": "REQUEST_DENIED"
                        }
                    })
            ).catch(err => {
                return {
                    "error_message": err.message,
                    "routes": [],
                    "status": "REQUEST_DENIED"
                }
            });
    });

    return axios.all(p)

}

module.exports = getWeather;
