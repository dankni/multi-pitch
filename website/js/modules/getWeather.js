import { convertTime } from "/js/modules/convertTime.js";

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
    if(weatherData){
        const yesterday = Date.parse(new Date()) - 86401000; // now minus 24hours and 1 second (in milliseconds)
        const referenceClimb = weatherData.find(data => data.currently); // any climb that fetched ok (individual climbs can fail)
        if (!referenceClimb) {
            console.warn('Weather data contains no successful climbs');
            return false;
        }
        const lastUpdate = referenceClimb.currently.time;
        const upToDate = parseInt(lastUpdate.toString().substring(0, 10)) > parseInt(yesterday.toString().substring(0, 10)); // trims to seconds
        return upToDate; // true or false
    } else {
        console.warn('No weather data stored locally, maybe offline'); // stopes console error if working offline
    }
}

export function fullWeatherForOneClimb(weatherData, climbIdToFind){
    const climbWeather = weatherData.find(data => data.climbId === parseInt(climbIdToFind));
    if (!climbWeather) {
        console.warn(`No weather data found for climb ID: ${climbIdToFind}`);
        return null; 
    }
    return climbWeather;
}

// Days rendered in the forecast strip, oldest first. `currently` is today.
// The feed carries up to offsetPlus15; days missing from the feed are skipped,
// so this also renders the old 7-day feed correctly.
const STRIP_DAYS = ['offsetMinus4', 'offsetMinus3', 'offsetMinus2', 'offsetMinus1', 'currently']
    .concat(Array.from({ length: 15 }, (_, i) => 'offsetPlus' + (i + 1)));

// Intl formatters are expensive to construct, and the strip needs thousands
// of format() calls per render - cache one formatter per timezone + shape
const formatterCache = {};
function getFormatter(timeZone, options, locale = 'en-GB') {
    const key = locale + '|' + timeZone + '|' + JSON.stringify(options);
    if (!formatterCache[key]) {
        formatterCache[key] = new Intl.DateTimeFormat(locale, Object.assign({ timeZone: timeZone }, options));
    }
    return formatterCache[key];
}

// local calendar date (YYYY-MM-DD) of a unix timestamp at the crag
function localDateKey(unixSeconds, timeZone) {
    return getFormatter(timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA')
        .format(new Date(unixSeconds * 1000));
}

// one pass over the hourly arrays: local date -> [hour indexes]
function groupHourlyByDate(hourly, timeZone) {
    const groups = {};
    if (!hourly || !hourly.time) return groups;
    hourly.time.forEach((time, index) => {
        const key = localDateKey(time, timeZone);
        (groups[key] = groups[key] || []).push(index);
    });
    return groups;
}

function buildHourCell(hourly, i, timeZone) {
    const hour = getFormatter(timeZone, { hour: '2-digit', minute: '2-digit', hour12: false })
        .format(new Date(hourly.time[i] * 1000));
    const rainChance = Math.round(hourly.precipProbability[i] * 100);
    const gustMph = Math.round(hourly.windGust[i] * 2.237);
    const iconName = hourly.icon[i].replace(/-/g, ' ');
    return `<div class="wx-hour"
        title="${hour}: ${iconName}, ${Math.round(hourly.temperature[i])}°C (feels like ${Math.round(hourly.feelsLike[i])}°C), ${rainChance}% chance of ${hourly.precipIntensity[i].toFixed(1)}mm rain, gusts ${gustMph}mph, UV ${Math.round(hourly.uvIndex[i])}">
        <div class="wx-dow">${hour}</div>
        <span class="weather ${hourly.icon[i]}"></span>
        <div class="wx-temp"><strong>${Math.round(hourly.temperature[i])}&#176;</strong></div>
        <div class="wx-pop">${rainChance}%</div>
        <div class="wx-mm">${hourly.precipIntensity[i].toFixed(1)}mm</div>
        <div class="wx-wind"><span class="wx-arrow" style="transform:rotate(${hourly.windBearing[i]}deg);">&#8595;</span>${gustMph}<small>mph</small></div>
    </div>`;
}

// BBC-style hour-by-hour panel for one strip day; returns false when the
// feed has no hourly coverage for that day (or none at all - legacy feed)
function renderHourlyPanel(climbWeather, dayKey, timeZone, hoursByDate) {
    const panel = document.getElementById('weatherHourly');
    if (!panel) return false;
    const day = climbWeather[dayKey];
    const hours = (day && hoursByDate[localDateKey(day.time, timeZone)]) || [];
    if (!hours.length) {
        panel.style.display = 'none';
        panel.innerHTML = '';
        return false;
    }
    const label = dayKey === 'currently' ? 'today'
        : getFormatter(timeZone, { weekday: 'long', day: 'numeric', month: 'long' })
            .format(new Date(day.time * 1000));
    panel.innerHTML = `<p class="chart-title">Hour by hour &mdash; ${label}</p>
        <div class="weather-strip wx-hours">`
        + hours.map(i => buildHourCell(climbWeather.hourly, i, timeZone)).join('')
        + '</div>';
    panel.style.display = 'block';
    return true;
}

function buildStripDay(day, key, timeZone, hasHourly) {
    const isToday = key === 'currently';
    const isPast = key.startsWith('offsetMinus');
    const dayLabel = isToday ? 'Today'
        : getFormatter(timeZone, { weekday: 'short', day: 'numeric' }).format(new Date(day.time * 1000));
    const rainChance = Math.round(day.precipProbability * 100);
    const rainHeight = Math.min(day.precipIntensity * 5, 95); // 95% bar height = 20mm
    const gustMph = Math.round(day.windGust * 2.237); // data is m/s
    const iconName = day.icon.replace(/-/g, ' ');
    const uv = Math.round(day.uvIndex);

    const classes = ['wx-day', isToday && 'wx-today', isPast && 'wx-past', hasHourly && 'wx-clickable']
        .filter(Boolean).join(' ');
    const clickableAttrs = hasHourly
        ? ` data-day="${key}" role="button" tabindex="0" aria-label="Show hourly forecast for ${dayLabel}"` : '';
    // past days report what fell; chance-of-rain only makes sense for the forecast
    // (the API returns no probability for past days)
    const rainSummary = isPast
        ? `${day.precipIntensity.toFixed(1)}mm rain fell`
        : `${rainChance}% chance of ${day.precipIntensity.toFixed(1)}mm rain`;
    const dewPoint = day.new_fields && typeof day.new_fields.dewPoint === 'number'
        ? ', dew point ' + day.new_fields.dewPoint.toFixed(0) + '°C' : '';

    return `<div class="${classes}"${clickableAttrs}
        title="${dayLabel}: ${iconName}, ${day.temperatureMin.toFixed(0)} to ${day.temperatureHigh.toFixed(0)}°C, ${rainSummary}, gusts ${gustMph}mph, UV ${uv}, ${Math.round(day.cloudCover)}% cloud${dewPoint}">
        <div class="wx-dow">${dayLabel}</div>
        <span class="weather ${day.icon}"></span>
        <div class="wx-temp"><strong>${Math.round(day.temperatureHigh)}&#176;</strong><span>${Math.round(day.temperatureMin)}&#176;</span></div>
        <div class="wx-rain"><div class="wx-rain-bar" style="height:${rainHeight}%;"></div></div>
        <div class="wx-pop">${isPast ? '&nbsp;' : rainChance + '%'}</div>
        <div class="wx-mm">${day.precipIntensity.toFixed(1)}mm</div>
        <div class="wx-wind"><span class="wx-arrow" style="transform:rotate(${day.windBearing}deg);">&#8595;</span>${gustMph}<small>mph</small></div>
    </div>`;
}

// Live clock showing the time at the crag right now
function startCragClock(timeZone) {
    const clockElement = document.getElementById('cragLocalTime');
    const zoneElement = document.getElementById('cragTimeZone');
    if (!clockElement) return;
    const clockFormatter = getFormatter(timeZone, { hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => {
        clockElement.innerText = clockFormatter.format(new Date());
    };
    tick();
    if (zoneElement) zoneElement.innerText = '(' + timeZone.replace(/_/g, ' ') + ')';
    clearInterval(window.cragClockInterval);
    window.cragClockInterval = setInterval(tick, 30000);
}

export function updateSpecificClimbCurrentWeather(climbWeather, climbTimeZone) {
    const strip = document.getElementById('weatherStrip');
    if (!strip) return; // stale cached page with the pre-strip markup
    // the weather feed knows the crag's real timezone; static climb data is the fallback
    const timeZone = climbWeather.timezone || climbTimeZone;

    document.getElementById("currentWeather").style.display = "block";
    document.getElementById("wIcon").classList.add(climbWeather.currently.icon);
    document.getElementById("wIcon").title = climbWeather.currently.icon.replace(/-/g, " ");
    document.getElementById("weatheName").innerText = climbWeather.currently.icon.replace(/-/g, " ");
    const options = {timeZone : timeZone, hour: '2-digit', minute: '2-digit', hour12: false};

    if(climbWeather.currently.sunriseTime){
        document.getElementById("sunrise").innerText = convertTime(climbWeather.currently.sunriseTime, options);
        document.getElementById("sunset").innerText = convertTime(climbWeather.currently.sunsetTime, options);
        document.getElementById('light_hours').innerText = (((climbWeather.currently.sunsetTime - climbWeather.currently.sunriseTime)/60)/60).toFixed(1);
    } else {
        // The sun doesn't always rise and set everyday in all locations (eg North Norway)
        if(climbWeather.currently.uvIndex >= 1) {
            document.getElementById('sunMovement').innerHTML = '<span class="weather clear-day"></span> 24h Sun! No sunset here today.';
        } else {
            document.getElementById('sunMovement').innerHTML = '<span class="weather moon"></span> 24h Darkness! No sunrise here today.';
        }
    }
    document.getElementById('lastDate').innerHTML = 'Updated: ' + new Date(climbWeather.currently.time * 1000).toString().substring(0,15);
    startCragClock(timeZone);

    const hoursByDate = groupHourlyByDate(climbWeather.hourly, timeZone); // computed once per render
    strip.innerHTML = STRIP_DAYS
        .filter(key => climbWeather[key])
        .map(key => buildStripDay(climbWeather[key], key, timeZone,
            !!hoursByDate[localDateKey(climbWeather[key].time, timeZone)]))
        .join('');
    // start the strip scrolled so today is in view on narrow screens
    const today = strip.querySelector('.wx-today');
    if (today) strip.scrollLeft = Math.max(0, today.offsetLeft - strip.clientWidth / 3);

    const selectDay = (dayKey) => {
        if (renderHourlyPanel(climbWeather, dayKey, timeZone, hoursByDate)) {
            strip.querySelectorAll('.wx-selected').forEach(el => el.classList.remove('wx-selected'));
            const dayElement = strip.querySelector(`.wx-day[data-day="${dayKey}"]`);
            if (dayElement) dayElement.classList.add('wx-selected');
        }
    };
    strip.onclick = (event) => {
        const dayElement = event.target.closest('.wx-day[data-day]');
        if (dayElement) selectDay(dayElement.dataset.day);
    };
    strip.onkeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const dayElement = event.target.closest('.wx-day[data-day]');
        if (dayElement) {
            event.preventDefault();
            selectDay(dayElement.dataset.day);
        }
    };
    selectDay('currently'); // BBC-style default: today's hour by hour
}

export function updateWeatherOnHP(weatherData, dayKey = 'currently'){
    document.querySelectorAll('.card').forEach(element => {
        let id = parseInt(element.id);
        try {
            const climbWeatherData = weatherData.find(data => data.climbId === id);
            const day = climbWeatherData[dayKey];
            const iconWeather = document.getElementById(`weather-${id}`);
            const toggleWeather = document.getElementById(`toggle-weather-${id}`);
            const tempValues = document.getElementById(`temp-${id}`);
            iconWeather.className = 'weather ' + day.icon; // replace, don't add: the icon changes when re-sorting by another date
            iconWeather.title = day.icon.replace(/-/g, " ");
            tempValues.innerHTML = Math.round(day.temperatureMin) + ' to ' + Math.round(day.temperatureHigh) + "&#176; C";
            toggleWeather.classList.remove("toggle-weather-off");
        } catch (e) {
              console.log("No weather found -> " + id + ". Error -> " + e);
        }
    });
}

// dayKey lets the homepage score any day in the feed ('currently',
// 'offsetPlus1'..'offsetPlus15') so climbs can be sorted by the weather
// on a chosen date, not just right now
export function generateWeatherScore(weatherData, dayKey = 'currently'){

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
        const day = data[dayKey];
        if (!day) { return; } // climb failed its fetch, or the feed doesn't reach that day
        const scoreWeatherType = weatherType[day.icon];
        const scoreTemperature = temperatureScoreFn(day.temperatureHigh, day.temperatureMin);
        const scoreRain = rainScoreFn(day.precipProbability, day.precipIntensity);
        const currentlyScore = ((scoreWeatherType + scoreRain + scoreTemperature)/3).toFixed(3); // to 3 decimal places

        weather.push(
            craftArry(
                data.climbId,
                day.icon,
                Math.round(day.temperatureMin) + '-' + Math.round(day.temperatureHigh) + "&#176;C",
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