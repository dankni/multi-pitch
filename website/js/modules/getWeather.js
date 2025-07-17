export const loadWeather =  async() => {
    const weatherUrl = 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-weather.json';
    try {
        const response = await fetch(weatherUrl);
        const weatherFromServer = await response.json();
        window.weatherData = weatherFromServer; // makes weather a global variable to save re-calling it
        return weatherFromServer;
    } catch (error) {
        console.log(error.message);
    }
}

export function weatherUpToDateCheck(weatherData){  
    const yesterday = Date.parse(new Date()) - 86401000; // now minus 24hours and 1 second (in milliseconds)
    const climbOneLastUpdate = weatherData.find(data => data.climbId === 1).currently.time;
    const upToDate = parseInt(climbOneLastUpdate.toString().substring(0, 10)) > parseInt(yesterday.toString().substring(0, 10)); // trims to seconds
    return upToDate; // true or false
}

export function fullWeatherForOneClimb(weatherData, climbIdToFind){
    const climbWeather = weatherData.find(data => data.climbId === parseInt(climbIdToFind));
    return climbWeather;
}

export function updateSpecificClimbCurrentWeather(climbWeather) {
    
    document.getElementById("currentWeather").style.display = "block";
    document.getElementById("seasonalWeather").classList.add("col-lg-6");
    document.getElementById("wIcon").classList.add(climbWeather.currently.icon);
    document.getElementById("wIcon").title = climbWeather.currently.icon.replace(/-/g, " ");
    document.getElementById("weatheName").innerText = climbWeather.currently.icon.replace(/-/g, " ");
    document.getElementById("highT").innerText = climbWeather.currently.temperatureHigh.toFixed(1);
    document.getElementById("lowT").innerText = climbWeather.currently.temperatureMin.toFixed(1);
    if(climbWeather.currently.sunriseTime){
        document.getElementById("sunrise").innerText = new Date(climbWeather.currently.sunriseTime  * 1000).toTimeString().substring(0,5); // suspect this is user browser time not location time
        document.getElementById("sunset").innerText = new Date(climbWeather.currently.sunsetTime  * 1000).toTimeString().substring(0,5);
        document.getElementById('light_hours').innerText = (((climbWeather.currently.sunsetTime - climbWeather.currently.sunriseTime)/60)/60).toFixed(1);
    } else {
        // The sun doesn't always rise and set everyday in all locations (eg North Norway)
        if(climbWeather.currently.uvIndex >= 1) {
            document.getElementById('sunMovement').innerHTML = '<span class="weather clear-day"></span> 24h Sun! No sunset here today.';
        } else {
            document.getElementById('sunMovement').innerHTML = '<span class="weather moon"></span> 24h Darkness! No sunrise here today.';
        }
    }
    document.getElementById('lastDate').innerHTML = '<br />Updated:' + new Date(climbWeather.currently.time * 1000).toString().substring(0,15);
    document.getElementById('precip_pos').innerText = Math.round(climbWeather.currently.precipProbability * 100);
    document.getElementById('precip_intense').innerText = climbWeather.currently.precipIntensity.toFixed(1);
    document.getElementById('wind_speed').innerText = climbWeather.currently.windGust.toFixed(1);
    document.getElementById('uv_index').innerText = climbWeather.currently.uvIndex;
    document.getElementById('cloud_cover').innerText = Math.round(climbWeather.currently.cloudCover);
    document.getElementById('bearing').style  = 'transform: rotate(' + climbWeather.currently.windBearing + 'deg);display:inline-block;';
    let bars = document.getElementById('currentRain').children;
    for (let i = 0; i < bars.length; i++) {
        let id = bars[i].id;
        let rainAmount = climbWeather[id].precipIntensity * 5;
        rainAmount > 95 ? rainAmount = 95 : rainAmount; // max 95% height = 20mm
        bars[i].children[0].style.height = rainAmount + '%';
        bars[i].prepend(Math.round(climbWeather[id].precipIntensity) + 'mm');
    }; 
}

export function updateWeatherOnHP(weatherData){
    document.querySelectorAll('.card').forEach(element => {
        let id = parseInt(element.id);
        try {
            const climbWeatherData = weatherData.find(data => data.climbId === id);
            const iconWeather = document.getElementById(`weather-${id}`);
            const toggleWeather = document.getElementById(`toggle-weather-${id}`);
            const tempValues = document.getElementById(`temp-${id}`);
            iconWeather.classList.add(climbWeatherData.currently.icon);
            iconWeather.title = climbWeatherData.currently.icon.replace(/-/g, " ");
            tempValues.innerHTML = Math.round(climbWeatherData.currently.temperatureMin) + ' to ' + Math.round(climbWeatherData.currently.temperatureHigh) + "&#176; C";
            toggleWeather.classList.remove("toggle-weather-off");
        } catch (e) {
              console.log("No weather found -> " + id + ". Error -> " + e);
        }
    }); 
}

export function generateWeatherScore(weatherData){

    const weatherType = {
        "partly-cloudy-day": 0.80, 
        "clear-day": 1,  
        "clear-night": 1, 
        "cloudy": 0.50,      
        "partly-cloudy-night": 0.75,
        "wind": 0.30,
        "fog": 0.30,
        "rain": 0.01,
        "sleet": 0.01,
        "snow": 0.01
    };
    const temperatureScoreFn = function (tempMax, tempMin) {
        const temp = tempMin + (tempMax - tempMin);
        if (temp < 0) {
            return 0.01;
        }
        if (temp >= 0 && temp < 5) {
            return 0.1;
        }
        if (temp >= 5 && temp < 12) {
            return 0.5;
        }
        if (temp >= 10 && temp < 15) {
            return 0.7;
        }
        if (temp >= 15 && temp < 24) {
            return 1;
        }
        if (temp >= 24 && temp < 30) {
            return 0.6;
        }
        if (temp >= 30) {
            return 0.1;
        } else {
            return 0.01;
        }
    }
    const rainScoreFn = function(chance, amount){
        if(amount <= 10){
            amount = amount / 10; // eg 3.5mm becomes 0.35
        } else {
            amount = 1; // eg 12mm becomes 1
        }
        return 1 - (chance * amount); // 50% chance of 1mm of rain = 0.95 because 1 - (0.5 * 0.1) 
                                      // 80% chance of 8mm of rain = 0.36 because 1 - (0.8 * 0.8) 
    }
    let weather = [];
    function craftArry(id, weather, temp, score){
        return {"climb" : id, "weather" : weather, "temp" : temp, "score" : score};
    }
    weatherData.forEach(data => {
        const scoreWeatherType = weatherType[data.currently.icon];
        const scoreTemperature = temperatureScoreFn(data.currently.temperatureHigh, data.currently.temperatureMin);
        const scoreRain = rainScoreFn(data.currently.precipProbability, data.currently.precipIntensity);
        const currentlyScore = ((scoreWeatherType + scoreRain + scoreTemperature)/3).toFixed(3); // to 3 decimal places

        weather.push(
            craftArry(
                data.climbId, 
                data.currently.icon,
                Math.round(data.currently.temperatureMin) + '-' + Math.round(data.currently.temperatureHigh) + "&#176;C",
                currentlyScore
            )
        );
        try{
            let climbCard = document.getElementById(data.climbId);
            climbCard.dataset.weatherScore = currentlyScore;
        } catch(e){
            console.log(e);
        }
    });

    //save it in local storage so there isn't a problem when sorting
    localStorage.setItem('weather', JSON.stringify(weather));
}