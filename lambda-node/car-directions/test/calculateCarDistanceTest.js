const mockAxios = require("axios");

const expect = require('chai').expect;
const calculateCarDistance = require("../calculateCarDistance");
const axios = require('axios');
const expectedGoogleRespose = require('./googleOkResponse.json');

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

const mockResponseGoogleOK = Object.assign({}, axisRespose, {
    data: expectedGoogleRespose
});

const mockResponseGoogleZeroResults = Object.assign({}, axisRespose, {
    data: {
        "geocoded_waypoints": [
            {},
            {}
        ],
        "routes": [],
        "status": "ZERO_RESULTS"
    }
});

const climbingCarGraphRequest = [
    {
        "climbId": 17,
        "car": {
            "nodes": [
                {
                    "id": "london",
                    "metadata": {
                        "latLong": "51.5074,0.1278"
                    }
                },
                {
                    "id": "stetind",
                    "metadata": {
                        "latLong": "68.162493,16.590668"
                    }
                }
            ],
            "edge": [
                {
                    "source": "london",
                    "relation": "car",
                    "target": "stetind"
                }
            ]
        }
    }
];

const climbingCarGraphExpected = {
    goodResults:
        [
            {
                "climbId": 17,
                "car": {
                    "nodes": [
                        {
                            "id": "london",
                            "metadata": {
                                "latLong": "51.5074,0.1278"
                            }
                        },
                        {
                            "id": "stetind",
                            "metadata": {
                                "latLong": "68.162493,16.590668"
                            }
                        }
                    ],
                    "edge": [
                        {
                            "source": "london",
                            "relation": "car",
                            "target": "stetind",
                            "metadata": {
                                "distance": "3,167 km",
                                "duration": "1 day 13 hours"
                            }
                        }
                    ]
                }
            },
        ],
    badResults: []
};


const climbingCarGraphBadExpected = {
    goodResults: [],
    badResults: [{
        "status": "ZERO_RESULTS",
        "climbId": 17
    }]
};

const climbingCarGraphGoodAndBadExpected = {
    goodResults: climbingCarGraphExpected.goodResults,
    badResults: climbingCarGraphBadExpected.badResults
};


describe('should call the google api in the right way', function () {
    it("Google ok response ", async function () {
        mockAxios.get = () => Promise.resolve(mockResponseGoogleOK);
        const fixture = await calculateCarDistance(climbingCarGraphRequest);
        expect(fixture.goodResults).to.eql(climbingCarGraphExpected.goodResults);
        expect(fixture.badResults).to.eql(climbingCarGraphExpected.badResults);
    });
    it("Google Zero Responses it happens when they can not find the distance ", async function () {
        mockAxios.get = () => Promise.resolve(mockResponseGoogleZeroResults);
        const fixture = await calculateCarDistance(climbingCarGraphRequest);
        expect(fixture.goodResults).to.eql(climbingCarGraphBadExpected.goodResults);
        expect(fixture.badResults).to.eql(climbingCarGraphBadExpected.badResults);
    });
    it("Google respond good and bad ", async function () {
        let firstRequest = true;

        mockAxios.get = () => {
            if (firstRequest) {
                firstRequest = false;
                return Promise.resolve(mockResponseGoogleOK);
            } else {
                return Promise.resolve(mockResponseGoogleZeroResults);
            }
        };

        const fixture = await calculateCarDistance([climbingCarGraphRequest[0], climbingCarGraphRequest[0]]);
        expect(fixture.goodResults).to.eql(climbingCarGraphGoodAndBadExpected.goodResults);
        expect(fixture.badResults).to.eql(climbingCarGraphGoodAndBadExpected.badResults);
    });
});
