const getWeatherUrl = 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-weather.json';


function checkStatusIs200(response) {
    if (response.status === 200) {
        return response.json();
    } else {
        return Promise.reject(response);
    }
}

function getData(url, headers) {
    return fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: Object.assign({}, headers),
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
    })
}

function getWeather() {

    getData(getWeatherUrl, {})
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log("Successfully download weather data from:", getWeatherUrl);
            window.darkSkyWeatherData = jsonData
        })
        .catch(err => console.error("Failed download weather data from:", err))
}

getWeather();
const fourHoursInMilliseconds = 4000 * 60 * 60;
setInterval(() => getWeather(), fourHoursInMilliseconds);


// var skycons = new Skycons({"color": "black"});
// skycons.add("dark-sky-icon", Skycons.PARTLY_CLOUDY_DAY);
// skycons.set("dark-sky-icon", Skycons.RAIN);
// skycons.play();

// <div class="loading" id="loading" style="display: none;">
//     <img src="https://www.multi-pitch.com/img/logo/mp-logo-white.png" alt="Loading">
//     <p id="loadingMsg">Requesting Geo-Location...</p>
// </div>