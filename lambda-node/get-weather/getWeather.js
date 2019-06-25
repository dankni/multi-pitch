const axios = require('axios');

const openWeatherMapKey = process.env.OPEN_WEATHER_MAP;

function getWeather(climbsData) {
    let promised = climbsData.map(climb => {

        let lat = climb.geoLocation.split(',')[0];
        let lon = climb.geoLocation.split(',')[1];
        let ownWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${lat}&lon=${lon}&appid=${openWeatherMapKey}`;

        return axios.get(ownWeatherUrl)
    });

    return axios.all(promised)
        .then(axiosResponse => axiosResponse.map(resp => resp.data))
        .then(openWeatherResponses => {
            return climbsData.reduce((acc, current, i) => {
                const openWeatherResponse = openWeatherResponses[i];
                if (openWeatherResponse.cod === 200) {
                    acc.goodResults.push({
                        climbId: current.id,
                        description: openWeatherResponse.weather[0].description,
                        weatherId: openWeatherResponse.weather[0].id,
                        weatherMain: openWeatherResponse.weather[0].main,
                        temperature: openWeatherResponse.main.temp,
                        pressure: openWeatherResponse.main.pressure,
                        humidity: openWeatherResponse.main.humidity,
                        windSpeed: openWeatherResponse.wind.speed
                    })
                } else {
                    acc.badResults.push({
                        status: openWeatherResponse.cod,
                        climbId: current.id
                    })
                }
                return acc;
            }, {
                goodResults: [],
                badResults: []
            })

        })
        .catch(err => {
            console.log("err" + err);
            return {
                "error_message": err.message,
                "routes": [],
                "status": "REQUEST_DENIED"
            }
        });

}

module.exports = getWeather;
