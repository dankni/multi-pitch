const mockAxios = require("axios");

const expect = require('chai').expect;
// const OWMResponse = require('./OWMResponse.json');
const climbData = require('./climbing-data.json');
const fixtureOwResponsePast = require('./OWMPast.json');
const fixtureOwResponseTodayAndFuture= require('./OWMoneCallTodayAndFuture.json')

const {getWeather, mapTodayAndFutureToMultipitcherDomain, mapPastToMultipitcherDomain} = require("../getWeatherOW.js");

const axisResponse = {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    request: {}
};

const OWMOKtoday = Object.assign({}, axisResponse, {
    data: fixtureOwResponseTodayAndFuture
});
const OWMOKpast = Object.assign({}, axisResponse, {
    data: fixtureOwResponsePast
});

const OWMZeroResults = Object.assign({}, axisResponse, {
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

describe('should call the OWM api in the right way', function () {
    it("OWM today ok response ", async function () {
        mockAxios.get = () => Promise.resolve(OWMOKtoday);
        const fixture = await getWeather(climbData);

        expect(fixture.length).to.eql(2);
        expect(fixture[0]).to.eql({});
    });

    // it("OWM today ok response ", async function () {
    //     mockAxios.get = () => Promise.resolve(OWMOKpast);
    //     const fixture = await getWeather(climbData);

    //     expect(fixture.length).to.eql(2);
    //     expect(fixture[0]).to.eql(getWeatherExpected);
    // });

    // it("OWM bad if the climb data is wrong ", async function () {
    //     mockAxios.get = () => Promise.resolve(OWMZeroResults);
    //     const fixture = await getWeather(climbDataWrong);
    //     expect(fixture.length).to.eql(0);
    // });
});

describe('should map the OWM past weather response to our domain', () =>{
    expected = {}
    responses = [fixtureOwResponsePast,fixtureOwResponsePast]
    const result = mapPastToMultipitcherDomain(responses)

    // expect(result).to.eql(expected)
})

describe('should map the OWM current and future weather response to our domain', () =>{
    const expected = {
        climbId: 1,
        currently: {
          time: 1618308000,
          icon: undefined,
          description: undefined,
          precipIntensity: 0.62,
          precipProbability: 0.2,
          temperatureHigh: 279.79,
          temperatureMin: 275.09,
          pressure: 1020,
          humidity: 81,
          cloudCover: 56,
          windGust: undefined,
          windBearing: 294,
          windSpeed: 3.06,
          uvIndex: 1.93,
          sunriseTime: 1618282134,
          sunsetTime: 1618333901,
          new_fields: {
            sunrise: 1618282134,
            sunset: 1618333901,
            moonrise: 1618284960,
            moonset: 1618339740,
            moonPhase: 0.04,
            moonPhaseDescription: "Moon phase. 0 and 1 are 'new moon', 0.25 is 'first quarter moon', 0.5 is 'full moon' and 0.75 is 'last quarter moon'. The periods in between are called 'waxing crescent', 'waxing gibous', 'waning gibous', and 'waning crescent', respectively.",
            temperature: [Object],
            feelsLike: [Object],
            weather: [Array]
          },
          hourly: [ [Object], [Object] ]
        },
        offsetPlus1: {
          time: 1618308000,
          icon: undefined,
          description: undefined,
          precipIntensity: 0.62,
          precipProbability: 0.2,
          temperatureHigh: 279.79,
          temperatureMin: 275.09,
          pressure: 1020,
          humidity: 81,
          cloudCover: 56,
          windGust: undefined,
          windBearing: 294,
          windSpeed: 3.06,
          uvIndex: 1.93,
          sunriseTime: 1618282134,
          sunsetTime: 1618333901,
          new_fields: {
            sunrise: 1618282134,
            sunset: 1618333901,
            moonrise: 1618284960,
            moonset: 1618339740,
            moonPhase: 0.04,
            moonPhaseDescription: "Moon phase. 0 and 1 are 'new moon', 0.25 is 'first quarter moon', 0.5 is 'full moon' and 0.75 is 'last quarter moon'. The periods in between are called 'waxing crescent', 'waxing gibous', 'waning gibous', and 'waning crescent', respectively.",
            temperature: [Object],
            feelsLike: [Object],
            weather: [Array]
          }
        }
      }

    const result = mapTodayAndFutureToMultipitcherDomain(fixtureOwResponseTodayAndFuture)

    // expect(result).to.eql(expected)
})
