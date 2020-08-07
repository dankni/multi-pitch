const axios = require('axios');
const querystring = require('querystring');

const tidesHoodKey  = process.env.TIDES_HOOD_KEY;

// TIDES_HOOD_KEY=your-key-from-rapid-api node test/getTidesTest.js

function isValidGeo(geoLocation) {
    const [lat, lon] = geoLocation.split(",");
    return lat && lon && lat.length != 0 && lon.length != 0
}

const tideApiUrl = "https://tides.p.rapidapi.com/tides"

function callTideApi(climb){
    const [lat, lon] = climb.geoLocation.split(",");
    queryParam = querystring.stringify({
	"interval": "60",
	"duration": "1440",
	"latitude": lat,
	"longitude": lon
    });
    console.log("climbid: " + climb.id + ", with wuery param: " + queryParam)
    headers = {
	"x-rapidapi-host": "tides.p.rapidapi.com",
	"x-rapidapi-key": tidesHoodKey,
	"useQueryString": true
    };
    return new Promise((resolve, reject) => {

	axios.get(tideApiUrl + "?" + queryParam, {headers})
	    .then(resp => resp.data)
            .then(tideApiResponse => mapTideApiToMultipitchClimb(tideApiResponse, climb))
	    .then(resolve)
            .catch(err => reject({"error_message": err.message}))
    })
    
    
}

function mapTideApiToMultipitchClimb(tideApiResponse, climb){
    return {
	climbId: climb.id,
	extremes: tideApiResponse.extremes,
	heights: tideApiResponse.heights
    }
}

function delay(t, v) {
    return new Promise(function(resolve) {
       setTimeout(resolve.bind(null, v), t)
   });
}

function getTide(climb){
    return callTideApi(climb)
}

function getTides(climbsData){
    var tidalClimb = climbsData.climbs.filter(c => c.tidal == 1);

    return tidalClimb.reduce((p, climb) =>
			       p.then(all_result => {
				   return getTide(climb)
				       .then(tide => delay(1500, tide))
				       .then(result => {
					   all_result.push(result)
					   return all_result
				       })
			       }),Promise.resolve([]))
}


module.exports = getTides;
