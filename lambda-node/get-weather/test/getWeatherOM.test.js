const mockAxios = require("axios");

const expect = require('chai').expect;
const climbData = require('./climbing-data.json');
const fixtureOpenMeteo = require('./openMeteoResponse.json'); // real response, Old Man of Stoer coords

const { getWeather, mapOpenMeteoToMultipitcherDomain, mapWmoIcon, mapHourlyIcon, buildOpenMeteoUrl, moonPhase } = require("../getWeatherOM.js");

// builds a minimal synthetic Open-Meteo response (20 days) so edge cases
// can be tested without hand-editing the recorded fixture
function syntheticResponse(overrides = {}) {
    const days = 20;
    const midnight = 1783810800; // some local midnight, unix seconds
    const fill = value => new Array(days).fill(value);
    const daily = Object.assign({
        time: Array.from({ length: days }, (_, i) => midnight + i * 86400),
        weather_code: fill(3),
        temperature_2m_max: fill(15),
        temperature_2m_min: fill(8),
        apparent_temperature_max: fill(14),
        apparent_temperature_min: fill(7),
        precipitation_sum: fill(1.2),
        precipitation_probability_max: fill(40),
        wind_speed_10m_max: fill(5),
        wind_gusts_10m_max: fill(9),
        wind_direction_10m_dominant: fill(270),
        uv_index_max: fill(4),
        cloud_cover_mean: fill(60),
        relative_humidity_2m_mean: fill(80),
        surface_pressure_mean: fill(1015),
        dew_point_2m_mean: fill(10),
        sunrise: Array.from({ length: days }, (_, i) => midnight + i * 86400 + 5 * 3600),
        sunset: Array.from({ length: days }, (_, i) => midnight + i * 86400 + 21 * 3600),
        daylight_duration: fill(16 * 3600)
    }, overrides);
    return { timezone: 'Europe/London', utc_offset_seconds: 3600, daily: daily };
}

const okResponse = {
    data: fixtureOpenMeteo,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
    request: {}
};

const CONSUMED_FIELDS = [
    'time', 'icon', 'precipIntensity', 'precipProbability',
    'temperatureHigh', 'temperatureMin', 'sunriseTime', 'sunsetTime',
    'uvIndex', 'cloudCover', 'windGust', 'windBearing', 'windSpeed'
];

const ICON_NAMES = ['clear-day', 'partly-cloudy-day', 'cloudy', 'fog', 'rain', 'sleet', 'snow'];

describe('buildOpenMeteoUrl', () => {
    it('requests past + forecast days with unix times and m/s wind', () => {
        const url = buildOpenMeteoUrl('58.26094', '-5.38266');
        expect(url).to.contain('latitude=58.26094');
        expect(url).to.contain('longitude=-5.38266');
        expect(url).to.contain('past_days=4');
        expect(url).to.contain('forecast_days=16');
        expect(url).to.contain('timeformat=unixtime');
        expect(url).to.contain('wind_speed_unit=ms');
        expect(url).to.contain('timezone=auto');
    });
});

describe('mapWmoIcon', () => {
    it('maps WMO codes to the icon names the frontend scores', () => {
        expect(mapWmoIcon(0)).to.eql('clear-day');
        expect(mapWmoIcon(1)).to.eql('partly-cloudy-day');
        expect(mapWmoIcon(2)).to.eql('partly-cloudy-day');
        expect(mapWmoIcon(3)).to.eql('cloudy');
        expect(mapWmoIcon(45)).to.eql('fog');
        expect(mapWmoIcon(48)).to.eql('fog');
        expect(mapWmoIcon(51)).to.eql('rain');
        expect(mapWmoIcon(61)).to.eql('rain');
        expect(mapWmoIcon(65)).to.eql('rain');
        expect(mapWmoIcon(80)).to.eql('rain');
        expect(mapWmoIcon(95)).to.eql('rain');
        expect(mapWmoIcon(56)).to.eql('sleet');
        expect(mapWmoIcon(66)).to.eql('sleet');
        expect(mapWmoIcon(71)).to.eql('snow');
        expect(mapWmoIcon(75)).to.eql('snow');
        expect(mapWmoIcon(85)).to.eql('snow');
    });

    it('every emittable icon name is scoreable and styleable by the frontend', () => {
        // keep in sync with weatherType in website/js/modules/getWeather.js
        // and the .weather sprite classes in website/css/style.css - an icon
        // outside this list produces NaN weather scores and a blank sprite
        const FRONTEND_ICONS = ['clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night',
            'cloudy', 'fog', 'wind', 'rain', 'sleet', 'snow'];
        for (let code = 0; code <= 99; code++) {
            expect(FRONTEND_ICONS, `wmo ${code} daily`).to.include(mapWmoIcon(code));
            expect(FRONTEND_ICONS, `wmo ${code} night`).to.include(mapHourlyIcon(code, 0));
        }
    });

    it('falls back to a name the frontend can score for unknown codes', () => {
        // regression: the OWM version defaulted to the raw code "03", which
        // produced NaN weather scores on the homepage
        expect(mapWmoIcon(42)).to.eql('partly-cloudy-day');
        expect(mapWmoIcon(undefined)).to.eql('partly-cloudy-day');
    });
});

describe('moonPhase', () => {
    it('anchors on the reference new moon and wraps correctly', () => {
        const referenceNewMoon = 947182440; // 2000-01-06 18:14 UTC
        const halfCycle = Math.round(29.53058867 / 2 * 86400);
        expect(moonPhase(referenceNewMoon)).to.be.closeTo(0, 0.01);
        expect(moonPhase(referenceNewMoon + halfCycle)).to.be.closeTo(0.5, 0.01);
        // dates before the reference must not go negative (JS % keeps sign)
        expect(moonPhase(referenceNewMoon - halfCycle)).to.be.closeTo(0.5, 0.01);
    });

    it('matches a known ephemeris full moon', () => {
        expect(moonPhase(1767434580)).to.be.closeTo(0.5, 0.03); // 2026-01-03 10:03 UTC full moon
    });
});

describe('mapOpenMeteoToMultipitcherDomain', () => {
    const result = mapOpenMeteoToMultipitcherDomain(fixtureOpenMeteo);

    it('produces currently + offsetPlus1..15 + offsetMinus1..4', () => {
        expect(result).to.have.property('currently');
        for (let i = 1; i <= 15; i++) expect(result).to.have.property(`offsetPlus${i}`);
        for (let i = 1; i <= 4; i++) expect(result).to.have.property(`offsetMinus${i}`);
    });

    it('every day carries all fields the website consumes', () => {
        const days = [result.currently,
            result.offsetPlus1, result.offsetPlus7, result.offsetPlus15,
            result.offsetMinus1, result.offsetMinus4];
        days.forEach(day => CONSUMED_FIELDS.forEach(field => {
            expect(day, `missing ${field}`).to.have.property(field);
            expect(day[field], `${field} is undefined/null`).to.not.be.undefined;
            expect(day[field], `${field} is null`).to.not.be.null;
        }));
    });

    it('uses only icon names the frontend understands', () => {
        Object.keys(result)
            .filter(k => k === 'currently' || k.startsWith('offset'))
            .forEach(k => expect(ICON_NAMES).to.include(result[k].icon));
    });

    it('keeps the old units: probability 0..1, humidity 0..1, cloud 0..100, bearing 0..360', () => {
        const day = result.currently;
        expect(day.precipProbability).to.be.within(0, 1);
        expect(day.humidity).to.be.within(0, 1);
        expect(day.cloudCover).to.be.within(0, 100);
        expect(day.windBearing).to.be.within(0, 360); // regression: old code multiplied wind_deg by 10
    });

    it('days advance by 24h and sunrise falls inside its day', () => {
        expect(result.offsetPlus1.time - result.currently.time).to.eql(86400);
        expect(result.offsetMinus1.time).to.be.below(result.currently.time);
        expect(result.currently.sunriseTime).to.be.above(result.currently.time - 43200);
        expect(result.currently.sunsetTime).to.be.above(result.currently.sunriseTime);
    });

    it('exposes the crag timezone for local-time display', () => {
        expect(result.timezone).to.eql('Europe/London');
        expect(result.utcOffsetSeconds).to.be.a('number');
    });

    it('keeps alerts on currently for schema compatibility', () => {
        expect(result.currently.alerts).to.eql([]);
    });

    it('computes moon phase locally and carries the dew point', () => {
        expect(result.currently.new_fields.moonPhase).to.be.within(0, 1);
        expect(result.currently.new_fields.dewPoint).to.be.a('number');
        // one day advances the phase by 1/29.53 of the cycle (mod wrap-around at new moon)
        const delta = Math.abs(result.offsetPlus1.new_fields.moonPhase - result.currently.new_fields.moonPhase);
        expect(Math.min(delta, 1 - delta)).to.be.closeTo(1 / 29.53, 0.01);
    });
});

describe('hourly forecast (BBC-style breakdown)', () => {
    const result = mapOpenMeteoToMultipitcherDomain(fixtureOpenMeteo);

    it('exposes 72 hours of parallel arrays', () => {
        expect(result.hourly.time).to.have.length(72);
        ['icon', 'temperature', 'feelsLike', 'precipIntensity', 'precipProbability',
         'windGust', 'windBearing', 'uvIndex'].forEach(key => {
            expect(result.hourly[key], key).to.have.length(72);
        });
    });

    it('hourly timestamps are hour-aligned and sequential', () => {
        expect(result.hourly.time[1] - result.hourly.time[0]).to.eql(3600);
        expect(result.hourly.time[71] - result.hourly.time[0]).to.eql(71 * 3600);
    });

    it('hourly probability is 0..1 like the daily fields', () => {
        result.hourly.precipProbability.forEach(p => expect(p).to.be.within(0, 1));
    });

    it('uses night icon variants when the sun is down', () => {
        expect(mapHourlyIcon(0, 1)).to.eql('clear-day');
        expect(mapHourlyIcon(0, 0)).to.eql('clear-night');
        expect(mapHourlyIcon(2, 0)).to.eql('partly-cloudy-night');
        expect(mapHourlyIcon(61, 0)).to.eql('rain'); // rain has no night variant
    });

    it('omits hourly gracefully when the API leaves it out', () => {
        const noHourly = Object.assign({}, fixtureOpenMeteo, { hourly: undefined });
        expect(mapOpenMeteoToMultipitcherDomain(noHourly).hourly).to.eql(null);
    });
});

describe('mapOpenMeteoToMultipitcherDomain edge cases', () => {
    it('shifts each day stamp to local noon so date labels survive timezone shifts', () => {
        const response = syntheticResponse();
        const result = mapOpenMeteoToMultipitcherDomain(response);
        expect(result.currently.time).to.eql(response.daily.time[4] + 43200);
    });

    it('signals polar day with falsy sun times (frontend shows "24h Sun")', () => {
        const result = mapOpenMeteoToMultipitcherDomain(
            syntheticResponse({ daylight_duration: new Array(20).fill(86400) }));
        expect(result.currently.sunriseTime).to.eql(0);
        expect(result.currently.sunsetTime).to.eql(0);
    });

    it('signals polar night with falsy sun times (frontend shows "24h Darkness")', () => {
        const result = mapOpenMeteoToMultipitcherDomain(
            syntheticResponse({ daylight_duration: new Array(20).fill(0) }));
        expect(result.currently.sunriseTime).to.eql(0);
        expect(result.currently.sunsetTime).to.eql(0);
    });

    it('defaults nulls the API can return (e.g. rain probability on past days)', () => {
        const result = mapOpenMeteoToMultipitcherDomain(
            syntheticResponse({
                precipitation_probability_max: new Array(20).fill(null),
                uv_index_max: new Array(20).fill(null)
            }));
        expect(result.offsetMinus1.precipProbability).to.eql(0);
        expect(result.offsetMinus1.uvIndex).to.eql(0);
    });
});

describe('getWeather', () => {
    it('skips unpublished climbs and climbs with a broken geoLocation', async () => {
        mockAxios.get = () => Promise.resolve(okResponse);
        const fixture = await getWeather({ climbs: [
            { id: 1, status: 'publish', geoLocation: '58.26094,-5.38266' },
            { id: 2, status: 'draft',   geoLocation: '51.5,-0.1' },
            { id: 3, status: 'publish', geoLocation: 'not-a-place' },
            { id: 4, status: 'publish', geoLocation: ' 46.5 , 11.8 ' } // whitespace must be tolerated
        ]});
        expect(fixture.map(f => f.climbId)).to.eql([1, 4]);
    });

    it('one failing climb does not poison the others', async () => {
        mockAxios.get = (url) => url.includes('latitude=58.26094')
            ? Promise.reject(new Error('boom'))
            : Promise.resolve(okResponse);
        const fixture = await getWeather({ climbs: [
            { id: 1, status: 'publish', geoLocation: '58.26094,-5.38266' },
            { id: 2, status: 'publish', geoLocation: '46.5,11.8' }
        ]});
        expect(fixture[0]).to.eql({ "routes": [], "status": "REQUEST_DENIED" });
        expect(fixture[1].climbId).to.eql(2);
        expect(fixture[1].currently).to.be.an('object');
    });

    it('maps mocked Open-Meteo responses for every published climb', async () => {
        mockAxios.get = () => Promise.resolve(okResponse);
        const fixture = await getWeather(climbData);

        const published = climbData.climbs.filter(c => c.status === 'publish').length;
        expect(fixture.length).to.eql(published);
        expect(fixture[0]).to.have.property('climbId');
        expect(fixture[0]).to.have.property('currently');
        expect(fixture[0]).to.have.property('offsetMinus1');
        expect(fixture[0].status).to.not.eql('REQUEST_DENIED');
    });

    it('emits the legacy failure shape when the API errors', async () => {
        mockAxios.get = () => Promise.reject(new Error('boom'));
        const fixture = await getWeather(climbData);
        fixture.forEach(entry => {
            expect(entry).to.eql({ "routes": [], "status": "REQUEST_DENIED" });
        });
    });
});
