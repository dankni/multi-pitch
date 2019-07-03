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
        dataSavingMode = navigator.connection.saveData;
    }
}
if ("geolocation" in navigator) {
    geoLocationSupport = true;
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

    if (field === 'grade') {
        const gradeMappings = {1: 'Diff', 2: 'VDiff', 3: 'Sev', 4: 'HS', 5: 'VS', 6: 'HVS', 7: 'E1'};
        lowerValue = gradeMappings[parseInt(lowerValue)];
        higherValue = gradeMappings[parseInt(higherValue)];
    }
    document.getElementById(field + "1").innerHTML = lowerValue;
    document.getElementById(field + "2").innerHTML = higherValue;
    filterCards();
}

/**
 A FUNCTION TO FILTER THE CARD BY THE USERS SELECTION
 **/
function filterCards() {

    var resultCount = 0;
    var lowGrade = parseInt(document.getElementById('gradeRange').value.split(',')[0]);
    var highGrade = parseInt(document.getElementById('gradeRange').value.split(',')[1]);
    var lowHeight = parseInt(document.getElementById('heightRange').value.split(',')[0]);
    var highHeight = parseInt(document.getElementById('heightRange').value.split(',')[1]);
    var lowApproch = parseInt(document.getElementById('approchRange').value.split(',')[0]);
    var highApproch = parseInt(document.getElementById('approchRange').value.split(',')[1]);

    var cards = document.getElementsByClassName('card');

    for (let i = 0; i < cards.length; i++) {

        var dataGrade = cards[i].getAttribute('data-grade');
        var dataHeight = cards[i].getAttribute('data-height');
        var dataApproch = cards[i].getAttribute('data-approch');

        if (
            parseInt(dataGrade) >= lowGrade
            && parseInt(dataGrade) <= highGrade
            && parseInt(dataHeight) >= lowHeight
            && parseInt(dataHeight) <= highHeight
            && parseInt(dataApproch) >= lowApproch
            && parseInt(dataApproch) <= highApproch
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

            if (climbsArr[i].techGrade === null) {
                var techGrade = "";
            } else {
                var techGrade = climbsArr[i].techGrade;
            }

            var card = `
    <div data-climb-id="${climbsArr[i].id}" data-test="climbid-${climbsArr[i].id}" data-grade="${climbsArr[i].dataGrade}" data-height="${climbsArr[i].length}" id="${climbsArr[i].id}" data-approch="${climbsArr[i].approchTime}" class="card">
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
                <span class="what">Grade:</span> ${climbsArr[i].tradGrade} ${techGrade} <br />
                <span class="what">Location:</span> <a href="https://www.google.co.uk/maps/place/${climbsArr[i].geoLocation}" target="blank">${climbsArr[i].county}</a> <br />
                <span class="what">Length:</span> ${climbsArr[i].length}m - ${climbsArr[i].pitches} pitches <br />
                <span class="what">Approach:</span> ${climbsArr[i].approchTime}min - <span class="approach-${climbsArr[i].approchDifficulty}"></span> <br />
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
    tryLoadTopo(climbId);
}

/**
 OPEN THE SUBSCRIBE OVERLAY
 **/
function openSubscribe() {
    var request = new XMLHttpRequest();
    request.open('GET', '/subscribe/', true);

    request.onload = function () {
        if (this.status >= 200 && this.status < 400) {
            var resp = this.response;
            document.getElementById('overlay').innerHTML = resp;
            document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);z-index:14;");
            document.getElementById('close').setAttribute("style", "display:block;");
            document.getElementById('bdy').setAttribute("style", "overflow:hidden");
        } else {
            console.log('failed to get subscribe');
        }
    };
    request.onerror = function () {
        console.log('There was a connection error of some sort');
    };
    request.send();
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
    document.getElementById('close').setAttribute("style", "display:none;");// its the subscribe overlay
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
    history.replaceState(history_data, 'The best multi-pitch climbs', rootProject);
    isCardTurned = false; // ensure future clicks don't think its first load again
    if (resetTitle !== false) {
        document.title = "The best multi-pitch rock climbs";
    }
}

/**
 LOAD TOPO DATA JS OBJECT IF AVAILIBLE
 **/
function tryLoadTopo(climbId, enviroment = '') {
    enviroment = (typeof enviroment === 'undefined') ? '' : enviroment; //makes this optional
    if (dataSavingMode === false) {
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
    img.onload = function () {
        draw();
    }
    canvas = document.getElementById("canvas");
    flag = new Image();
    logo = new Image();
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
    let absailPoints = document.getElementById('c4').checked;
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
    if (absailPoints === true) {
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
function LoadAnalytics(){
    loadNonEssential("script", "https://www.googletagmanager.com/gtag/js?id=UA-123782847-1");
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'UA-123782847-1');
    window.performance.mark('gta-end');
}

function loadWeather() {
    if (window.darkSkyWeatherData) {
        climbsData.climbs.map(climb => {
            try {
                const weatherData = window.darkSkyWeatherData.find(data => data.climbId === climb.id);
                const iconWeather = document.getElementById(`weather-${climb.id}`);
                const toggleWeather = document.getElementById(`toggle-weather-${climb.id}`);
                const tempValues = document.getElementById(`temp-${climb.id}`);
                iconWeather.classList.add(weatherData.currently.icon);
                iconWeather.title = weatherData.currently.icon.replace(/-/g, " ");
                tempValues.innerHTML = Math.round(weatherData.currently.temperatureMin) + '-' + Math.round(weatherData.currently.temperatureHigh) + "&#176; C";
                toggleWeather.classList.remove("toggle-weather-off");
            } catch (e) {
                console.log("Can't add weather for climbing id ", climb.id);
            }
        });
        const fourHoursInMilliseconds = 4000 * 60 * 60;
        setTimeout(() => loadWeather(), fourHoursInMilliseconds)

    } else {
        //    If window.darkSkyWeatherData is not loaded yet, I will keep calling this function a bit faster then normally
        setTimeout(() => loadWeather(), 1000)
    }
}

// need to handle history.onPopstate ie. user presses back
window.onpopstate = function (event) {
    hideTile();
};

window.onload = function () {
    window.performance.mark('onload-event-happened');
        // Sorts and publishes the cards
    var hp = false;
    document.getElementById('cardHolder') ? hp = true : hp = false;
    if (document.location.href.indexOf('/climbs/') === -1 && hp === true) {
        sortCards('length', 'DESC');
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
    loadNonEssential("link", "https://fonts.googleapis.com/css?family=Roboto:300");
    loadNonEssential("link", "/css/fontello.css"); 
    loadNonEssential("script", "js/load-weather.js"); 
    loadNonEssential("script", "js/auth-stuff.js"); 
    LoadAnalytics();
};