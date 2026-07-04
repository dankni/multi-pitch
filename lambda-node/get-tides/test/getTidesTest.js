const mockAxios = require("axios");
const expect = require('chai').expect;

const recorded = require('./get_tides.json');
const tideApiBody = typeof recorded.body === 'string' ? JSON.parse(recorded.body) : recorded.body; // fixture is a recorded wrapped response
const climbList = require('./climbing-data.json');

const getTides = require("../getTides.js");

describe('getTides', function () {
    this.timeout(20000); // getTides paces its API calls with a 1.5s delay per tidal climb

    it('maps the tide API response for every tidal climb', async function () {
        mockAxios.get = () => Promise.resolve({ data: tideApiBody });

        const result = await getTides({ climbs: climbList });

        const tidalCount = climbList.filter(c => c.tidal == 1).length;
        expect(result.length).to.eql(tidalCount);
        expect(result[0]).to.have.property('climbId');
        expect(result[0].heights).to.have.length(24);
        expect(result[0].extremes).to.have.length(4);
    });
});
