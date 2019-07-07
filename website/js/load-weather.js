const getWeatherUrl = 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-weather.json';


function checkStatusIs200AndReturnJson(response) {
    if (response.status === 200) {
        return response.json();
    } else {
        return Promise.reject(response);
    }
}

function getData(url, headers) {
    return fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: Object.assign({}, headers),
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
    })
}

function getWeatherAddScoreAndSaveInWindow() {
    getData(getWeatherUrl, {})
        .then(checkStatusIs200AndReturnJson)
        .then(weatherScoreFun)
        .then(function (jsonData) {
            console.log("Successfully download weather data from:", getWeatherUrl);
            window.darkSkyWeatherData = jsonData
        })
        .catch(err => console.error("Failed download weather data from:", err))
}

const weatherType = {
    "partly-cloudy-day": 0.20, // 20, 0.2
    "clear-day": 0.15,  //  15 0.15
    "clear-night": 0.15, // 15
    "cloudy": 0.15,      // 15
    "partly-cloudy-night": 0.15, // 15
    "wind": 0.08, // 8
    "fog": 0.07,// 7
    "rain": 0.03, // 3
    "sleet": 0.01, // 1
    "snow": 0.01   // 1
};

const temperatureScoreFn = function (tempMax, tempMin) {
    const temp = (tempMax - tempMin) / 2;
    if (temp < 0) {
        return 0.01;
    }
    if (temp >= 0 && temp < 5) {
        return 0.05;
    }
    if (temp >= 5 && temp < 10) {
        return 0.08;
    }
    if (temp >= 10 && temp < 15) {
        return 0.20;
    }
    if (temp >= 15 && temp < 20) {
        return 0.30;
    }
    if (temp >= 20 && temp < 25) {
        return 0.20;
    }
    if (temp >= 25 && temp < 30) {
        return 0.10;
    }
    if (temp >= 30) {
        return 0.06;
    } else {
        return -1;
    }
};


function howWetWasFun(weatherData) {
    const wetScore = {
        'offsetMinus1': 0.6,
        'offsetMinus2': 0.2,
        'offsetMinus3': 0.1,
        'offsetMinus4': 0.1,
    };
    // offsetMinus1
    return [1, 2, 3, 4].reduce((acc, number) => {
        const offsetLabel = "offsetMinus" + number;
        const offsetData = weatherData[offsetLabel];
        return acc + offsetData["precipIntensity"] * wetScore[offsetLabel];
    }, 0);
}

function howWetIsInTheFutureFun(weatherData) {
    const wetScore = {
        'offsetPlus1': 0.4,
        'offsetPlus2': 0.3,
        'offsetPlus3': 0.1,
        'offsetPlus4': 0.05,
        'offsetPlus5': 0.05,
        'offsetPlus6': 0.05,
        'offsetPlus7': 0.05,
    };
    // offsetMinus1
    return [1, 2, 3, 4, 5, 6, 7].reduce((acc, number) => {
        const offsetLabel = "offsetPlus" + number;
        const offsetData = weatherData[offsetLabel];
        return acc + offsetData["precipIntensity"] * wetScore[offsetLabel];
    }, 0);
}

const weatherScoreFun = function (weatherData) {

    return weatherData.reduce((acc, data) => {
        const scoreWeatherType = weatherType[data.currently.icon];
        const scoreRain = (1 - data.currently.precipProbability);
        const scoreTemperature = temperatureScoreFn(data.currently.temperatureHigh, data.currently.temperatureMin);
        const currentlyScore = scoreWeatherType * scoreRain * scoreTemperature;
        const howWetWasInThePastScore = howWetWasFun(data);
        const howWetIsInTheFuture = howWetIsInTheFutureFun(data);

        const weatherScore = (currentlyScore - (howWetWasInThePastScore + (howWetIsInTheFuture/2)));
        acc.push(Object.assign({}, data, {weatherScore}));

        return acc;
    }, [])
};


window.weatherScoreFun = weatherScoreFun;
const fourHoursInMilliseconds = 4000 * 60 * 60;

getWeatherAddScoreAndSaveInWindow();
setInterval(getWeatherAddScoreAndSaveInWindow, fourHoursInMilliseconds);
loadWeather();
