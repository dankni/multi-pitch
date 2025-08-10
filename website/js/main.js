// START
window.performance.mark('start-js-read');

/**
 IMPORTS
 **/
import { loadWeather, weatherUpToDateCheck, updateWeatherOnHP, generateWeatherScore, fullWeatherForOneClimb, updateSpecificClimbCurrentWeather } from "./modules/getWeather.js";
import { climbCard, getRouteTopo } from "/components/climbCard.js";

/**
 GLOBAL VARIABLES
 **/
const rootProject = '/'; // adjust per enviroment
var climbsData;
var topoData = null;
var historyData = {"page": window.location.pathname}; // push state
var dataSavingMode = false;
var geoLocationSupport = false;
var userLat = null;
var userLon = null;
if ("connection" in navigator) {
    if (navigator.connection.saveData === true) {
        // if the device supports data saving this takes the value (true or false)
        // climbCard.js then doesn't loads high pixel density images (ie. larger files)
        dataSavingMode = navigator.connection.saveData;
    }
}
if ("geolocation" in navigator) {
    geoLocationSupport = true;
}
const gradeMappings = {
    'BAS': {1: 'Diff', 2: 'VDiff', 3: 'Sev', 4: 'HS', 5: 'VS', 6: 'HVS', 7: 'E1','title':'British Adjectival System'},
    'UIAA':{1: 'II', 2: 'III', 3: 'IV', 4: 'IV+', 5: 'V', 6: 'VI', 7: 'VI+', 'title':'Union Internationale des Associations d\'Alpinisme'},
    'YDS':{1: '5.3', 2: '5.4', 3: '5.6', 4: '5.7', 5: '5.8', 6: '5.9', 7: '5:10a','title':'Yosemite Decimal System'},
    'FS':{1: '2', 2: '3', 3: '4', 4: '4+', 5: '5+', 6: '6a', 7: '6a+', 'title': 'French Sport'},
    'N':{1: '2', 2: '3', 3: '4', 4: '4+', 5: '5', 6: '5+', 7: '6', 'title': 'Norwegian'},
    'ALP':{1: 'PD-', 2: 'PD', 3: 'PD+', 4: 'AD-', 5: 'AD', 6: 'D', 7: 'TD', 'title': 'French Alpine Grades'}
};
if (!"content" in document.createElement("template") && document.getElementById('ie-warn')) {
    // browser does not support <template> element
    document.getElementById('ie-warn').setAttribute('style', 'display:block;');
}
var webPsupport = (function() {
    var webP = new Image();
    webP.onload = WebP.onerror = function () {
      callback(webP.height == 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
});

/**
 * SET THE climbsData VARIABLE BUT USE localStorage FIRST
 **/
window.getOnlineClimbsData = async (set) => {
    try{
        const response = await fetch('/data/data.json', {cache: "no-cache"});
        if(set === true){
            climbsData = await response.json();
            window.performance.mark('data.json-from-server');
            localStorage.setItem('climbsData', JSON.stringify(climbsData));
            // if the DOM is not ready add an event listener to launch init, otherwise just launch it. 
            document.readyState == 'loading' ? document.addEventListener('DOMContentLoaded', init()) : init();
        } else {
            let serverClimbsData = await response.json();
            if(serverClimbsData.lastUpdate > climbsData.lastUpdate){
                climbsData = serverClimbsData;
                localStorage.setItem('climbsData', JSON.stringify(climbsData));
                document.readyState == 'loading' ? document.addEventListener('DOMContentLoaded', init()) : init();
            }
        }
    } catch (e){
        console.log(e);
    }
};
if(localStorage.getItem('climbsData')){
    climbsData = JSON.parse(localStorage.getItem('climbsData'));
    window.addEventListener('load', (event) => {
        init();
        getOnlineClimbsData(false);
    });
} else {
    getOnlineClimbsData(true);
}
    
/**
GA TRACKING HELPER
**/
window.trackGA = function(category, action, label, value = 0) {
    try{
        ga('gtag_UA_123782847_1' + '.send', 'event', category, action, label, value);
    }
    catch (e) {
        // console.log("failed to track event" + e);
    }
};

/**
 THE SLIDER FUNCTION FOR FILTERS
 **/
(function () { // self executing anonymous function
    const ranges = ['grade', 'height', 'approach'];
    ranges.forEach((type) =>{
        const rangeInput = document.querySelectorAll("." + type + "-range-input input");
        rangeInput.forEach((input) => {
            input.addEventListener("input", (e) => {
                if(rangeInput[0].value === rangeInput[0].max ){
                    rangeInput[0].style.zIndex = "2"; 
                    rangeInput[1].style.zIndex = "1";
                } else {
                    rangeInput[1].style.zIndex = "2";
                    rangeInput[0].style.zIndex = "1";
                }
                showVal(type);
            });
        })
    });
})();

/**
 SHOW THE CURRENT VALUE OF THE SLIDERS
 **/
window.showVal = function(field) {

    let gradePreference = 'BAS'; //default

    let val1 = parseInt(document.getElementById(field + 'Range1').value);
    let val2 = parseInt(document.getElementById(field + 'Range2').value);

    let lowerValue = val1 < val2 ? val1 : val2;
    let higherValue = val2 >= val1 ? val2 : val1;

    if(localStorage.getItem('gradePreference')){
       gradePreference = localStorage.getItem('gradePreference');
       document.getElementById('gradeSys').title = gradeMappings[gradePreference].title;
       document.getElementById('gradeSys').textContent = gradePreference;
    }

    if (field === 'grade') {
        lowerValue = gradeMappings[gradePreference][parseInt(lowerValue)];
        higherValue = gradeMappings[gradePreference][parseInt(higherValue)];
    }
    document.getElementById(field + "1").innerHTML = lowerValue;
    document.getElementById(field + "2").innerHTML = higherValue;
    filterCards();
};

/**
 UPDATE WHICH COL TO HIGHLIGHT IN GRADE CONVERSION TABLE
 **/
window.updateTableHighlight = function(){
    if(document.getElementById('gradeTable')){
        const tableData = document.getElementsByTagName('td');
        gradePreference = localStorage.getItem('gradePreference');
        for(let i=0; i < tableData.length; i++){
            if(tableData[i].classList.contains(gradePreference)){
                if(tableData[i].classList.contains('active')){
                    // has right class
                } else {
                    tableData[i].classList.add('active');
                }
            } else if(tableData[i].classList.contains('active')){
                tableData[i].classList.remove('active');
            }
        } 
    }  
};

/**
 UPDATE THE USERS GRADE Preference
 **/
window.updateGradePref = function() {
    const radios = document.querySelectorAll('input[type=radio][name=gradeChanger]');
    const descriptions = document.getElementsByClassName('gradeDes');
    for (let j=0; j < descriptions.length; j++) {
        descriptions[j].style.display = 'none';
    }

    for (let i=0; i < radios.length; i++) {
        if (radios[i].checked) { 
            localStorage.setItem('gradePreference', radios[i].value); 
            showVal('grade');
            if(document.getElementById(radios[i].value)){
                document.getElementById(radios[i].value).style.display = 'block';
            }
            trackGA('gradeConversion', "changed grade", radios[i].value);
            break;
        }
    }
    // update table highlighting
    updateTableHighlight();
    updateListingGrades();
};

/**
 UPDATE THE LISTED GRADES TO MATCH GRADE Preference
 **/
window.updateListingGrades = function(){
    let cards = document.getElementsByClassName('card');
    for(let i = 0; i < cards.length; i++){
        let climb = climbsData.climbs.find(climb => climb.id === parseInt(cards[i].id));
        let answer = gradeToShow(climb, localStorage.getItem('gradePreference'));
        let card = document.getElementById(climb.id);
        function updateHTML(gradeTxt, conTxt, abbrEl, abbrTitle){
            card.querySelector('.card-body .gradeTxt').innerHTML = gradeTxt;
            card.querySelector('.card-body .convTxt').innerHTML = conTxt;
            card.querySelector('.card-body abbr').innerHTML = abbrEl;
            card.querySelector('.card-body abbr').title = abbrTitle;
        }
        if(localStorage.getItem('useConverted')){
            if(answer.converted == 'Converted '){
                updateHTML(answer.grade, "Converted Grade:", localStorage.getItem('gradePreference'), gradeMappings[localStorage.getItem('gradePreference')].title);
            } else {
                updateHTML(answer.grade, "Grade:", climb.gradeSys, gradeMappings[climb.gradeSys].title);
            }
        } else {
            updateHTML(climb.originalGrade, "Grade:", climb.gradeSys, gradeMappings[climb.gradeSys].title);
        }
    }
};

/**
 SET IF THE USER WANTS TO SHOW CONVERTED OR ORIGINAL GRADES
 **/
window.toggleUseConverted = function(){
    if(document.getElementById('useConverted').checked === true){
        trackGA('gradeConversion', "toogle use converted", 'on');
        localStorage.setItem('useConverted', true);
        updateListingGrades();
    } else {
        localStorage.removeItem('useConverted');
        trackGA('gradeConversion', "toogle use converted", 'off');
        updateListingGrades();
    }
};

/**
 FUNCTION TO GET FILTER VALUES FROM HTML 
 **/
window.getFilters = function(){
    let filters = {
        "height" :   { "low" : 50, "high" : 720 },
        "grade" :    { "low" : 1,  "high" : 7   },
        "approach" : { "low" : 0,  "high" : 200  }
    };
    const keys = Object.keys(filters);
    for(let i = 0; i < keys.length; i++){
        let val1 = parseInt(document.getElementById(keys[i] + 'Range1').value);
        let val2 = parseInt(document.getElementById(keys[i] + 'Range2').value);
        
        if(val1 < val2) {
            filters[keys[i]].low = val1;
            filters[keys[i]].high = val2;
        } else {
            filters[keys[i]].low = val2;
            filters[keys[i]].high = val1;
        }
    }
    return filters;
};


/**
 A FUNCTION TO FILTER THE CARD BY THE USERS SELECTION
 **/
window.filterCards = function() {

    let resultCount = 0;
    let filters = getFilters();
    let cards = document.getElementsByClassName('card');

    for (let i = 0; i < cards.length; i++) {
        let dataGrade = cards[i].getAttribute('data-grade');
        let dataHeight = cards[i].getAttribute('data-height');
        let dataApproach = cards[i].getAttribute('data-approach');
        let clash = 0;
        let advancedLabels = document.getElementsByClassName('advancedLabel');

        for(let j = 0; j < advancedLabels.length; j++){
          let title = advancedLabels[j].getAttribute('for');
          if(document.getElementById(title).checked === false && cards[i].getAttribute('data-' + title) === '1'){
              clash += 1; break;
          } else {
            clash += 0;
          }
        }

        if (
            parseInt(dataGrade) >= filters.grade.low
            && parseInt(dataGrade) <= filters.grade.high
            && parseInt(dataHeight) >= filters.height.low
            && parseInt(dataHeight) <= filters.height.high
            && parseInt(dataApproach) >= filters.approach.low
            && parseInt(dataApproach) <= filters.approach.high
            && clash < 1
        ) {
            cards[i].style.display = "block";
            resultCount += 1;
        } else {
            cards[i].style.display = "none";
        }
    }

    if (resultCount === 0) {
        document.getElementById('noResults').style.display = 'block';
    } else {
        document.getElementById('noResults').style.display = 'none';
    }
    updateTotalCount();
};

window.toggleFilters = function(){
    let advancedFilters = document.getElementById('advancedFilters');
    let filterArrow = document.getElementById('filterArrow');
    if(advancedFilters.style.display === 'flex'){
        advancedFilters.style.display = 'none';
        localStorage.setItem('showFilters', false);
        filterArrow.style.rotate = '0deg';
    } else {
        advancedFilters.style.display = 'flex';
        document.getElementById('abseil').focus(); // keyboard acessibility 
        localStorage.setItem('showFilters', true);
        filterArrow.style.rotate = '180deg';
    }
};

window.saveFilter = function() {
    let filter = getFilters();

    let advancedLabels = document.getElementsByClassName('advancedLabel');
    for(let j = 0; j < advancedLabels.length; j++){
        let title = advancedLabels[j].getAttribute('for');
        let value = document.getElementById(title).checked;
        filter[title] = value; 
    }
    localStorage.setItem('filters', JSON.stringify(filter));
};

window.trackFilter = function(filterType){
    let lastUpdate = document.getElementById("lastUpdate");
    lastUpdate.innerHTML = new Date().getTime();
    setTimeout(function(){
        if (parseInt(lastUpdate.innerHTML) + 1999 < new Date().getTime()){
            let filters = getFilters();
            let label = `G = ${filters.grade.low},${filters.grade.high} | H = ${filters.height.low},${filters.height.high} | A = ${filters.approach.low},${filters.approach.high}`;
            saveFilter();
            trackGA('sort-and-filter', filterType + '-filter', label, 0);
        }
    }, 2000);
};

/**
 FUNCTION TO SORT MULTIDIMENSIONAL ARRAYS
 **/
if (typeof helper === 'undefined') {
    var helper = {};
}

helper.arr = {

    // param {array} [arr] Source array
    // param {array} [columns] List of columns to sort
    // param {array} [order_by] List of directions (ASC, DESC)
    // returns {array}

    multisort: function (arr, columns, order_by) {
        

        if(columns[0] === 'lastUpdate'){
            for(let i = 0; i < arr.length; i++){
                if(isNaN(arr[i].lastUpdate)){ // if its not a number convert it, if it is, its been converted already
                    arr[i].lastUpdate = Date.parse(arr[i].lastUpdate); // this is converting climbsData to timestamp
                }
            }
        }
        if (typeof columns === 'undefined') {
            columns = [];
            for (x = 0; x < arr[0].length; x++) {
                columns.push(x);
            }
        }
        if (typeof order_by === 'undefined') {
            order_by = [];
            for (x = 0; x < arr[0].length; x++) {
                order_by.push('ASC');
            }
        }

        function multisort_recursive(a, b, columns, order_by, index) {
            var direction = order_by[index] === 'DESC' ? 1 : 0;
            var is_numeric = !isNaN(a[columns[index]] - b[columns[index]]);
            var x = is_numeric ? a[columns[index]] : a[columns[index]].toLowerCase();
            var y = is_numeric ? b[columns[index]] : b[columns[index]].toLowerCase();        

            if (!is_numeric) {
                x = helper.string.to_ascii(a[columns[index]].toLowerCase(), -1),
                y = helper.string.to_ascii(b[columns[index]].toLowerCase(), -1);
            }
            if (x < y) {
                return direction === 0 ? -1 : 1;
            }
            if (x === y) {
                return columns.length - 1 > index ? multisort_recursive(a, b, columns, order_by, index + 1) : 0;
            }
            return direction === 0 ? 1 : -1;
        }

        return arr.sort(function (a, b) {
            return multisort_recursive(a, b, columns, order_by, 0);
        });
    }
};

/**
 GET GRADE TO SHOW BASED ON ClimbID & PREFFERED GRADE
 **/
 window.gradeToShow = function(climb, sys){
    let answer = {'converted' : '', 'grade': 'tbc', 'sys' : sys};
    if ((climb.gradeSys === sys) || (localStorage.getItem('useConverted') != 'true')) {  // The grade pref matches original grade
        answer.grade = '' + climb.originalGrade;
        answer.sys = climb.gradeSys;
        return answer;
    }
    if (sys === 'BAS') {                                        // British grade pref, use manual conversions
        answer.grade = climb.tradGrade + ' ' + climb.techGrade;
        answer.converted = 'Converted ';
        return answer;
    } else {                                                    // Use dataGrade number to convert
        answer.grade = '' + gradeMappings[sys][climb.dataGrade];
        answer.converted = 'Converted ';
        return answer;
    } 
};

/**
 PUBLISH THE FRONT OF THE CARDS
 **/
window.publishCards = async function(climbsArr) {
    const boolToNumber = function (value){
        value === "true" || value === "1" || value === true || value === 1 ? value = 1 : value = "";
        return value;
    }
    const cardTemplateHTML = document.querySelector("#climb-card-template").innerHTML;

    function fillCardTemplate(cardTemplateHTML, data) {
        return cardTemplateHTML.replace(/{{(.*?)}}/g, (match, key) => data[key.trim()] ?? '');
    }

    for (let i = 0; i < climbsArr.length; i++) {
        if (climbsArr[i].status === 'publish') {
            let status = "";
            let icon = "heart-empty";
            let saved = 0;
            let unsaved = 1;
            let done = 0
            if(localStorage.getItem('wishlist')){
                try{
                    let wishlist = JSON.parse(localStorage.getItem('wishlist'));
                    status = wishlist[climbsArr[i].id];
                    if(status === "done"){ 
                        icon = "ok"; 
                        done = 1;
                        saved = 0;
                        unsaved = 0; 
                    }
                    else if (status === "wished") { 
                        icon = "heart"; 
                        saved = 1;
                        unsaved = 0;
                        done =0;
                    }
                } catch (e) {
                    // useful catch for currupt JSON
                    localStorage.removeItem('wishlist');
                    console.log("Problem with wishlist in local storage. Whole wishlist removed" + e);
                }
            }
        
            let sys = 'BAS';
            if(localStorage.getItem('gradePreference')){
                sys = localStorage.getItem('gradePreference');
            }
            const answer = gradeToShow(climbsArr[i], sys);
            sys = answer.sys;
            const grade = answer.grade;
            const conv = answer.converted;
        
            const data = {
                id: climbsArr[i].id,
                flag: climbsArr[i].country.toLowerCase().replace(' ', ''),
                cliff: climbsArr[i].cliff,
                routeName: climbsArr[i].routeName,
                webPUrl: climbsArr[i].tileImage.url.replace(".jpg", ".webp"),
                url: '/climbs/' + climbsArr[i].routeName + '-on-' + climbsArr[i].cliff + '/'.toLowerCase().replace(/'/g, "").replace(/ /g, "-"),
                status: status,
                icon: icon,
                saved: saved,
                unsaved: unsaved,
                done: done,
                sys: sys,
                grade: grade,
                conv: conv,
                dataGrade: climbsArr[i].dataGrade,
                length: climbsArr[i].length,
                pitches: climbsArr[i].pitches,
                approachTime: climbsArr[i].approachTime,
                approachDifficulty: climbsArr[i].approachDifficulty,
                abseil: boolToNumber(climbsArr[i].abseil),
                traverse: boolToNumber(climbsArr[i].traverse),
                loose: boolToNumber(climbsArr[i].loose),
                tidal: boolToNumber(climbsArr[i].tidal),
                seepage: boolToNumber(climbsArr[i].seepage),
                polished: boolToNumber(climbsArr[i].polished),
                draft: boolToNumber(climbsArr[i].draft),
                tileImageUrl: climbsArr[i].tileImage.url,
                tileImageAlt: climbsArr[i].tileImage.alt,
                geoLocation: climbsArr[i].geoLocation,
                county: climbsArr[i].county
            };
                    // Fill the template
            const cardHTML = fillCardTemplate(cardTemplateHTML, data);
            cardHolder.innerHTML += cardHTML;
        }
    }
    document.getElementById('loading').style.display = 'none';
    filterCards();
};

/**
CHANGES THE USERS STATUS OF THE CLIMB CARD BETWEEN NONE, WISHED & DONE
**/
window.cycleStatus = function(id){
    let statusFlag = document.getElementById(id + 'Status');
    let curentState = statusFlag.dataset.status;
    let wishlist = {};
    switch(curentState) {
        case (""):
            statusFlag.dataset.status = "wished";
            statusFlag.innerHTML = "<i class='icon-heart'></i>";
            break;
        case ("wished"):
            statusFlag.dataset.status = "done";
            statusFlag.innerHTML = "<i class='icon-ok'></i>";
            break;
        default:
            statusFlag.dataset.status = "";
            statusFlag.innerHTML = "<i class='icon-heart-empty'></i>";
            break;
    }
    let climbSti = document.getElementsByClassName('climb-status');
    for(let i = 0; i < climbSti.length; i++){
        wishlist[climbSti[i].dataset.climbid] = climbSti[i].dataset.status;
    }
    trackGA('wishlist', statusFlag.dataset.status, id + ' = ' + statusFlag.dataset.status);
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
};

/**
 REMOVES ALL THE CARDS THEN SORTS THE ARRAY AND PUBLISHES IT
 **/
window.sortCards = function(sortBy, direction) {
    if(sortBy !== 'distance' && sortBy !== 'weatherScore') { // avoid the geo-location call or weather being the default
        localStorage.setItem('sortOrder', sortBy + ',' + direction);
    }
    if (sortBy === 'weatherScore') {
        for (let i = 0; i < climbsData.climbs.length; i++) {
            if (climbsData.climbs[i].status === "publish") { // ensures unpublished climbs are not processed
                let climb = climbsData.climbs[i];
                let weatherScore = document.getElementById(climb.id).dataset.weatherScore;
                climbsData.climbs[i].weatherScore = weatherScore; // add weather score to the js climb data
            } else {
                climbsData.climbs[i].weatherScore = 0; 
            }
        }           
    }
    if (sortBy === 'distance' && userLat === null) {
        document.getElementById('loading').style.display = "block";
        document.getElementById('loadingMsg').innerHTML = "Requesting Geo-Location...";
        navigator.geolocation.getCurrentPosition(locationLoaded, locationFailed);
    }
    else {
        var c = document.getElementsByClassName("card");
        while (c.length > 0) c[0].remove();
        var climbsSorted = helper.arr.multisort(climbsData.climbs, [sortBy, 'dataGrade'], [direction, 'ASC']);
        publishCards(climbsSorted);
        filterCards(); // ensures filters are kept
    }
    if(localStorage.getItem('weather')){   // toDo check its up to date 
        const weatherData = JSON.parse(localStorage.getItem('weather'));
        document.querySelectorAll('.card').forEach(element => {
            let id = parseInt(element.id);
            const climbWeatherData = weatherData.find(data => data.climb=== id);
            const iconWeather = document.getElementById(`weather-${id}`);
            const toggleWeather = document.getElementById(`toggle-weather-${id}`);
            const tempValues = document.getElementById(`temp-${id}`);
            iconWeather.classList.add(climbWeatherData.weather);
            iconWeather.title = climbWeatherData.weather.replace(/-/g, " ");
            tempValues.innerHTML = climbWeatherData.temp;
            document.getElementById(id).dataset.weatherScore = climbWeatherData.score;
            toggleWeather.classList.remove("toggle-weather-off");
        });
    }
};

/**
 FUNCTION TO ADD DISTANCE FROM USER TO CLIMB TO ALL CLIMBS THEN SORT ASC
 **/
window.locationLoaded = function(position) {
    userLat = position.coords.latitude;
    userLon = position.coords.longitude;
    for (let i = 0; i < climbsData.climbs.length; i++) {
        if (climbsData.climbs[i].status === "publish") { // ensures unpublished climbs are not processed
            let climb = climbsData.climbs[i];
            let distance = calcDistanceBetweenPoints(climb.geoLocation.split(',')[0], climb.geoLocation.split(',')[1], userLat, userLon);
            climbsData.climbs[i].distance = distance;
        } else {
            climbsData.climbs[i].distance = 100000; // ensures all climbs have a distance column
        }
    }
    document.getElementById('loading').style.display = "none";
    sortCards('distance', 'ASC');

};

window.locationFailed = function() {
    console.log("failed to get location");
};

/**
 FUNCTION TO GET KM BETWEEN TWO POINTS USING LAT LON
 **/
window.calcDistanceBetweenPoints = function(lat1, lon1, lat2, lon2) {
    var R = 6371; // km (change this constant to get miles)
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d.toFixed(1); // km to 1 decimal place 
};

/**
 SHOW FULL CLIMB INFO - IE LOAD THE BACK OF THE CARD
 **/
window.showTile = function(climbId, popped = false) {
    // ToDo: clean this up - its a bit messy because the lastUpdate could be a timestamp or JS date string
    climbId = parseInt(climbId);
    let climb = localStorage.getItem('climb' + climbId) ? JSON.parse(localStorage.getItem('climb' + climbId)) : null;
    let localClimbFileDate = localStorage.getItem('climb' + climbId) ? Date.parse(climb.climbData.lastUpdate) : null; 
    localClimbFileDate = typeof localClimbFileDate == 'string' ? Date.parse(localClimbFileDate) : localClimbFileDate;
    let summaryFileClimbTime = climbsData.climbs.find(climb => climb.id === climbId).lastUpdate;
    summaryFileClimbTime = typeof summaryFileClimbTime == 'string' ? Date.parse(summaryFileClimbTime) : summaryFileClimbTime;

    if(climb !== null && localClimbFileDate >= summaryFileClimbTime){
        deliverChange(climb, popped);
    } else {
        fetch('/data/climbs/' + climbId + '.json', {
            cache: "no-cache",
            headers: {'Cache-Control': 'no-cache, no-store, max-age=0'}
        })
        .then(response => {
            if (response.ok) {
                return response.text();
            } 
        })
        .then(data => {
            if (data) {
                localStorage.setItem('climb' + climbId, data);
                climb = JSON.parse(data);
                deliverChange(climb, popped);
            }
        })
        .catch((e) => {
            console.log("couldn't load climbsData - likley connection error:" + e);
        });
    }
};

window.deliverChange = function(climb, popped){
    let climbData = climb.climbData;
    localStorage.setItem('focusId', climbData.id + 'Focus');
    localStorage.setItem('lastClimb', climbData.id );
     
    var url = '/climbs/' + climbData.routeName.trim() + '-on-' + climbData.cliff.trim() + '/';
    url = url.toLowerCase().replace(/'/g, "").replace(/ /g, "-");
    if(popped === false) {
        window.history.pushState({"page": url}, climbData.cliff, url);
    }
    document.getElementById('overlay').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");
    var fullCard = climbCard(climb);
    document.getElementById('overlay').innerHTML = fullCard;
    var navHeight = document.getElementsByTagName("nav")[0].height;
    document.getElementById('climbCardDetails').style = `margin: ${navHeight}px 0 0 0;Background: #fff;`;
    document.title = climbData.cliff + " - " + climbData.routeName;
    document.getElementById('articleTitle').focus(); // Set focus on the climb card article for accessibility 
    loadCurrentWeatherModule();
    if(climbData.tidal >= 1){
        loadTides(climbData.id);
    }
};

/**
 OPEN AN OVERLAY
 **/
window.openModal = function(url, id) {
    localStorage.setItem('focusId', id)
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            var resp = this.response;
            document.getElementById('overlay').innerHTML = resp;
            document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);z-index:14;");
            document.getElementById('close').setAttribute("style", "display:block;");
            document.getElementById('bdy').setAttribute("style", "overflow:hidden");
            document.getElementById('modalStart').focus(); // accessibility
            if(document.getElementById('newScript')){
                eval(document.getElementById('newScript').textContent); // ToDo: Fix this! A hack to run any scripts that are in the new html
            }
        } else {
            console.log('failed to get modal');
        }
    };
    request.onerror = function () {
        console.log('There was a connection error of some sort');
    };
    request.send();
    const name = url.replace('/','');
    trackGA(name, 'Open', id);
};

/**
 CLOSE THE OVERLAY OR GO BACK TO HOMEPAGE
 **/
window.hideTile = function() {
    document.getElementById('close').setAttribute("style", "display:none;"); // for the subscribe overlay
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
    if(localStorage.getItem('focusId')){
        if(document.getElementById(localStorage.getItem('focusId'))){
            document.getElementById(localStorage.getItem('focusId')).focus();
            localStorage.removeItem('focusId');
        }
    }
};

function isScriptLoaded(url) {
    var scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.split("/").pop() == url.split("/").pop()) {
            return true;
        }
    }
    return false;
}

window.topoInteraction = function(climbId, name, cliff){
    if(topoData === null){
        // landing direct and no local data
        toggleTopo();
        tryLoadTopo(climbId); 
    } else {
        // local data but not loaded
        toggleTopo();
        if(document.getElementById("staticTopo").style.display !== "none"){
            initTopo(climbId);
        } else {
            // loaded
            draw();
        }
    }
    trackGA('topo', 'infoBox', 'ID = ' + climbId + ' | N =  ' + name + ' on  ' + cliff, 0);
};
/**
 LOAD TOPO DATA JS OBJECT
 **/
window.tryLoadTopo = function (climbId, enviroment = '') {
    enviroment = (typeof enviroment === 'undefined') ? '' : enviroment; //makes this optional
    topoData = (localStorage.getItem('climb' + climbId)) ? JSON.parse(localStorage.getItem('climb' + climbId)).topoData : null ;
    if (topoData === null) {
        // page was direct load so add data to local storage;
        const getData = async (climbId) => {
            const response = await fetch('/data/climbs/' + climbId + '.json', {cache: "no-cache"});
            let climbData = await response.json();
            localStorage.setItem('climb' + climbId, JSON.stringify(climbData));
            topoData = climbData.topoData;
            initTopo(climbId);
        }
        getData(climbId).catch((e) => {
            console.log(`Error loading Topo. ${e}`)
        });
    } else {
        initTopo(climbId);
    }
}

/**
 ALL THE TOPO DRAWING FUNCTIONS
 **/
// Global Variables for topo drawing
const pd = window.devicePixelRatio;
var scale, lineWidth, fontsize, canvas, img, flag, logo;
var belaySize = 24;
const lineColor = "rgba(204,25,29,0.95)";
const belayColor = "rgb(236,142,140,0.9)";
const decentBelay = "rgba(84, 122, 183, 0.9)";
const decentLine = "rgb(1, 70, 181, 0.95)";
const infoBoxColor = 'rgba(28, 35, 49, 0.95)';
var maxWidth = 'max';
var arrowSize = 20;
var dashSpace = [32, 8, 5, 8];
var dotted = [5, 10]
var belayScale = 1; // used to scale the line and labels inline with belay size

window.initTopo = function() {
    img = new Image(); 
    flag = new Image();
    logo = new Image();
    canvas = document.getElementById("canvas");
    logo.src = '/img/logo/mp-logo-white.png';
    img.src = topoData.image;
    flag.src = topoData.flag;
    img.onload = function () {
        draw();
    }
}

window.toggleTopo = function() {
    document.getElementById("staticTopo").style.display = "none";
    document.getElementById("canvas").style.display = "block";
}

window.updateScale = function() {
    let vh90 = window.innerHeight * 0.9;
    let topoHolder = document.getElementById("topoHolder");
    let scaleVsVh, scaleVsHolder;
    vh90 < img.height ? scaleVsVh = vh90 / img.height : scaleVsVh = 1;
    topoHolder.offsetWidth ? scaleVsHolder = topoHolder.offsetWidth / img.width : scaleVsHolder = 1;
    scaleVsVh > scaleVsHolder ? scale = scaleVsHolder : scale = scaleVsVh;

    topoData.belaySize ? belaySize = sThis(topoData.belaySize) : belaySize = sThis(24);
    belayScale = belaySize / sThis(24);
    lineWidth = sThis(6) * belayScale;
    fontsize = sThis(55) * belayScale;
    dashSpace = [sThis(32) * belayScale, sThis(8) * belayScale, sThis(5) * belayScale, sThis(8) * belayScale];
    dotted = [sThis(5) * belayScale, sThis(10) * belayScale];
    arrowSize = 20 * belayScale;
}

// Draws the topo on the canvas based on the current data
window.draw = function() {
    updateScale();
    /** DEFINE THE DERIVED DRAWING VARIABLES */
    let infoBox = document.getElementById('c1').checked;
    let routeLine = document.getElementById('c2').checked;
    let belayPoints = document.getElementById('c3').checked;
    let abseilPoints = document.getElementById('c4').checked;
    let pitchLabels = document.getElementById('c5').checked;
    let alternatives = document.getElementById('c6').checked;
    var ctx = document.getElementById('canvas').getContext('2d');

    const imgWidth = sThis(img.width);
    const imgHeight = sThis(img.height);
    const flagWidth = sThis(100);
    const flagLeftMargin = sThis(80);
    const flagHeight = flagWidth * (flag.height / flag.width);
    const boxHeight = sThis(100);
    // this deals with high pixel density devices
    canvas.style.width = imgWidth + "px";
    canvas.style.height = imgHeight + "px";
    canvas.width = imgWidth * pd;
    canvas.height = imgHeight * pd;

    // Adds the main Crag image
    ctx.scale(pd, pd);
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

    // Ads the box at the bottom
    if (infoBox === true) {
        ctx.fillStyle = infoBoxColor;
        ctx.rect(0, imgHeight - boxHeight, imgWidth, imgHeight); // ToDo: make sizes relative to image size eg 8% of height
        ctx.fill();
        ctx.drawImage(flag, flagLeftMargin, (imgHeight - boxHeight + ((boxHeight - flagHeight) / 2)), flagWidth, flagHeight);
        ctx.drawImage(logo, (imgWidth - sThis(520)), (imgHeight - sThis(90)), sThis(75), sThis(75));
        ctx.font = sThis(55) + "px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(topoData.title, flagLeftMargin * 2 + flagWidth, imgHeight - sThis(35));
        ctx.fillText('multi-pitch.com', (imgWidth - sThis(420)), imgHeight - sThis(35));
    }

    // Add the Topo Line
    if (routeLine === true) {
        if (topoData.route.length > 1) {
            drawLine(ctx, topoData.route, true, false, lineColor);
        }    
        if (topoData.alternatives && alternatives === true){
            for(let i = 0; i < topoData.alternatives.length; i++){
                drawLine(ctx, topoData.alternatives[i].route, true, false, "rgba(255, 239, 101, 0.85)");
                drawBelay(ctx, topoData.alternatives[i].route[0][0], topoData.alternatives[i].route[0][1], "rgba(255, 239, 101, 0.95)", "rgba(255, 239, 101, .95)");
                annotate(ctx, topoData.alternatives[i].reference,
                    sThis(topoData.alternatives[i].route[0][0] - 12),
                    sThis(topoData.alternatives[i].route[0][1] + 12),
                    "rgb(0,0,0)");
            }
        }
    }

    for (let i = 0; i < topoData.pitches.length; i++) {
        // Add the Belay Points
        if (belayPoints === true) {
            drawBelay(
                ctx,
                topoData.pitches[i].belayPosition[0],
                topoData.pitches[i].belayPosition[1],
                lineColor, belayColor);
        }
        // add the labels
        if (topoData.pitches[i].height !== null && pitchLabels === true) {
            annotate(
                ctx,
                topoData.pitches[i].height,
                sThis(topoData.pitches[i].labelPosition[0]),
                sThis(topoData.pitches[i].labelPosition[1]),
                lineColor);
        }
        if (topoData.pitches[i].grade !== null && pitchLabels === true) {
            annotate(
                ctx,
                topoData.pitches[i].grade,
                sThis(topoData.pitches[i].labelPosition[0]),
                sThis(topoData.pitches[i].labelPosition[1]) + (fontsize * 1.3),
                lineColor);
        }
    }

    // Add the abasail Points
    if (abseilPoints === true) {
        for (let i = 0; i < topoData.decent.length; i++) {
            if (topoData.decent[i].anchor !== null) {
                drawBelay(ctx,
                    topoData.decent[i].anchor[0],
                    topoData.decent[i].anchor[1],
                    decentLine, decentBelay);
            }
            if (topoData.decent[i].label !== null && pitchLabels === true) {
                annotate(
                    ctx, 
                    topoData.decent[i].label, 
                    sThis(topoData.decent[i].labelPosition[0]),
                    sThis(topoData.decent[i].labelPosition[1]), decentLine);
            }
            if (topoData.decent[i].path !== null) {
                drawLine(ctx, topoData.decent[i].path, true, true, decentLine);
            }            
        }
    }
    document.getElementById('canvas').dataset.success = 'true'; // for automated testing
}

// A set of helper functions 
window.drawBelay = function(context, x, y, line, fill, size = belaySize ) {
    if (x > 0 && y > 0) {
        context.strokeStyle = line;
        context.setLineDash([]);
        context.lineWidth = lineWidth;
        context.fillStyle = fill;
        context.beginPath();
        context.arc(sThis(x), sThis(y), size, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();
        context.closePath();
    }
}

window.annotate = function(context, msg, x, y, color) {
    context.font = "bold " + (fontsize * 0.8) + "px sans-serif";
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = sThis(10);
    context.strokeText(msg, x, y);
    context.fillStyle = color;
    context.fillText(msg, x, y);
}

window.drawLine = function(context, arrayOfxy, dashed, arrowEnd, color) {
    context.beginPath();
    context.moveTo(sThis(arrayOfxy[0][0]), sThis(arrayOfxy[0][1]));
    for (var i = 0; i < arrayOfxy.length - 2; i++) {
        context.quadraticCurveTo(sThis(arrayOfxy[i][0]),
            sThis(arrayOfxy[i][1]),
            sThis((arrayOfxy[i][0] + arrayOfxy[i + 1][0]) / 2),
            sThis((arrayOfxy[i][1] + arrayOfxy[i + 1][1]) / 2));
    }
    context.quadraticCurveTo(sThis(arrayOfxy[i][0]),
        sThis(arrayOfxy[i][1]),
        sThis(arrayOfxy[i + 1][0]),
        sThis(arrayOfxy[i + 1][1])); // For the last 2 points
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = 'round';
    dashed === true ? context.setLineDash(dashSpace) : context.setLineDash(dotted);
    context.stroke();
    if (arrowEnd === true) {
        drawArrowhead(context, arrayOfxy[arrayOfxy.length - 2], arrayOfxy[arrayOfxy.length - 1], arrowSize, color);
    }
}

window.drawArrowhead = function(context, from, to, radius, color) {
    context.beginPath();
    var angle = Math.atan2(to[1] - from[1], to[0] - from[0])
    var x = radius * Math.cos(angle) + to[0];
    var y = radius * Math.sin(angle) + to[1];
    context.moveTo(sThis(x), sThis(y));

    angle += (1.0 / 3.0) * (2 * Math.PI)
    x = radius * Math.cos(angle) + to[0];
    y = radius * Math.sin(angle) + to[1];
    context.lineTo(sThis(x), sThis(y));

    angle += (1.0 / 3.0) * (2 * Math.PI)
    x = radius * Math.cos(angle) + to[0];
    y = radius * Math.sin(angle) + to[1];
    context.lineTo(sThis(x), sThis(y));

    context.closePath();
    context.fillStyle = color;
    context.fill();
}

window.sThis = function(number) {
    return number * scale;
}
/**
 ADDS SCRIPTS & CSS TO THE PAGE FOOTER
 **/
function loadNonEssential(type, url, mod = false){
    if(type == "script" && isScriptLoaded(url) === false){
        const tag =  document.createElement(type);
        tag.src = url
        tag.async = true;
        tag.defer = true;
        if(mod === true) { tag.type = "module";}
        document.getElementsByTagName("footer")[0].appendChild(tag);
    }
    if(type == "link"){
        const tag =  document.createElement(type);
        tag.rel = "stylesheet";
        tag.href = url;
        document.getElementsByTagName("footer")[0].appendChild(tag);
    }
}

/**
 LOADS THE ANALYTICS AFTER THE PAGE LOADS
 **/
function LoadAnalytics(){
    window.performance.mark('gta-start');
    loadNonEssential("script", "https://www.googletagmanager.com/gtag/js?id=UA-123782847-1");
    setTimeout(function(){
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'UA-123782847-1');
        window.performance.mark('gta-end');
    }, 1000);

}

/**
 * LOAD TIDE INFO
 **/
window.loadTides = function (climbId) {
    if(climbId === undefined || climbId === null) {
        climbId = parseInt(document.getElementById('climbIdMeta').content);
    }
    if (document.getElementById('tideHolder')) {
        import("./modules/loadTide.js").then(module => {
            if (!window.tideData) {
                module.loadTides(climbId).then(tideData =>{
                    let localTide = module.fullTideDataForOneClimb(tideData, climbId);
                    module.updateSpecificClimbTideInfo(localTide);
                }).
                catch((e) => {
                    console.log("Can't load tide data. " + e);
                });
            } else {
                let localTide = module.fullTideDataForOneClimb(tideData, climbId);
                module.updateSpecificClimbTideInfo(localTide);
            }
        })
    }
};

/**
 LOADS FULL WEATHER ON BACK OF CARD
 **/
window.loadCurrentWeatherModule = function(){
    const climbId = document.querySelector('meta[name="climbId"]')?.content;
    const timeZone = JSON.parse(localStorage.getItem('climb' + climbId)).climbData.timeZone;
    if (window.weatherData) {
        if(weatherUpToDateCheck(window.weatherData)){
            let localWeather = fullWeatherForOneClimb(window.weatherData, climbId);
            updateSpecificClimbCurrentWeather(localWeather, timeZone);
        }
    } else {
        loadWeather().then(response => {
            if(weatherUpToDateCheck(response)){
                let localWeather = fullWeatherForOneClimb(response, climbId);
                updateSpecificClimbCurrentWeather(localWeather, timeZone);
            }; 
        }).catch(error => {
            console.error("Error loading weather data:", error);   
        });
    }
}

/**
 ALLOWS USER TO NAVIGATE THE WEATHER PER DAY
 **/
window.weatherBars = function(direction) {
    let state = parseInt(document.getElementById('currentRain').dataset.state);
    state = (direction === 'forward') ? parseInt(state + 1) : parseInt(state -1);
    document.getElementById('currentRain').dataset.state = state;

    if (direction === 'forward') {
        document.querySelector('.bar' + parseInt(state - 4)).setAttribute('style', 'display:none;');
        document.querySelector('.bar' + parseInt(state + 3)).setAttribute('style', '');

    } else {
        document.querySelector('.bar' + parseInt(state - 3)).setAttribute('style', '');
        document.querySelector('.bar' + parseInt(state + 4)).setAttribute('style', 'display:none;');
    }

    const toggle = function(element, disable){
        let secondClass = (disable === true) ? 'inactiveChev' : '';
        let pointerEvent = (disable === true) ? 'none' : 'auto';
        document.getElementById(element).classList = 'weatherChev ' + secondClass;
        document.getElementById(element).style.pointerEvents = pointerEvent;
    } 
    
    state <= 3 ? toggle('backChev', true) : toggle('backChev', false);
    state >= 7 ? toggle('forwardChev', true) : toggle('forwardChev', false);
}

/**
 UPDATE TOTAL COUNTS
 **/
window.updateTotalCount = function(){
    let showing = 0;
    document.querySelectorAll('.card').forEach(card => {
        if(card.style.display != 'none'){
            showing += 1;
        }
    });
    document.getElementById('total').innerHTML = document.querySelectorAll('.card').length;
    document.getElementById('showing').innerHTML = showing;
};

/**
 * EXECUTE THE FILTER FUCTION BASED ON LOCAL STORAGE
 **/
function execFilter(){
    let filters = JSON.parse(localStorage.getItem('filters'));
    let advancedLabels = document.getElementsByClassName('advancedLabel');
    for(let i = 0; i < advancedLabels.length; i++){
        document.getElementById(advancedLabels[i].getAttribute('for')).checked = filters[advancedLabels[i].getAttribute('for')];
    }

    const keys = Object.keys(filters); // load range sliders from localstorage
    for(let i = 0; i < 2; i++){
        document.getElementById(keys[i] + 'Range1').value = filters[keys[i]].low;
        document.getElementById(keys[i] + 'Range2').value = filters[keys[i]].high;
        showVal([keys[i]]);
    }
    showVal('grade');
    updateTotalCount();
}

window.clearFilters = function(){    
    try {
        localStorage.removeItem('filters');
    } catch (e){
        // no filters
    }
    // reset the advanced filters
    let labels = document.getElementsByClassName('advancedLabel');
    for(let i = 0; i < labels.length; i++){
        document.getElementById(labels[i].getAttribute('for')).checked = true;
    }
    // reset the normal filters
    let filters = {
        "height" :   { "low" : 50, "high" : 720 },
        "grade" :    { "low" : 1,  "high" : 7   },
        "approach" : { "low" : 0,  "high" : 220 }
    };
    const keys = Object.keys(filters);
    for(let i = 0; i < keys.length; i++){
        document.getElementById(keys[i] + 'Range1').value = filters[keys[i]].low;
        document.getElementById(keys[i] + 'Range2').value = filters[keys[i]].high;  
        showVal([keys[i]]);
    }
    showVal('grade'); // ToDo: not sure why we need this here
    filterCards();
    return false;
}

/**
 STATE MACHINE
 **/
// need to handle history.onPopstate ie. user presses back OR forwards which makes it tricky!
window.onpopstate = function (event) {  
    let pageToLoad = document.location.pathname;
    if(pageToLoad === '/' && document.getElementById('overlay').style.display === 'block'){ 
        // the climb Card overlay is being used
        hideTile();
        document.title = "The best multi-pitch rock climbs";
    } else if(pageToLoad.includes('/climbs/')){
        // only really happens if the user presses forwards
        if(localStorage.getItem('lastClimb')){
            showTile(localStorage.getItem('lastClimb'), true);
        } else {
            // forwards won't work
        }
    } else if(pageToLoad.includes('/climbing-tips/')){
        // else it's a content page
        let url = document.location + 'content.json';
        getContent(url, false);
    } else {
        history.back();
    }
};

/**
 NAV HIGHLIGHT FOR CURRENT PAGE
 **/
window.highlightNavLocation = function(){
    const navLinks = document.querySelectorAll('nav li a');
    navLinks.forEach(a => {
        if(a.getAttribute('href') === location.pathname){
            a.classList.add('current');
        }
    });
}

function init () {
    window.performance.mark('onload-event-happened');
    // Check it's the homepage
    var hp = document.getElementById('cardHolder') ? true : false;
    if (document.location.href.includes('/climbs/') === false && hp === true) {
        if(localStorage.getItem('sortOrder')){
            const options = document.querySelectorAll('#sortOrder option');
            options.forEach(option => {
                if(option.value === localStorage.getItem('sortOrder')){
                    option.setAttribute('selected', true);
                }
            });
            var sort = localStorage.getItem('sortOrder').split(',')[0];
            var direction = localStorage.getItem('sortOrder').split(',')[1];
            sort = sort === 'updateTimestamp' ? 'lastUpdate' : sort; // Important: for backwards compatibility with previous locally saved sortOrder
        } else {
            var sort = 'lastUpdate';
            var direction = 'DESC';
        }
        sortCards(sort, direction);
        if(localStorage.getItem('filters')){
            execFilter();
        }
        window.performance.mark('all-climbs-loaded');
    }
    if (geoLocationSupport === true && hp === true) {
        document.getElementById('distance').style.display = "block";
    }
    if(localStorage.getItem('showFilters') && hp === true){
        if(localStorage.getItem('showFilters') === 'true'){
            document.getElementById('advancedFilters').style.display = 'flex';
        }
    }
}
window.addEventListener('load', (event) => {
    // if the browser supports webP add a class to the body to allow css to use webp version
    webPsupport ? document.querySelector('body').classList.add('webp') : document.querySelector('body').classList.add('no-webp'); 
    
    var hp = document.getElementById('cardHolder') ? true : false;
    // Load HP only JS
    if (hp === true){
        if (window.weatherData) {
            if(weatherUpToDateCheck(window.weatherData)){
                // the loaded weather data is up to date, so we can use it
                updateWeatherOnHP(response);
                generateWeatherScore(response);
            }
        } else {
            loadWeather().then(response => {
                if(weatherUpToDateCheck(response)){
                    updateWeatherOnHP(response);
                    generateWeatherScore(response);
                };
            });
        }
        import("./modules/rangeSliders.js");
    }
    
    loadNonEssential("link", "https://fonts.googleapis.com/css?family=Roboto:300,400&display=swap");
    loadNonEssential("link", "/css/fontello.css");

    if(document.getElementById('tideHolder')){
        loadTides();
    }

    if (document.location.href.includes('/climbs/') === true) {
        loadCurrentWeatherModule()
    }
    if (document.location.href.includes('god-mode') === true && hp === false) {
        loadNonEssential("script", "/js/cms-mode.js", true); // To Do make import
        loadNonEssential("link", "/css/cms-styles.css")
    }
    if (document.location.href.includes('god-mode') === true && hp === true) {
        // lets user stay in "CMS mode" on Homepage
        document.getElementsByTagName("nav")[0].style.backgroundColor = '#5f1430';
        let anchors = document.querySelectorAll("a");
        anchors.forEach(aTag => {
            aTag.removeAttribute("onClick");
            aTag.href = aTag.href + "?god-mode";
        });
    }
    highlightNavLocation();
//    loadNonEssential("script", "/js/auth-stuff.js"); 
    LoadAnalytics();
});
