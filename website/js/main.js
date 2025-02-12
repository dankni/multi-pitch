// START
window.performance.mark('start-js-read');
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
const getOnlineClimbsData = async (set) => {
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
}
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
function trackGA(category, action, label, value = 0){
    try{
        ga('gtag_UA_123782847_1' + '.send', 'event', category, action, label, value);
    }
    catch (e) {
        // console.log("failed to track event" + e);
    }
}

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
function showVal(field) {

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
}

/**
 UPDATE WHICH COL TO HIGHLIGHT IN GRADE CONVERSION TABLE
 **/
function updateTableHighlight(){
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
}

/**
 UPDATE THE USERS GRADE Preference
 **/
function updateGradePref() {
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
}

/**
 UPDATE THE LISTED GRADES TO MATCH GRADE Preference
 **/
function updateListingGrades(){
    let cards = document.getElementsByClassName('card');
    for(let i = 0; i < cards.length; i++){
        let climb = climbsData.climbs.find(climb => climb.id === parseInt(cards[i].id));
        let answer = gradeToShow(climb, localStorage.getItem('gradePreference'));
        let card = document.getElementById(climb.id);
        // Could Prob clean this up in a refactor: 
        if(localStorage.getItem('useConverted')){
            if(answer.converted == 'Converted '){
                card.querySelector('.card-body .gradeTxt').innerHTML = answer.grade;
                card.querySelector('.card-body .convTxt').innerHTML = "Converted Grade:";
                card.querySelector('.card-body abbr').innerHTML = localStorage.getItem('gradePreference');
                card.querySelector('.card-body abbr').title = gradeMappings[localStorage.getItem('gradePreference')].title;
            } else {
                card.querySelector('.card-body .gradeTxt').innerHTML = answer.grade;
                card.querySelector('.card-body .convTxt').innerHTML = "Grade:";
                card.querySelector('.card-body abbr').innerHTML = climb.gradeSys;
                card.querySelector('.card-body abbr').title = gradeMappings[climb.gradeSys].title;
            }
        } else {
            card.querySelector('.card-body .gradeTxt').innerHTML = climb.originalGrade;
            card.querySelector('.card-body .convTxt').innerHTML = "Grade:";
            card.querySelector('.card-body abbr').innerHTML = climb.gradeSys;
            card.querySelector('.card-body abbr').title = gradeMappings[climb.gradeSys].title;
        }
    }
}

/**
 SET IF THE USER WANTS TO SHOW CONVERTED OR ORIGINAL GRADES
 **/
function toggleUseConverted(){
    if(document.getElementById('useConverted').checked === true){
        trackGA('gradeConversion', "toogle use converted", 'on');
        localStorage.setItem('useConverted', true);
        updateListingGrades();
    } else {
        localStorage.removeItem('useConverted');
        trackGA('gradeConversion', "toogle use converted", 'off');
        updateListingGrades();
    }
}

/**
 FUNCTION TO GET FILTER VALUES FROM HTML 
 **/
function getFilters(){
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
}


/**
 A FUNCTION TO FILTER THE CARD BY THE USERS SELECTION
 **/
function filterCards() {

    let resultCount = 0;
    let filters = getFilters();

    var cards = document.getElementsByClassName('card');

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
}

function toggleFilters(){
    let advancedFilters = document.getElementById('advancedFilters');
    if(advancedFilters.style.display === 'flex'){
        advancedFilters.style.display = 'none';
        localStorage.setItem('showFilters', false);
    } else {
        advancedFilters.style.display = 'flex';
        document.getElementById('abseil').focus(); // keyboard acessibility 
        localStorage.setItem('showFilters', true);
    }
}

function saveFilter() {
    let filter = getFilters();

    let advancedLabels = document.getElementsByClassName('advancedLabel');
    for(let j = 0; j < advancedLabels.length; j++){
        let title = advancedLabels[j].getAttribute('for');
        let value = document.getElementById(title).checked;
        filter[title] = value; 
    }
    localStorage.setItem('filters', JSON.stringify(filter));
}

function trackFilter(filterType){
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
}

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
 RANGE SLIDERS
 **/
function mousemoveListener(event) {
    let x = (event.clientX - this.offsetLeft) / this.offsetWidth;
    let inputs = this.getElementsByTagName('input');
    let min_dist = Infinity;
    let min_index = 0;
    for(let i = 0; i < inputs.length; i++) {
    	let dist = (inputs[i].value - inputs[i].min) / (inputs[i].max - inputs[i].min);
        dist = Math.abs(dist - x);
        if (dist < min_dist) {
            min_dist = dist;
            min_index = i;
        }
    }
    for(let i = 0; i < inputs.length; i++) {
        inputs[i].style.zIndex = i == min_index ? 1 : 0;
    }
}
function changeListener(event) {
    var parent = this.parentNode;
    var inputs = parent.getElementsByTagName('input');
    var values = [];
    for(var i = 0; i < inputs.length; i++) {
        values[i] = +inputs[i].value;
    }
    parent.value = values[0] < values[1] ? values : [values[1], values[0]];
    var event = document.createEvent('Event');
    event.initEvent('change', true, true);
    parent.dispatchEvent(event);
}
function attachInputRangeListeners(containers) {
    var containers = containers || document.getElementsByClassName('input-range');
    for(var i = 0; i < containers.length; i++) {
    	// Move the closest input range to the top.
        containers[i].addEventListener('mousemove', mousemoveListener);
        // Generate an onchange event for the input range container.
        var inputs = containers[i].getElementsByTagName('input');
        for (var j = 0; j < inputs.length; j++) {
            inputs[j].addEventListener('input', changeListener);
            inputs[j].addEventListener('change', changeListener);
        }
    }
}

/**
 GET GRADE TO SHOW BASED ON ClimbID & PREFFERED GRADE
 **/
function gradeToShow(climb, sys){
    let answer = {'converted' : '', 'grade': 'tbc', 'sys' : sys};
    if ((climb.gradeSys === sys) || (localStorage.getItem('useConverted') != 'true')) {                              // The grade pref matches original grade
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
}

/**
 PUBLISH THE FRONT OF THE CARDS
 **/
function publishCards(climbsArr) {
    for (let i = 0; i < climbsArr.length; i++) {
        if (climbsArr[i].status === 'publish') {
            let webPUrl =  climbsArr[i].tileImage.url.replace(".jpg", ".webp");
            let url = '/climbs/' + climbsArr[i].routeName + '-on-' + climbsArr[i].cliff + '/';
            url = url.toLowerCase().replace(/'/g, "").replace(/ /g, "-");
            let status = "";
            let icon = "heart-empty";
            let saved = 0;
            let unsaved = 1;
            let done = 0
            let flag = climbsArr[i].country.toLowerCase().replace(' ', '');
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
            const boolToNumber = function (value){
                value === "true" || value === "1" || value === true || value === 1 ? value = 1 : value = "";
                return value;
            }
            var card = `
    <div data-climb-id="${climbsArr[i].id}" 
         data-test="climbid-${climbsArr[i].id}"
         data-grade="${climbsArr[i].dataGrade}" 
         data-height="${climbsArr[i].length}"
         data-approach="${climbsArr[i].approachTime}"
         data-abseil="${boolToNumber(climbsArr[i].abseil)}"
         data-traverse="${boolToNumber(climbsArr[i].traverse)}"
         data-loose="${boolToNumber(climbsArr[i].loose)}"
         data-tidal="${boolToNumber(climbsArr[i].tidal)}"
         data-seepage="${boolToNumber(climbsArr[i].seepage)}"
         data-polished="${boolToNumber(climbsArr[i].polished)}"
         data-saved="${saved}"
         data-unsaved="${unsaved}"
         data-done="${done}"
         id="${climbsArr[i].id}" 
         class="card">
         <div class="climb-status" id="${climbsArr[i].id}Status" data-climbId="${climbsArr[i].id}" data-status="${status}" onclick="cycleStatus(${climbsArr[i].id})">
             <i class="icon-${icon}"></i>
         </div>
        <a href="${url}" onclick="showTile(${climbsArr[i].id});return false;" id="${climbsArr[i].id}Focus">
            <picture>
                <source srcset="/${webPUrl}" type="image/webp">
                <img src="/${climbsArr[i].tileImage.url}" alt="${climbsArr[i].tileImage.alt}" class="crag-hero" loading="lazy" />
            </picture>
        </a>
        <div class="card-body">
            <h4>
            <span class="flag ${flag}"></span>
                 ${climbsArr[i].cliff}
            </h4>
            <p class="card-text">
                <span class="what">Target Route:</span> ${climbsArr[i].routeName} <br />
                <span class="what convTxt">${conv}Grade:</span> <span class="gradeTxt">${grade}</span>
                <small>
                    (<abbr title="${gradeMappings[sys].title}">${sys}</abbr>)
                </small> <br />
                <span class="what">Location:</span> <a href="/map/?loc=${climbsArr[i].geoLocation}">${climbsArr[i].county}</a> <br />
                <span class="what">Length:</span> ${climbsArr[i].length}m - ${climbsArr[i].pitches} pitches <br />
                <span class="what">Approach:</span> ${climbsArr[i].approachTime}min - <span class="approach-${climbsArr[i].approachDifficulty}"></span> <br />
                <span id="toggle-weather-${climbsArr[i].id}" class="toggle-weather-off">
                    <span class="what">Weather:</span>   
                    <span id="weather-${climbsArr[i].id}" class="weather"></span>
                    <span id="temp-${climbsArr[i].id}"></span>
                </span>
            </p>
        </div>
        <a class="open-tile" href="${url}" onclick="showTile(${climbsArr[i].id});return false;">SHOW MORE INFO</a>
    </div>`;

            cardHolder.innerHTML += card;
        }
    }
    document.getElementById('loading').style.display = 'none';
}

/**
CHANGES THE USERS STATUS OF THE CLIMB CARD BETWEEN NONE, WISHED & DONE
**/
function cycleStatus(id){
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
}

/**
 REMOVES ALL THE CARDS THEN SORTS THE ARRAY AND PUBLISHES IT
 **/
function sortCards(sortBy, direction) {
    if(sortBy !== 'distance' && sortBy !== 'weatherScore') { // avoid the geo-location call or weather being the default
        localStorage.setItem('sortOrder', sortBy + ',' + direction);
    }
    if (sortBy === 'weatherScore') {
        climbsData.climbs = climbsData.climbs.map(climb => {
            let climbWeather = darkSkyWeatherData.find(weatherData => weatherData.climbId === climb.id);
            return Object.assign({}, climb, {weatherScore: climbWeather ? climbWeather.weatherScore : Number.MIN_VALUE})
        })
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
//    loadWeather();
}

/**
 FUNCTION TO ADD DISTANCE FROM USER TO CLIMB TO ALL CLIMBS THEN SORT ASC
 **/
function locationLoaded(position) {
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

}

function locationFailed() {
    console.log("failed to get location");
}

/**
 FUNCTION TO GET KM BETWEEN TWO POINTS USING LAT LON
 **/
function calcDistanceBetweenPoints(lat1, lon1, lat2, lon2) {
    var R = 6371; // km (change this constant to get miles)
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d.toFixed(1); // km to 1 decimal place 
}

/**
 SHOW FULL CLIMB INFO - IE LOAD THE BACK OF THE CARD
 **/
function showTile(climbId, popped = false) {
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
        let request = new XMLHttpRequest(); /* To Do: update this to fetch */ 
        request.open('GET', '/data/climbs/' + climbId + '.json', true);
        request.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {
                localStorage.setItem('climb' + climbId, this.response);
                climb = JSON.parse(this.response);
                deliverChange(climb, popped);
            } else { console.log("couldn't load climbsData - likley server error / file not found"); }
        };
        request.onerror = function() { console.log("couldn't load climbsData - likley connection error"); };
        request.send();
    }
}
function deliverChange(climb, popped){
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
    loadCurrentWeatherModule(climbData.id);
    if(climbData.tidal >= 1){
        loadTides(climbData.id);
    }
}

/**
 OPEN AN OVERLAY
 **/
function openModal(url, id) {
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
                eval(document.getElementById('newScript').textContent); // bit of a hack to run any scripts that are in the new html
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
}

/**
 CLOSE THE OVERLAY OR GO BACK TO HOMEPAGE
 **/
function hideTile() {
    document.getElementById('close').setAttribute("style", "display:none;"); // for the subscribe overlay
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
    if(localStorage.getItem('focusId')){
        if(document.getElementById(localStorage.getItem('focusId'))){
            document.getElementById(localStorage.getItem('focusId')).focus();
            localStorage.removeItem('focusId');
        }
    }
}
function isScriptLoaded(url) {
    var scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.split("/").pop() == url.split("/").pop()) {
            return true;
        }
    }
    return false;
}
function topoInteraction(climbId, name, cliff){
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
}
/**
 LOAD TOPO DATA JS OBJECT
 **/
function tryLoadTopo(climbId, enviroment = '') {
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

function initTopo() {
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

function toggleTopo() {
    document.getElementById("staticTopo").style.display = "none";
    document.getElementById("canvas").style.display = "block";
}

function updateScale() {
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
function draw() {
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
function drawBelay(context, x, y, line, fill, size = belaySize ) {
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

function annotate(context, msg, x, y, color) {
    context.font = "bold " + (fontsize * 0.8) + "px sans-serif";
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = sThis(10);
    context.strokeText(msg, x, y);
    context.fillStyle = color;
    context.fillText(msg, x, y);
}

function drawLine(context, arrayOfxy, dashed, arrowEnd, color) {
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

function drawArrowhead(context, from, to, radius, color) {
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

function sThis(number) {
    return number * scale;
}
/**
 ADDS SCRIPTS & CSS TO THE PAGE FOOTER
 **/
function loadNonEssential(type, url, module = false){
    if(type == "script" && isScriptLoaded(url) === false){
        const tag =  document.createElement(type);
        tag.src = url
        tag.async = true;
        tag.defer = true;
        if(module === true) { tag.type = "module";}
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
 LOADS THE WEATHER
 **/
function loadWeather() {
/*
  if (window.darkSkyWeatherData && (document.getElementById('cardHolder') || document.getElementById('map'))) {
    
    const fourHoursInMilliseconds = 4000 * 60 * 60;
    const yesterday = Date.parse(new Date()) - 86401; // now minus 24hours and 1 second
    const climbOneLastUpdate = window.darkSkyWeatherData.find(data => data.climbId === 1).currently.time;
    const upToDate = climbOneLastUpdate > yesterday;
    if(upToDate){
      climbsData.climbs.map(climb => {   // currently loops all climbs even on a single climb page (ToDo: fix!)
        try {
          if(climb.status === "publish"){
            const weatherData = window.darkSkyWeatherData.find(data => data.climbId === climb.id);
            const iconWeather = document.getElementById(`weather-${climb.id}`);
            const toggleWeather = document.getElementById(`toggle-weather-${climb.id}`);
            const tempValues = document.getElementById(`temp-${climb.id}`);
            iconWeather.classList.add(weatherData.currently.icon);
            iconWeather.title = weatherData.currently.icon.replace(/-/g, " ");
            tempValues.innerHTML = Math.round(weatherData.currently.temperatureMin) + '-' + Math.round(weatherData.currently.temperatureHigh) + "&#176; C";
            toggleWeather.classList.remove("toggle-weather-off");
          }
        } catch (e) {
         //  console.log("No weather found -> " + climb.id + ". Error -> " + e);
        }
      });
    } else {
      // there is a weather file but its not up to date so don't let users filer by good weather
      if(document.getElementById('goodWeather')){
        document.getElementById('goodWeather').remove();
      }
       
    }
  setTimeout(() => loadWeather(), fourHoursInMilliseconds)
  } else if (window.darkSkyWeatherData && document.location.href.includes('/climbs/') === true){
    try {
     loadCurrentWeatherModule();
    } catch (e) {
      console.log("can't get weather for this climb");
    }
    setTimeout(() => loadWeather(), fourHoursInMilliseconds)
  } else {
    //    If window.darkSkyWeatherData is not loaded yet, I will keep calling this function a bit faster then normally
    setTimeout(() => loadWeather(), 1000)
  }*/
}
/**
 * LOAD TIDE INFO
 **/
const loadTides = async (id) => {
    let tideUrl = 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-tides.json';
    let response = await fetch(tideUrl,{
        method: "GET",
        mode: "cors",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        redirect: "follow", // manual, *follow, error
    });
    tideData = await response.json();
    let thisTideData = tideData.find(tide => tide.climbId === parseInt(id));
    let cleanArray = [];
    let max = 0;
    let min = 0;
    for(let i = 0; i < thisTideData.heights.length; i++){
        cleanArray.push(thisTideData.heights[i]);
        max = (thisTideData.heights[i].height > max) ? thisTideData.heights[i].height : max;
        min = (thisTideData.heights[i].height < min) ? thisTideData.heights[i].height : min;
    }
    let base = (min < 0) ? Math.abs(min) : min;
    let diff = max - min;
    let multiplier = 70 / diff;
  
    cleanArray.sort(function(a, b){
        return a.timestamp - b.timestamp;
    });
    
    let html = ' <p class="chart-title">Hourly Tide Heights</p><ul class="chart" style="margin-bottom:2em;max-width:100%;width:100%">';
    for(let i = 0; i < cleanArray.length; i++){
        let height = (base * multiplier) + (cleanArray[i].height * multiplier) + 15; // makes the smallest bar 15% and largest 85%
        let color = (new Date().getHours() === new Date(cleanArray[i].timestamp * 1000).getHours()) ? 'background-color:rgba(53, 135, 216, 0.87);font-weight:600;' : '';
        html += `
                <li>
                   <span class="tide" style="height:${height.toFixed(1)}%;writing-mode: vertical-rl;text-orientation: mixed;${color}" title="${new Date(cleanArray[i].timestamp * 1000).getHours()}:00">
                        ${cleanArray[i].height.toFixed(1)}m
                    </span>
                </li>`;
    }
    html += '</ul><style>.chart .tide::before{padding: 1em 2em;}</style>';
    document.getElementById('tideHolder').innerHTML = html;
}

/**
 LOADS FULL WEATHER ON BACK OF CARD
 **/
function loadCurrentWeatherModule(id){/*
  if(id) {
    var climbid = id;
  } else {
    var climbid = parseInt(document.getElementById('climbIdMeta').content);
  }
  try{
    const dsWeather = window.darkSkyWeatherData.find(data => data.climbId === climbid);
    if(dsWeather != null){
        document.getElementById("currentWeather").style.display = "block";
        document.getElementById("seasonalWeather").classList.add("col-lg-6");
        const currentWeather = ["currently", "offsetMinus1", "offsetMinus2", "offsetMinus3", "offsetPlus1", "offsetPlus2", "offsetPlus3", "offsetPlus4", "offsetPlus5", "offsetPlus6", "offsetPlus7"];
        document.getElementById("wIcon").classList.add(dsWeather.currently.icon);
        document.getElementById("wIcon").title = dsWeather.currently.icon.replace(/-/g, " ");
        document.getElementById("weatheName").innerText = dsWeather.currently.icon.replace(/-/g, " ");
        document.getElementById("highT").innerText = dsWeather.currently.temperatureHigh.toFixed(1);
        document.getElementById("lowT").innerText = dsWeather.currently.temperatureMin.toFixed(1);
        if(dsWeather.currently.sunriseTime){
            document.getElementById("sunrise").innerText = new Date(dsWeather.currently.sunriseTime  * 1000).toTimeString().substring(0,5); // suspect this is user browser time not location time
            document.getElementById("sunset").innerText = new Date(dsWeather.currently.sunsetTime  * 1000).toTimeString().substring(0,5);
            document.getElementById('light_hours').innerText = (((dsWeather.currently.sunsetTime - dsWeather.currently.sunriseTime)/60)/60).toFixed(1);
        } else {
            // The sun doesn't always rise and set everyday in all locations (eg North Norway)
            if(dsWeather.currently.uvIndex >= 1) {
                document.getElementById('sunMovement').innerHTML = '<span class="weather clear-day"></span> 24h Sun! No sunset here today.';
            } else {
                document.getElementById('sunMovement').innerHTML = '<span class="weather moon"></span> 24h Darkness! No sunrise here today.';
            }
        }
        const currentDay = new Date(dsWeather.currently.time * 1000);
        document.getElementById('lastDate').innerHTML = '<br />Updated:' + currentDay.toString().substring(0,15);
        document.getElementById('precip_pos').innerText = Math.round(dsWeather.currently.precipProbability * 100);
        document.getElementById('precip_intense').innerText = dsWeather.currently.precipIntensity.toFixed(1);
        document.getElementById('wind_speed').innerText = dsWeather.currently.windGust.toFixed(1);
        document.getElementById('uv_index').innerText = dsWeather.currently.uvIndex;
        document.getElementById('cloud_cover').innerText = Math.round(dsWeather.currently.cloudCover);
        document.getElementById('bearing').style  = 'transform: rotate(' + dsWeather.currently.windBearing + 'deg);display:inline-block;';
        for(let i = 0; i < currentWeather.length; i++){
            let listItem = document.getElementById(currentWeather[i]);
            let rain = dsWeather[currentWeather[i]].precipIntensity;
            let height = rain > 10 ? 100 : rain * 10;
            let label = document.createTextNode(rain.toFixed(1) + "mm");
            listItem.firstElementChild.style.height = height + "%";
            listItem.prepend(label);
        }
    }
  } catch (e) {
    console.log("Weather Data Error " + climbid + ". Error -> " + e);
  }*/
}

function weatherBars(direction) {
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
function updateTotalCount(){
    let showing = 0;
    document.querySelectorAll('.card').forEach(card => {
        if(card.style.display != 'none'){
            showing += 1;
        }
    });
    document.getElementById('total').innerHTML = document.querySelectorAll('.card').length;
    document.getElementById('showing').innerHTML = showing;
}

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

function clearFilters(){    
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
    //    loadWeather();
        attachInputRangeListeners(); // set up the range sliders
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
    var hp = document.getElementById('cardHolder') ? true : false;
    // if the browser supports webP add a class to the body to allow css to use webp version
    webPsupport ? document.querySelector('body').classList.add('webp') : document.querySelector('body').classList.add('no-webp'); 
    loadNonEssential("link", "https://fonts.googleapis.com/css?family=Roboto:300,400&display=swap");
    loadNonEssential("link", "/css/fontello.css");
    if (document.location.href.includes('/climbs/') === true || hp === true) {
        loadNonEssential("script", "/js/load-weather.js");
        if(document.getElementById('tideHolder')){
            loadTides(parseInt(document.getElementById('climbIdMeta').content)).catch((e) => {
                console.log("Can't load tide data. " + e)
            })
        }
    }
    if (document.location.href.includes('god-mode') === true && hp === false) {
        loadNonEssential("script", "/components/climbCard.js", false);
        loadNonEssential("script", "/js/cms-mode.js", true);
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
//    loadNonEssential("script", "/js/auth-stuff.js"); 
    LoadAnalytics();
});