// START
window.performance.mark('start-js-read');
/**
 GLOBAL VARIABLES
 **/
const rootProject = "/"; // adjust per enviroment
var start = document.URL;
var history_data = { "Start": start }; // push state
var isCardTurned = start.includes('?overview');
var dataSavingMode = false;
if ("connection" in navigator) {
    if (navigator.connection.saveData === true) {
        dataSavingMode = navigator.connection.saveData;
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
        const gradeMappings = { 1: 'Diff', 2: 'VDiff', 3: 'Sev', 4: 'HS', 5: 'VS', 6: 'HVS', 7: 'E1' };
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
    var c = document.getElementsByClassName("card");
    while (c.length > 0) c[0].remove();
    var climbsSorted = helper.arr.multisort(climbsData.climbs, [sortBy, 'dataGrade'], [direction, 'ASC']);
    publishCards(climbsSorted);
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

    document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);");
    document.getElementById('close').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");

    var fullCard = climbCard(climb, cImgs, allGuideBooks, weatherData, referanceLines);

    document.getElementById('overlay').innerHTML = fullCard;
    document.getElementById('climbCardDetails').style = "max-width: 1080px;margin: 10px auto;Background: #fff;";
    document.title = climb.cliff + " - " + climb.routeName;
    tryLoadTopo(climbId);
}

/**
 CLOSE THE CLIMB OVERVIEW - IE CLOSE THE BACK OF THE CARD
 **/
function hideTile() {
    history.replaceState(start, 'The best multi-pitch climbs', rootProject);
    isCardTurned = false; // ensure future clicks don't think its first load again
    document.getElementById('close').setAttribute("style", "display:none;");
    document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
    document.getElementById('bdy').setAttribute("style", "");
    document.title = "The best multi-pitch rock climbs";
}

/**
 LOAD TOPO DATA JS OBJECT IF AVAILIBLE
 **/
function tryLoadTopo(climbId){
    if(dataSavingMode === false){ 
        let cImgs = climbImgs.imgs.filter(img => img.climbId === climbId);
        let topoImg = cImgs.find(img => img.type === 'topo');
        if(topoImg.dataFile > 1){
            let ref = document.getElementsByTagName('script')[0];
            var script = document.createElement( 'script' ); 
            script.onload = function(){
                initTopo();
            }
            script.src = "/data/topos/" + climbId + ".js";
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
var  belaySize = 24;
const lineColor = "rgba(204,25,29,0.95)";
const belayColor = "rgb(236,142,140,0.9)";
const decentBelay = "rgba(84, 122, 183, 0.9)";
const decentLine = "rgb(1, 70, 181, 0.95)";
const infoBoxColor = 'rgba(28, 35, 49, 0.95)';
var maxWidth = 'max';
var arrowSize = 20;
var dashSpace = [32, 8, 5, 8];

function initTopo () {
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
function toggleTopo(){
    document.getElementById("staticTopo").style.display = "none";
    document.getElementById("canvas").style.display = "block";
}

function updateScale(){
    let vh90 = window.innerHeight * 0.9;
    let topoHolder = document.getElementById("topoHolder");
    let scaleVsVh, scaleVsHolder;
    vh90 < img.height ? scaleVsVh = vh90 / img.height : scaleVsVh = 1;
    topoHolder.offsetWidth ? scaleVsHolder = topoHolder.offsetWidth / img.width : scaleVsHolder = 1;
    scaleVsVh > scaleVsHolder ? scale = scaleVsHolder : scale = scaleVsVh;
    
    topoData.belaySize ? belaySize =  sThis(topoData.belaySize) : belaySize = sThis(24); 
    lineWidth = sThis(6);
    fontsize = sThis(55);
    dashSpace = [sThis(32), sThis(8), sThis(5), sThis(8)];
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
        ctx.font = fontsize + "px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(topoData.title, flagLeftMargin * 2 + flagWidth, imgHeight - sThis(35));
        ctx.fillText('multi-pitch.com', (imgWidth - sThis(420)), imgHeight - sThis(35));
    }

    // Add the Topo Line
    if (routeLine === true) {
        if (topoData.route.length > 1){
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
            if(topoData.decent[i].anchor !== null){
                drawBelay(ctx, 
                    topoData.decent[i].anchor[0], 
                    topoData.decent[i].anchor[1], 
                    decentLine, decentBelay);
            }
            if(topoData.decent[i].path !== null){
                drawLine(ctx, topoData.decent[i].path, true, true, decentLine);
            }
            if(topoData.decent[i].label !== null && pitchLabels === true){
                annotate(ctx, topoData.decent[i].label, sThis(topoData.decent[i].labelPosition[0]), 
                    sThis(topoData.decent[i].labelPosition[1]), decentLine);
            }
        }
    }
}

// A set of helper functions 
function drawBelay(context, x, y, line, fill){
    if (x > 0 && y > 0){
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

function annotate(context, msg, x, y, color){
    context.font = "bold " + (fontsize * 0.8) + "px sans-serif";
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = sThis(10);
    context.strokeText(msg, x, y);
    context.fillStyle = color;
    context.fillText(msg, x, y);
}

function drawLine (context, arrayOfxy, dashed, arrowEnd, color){
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


// need to handel history.onPopstate ie. user presses back
window.onpopstate = function (event) {
    hideTile();
};

window.onload = function () {
    window.performance.mark('onload-event-happened');
    // Sorts and publishes the cards
    if (document.location.href.indexOf('/climbs/') === -1) {
        sortCards('length', 'DESC');
        window.performance.mark('all-climbs-loaded');
    } 
    if (isCardTurned === true) {
        var overview = start.split('=');
        var cardToLoad = overview[1];
        showTile(cardToLoad);
    }
};