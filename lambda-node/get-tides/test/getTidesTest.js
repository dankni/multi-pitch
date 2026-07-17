const mockAxios = require("axios");
const expect = require('chai').expect;

const marineFixture = require('./marineResponse.json'); // real Open-Meteo Marine response
const climbList = require('./climbing-data.json');

const getTides = require("../getTides.js");
const { buildMarineUrl, mapMarineToMultipitchClimb } = getTides;

describe('buildMarineUrl', function () {
    it('requests hourly sea level with unix times at the crag timezone', function () {
        const url = buildMarineUrl('58.26094', ' -5.38266');
        expect(url).to.contain('marine-api.open-meteo.com');
        expect(url).to.contain('latitude=58.26094');
        expect(url).to.contain('longitude=-5.38266'); // whitespace trimmed
        expect(url).to.contain('sea_level_height_msl');
        expect(url).to.contain('timeformat=unixtime');
        expect(url).to.contain('timezone=auto');
    });
});

describe('mapMarineToMultipitchClimb', function () {
    it('emits 24 hourly {timestamp, height} points, the shape the tide chart reads', function () {
        const result = mapMarineToMultipitchClimb(marineFixture, { id: 1 });
        expect(result.climbId).to.eql(1);
        expect(result.heights).to.have.length(24);
        result.heights.forEach(point => {
            expect(point.timestamp).to.be.a('number');
            expect(point.height).to.be.a('number');
        });
        expect(result.heights[1].timestamp - result.heights[0].timestamp).to.eql(3600);
    });

    it('skips null sea levels without shortening the day below the available data', function () {
        const withGap = JSON.parse(JSON.stringify(marineFixture));
        withGap.hourly.sea_level_height_msl[2] = null;
        const result = mapMarineToMultipitchClimb(withGap, { id: 1 });
        expect(result.heights).to.have.length(24); // backfilled from the second day
        expect(result.heights.some(p => p.height === null)).to.eql(false);
    });
});

describe('getTides', function () {
    it('maps the marine response for every tidal climb', async function () {
        mockAxios.get = () => Promise.resolve({ data: marineFixture });

        const result = await getTides({ climbs: climbList });

        const tidalCount = climbList.filter(c => c.tidal == 1).length;
        expect(result.length).to.eql(tidalCount);
        expect(result[0]).to.have.property('climbId');
        expect(result[0].heights).to.have.length(24);
    });

    it('one failing climb only loses its own chart', async function () {
        let call = 0;
        mockAxios.get = () => (++call === 1)
            ? Promise.reject(new Error('boom'))
            : Promise.resolve({ data: marineFixture });

        const result = await getTides({ climbs: climbList });

        const tidalCount = climbList.filter(c => c.tidal == 1).length;
        expect(result.length).to.eql(tidalCount - 1);
        result.forEach(entry => expect(entry.heights).to.have.length(24));
    });
});
