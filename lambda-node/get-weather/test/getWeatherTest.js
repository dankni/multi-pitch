const mockAxios = require("axios");

const expect = require('chai').expect;
const getWeather = require("../getWeather");
const axios = require('axios');
const OpenWeatherRespose = require('./openWeatherResponse.json');

const axisRespose = {
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    request: {}
};

const axisResposeNoGood = {
    status: 500
};

const OpenWeatherOK = Object.assign({}, axisRespose, {
    data: OpenWeatherRespose
});

const OpenWeatherZeroResults = Object.assign({}, axisRespose, {
    data: {
        "cod": "400",
        "message": "5122.5074 is not a float"
    }
});

const getWeatherRequest = [
    {
        "cliff": "Stetind",
        "status": "publish",
        "id": 17,
        "country": "Norway",
        "county": "Nordland",
        "routeName": "Sydpillaren",
        "length": 575,
        "pitches": 13,
        "dataGrade": 7,
        "tradGrade": "E1",
        "techGrade": "5b",
        "uiaaGrade": "N6-",
        "flag": "norway",
        "geoLocation": "68.162493,16.590668",
        "approchTime": 90,
        "approchDifficulty": 2,
        "rock": "granite",
        "intro": "Stetind is a huge granite pillar rising 1329 m out of Tysfjord. Voted Norways national Mountain it’s an iconic sight. The South Pilar route or Sydpillaren, offers some challenging climbing, especially towards the top with a couple of N6- graded pitches which roughly equate to HVS/E1. In total it’s a 14 pitch climb that is described as one of Norway’s finest climbs and it’s a classic alpine test piece. Getting down actually requires reversing the Original Route (graded n4),  it will require ropework in sections.",
        "approach": "Follow the good path from the parking area up the left side of the stream (initially marked with red paint). This leads through birch forest and eventually out into open country. Ascend through boulders following a discontinuous path - fill  water bottles up here - to a level area on top of the moraine about a 100m above an iceberg filled lake. There is a big flat ‘gearing up’boulder at the saddle.",
        "pitchInfo": null,
        "incline": "Slab & Vertical",
        "face": null,
        "absail": 1,
        "traverse": null,
        "tidal": null
    }];

const getWeatherExpected = {
        goodResults:
            [
                {
                    "climbId": 17,
                    "description": "mist",
                    "temperature": 18.79,
                    "pressure": 1016,
                    "humidity": 88,
                    "windSpeed": 1.5
                },
            ],
        badResults: []
    }
;


const getWeatherBadExpected = {
    goodResults: [],
    badResults: [{
        "status": "400",
        "climbId": 17
    }]
};

const getWeatherGoodAndBadExpected = {
    goodResults: getWeatherExpected.goodResults,
    badResults: getWeatherBadExpected.badResults
};


describe('should call the openWeather api in the right way', function () {
    it("OpenWeather ok response ", async function () {
        mockAxios.get = () => Promise.resolve(OpenWeatherOK);
        const fixture = await getWeather(getWeatherRequest);
        expect(fixture).to.eql(getWeatherExpected);
    });
    it("OpenWeather Zero Responses it happens when they can not find the distance ", async function () {
        mockAxios.get = () => Promise.resolve(OpenWeatherZeroResults);
        const fixture = await getWeather(getWeatherRequest);
        expect(fixture).to.eql(getWeatherBadExpected);
    });
    it("OpenWeather respond good and bad ", async function () {
        let firstRequest = true;

        mockAxios.get = () => {
            if (firstRequest) {
                firstRequest = false;
                return Promise.resolve(OpenWeatherOK);
            } else {
                return Promise.resolve(OpenWeatherZeroResults);
            }
        };

        const fixture = await getWeather([getWeatherRequest[0], getWeatherRequest[0]]);
        expect(fixture).to.eql(getWeatherGoodAndBadExpected);
    });
});
