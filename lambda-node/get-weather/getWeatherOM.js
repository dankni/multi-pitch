const axios = require('axios');

// Open-Meteo (https://open-meteo.com) — free for non-commercial use, no API key.
// One call per climb returns the 4 past days + today + 7 forecast days,
// replacing the 5 OpenWeatherMap One Call 3.0 requests per climb.
const PAST_DAYS = 4;
const FORECAST_DAYS = 16; // today + offsetPlus1..15 (the old OWM feed stopped at offsetPlus7)
const TODAY_INDEX = PAST_DAYS;

const DAILY_FIELDS = [
    'weather_code',
    'temperature_2m_max',
    'temperature_2m_min',
    'apparent_temperature_max',
    'apparent_temperature_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'wind_speed_10m_max',
    'wind_gusts_10m_max',
    'wind_direction_10m_dominant',
    'uv_index_max',
    'cloud_cover_mean',
    'relative_humidity_2m_mean',
    'surface_pressure_mean',
    'dew_point_2m_mean',
    'sunrise',
    'sunset',
    'daylight_duration'
].join(',');

// Hourly detail for the near-term forecast (BBC-weather style breakdown).
// 72 hours from now keeps the feed small while covering today + ~3 days.
const HOURLY_HOURS = 72;
const HOURLY_FIELDS = [
    'weather_code',
    'temperature_2m',
    'apparent_temperature',
    'precipitation',
    'precipitation_probability',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'uv_index',
    'is_day'
].join(',');

// The frontend keys CSS icon classes and weather scores off these names
// (see website/js/modules/getWeather.js), so only emit names from this set:
// clear-day, partly-cloudy-day, cloudy, fog, rain, sleet, snow.
function mapWmoIcon(wmoCode) {
    if (wmoCode === 0) return 'clear-day';
    if (wmoCode === 1 || wmoCode === 2) return 'partly-cloudy-day';
    if (wmoCode === 3) return 'cloudy';
    if (wmoCode === 45 || wmoCode === 48) return 'fog';
    if (wmoCode === 56 || wmoCode === 57 || wmoCode === 66 || wmoCode === 67) return 'sleet';
    if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) return 'snow';
    if ((wmoCode >= 51 && wmoCode <= 65) || (wmoCode >= 80 && wmoCode <= 82) || wmoCode >= 95) return 'rain';
    return 'partly-cloudy-day';
}

const WMO_DESCRIPTIONS = {
    0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'fog', 48: 'depositing rime fog',
    51: 'light drizzle', 53: 'moderate drizzle', 55: 'dense drizzle',
    56: 'light freezing drizzle', 57: 'dense freezing drizzle',
    61: 'slight rain', 63: 'moderate rain', 65: 'heavy rain',
    66: 'light freezing rain', 67: 'heavy freezing rain',
    71: 'slight snow', 73: 'moderate snow', 75: 'heavy snow', 77: 'snow grains',
    80: 'slight rain showers', 81: 'moderate rain showers', 82: 'violent rain showers',
    85: 'slight snow showers', 86: 'heavy snow showers',
    95: 'thunderstorm', 96: 'thunderstorm with slight hail', 99: 'thunderstorm with heavy hail'
};

function buildOpenMeteoUrl(lat, lon) {
    return 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${lat}&longitude=${lon}`
        + `&daily=${DAILY_FIELDS}`
        + `&hourly=${HOURLY_FIELDS}&forecast_hours=${HOURLY_HOURS}`
        + `&past_days=${PAST_DAYS}&forecast_days=${FORECAST_DAYS}`
        + '&timezone=auto&timeformat=unixtime&wind_speed_unit=ms';
}

function num(value, fallback) {
    return (value === null || value === undefined || isNaN(value)) ? fallback : value;
}

// Open-Meteo has no moon data, so compute the phase from the lunar cycle:
// fraction of the synodic month elapsed since a reference new moon
// (2000-01-06 18:14 UTC). 0 and 1 = new moon, 0.5 = full moon.
const SYNODIC_MONTH_DAYS = 29.53058867;
function moonPhase(unixSeconds) {
    const daysSinceNewMoon = (unixSeconds - 947182440) / 86400;
    const phase = ((daysSinceNewMoon % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS / SYNODIC_MONTH_DAYS;
    return Math.round(phase * 100) / 100;
}

// Maps one day (column `i` of the Open-Meteo daily arrays) to the domain
// object the website expects — same schema the OpenWeatherMap version produced.
function mapDayToMultipitcherDomain(daily, i) {
    const wmoCode = num(daily.weather_code[i], 3);

    // Daily `time` is local midnight; shift to local noon so browsers in
    // other timezones still render the correct calendar date for the bar labels.
    const noon = daily.time[i] + 43200;

    // Polar day/night: the frontend treats a falsy sunriseTime as "no sunrise/
    // sunset today" and uses uvIndex to tell 24h sun from 24h darkness.
    const daylight = num(daily.daylight_duration[i], 43200);
    const polar = daylight < 60 || daylight > 86340;

    return {
        time: noon,
        icon: mapWmoIcon(wmoCode),
        description: WMO_DESCRIPTIONS[wmoCode] || 'unknown',
        precipIntensity: num(daily.precipitation_sum[i], 0),
        precipProbability: num(daily.precipitation_probability_max[i], 0) / 100,
        temperatureHigh: num(daily.temperature_2m_max[i], 0),
        temperatureMin: num(daily.temperature_2m_min[i], 0),
        pressure: num(daily.surface_pressure_mean[i], 0),
        humidity: num(daily.relative_humidity_2m_mean[i], 0) / 100,
        cloudCover: num(daily.cloud_cover_mean[i], 0),
        windGust: num(daily.wind_gusts_10m_max[i], 0),
        windBearing: num(daily.wind_direction_10m_dominant[i], 0),
        windSpeed: num(daily.wind_speed_10m_max[i], 0),
        uvIndex: num(daily.uv_index_max[i], 0),
        sunriseTime: polar ? 0 : num(daily.sunrise[i], 0),
        sunsetTime: polar ? 0 : num(daily.sunset[i], 0),
        new_fields: {
            moonPhase: moonPhase(noon),
            moonPhaseDescription: "Moon phase. 0 and 1 are 'new moon', 0.25 is 'first quarter moon', 0.5 is 'full moon' and 0.75 is 'last quarter moon'. The periods in between are called 'waxing crescent', 'waxing gibous', 'waning gibous', and 'waning crescent', respectively.",
            dewPoint: num(daily.dew_point_2m_mean[i], 0),
            temperature: {
                min: num(daily.temperature_2m_min[i], 0),
                max: num(daily.temperature_2m_max[i], 0)
            },
            feelsLike: {
                min: num(daily.apparent_temperature_min[i], 0),
                max: num(daily.apparent_temperature_max[i], 0)
            },
            weather: [{ id: wmoCode, main: WMO_DESCRIPTIONS[wmoCode] || 'unknown' }]
        }
    };
}

// Night hours get the -night icon variant so the hourly row reads naturally.
function mapHourlyIcon(wmoCode, isDay) {
    const icon = mapWmoIcon(wmoCode);
    if (isDay) return icon;
    if (icon === 'clear-day') return 'clear-night';
    if (icon === 'partly-cloudy-day') return 'partly-cloudy-night';
    return icon;
}

// Compact parallel arrays (not one object per hour) to keep the feed small.
function mapHourlyToMultipitcherDomain(hourly) {
    if (!hourly || !hourly.time) return null;
    return {
        time: hourly.time,
        icon: hourly.time.map((_, i) => mapHourlyIcon(num(hourly.weather_code[i], 3), num(hourly.is_day[i], 1))),
        temperature: hourly.temperature_2m.map(v => num(v, 0)),
        feelsLike: hourly.apparent_temperature.map(v => num(v, 0)),
        precipIntensity: hourly.precipitation.map(v => num(v, 0)),
        precipProbability: hourly.precipitation_probability.map(v => num(v, 0) / 100),
        windSpeed: hourly.wind_speed_10m.map(v => num(v, 0)),
        windGust: hourly.wind_gusts_10m.map(v => num(v, 0)),
        windBearing: hourly.wind_direction_10m.map(v => num(v, 0)),
        uvIndex: hourly.uv_index.map(v => num(v, 0))
    };
}

function mapOpenMeteoToMultipitcherDomain(omResponse) {
    const daily = omResponse.daily;

    const result = {
        // IANA zone for the crag's coordinates — lets the site show local time
        // without relying on the hand-maintained climbData.timeZone field.
        timezone: omResponse.timezone,
        utcOffsetSeconds: omResponse.utc_offset_seconds,
        hourly: mapHourlyToMultipitcherDomain(omResponse.hourly),
        currently: mapDayToMultipitcherDomain(daily, TODAY_INDEX)
    };
    result.currently.alerts = []; // Open-Meteo has no weather alerts; kept for schema compatibility

    for (let plus = 1; plus < FORECAST_DAYS; plus++) {
        result[`offsetPlus${plus}`] = mapDayToMultipitcherDomain(daily, TODAY_INDEX + plus);
    }
    for (let minus = 1; minus <= PAST_DAYS; minus++) {
        result[`offsetMinus${minus}`] = mapDayToMultipitcherDomain(daily, TODAY_INDEX - minus);
    }
    return result;
}

function isValidGeo(climb) {
    const [lat, lon] = (climb.geoLocation || "").split(",");
    const isValid = !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
    if (!isValid) {
        console.error(`climb ${climb.id} has invalid geo location: ${climb.geoLocation}`);
    }
    return isValid;
}

function getWeather(climbsData) {
    const requests = climbsData.climbs
        .filter(climb => climb.status == 'publish' && isValidGeo(climb))
        .map(climb => {
            const [lat_raw, lon_raw] = climb.geoLocation.split(",");
            const url = buildOpenMeteoUrl(
                encodeURIComponent(lat_raw.trim()),
                encodeURIComponent(lon_raw.trim())
            );
            console.log("going to call Open-Meteo for climb " + climb.id, url);

            return axios.get(url)
                .then(response => {
                    return {
                        climbId: climb.id,
                        ...mapOpenMeteoToMultipitcherDomain(response.data)
                    };
                })
                .catch(err => {
                    console.error(`weather fetch failed for climb ${climb.id}:`, err.message);
                    // same shape the old implementation emitted on failure
                    return {
                        "routes": [],
                        "status": "REQUEST_DENIED"
                    };
                });
        });

    return axios.all(requests);
}

module.exports = { getWeather, mapOpenMeteoToMultipitcherDomain, mapWmoIcon, mapHourlyIcon, buildOpenMeteoUrl, moonPhase };
