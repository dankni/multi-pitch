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
        "windSpeed": darkSkyData.windSpeed,
        "cloudCover": darkSkyData.cloudCover,
    };
}


function getWeather(climbsData) {
    let pastAndCurrentFuture = climbsData.map(climb => {
        const geoLocation = climb.geoLocation;
        const darkSkyPastPromises = [1, 2, 3, 4].map(value => {
            let d = new Date();
            d.setDate(d.getDate() - value);
            const tsInSeconds = (d.getTime() / 1000).toFixed(0);
            const darkSkyPastUrl = `https://api.darksky.net/forecast/${darkSkyKey}/${climb.geoLocation},${tsInSeconds}?exclude=currently,flags,minutely,hourly,alerts&units=si`;
            console.log("going to call", darkSkyPastUrl);
            return axios.get(darkSkyPastUrl);
        });

        const darkSkyCurrentlyAndFutureUrl = `https://api.darksky.net/forecast/${darkSkyKey}/${geoLocation}?exclude=currently,flags,minutely,hourly,alerts&units=si`;
        console.log("going to call", darkSkyCurrentlyAndFutureUrl);
        const darkSkyCurrentlyAndFuturePromise = axios.get(darkSkyCurrentlyAndFutureUrl);

        return [darkSkyPastPromises, darkSkyCurrentlyAndFuturePromise]
    });

    const p = pastAndCurrentFuture.map((tuple, index) => {
        const climb = climbsData[index];
        const [pastPromises, currentAndFuturePromise] = tuple;
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
                            climbId: climb.id,
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
