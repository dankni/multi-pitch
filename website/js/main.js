// START
window.performance.mark('start-js-read');
/**
 GLOBAL VARIABLES
 **/
const rootProject = "/"; // adjust per enviroment
var start = document.URL;
var history_data = {"Start": start}; // push state
var isCardTurned = start.includes('?overview');
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
(function () {
    "use strict";

    var supportsMultiple = self.HTMLInputElement && "valueLow" in HTMLInputElement.prototype;

    var descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

    self.multirange = function (input) {
        if (supportsMultiple || input.classList.contains("multirange")) {
            return;
        }

        var value = input.getAttribute("value");
        var values = value === null ? [] : value.split(",");
        var min = +(input.min || 0);
        var max = +(input.max || 100);
        var ghost = input.cloneNode();
        ghost.id = ''; // stops 2 elements with the same id issue

        input.classList.add("multirange", "original");
        ghost.classList.add("multirange", "ghost");

        input.value = values[0] || min + (max - min) / 2;
        ghost.value = values[1] || min + (max - min) / 2;

        input.parentNode.insertBefore(ghost, input.nextSibling);

        Object.defineProperty(input, "originalValue", descriptor.get ? descriptor : {
            // Damn you Safari
            get: function () {
                return this.value;
            },
            set: function (v) {
                this.value = v;
            }
        });

        Object.defineProperties(input, {
            valueLow: {
                get: function () {
                    return Math.min(this.originalValue, ghost.value);
                },
                set: function (v) {
                    this.originalValue = v;
                },
                enumerable: true
            },
            valueHigh: {
                get: function () {
                    return Math.max(this.originalValue, ghost.value);
                },
                set: function (v) {
                    ghost.value = v;
                },
                enumerable: true
            }
        });

        if (descriptor.get) {
            Object.defineProperty(input, "value", {
                get: function () {
                    return this.valueLow + "," + this.valueHigh;
                },
                set: function (v) {
                    var values = v.split(",");
                    this.valueLow = values[0];
                    this.valueHigh = values[1];
                    update();
                },
                enumerable: true
            });
        }

        if (typeof input.oninput === "function") {
            ghost.oninput = input.oninput.bind(input);
        }

        function update() {
            ghost.style.setProperty("--low", 100 * ((input.valueLow - min) / (max - min)) + 1 + "%");
            ghost.style.setProperty("--high", 100 * ((input.valueHigh - min) / (max - min)) - 1 + "%");
        }

        input.addEventListener("input", update);
        ghost.addEventListener("input", update);

        update();
    };

    multirange.init = function () {
        [].slice.call(document.querySelectorAll("input[type=range][multiple]:not(.multirange)")).forEach(multirange);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", multirange.init);
    } else {
        multirange.init();
    }

})();

/**
 SHOW THE CURRENT VALUE OF THE SLIDERS
 **/
function showVal(values, field) {

    var lowerValue = values.split(',')[0];
    var higherValue = values.split(',')[1];
    if(localStorage.getItem('gradePreference')){
       var gradePreference = localStorage.getItem('gradePreference');
       document.getElementById('gradeSys').title = gradeMappings[gradePreference].title;
       document.getElementById('gradeSys').textContent = gradePreference;
    } else {
        var gradePreference = 'BAS';
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
 UPDATE THE USERS GRADE PREFERANCE
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
            showVal(document.getElementById('gradeRange').value, 'grade');
            if(document.getElementById(radios[i].value)){
                document.getElementById(radios[i].value).style.display = 'block';
            }
            trackGA('gradeConversion', "changed grade", radios[i].value);
            break;
        }
    }
    updateListingGrades();
}

/**
 UPDATE THE LISTED GRADES TO MATCH GRADE PREFERANCE
 **/
function updateListingGrades(){
    let cards = document.getElementsByClassName('card');
    for(let i = 0; i < cards.length; i++){
        const climb = climbsData.climbs.find(climb => climb.id === parseInt(cards[i].id));
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
 A FUNCTION TO FILTER THE CARD BY THE USERS SELECTION
 **/
function filterCards() {

    let resultCount = 0;
    
    let lowGrade = parseInt(document.getElementById('gradeRange').value.split(',')[0]);
    let highGrade = parseInt(document.getElementById('gradeRange').value.split(',')[1]);
    let lowHeight = parseInt(document.getElementById('heightRange').value.split(',')[0]);
    let highHeight = parseInt(document.getElementById('heightRange').value.split(',')[1]);
    let lowApproach = parseInt(document.getElementById('approachRange').value.split(',')[0]);
    let highApproach = parseInt(document.getElementById('approachRange').value.split(',')[1]);
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
            parseInt(dataGrade) >= lowGrade
            && parseInt(dataGrade) <= highGrade
            && parseInt(dataHeight) >= lowHeight
            && parseInt(dataHeight) <= highHeight
            && parseInt(dataApproach) >= lowApproach
            && parseInt(dataApproach) <= highApproach
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
    let filter = {};
    filter.gradeRange = document.getElementById('gradeRange').value;
    filter.heightRange = document.getElementById('heightRange').value;
    filter.approachRange = document.getElementById('approachRange').value
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
            let grade = document.getElementById('grade').innerText;
            let height = document.getElementById('height').innerText;
            let approach = document.getElementById('approach').innerText;
            let label = "G = " + grade + " | H = " + height + " | A = " + approach;
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
            var cImgs = climbImgs.imgs.filter(img => img.climbId === climbsArr[i].id); // get all the imgs for the climb
            var tileImg = cImgs.find(img => img.type === 'tile'); // get the img object
            var webPUrl = tileImg.url.replace(".jpg", ".webp");
            var url = '/climbs/' + climbsArr[i].routeName + '-on-' + climbsArr[i].cliff + '/';
            url = url.toLowerCase().replace(/'/g, "").replace(/ /g, "-");
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

            var card = `
    <div data-climb-id="${climbsArr[i].id}" 
         data-test="climbid-${climbsArr[i].id}"
         data-grade="${climbsArr[i].dataGrade}" 
         data-height="${climbsArr[i].length}"
         data-approach="${climbsArr[i].approachTime}"
         data-abseil="${climbsArr[i].abseil}"
         data-traverse="${climbsArr[i].traverse}"
         data-loose="${climbsArr[i].loose}"
         data-tidal="${climbsArr[i].tidal}"
         data-seepage="${climbsArr[i].seepage}"
         data-polished="${climbsArr[i].polished}"
         data-saved="${saved}"
         data-unsaved="${unsaved}"
         data-done="${done}"
         id="${climbsArr[i].id}" 
         class="card">
         <div class="climb-status" id="${climbsArr[i].id}Status" data-climbId="${climbsArr[i].id}" data-status="${status}" onclick="cycleStatus(${climbsArr[i].id})">
             <i class="icon-${icon}"></i>
         </div>
        <a href="${url}" onclick="showTile(${climbsArr[i].id});return false;">
            <picture>
                <source srcset="/${webPUrl}" type="image/webp">
                <img src="/${tileImg.url}" alt="${tileImg.alt}" class="crag-hero">
            </picture>
        </a>
        <div class="card-body">
            <h4>
            <span class="flag ${climbsArr[i].flag}"></span>
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
    } else {
        var c = document.getElementsByClassName("card");
        while (c.length > 0) c[0].remove();
        var climbsSorted = helper.arr.multisort(climbsData.climbs, [sortBy, 'dataGrade'], [direction, 'ASC']);
        publishCards(climbsSorted);
        filterCards(); // ensures filters are kept
    }
    loadWeather();
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
    return Math.round(d); // km
}

/**
 SHOW FULL CLIMB INFO - IE LOAD THE BACK OF THE CARD
 **/
function showTile(climbId) {
    climbId = parseInt(climbId);
    var climb = climbsData.climbs.find(c => c.id === climbId); // get the climb object by id
    var cImgs = climbImgs.imgs.filter(img => img.climbId === climbId);  //note find returns first vs filter returns all.
    var referanceLines = referances.referanceLines.filter(referanceLines => referanceLines.climbId === climbId);
    var allGuideBooks = guideBooks.books.filter(book => book.climbId === climbId);

    // a check to see if the user has landed on a page from a direct link
    if (isCardTurned !== true) {
        var url = '/climbs/' + climb.routeName + '-on-' + climb.cliff + '/';
        url = url.toLowerCase().replace(/'/g, "").replace(/ /g, "-");

        window.history.pushState(history_data, climb.cliff, url);
    }

    document.getElementById('overlay').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");

    var fullCard = climbCard(climb, cImgs, allGuideBooks, weatherData, referanceLines);

    document.getElementById('overlay').innerHTML = fullCard;
    var navHeight = document.getElementsByTagName("nav")[0].height;
    document.getElementById('climbCardDetails').style = `margin: ${navHeight}px 0 0 0;Background: #fff;`;
    document.title = climb.cliff + " - " + climb.routeName;
    document.getElementById('articleTitle').focus(); // Set focus on the climb card article for accessibility 
    //tryLoadTopo(climbId);
    loadCurrentWeatherModule(climbId);
}

/**
 OPEN THE SUBSCRIBE OVERLAY
 **/
function openModal(url, trackingLabel) {
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
    trackGA(name, 'Open', trackingLabel);
}

/**
 CHANGE GRADES
 **/
// ToDo: make onChange event for name field MMERGE3
function updateGradeLabel(gradeSystem) {

    var easyLabel = document.getElementById('easy-label');
    var mediumLabel = document.getElementById('med-label');
    var hardLabel = document.getElementById('hard-label');

    if (gradeSystem == 'british') {
        easyLabel.textContent = "Up to VDiff";
        mediumLabel.textContent = "Severe to VS ";
        hardLabel.textContent = "HVS or harder";
    } else if (gradeSystem == 'uiaa') {
        easyLabel.textContent = "Up to UIAA IV";
        mediumLabel.textContent = "UIAA IV to V ";
        hardLabel.textContent = "UIAA V+ harder";
    } else if (gradeSystem == 'yds') {
        easyLabel.textContent = "Up to 5.5";
        mediumLabel.textContent = "5.6 to 5.8 ";
        hardLabel.textContent = "5.9 or harder";
    } else if (gradeSystem == 'norwegian') {
        easyLabel.textContent = "Up to 3";
        mediumLabel.textContent = "4 to 5 ";
        hardLabel.textContent = "5+ or harder";
    }
}

/**
 CLOSE THE SUBSCRIBE OVERLAY OR GO BACK TO HOMEPAGE
 **/
function hideTile(resetTitle) {
    document.getElementById('close').setAttribute("style", "display:none;"); // for the subscribe overlay
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
    isCardTurned = false; // ensure future clicks don't think its first load again
    if (resetTitle !== false) {
        history.replaceState(history_data, 'The best multi-pitch climbs', rootProject);
        document.title = "The best multi-pitch rock climbs";
    }
}
function isScriptLoaded(url) {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length; i--;) {
        if (scripts[i].src == url) return true;
    }
    return false;
}
function topoInteraction(climbId, name, cliff){
    if(isScriptLoaded('/data/topos/' + climbId + '.js' === false)){
        tryLoadTopo(climbId);
        toggleTopo();
    } else {
        draw();
    }
    trackGA('topo', 'infoBox', 'ID = ' + climbId + ' | N =  ' + name + ' on  ' + cliff, 0);
}
/**
 LOAD TOPO DATA JS OBJECT IF AVAILIBLE
 **/
function tryLoadTopo(climbId, enviroment = '') {
    enviroment = (typeof enviroment === 'undefined') ? '' : enviroment; //makes this optional
    let cImgs = climbImgs.imgs.filter(img => img.climbId === climbId);
    let topoImg = cImgs.find(img => img.type === 'topo');
    if (topoImg.dataFile > 1) {
        let ref = document.getElementsByTagName('script')[0];
        var script = document.createElement('script');
        script.onload = function () {
            initTopo();
        }
        script.src = enviroment + "/data/topos/" + climbId + ".js";
        ref.parentNode.insertBefore(script, ref);
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
var belayScale = 1; // used to scale the line and labels inline with belay size

function initTopo() {
    img = new Image(); 
    flag = new Image();
    logo = new Image();
    img.onload = function () {
        draw();
    }
    canvas = document.getElementById("canvas");
    logo.src = '/img/logo/mp-logo-white.png';
    img.src = topoData.image;
    flag.src = topoData.flag;
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
            if (topoData.decent[i].path !== null) {
                drawLine(ctx, topoData.decent[i].path, true, true, decentLine);
            }
            if (topoData.decent[i].label !== null && pitchLabels === true) {
                annotate(ctx, topoData.decent[i].label, sThis(topoData.decent[i].labelPosition[0]),
                    sThis(topoData.decent[i].labelPosition[1]), decentLine);
            }
        }
    }
    document.getElementById('canvas').dataset.success = 'true'; // for automated testing
}

// A set of helper functions 
function drawBelay(context, x, y, line, fill) {
    if (x > 0 && y > 0) {
        context.strokeStyle = line;
        context.setLineDash([]);
        context.lineWidth = lineWidth;
        context.fillStyle = fill;
        context.beginPath();
        context.arc(sThis(x), sThis(y), belaySize, 0, 2 * Math.PI, false);
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
    dashed === true ? context.setLineDash(dashSpace) : context.setLineDash([]);
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
function loadNonEssential(type, url){
    const tag =  document.createElement(type);
    if(type == "script"){
        tag.src = url
        tag.async = true;
        tag.defer = true;
    }
    if(type == "link"){
        tag.rel = "stylesheet";
        tag.href = url;
    }
    document.getElementsByTagName("footer")[0].appendChild(tag);
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
        gtag('config', 'UA-123782847-1'); // variable also declared in the global variable scope at the top
        window.performance.mark('gta-end');
    }, 1000);

}
/**
 LOADS THE WEATHER
 **/
function loadWeather() {
  const fourHoursInMilliseconds = 4000 * 60 * 60;
  if (window.darkSkyWeatherData && (document.getElementById('cardHolder') || document.getElementById('map'))) {
  //  console.log(window.darkSkyWeatherData);
    climbsData.climbs.map(climb => {   
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
      console.log("Can't add weather for climbing id " + climb.id);
    }
  });
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
  }
}
/**
 LOADS FULL WEATHER ON BACK OF CARD
 **/
function loadCurrentWeatherModule(id){
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
      const currentWeather = ["currently", "offsetMinus1", "offsetMinus2", "offsetMinus3", "offsetPlus1", "offsetPlus2", "offsetPlus3"];
      document.getElementById("wIcon").classList.add(dsWeather.currently.icon);
      document.getElementById("wIcon").title = dsWeather.currently.icon.replace(/-/g, " ");
      document.getElementById("weatheName").innerText = dsWeather.currently.icon.replace(/-/g, " ");
      document.getElementById("highT").innerText = dsWeather.currently.temperatureHigh.toFixed(1);
      document.getElementById("lowT").innerText = dsWeather.currently.temperatureMin.toFixed(1);

      for(let i = 0; i < currentWeather.length; i++){
        let listItem = document.getElementById(currentWeather[i]);
        let rain = dsWeather[currentWeather[i]].precipIntensity;
        let height = rain > 3 ? 100 : rain * 33.3;
        let label = document.createTextNode(rain.toFixed(1) + "mm");
        listItem.firstElementChild.style.height = height + "%";
        listItem.prepend(label);
      }
    }
  } catch (e) {
    console.log("Can't add weather for climbing id ", id);
  }
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
    document.getElementById('gradeRange').value = filters.gradeRange;
    showVal(filters.gradeRange, 'grade');
    document.getElementById('heightRange').value = filters.heightRange;
    showVal(filters.heightRange, 'height');
    document.getElementById('approachRange').value = filters.approachRange;
    showVal(filters.approachRange, 'approach');
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
    let options = { "filters": 
                    [{"el":"gradeRange", "name":"grade"},
                    {"el":"heightRange", "name":"height"},
                    {"el":"approachRange", "name":"approach"}]
                };
    for(let i = 0; i < options.filters.length; i++){
        let range = document.getElementById(options.filters[i].el);
        let valueString = range.min + ',' + range.max;
        range.value = valueString
        showVal(valueString, options.filters[i].name);
    }
    filterCards();
}

// need to handle history.onPopstate ie. user presses back
window.onpopstate = function (event) {
    hideTile();
  //  console.log(event.state);
};

window.onload = function () {
    window.performance.mark('onload-event-happened');
    var hp = false;
    // Check it's the homepage
    document.getElementById('cardHolder') ? hp = true : hp = false;
    if (document.location.href.includes('/climbs/') === false && hp === true) {
        sortCards('length', 'DESC');
        if(localStorage.getItem('filters')){
            execFilter();
        }
        window.performance.mark('all-climbs-loaded');
    }
    if (geoLocationSupport === true && hp === true) {
        document.getElementById('distance').style.display = "block";
    }
    if (isCardTurned === true) {
        var overview = start.split('=');
        var cardToLoad = overview[1];
        showTile(cardToLoad);
    }
    if(localStorage.getItem('showFilters') && hp === true){
        if(localStorage.getItem('showFilters') === 'true'){
            document.getElementById('advancedFilters').style.display = 'flex';
        }
    }
    loadNonEssential("link", "https://fonts.googleapis.com/css?family=Roboto:300,400&display=swap");
    loadNonEssential("link", "/css/fontello.css"); 
    loadNonEssential("script", "/js/load-weather.js"); 
//    loadNonEssential("script", "/js/auth-stuff.js"); 
    LoadAnalytics();
};