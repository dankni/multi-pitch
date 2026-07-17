const mockAxios = require("axios");

const expect = require('chai').expect;
const climbData = require('./climbing-data.json');
const fixtureOpenMeteo = require('./openMeteoResponse.json'); // real response, Old Man of Stoer coords

const { getWeather, mapOpenMeteoToMultipitcherDomain, mapWmoIcon, mapHourlyIcon, buildOpenMeteoUrl, buildMarineUrl, findLowTides, moonPhase } = require("../getWeatherOM.js");

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
        expect(url).to.contain('past_days=3');
        expect(url).to.contain('forecast_days=15');
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

describe('tides (Open-Meteo Marine)', () => {
    it('marine url covers the same window as the weather call', () => {
        const url = buildMarineUrl('54.1', '-6.1');
        expect(url).to.contain('marine-api.open-meteo.com');
        expect(url).to.contain('sea_level_height_msl');
        expect(url).to.contain('past_days=3');
        expect(url).to.contain('forecast_days=15');
    });

    it('finds low-water times as local minima of the sea level curve', () => {
        // two tide cycles: minima at hours 3 and 15
        const heights = [1.2, 0.6, 0.1, -0.4, 0.0, 0.7, 1.3, 1.6, 1.3, 0.8, 0.3, -0.1, -0.5, -0.2, 0.4, -0.6, 0.2, 0.9];
        const times = heights.map((_, i) => 1000000 + i * 3600);
        const lows = findLowTides(times, heights);
        expect(lows.map(low => (low.time - 1000000) / 3600)).to.eql([3, 12, 15]);
        expect(lows[0].height).to.eql(-0.4);
    });

    it('skips null gaps without crashing', () => {
        const heights = [1.0, null, 0.2, 0.5, 0.1, 0.4];
        const times = heights.map((_, i) => i * 3600);
        expect(findLowTides(times, heights).map(l => l.time / 3600)).to.eql([4]);
    });

    it('attaches low tides to tidal climbs and never fails the weather on marine errors', async () => {
        mockAxios.get = (url) => url.includes('marine-api')
            ? Promise.resolve({ data: { hourly: {
                time: Array.from({ length: 48 }, (_, i) => fixtureOpenMeteo.daily.time[3] + i * 3600),
                sea_level_height_msl: Array.from({ length: 48 }, (_, i) => Math.sin(i / 2))
              } } })
            : Promise.resolve(okResponse);
        const [tidal] = await getWeather({ climbs: [
            { id: 9, status: 'publish', geoLocation: '54.1,-6.1', tidal: 1 }
        ]});
        expect(tidal.currently.lowTides).to.be.an('array').with.length.greaterThan(0);

        mockAxios.get = (url) => url.includes('marine-api')
            ? Promise.reject(new Error('marine down'))
            : Promise.resolve(okResponse);
        const [degraded] = await getWeather({ climbs: [
            { id: 9, status: 'publish', geoLocation: '54.1,-6.1', tidal: 1 }
        ]});
        expect(degraded.climbId).to.eql(9); // weather survives
        expect(degraded.currently.lowTides).to.be.undefined;
    });

    it('non-tidal climbs never call the marine api', async () => {
        const urls = [];
        mockAxios.get = (url) => { urls.push(url); return Promise.resolve(okResponse); };
        await getWeather({ climbs: [{ id: 2, status: 'publish', geoLocation: '46.5,11.8' }] });
        expect(urls.some(u => u.includes('marine-api'))).to.eql(false);
    });
});

describe('top-out conditions (long routes)', () => {
    const { buildTopOutUrl } = require('../getWeatherOM.js');

    it('top-out url reuses the coordinates with a relative elevation offset', () => {
        const url = buildTopOutUrl('46.499111', '11.808021', 2709 + 370);
        expect(url).to.contain('elevation=3079');
        expect(url).to.contain('temperature_2m_max');
        expect(url).to.contain('wind_gusts_10m_max');
    });

    it('routes >= 300m get model top-out numbers on every day', async () => {
        const urls = [];
        mockAxios.get = (url) => {
            urls.push(url);
            if (url.includes('elevation=')) {
                const daily = fixtureOpenMeteo.daily;
                return Promise.resolve({ data: { daily: {
                    time: daily.time,
                    temperature_2m_max: daily.temperature_2m_max.map(v => v === null ? null : v - 4),
                    temperature_2m_min: daily.temperature_2m_min.map(v => v === null ? null : v - 4),
                    wind_gusts_10m_max: daily.wind_gusts_10m_max.map(v => v === null ? null : v * 2)
                } } });
            }
            return Promise.resolve(okResponse);
        };
        const [entry] = await getWeather({ climbs: [
            { id: 42, status: 'publish', geoLocation: '46.499111,11.808021', length: 370 }
        ]});
        expect(urls.filter(u => u.includes('elevation=')).length).to.eql(1);
        expect(entry.routeLength).to.eql(370);
        expect(entry.currently.topOut.temperatureHigh).to.be.closeTo(entry.currently.temperatureHigh - 4, 0.01);
        expect(entry.offsetPlus7.topOut.windGust).to.be.a('number');
    });

    it('short routes make no extra call and still carry routeLength for the estimate', async () => {
        const urls = [];
        mockAxios.get = (url) => { urls.push(url); return Promise.resolve(okResponse); };
        const [entry] = await getWeather({ climbs: [
            { id: 1, status: 'publish', geoLocation: '58.26094,-5.38266', length: 67 }
        ]});
        expect(urls.some(u => u.includes('elevation='))).to.eql(false);
        expect(entry.routeLength).to.eql(67);
        expect(entry.currently.topOut).to.be.undefined;
    });

    it('traverse routes get no top-out: length covers distance, not height', async () => {
        const urls = [];
        mockAxios.get = (url) => { urls.push(url); return Promise.resolve(okResponse); };
        const [entry] = await getWeather({ climbs: [
            { id: 42, status: 'publish', geoLocation: '46.499111,11.808021', length: 370, traverse: 1 }
        ]});
        expect(urls.some(u => u.includes('elevation='))).to.eql(false);
        expect(entry.routeLength).to.eql(0); // suppresses the widget's estimate too
        expect(entry.currently.topOut).to.be.undefined;
    });

    it('a failed top-out fetch never loses the climb', async () => {
        mockAxios.get = (url) => url.includes('elevation=')
            ? Promise.reject(new Error('boom'))
            : Promise.resolve(okResponse);
        const [entry] = await getWeather({ climbs: [
            { id: 42, status: 'publish', geoLocation: '46.499111,11.808021', length: 370 }
        ]});
        expect(entry.climbId).to.eql(42);
        expect(entry.currently).to.be.an('object');
        expect(entry.currently.topOut).to.be.undefined;
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

    it('produces currently + offsetPlus1..14+ + offsetMinus1..4', () => {
        expect(result).to.have.property('currently');
        // the final day (offsetPlus14) is dropped when the model nulls it
        for (let i = 1; i <= 13; i++) expect(result).to.have.property(`offsetPlus${i}`);
        for (let i = 1; i <= 3; i++) expect(result).to.have.property(`offsetMinus${i}`);
    });

    it('every day carries all fields the website consumes', () => {
        const days = [result.currently,
            result.offsetPlus1, result.offsetPlus7, result.offsetPlus13,
            result.offsetMinus1, result.offsetMinus3];
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

    it('exposes the full window (4 past + 16 forecast days) of parallel arrays', () => {
        // up to 480 hours; the model's trailing null hours are trimmed
        const hours = result.hourly.time.length;
        expect(hours).to.be.within(350, 432);
        ['icon', 'temperature', 'feelsLike', 'precipIntensity', 'precipProbability',
         'windGust', 'windBearing', 'uvIndex'].forEach(key => {
            expect(result.hourly[key], key).to.have.length(hours);
        });
    });

    it('hourly timestamps are hour-aligned and sequential', () => {
        const last = result.hourly.time.length - 1;
        expect(result.hourly.time[1] - result.hourly.time[0]).to.eql(3600);
        expect(result.hourly.time[last] - result.hourly.time[0]).to.eql(last * 3600);
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
        expect(result.currently.time).to.eql(response.daily.time[3] + 43200);
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

    it('drops trailing days the model left null instead of emitting ghost 0-degree days', () => {
        const temps = new Array(20).fill(15);
        temps[17] = null; // Open-Meteo nulls its final day(s)
        temps[18] = null;
        temps[19] = null;
        const result = mapOpenMeteoToMultipitcherDomain(
            syntheticResponse({ temperature_2m_max: temps }));
        expect(result.offsetPlus13).to.be.an('object');
        expect(result).to.not.have.property('offsetPlus14');
    });

    it('trims trailing null hours from the hourly arrays', () => {
        const hours = 432;
        const midnight = 1783810800;
        const fill = value => new Array(hours).fill(value);
        const temperatures = fill(14);
        for (let i = 424; i < hours; i++) temperatures[i] = null; // last 8 hours unfilled
        const response = syntheticResponse();
        response.hourly = {
            time: Array.from({ length: hours }, (_, i) => midnight + i * 3600),
            weather_code: fill(3), temperature_2m: temperatures, apparent_temperature: fill(13),
            precipitation: fill(0), precipitation_probability: fill(10),
            wind_gusts_10m: fill(8), wind_direction_10m: fill(200), uv_index: fill(2), is_day: fill(1)
        };
        const result = mapOpenMeteoToMultipitcherDomain(response);
        expect(result.hourly.time).to.have.length(424);
        expect(result.hourly.temperature).to.have.length(424);
        expect(result.hourly.temperature[423]).to.eql(14);
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
