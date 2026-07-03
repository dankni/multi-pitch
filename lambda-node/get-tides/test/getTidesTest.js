const mockAxios = require("axios");
const expect = require('chai').expect;

const tidesJson = require('./get_tides.json');
const climbList = require('./climbing-data.json');

const getTides = require("../getTides.js");

describe('getTides', function () {
    this.timeout(20000); // getTides paces its API calls with a 1.5s delay per tidal climb

    it('maps the tide API response for every tidal climb', async function () {
        mockAxios.get = () => Promise.resolve({ data: tidesJson });

        const result = await getTides({ climbs: climbList });

        const tidalCount = climbList.filter(c => c.tidal == 1).length;
        expect(result.length).to.eql(tidalCount);
        expect(result[0]).to.have.property('climbId');
        expect(result[0]).to.have.property('heights');
    });
});
