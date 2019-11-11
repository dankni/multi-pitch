const mockAxios = require("axios");

const expect = require('chai').expect;
const darkSkyResponse = require('./darkSkyResponse.json');
const climbData = require('./climbing-data.json');
const climbDataWrong = require('./climbing-data-wrong.json');

const getWeather = require("../getWeatherDarkSky.js");

const axisResponse = {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    request: {}
};

const darkSkyOK = Object.assign({}, axisResponse, {
    data: darkSkyResponse
});

const darkSkyZeroResults = Object.assign({}, axisResponse, {
    data: {
        "cod": "400",
        "message": "5122.5074 is not a float"
    }
});

const getWeatherExpected = {
    "climbId": 1,
    "currently": {
        "time": 1561500000,
        "icon": "rain",
        "precipIntensity": 0.4093,
        "precipProbability": 0.87,
        "temperatureHigh": 5.36,
        "temperatureMin": 2.87,
        "pressure": 1016.87,
        "humidity": 1,
        "windSpeed": 2.81,
        "cloudCover": 0.91
    },
    "offsetPlus1": {
        "time": 1561586400,
        "icon": "rain",
        "precipIntensity": 0.437,
        "precipProbability": 0.87,
        "temperatureHigh": 3.14,
        "temperatureMin": 1.17,
        "pressure": 1014.84,
        "humidity": 1,
        "windSpeed": 3.95,
        "cloudCover": 0.98
    },
    "offsetPlus2": {
        "time": 1561672800,
        "icon": "rain",
        "precipIntensity": 0.2171,
        "precipProbability": 0.69,
        "temperatureHigh": 5.45,
        "temperatureMin": 1.25,
        "pressure": 1013.29,
        "humidity": 0.98,
        "windSpeed": 3.43,
        "cloudCover": 0.85
    },
    "offsetPlus3": {
        "time": 1561759200,
        "icon": "rain",
        "precipIntensity": 0.5361,
        "precipProbability": 0.9,
        "temperatureHigh": 1.58,
        "temperatureMin": -0.28,
        "pressure": 1006.58,
        "humidity": 1,
        "windSpeed": 2.99,
        "cloudCover": 0.92
    },
    "offsetPlus4": {
        "time": 1561845600,
        "icon": "rain",
        "precipIntensity": 0.1103,
        "precipProbability": 0.62,
        "temperatureHigh": 8.58,
        "temperatureMin": -0.28,
        "pressure": 999.85,
        "humidity": 0.88,
        "windSpeed": 1.93,
        "cloudCover": 0.86
    },
    "offsetPlus5": {
        "time": 1561932000,
        "icon": "rain",
        "precipIntensity": 0.2435,
        "precipProbability": 0.92,
        "temperatureHigh": 1.54,
        "temperatureMin": 0.59,
        "pressure": 992.21,
        "humidity": 1,
        "windSpeed": 1.56,
        "cloudCover": 0.99
    },
    "offsetPlus6": {
        "time": 1562018400,
        "icon": "rain",
        "precipIntensity": 0.2437,
        "precipProbability": 0.81,
        "temperatureHigh": 4.24,
        "temperatureMin": 0.06,
        "pressure": 996.79,
        "humidity": 0.98,
        "windSpeed": 1.59,
        "cloudCover": 0.96
    },
    "offsetPlus7": {
        "time": 1562104800,
        "icon": "rain",
        "precipIntensity": 0.4152,
        "precipProbability": 0.93,
        "temperatureHigh": 3.44,
        "temperatureMin": 0.7,
        "pressure": 999.33,
        "humidity": 1,
        "windSpeed": 2.1,
        "cloudCover": 0.93
    },
    "offsetMinus1": {
        "time": 1561500000,
        "icon": "rain",
        "precipIntensity": 0.4093,
        "precipProbability": 0.87,
        "temperatureHigh": 5.36,
        "temperatureMin": 2.87,
        "pressure": 1016.87,
        "humidity": 1,
        "windSpeed": 2.81,
        "cloudCover": 0.91
    },
    "offsetMinus2": {
        "time": 1561500000,
        "icon": "rain",
        "precipIntensity": 0.4093,
        "precipProbability": 0.87,
        "temperatureHigh": 5.36,
        "temperatureMin": 2.87,
        "pressure": 1016.87,
        "humidity": 1,
        "windSpeed": 2.81,
        "cloudCover": 0.91
    },
    "offsetMinus3": {
        "time": 1561500000,
        "icon": "rain",
        "precipIntensity": 0.4093,
        "precipProbability": 0.87,
        "temperatureHigh": 5.36,
        "temperatureMin": 2.87,
        "pressure": 1016.87,
        "humidity": 1,
        "windSpeed": 2.81,
        "cloudCover": 0.91
    },
    "offsetMinus4": {
        "time": 1561500000,
        "icon": "rain",
        "precipIntensity": 0.4093,
        "precipProbability": 0.87,
        "temperatureHigh": 5.36,
        "temperatureMin": 2.87,
        "pressure": 1016.87,
        "humidity": 1,
        "windSpeed": 2.81,
        "cloudCover": 0.91
    }
};

describe('should call the openWeather api in the right way', function () {
    it("DarkSky ok response ", async function () {
        mockAxios.get = () => Promise.resolve(darkSkyOK);
        const fixture = await getWeather(climbData);

        expect(fixture.length).to.eql(1);
        expect(fixture[0]).to.eql(getWeatherExpected);
    });
    it("DarkSky bad if the climb data is wrong ", async function () {
        mockAxios.get = () => Promise.resolve(darkSkyZeroResults);
        const fixture = await getWeather(climbDataWrong);
        expect(fixture.length).to.eql(0);
    });
});
