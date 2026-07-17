const axios = require('axios');

// Open-Meteo Marine (https://open-meteo.com) - free for non-commercial use,
// no API key. Replaced the RapidAPI tides endpoint that died behind its
// quota in July 2026; same provider family as the weather lambda.
function buildMarineUrl(lat, lon) {
    return 'https://marine-api.open-meteo.com/v1/marine'
        + `?latitude=${encodeURIComponent(lat.trim())}&longitude=${encodeURIComponent(lon.trim())}`
        + '&hourly=sea_level_height_msl'
        + '&forecast_days=2&timezone=auto&timeformat=unixtime';
}

function isValidGeo(geoLocation) {
    const [lat, lon] = (geoLocation || "").split(",");
    return !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
}

// 24 hourly points covering today at the crag - the shape the tide chart
// consumes ({timestamp, height}); the feed regenerates daily
function mapMarineToMultipitchClimb(marine, climb) {
    const times = marine.hourly.time;
    const seaLevels = marine.hourly.sea_level_height_msl;
    const heights = [];
    for (let i = 0; i < times.length && heights.length < 24; i++) {
        if (seaLevels[i] === null || seaLevels[i] === undefined) continue;
        heights.push({
            timestamp: times[i],
            height: Math.round(seaLevels[i] * 100) / 100
        });
    }
    return {
        climbId: climb.id,
        heights: heights
    };
}

function getTides(climbsData) {
    const requests = climbsData.climbs
        .filter(climb => climb.tidal == 1 && isValidGeo(climb.geoLocation))
        .map(climb => {
            const [lat, lon] = climb.geoLocation.split(",");
            const url = buildMarineUrl(lat, lon);
            console.log("going to call Open-Meteo Marine for climb " + climb.id, url);
            // a timeout keeps one hung request from stalling the daily run;
            // one climb's failure only costs that climb its chart
            return axios.get(url, { timeout: 10000 })
                .then(response => mapMarineToMultipitchClimb(response.data, climb))
                .catch(err => {
                    console.error(`marine fetch failed for climb ${climb.id}:`, err.message);
                    return null;
                });
        });

    return Promise.all(requests).then(results => results.filter(Boolean));
}

module.exports = getTides;
module.exports.buildMarineUrl = buildMarineUrl;
module.exports.mapMarineToMultipitchClimb = mapMarineToMultipitchClimb;
