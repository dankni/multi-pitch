import { returnClimbURL } from "../js/modules/convertNameToURL.js";

function getGuidebook(climb) {
    guideBookModule = '';
    if(climb.guideBooks.length >= 1){
        let twoColsImgClass = climb.guideBooks.length >= 2 ? ['col-xl-2','col-xl-4'] : ['',''];
        try {
            var guideBookModule = `
        <hr />
        <section class="row" id="guidebooks">
            <div class="col-sm-12">
                <h3>Guidebooks</h3>
            </div>`;
                for (let i = 0; i < climb.guideBooks.length; i++) {
                    let pg = (climb.guideBooks[i].pg === null) ? "?" : climb.guideBooks[i].pg;
                    guideBookModule += `
                        <div class="col-sm-2 ${twoColsImgClass[0]}">
                            <img src="/${climb.guideBooks[i].imgURL}" alt="${climb.guideBooks[i].title}" class="guidebook-img" /> 
                        </div>
                        <div class="col-sm-10 ${twoColsImgClass[1]}">
                            <p>
                                <strong class="guide-name">${climb.guideBooks[i].title}</strong> - pg.<span class="page"> ${pg}</span>
                            </p>
                            <p class="guide-desc">
                                ${climb.guideBooks[i].description}
                            </p>
                            <p>
                                <a href="${climb.guideBooks[i].link}" onClick="trackGA('external-link', 'guidebook', 'ID = ${climb.id} | B = ${climb.guideBooks[i].title}', '${climb.guideBooks[i].rrp}');" target="blank">Availible Here</a>
                                R.R.P. <strong class="guide-rrp">£ ${climb.guideBooks[i].rrp}</strong><br />
                                <small>ISBN: <span class="guide-isbn">${climb.guideBooks[i].isbn}</span></small>
                            </p>
                        </div>`;
                }
                guideBookModule += `

        </section>`;
        } catch (e) {
            guideBookModule = '';
            console.log("problem with guidebook module for " + climb.id)
        }
    }
    return guideBookModule;
}

function getApproachInfo(climb) {
    try {
        if (climb.approach != '') {
            var approachInfo = `
    <hr />
    <section class="row" id="approachDescent">
        <div class="col">
            <h3>Approach & Descent Information</h3>
            <p id="approach">${climb.approach}</p>
            <p style="text-align:center"> 
                <a href="/map/?loc=${climb.geoLocation}" class="open-tile inline-button">
                    See ${climb.cliff} on the climb map
                </a>
                <a href="https://www.google.com/maps/place/${climb.geoLocation}" target="blank" class="open-tile inline-button">
                    Open climb location in Google Maps<i class=" icon-link-ext" aria-hidden="true"></i>
                </a>
            </p>
        </div>
    </section>`;
        } else {
            var approachInfo = '';
        }
    } catch (e) {
        approachInfo = '';
    }
    return approachInfo;
}

function getPitchInfo(climb) {
    try {
        if (climb.pitchInfo !== null)  {
            var pitchInfo = `
    <hr />
    <section class="row" id="pitchesSection">
        <div class="col">
           <h3>Pitch By Pitch Information</h3>
           <p id="pitchInfo">${climb.pitchInfo}</p>
        </div>
      </section>`;
        } else {
            var pitchInfo = '';
        }
    } catch (e) {
        pitchInfo = '';
    }
    return pitchInfo;
}

function getreferenceInfo(climb) {
    try {
        if (climb.references.length >= 1) {
            var refInfo = `
        <hr />
        <section class="row" id="references">
            <div class="col">
                <h3 id="refs">References &amp; additional links</h3>
                <p>
                    The following links will take you to external websites specifically related to this climb: ${climb.routeName} on ${climb.cliff}.<br />
                    <em>Note: They contained relevant information at the time of publishing.</em>
                </p>`;
                for (let i = 0; i < climb.references.length; i++) {
                    refInfo += `<p><a class="reference" href="${climb.references[i].url}" target="blank" rel="noopener">${climb.references[i].text} <i class="icon-link-ext"></i></a></p>`;
                }
                refInfo += `
            </div>
        </section>`;
        } else {
            var refInfo = '';
        }
    } catch (e) {
        refInfo = '';
    }
    return refInfo;
}

function getGraph(type, climb) {

    try {
        var date = new Date;
        var curentMonth = date.getMonth();
        var minTemprature = 0;
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var topValues;
        var bottomValues;
        var bold;    

        if (type === "temp") {
            topValues = climb.weatherData.tempH;
            bottomValues = climb.weatherData.tempL;
            minTemprature = Math.min.apply(null, bottomValues);
        } else {
            topValues = climb.weatherData.rainyDays;
            bottomValues = [0,0,0,0,0,0,0,0,0,0,0,0];
        }
  
        var maxValue = Math.max.apply(null, topValues);
        var graphHeight = 40;
        if (maxValue < 18) graphHeight -= 5;        // makes the bars fill more of the height (zooms in)
        
        var barHeightModifier = 0;                  // if all temps are above 0 no adjustment needed   
        if (minTemprature < -8) {                   // ensure all numbers are > 0 so we dont subtract a minus number (which would be addative)
            barHeightModifier = 16;                 // if its really cold adjust the graph a lot
        } else if (minTemprature < 0) {
            barHeightModifier = 8;                  // if its a bit cold adjust it a little
        }

        var tempInfo = `<ul class="chart ${type}">`;

        for (let i = 0; i < 12; i++) {
            i === curentMonth ? bold = "font-weight:900;" : bold = "";
            // the bottom bar "pushes up" the top bar so barEndingHeight is the delta which sits on the bottom bar
            let barEndingHeight = ((topValues[i] + barHeightModifier) - (bottomValues[i] + barHeightModifier)) / graphHeight * 100;
            let barStartingHeight = ((bottomValues[i] + barHeightModifier)) / graphHeight * 100;
            tempInfo += `<li>
                            ${topValues[i]}<span style="height:${barEndingHeight}%;${bold}"  title="${months[i]}"></span>`;
            if (type === "temp") {
                tempInfo += `<span style="height:${barStartingHeight}%;background-color:rgba(0,0,0,0);">${bottomValues[i]}</span>`;
            }
            tempInfo += `</li>`;
        }
        tempInfo += `</ul>`;

    } catch (e) {
        console.log(e);
        tempInfo = "";
    }
    return tempInfo;
}

function getWeather(climb) {
    try {
        var temperature = getGraph("temp", climb);
        if (temperature == '') {
            return '';
        }
        var rain = getGraph("seasonal-rain", climb);
        if (climb.seepage >= 1) {
            var seepage = `<p>The climb ${climb.routeName} on ${climb.cliff} suffers from seepage 
            and will need time to dry out after rain. Rock climbing after heavy rainfall could 
            be a slimy unpleasnt experiance.</p>`;
        } else {
            var seepage = "";
        }
        let tideInfoBox = (climb.tidal >= 1) ? '<div id="tideHolder"></div>' : '' ;
        var weatherInfo = `
      <hr />
      <section class="row" id="weather">
        <div class="col-12">
          <h3>Weather & Local Conditions</h3>
          ${seepage}
          <aside style="margin-bottom:2.5rem;">
            <small>
            Please Note: <em>This forecast is calculated for the climb's coordinates. Not all routes have weather stations nearby. 
            For more remote mountain routes it may be noticeably different. Don't take the forecast for granted.</em>
            </small>
          </aside>
        </div>
        <div class="col-12" id="currentWeather" style="display:none;">
          <h4>Current Weather - <span id="wIcon" class="weather wLarge"></span></h4>
          <p>
            The current weather at ${climb.cliff} in ${climb.county} looks like <strong id="weatheName"></strong>. <small id="lastDate">Updated: </small><br />
            Local time at the crag is <strong id="cragLocalTime"></strong> <small id="cragTimeZone"></small>.<br />
            <span id="sunMovement">
                <span class="weather sunrise"></span> <strong id="light_hours"></strong> Daylight hours today between
                <strong id="sunrise"></strong> & <strong id="sunset"></strong>.
            </span>
            <br />          
            <span class="weather clear-day"></span> Todays
            <abbr title="Ultraviolet">UV</abbr> Index is <strong id="uv_index"></strong> which is considered <span id="uv_description"></span>
          </p>
          <p class="chart-title">
            Recent rain & 14 day forecast
          </p>
          <div class="wx-strip-wrap">
            <button type="button" class="wx-scroll wx-scroll-left" aria-label="Earlier days"
                    onclick="document.getElementById('weatherStrip').scrollBy({left:-280,behavior:'smooth'})">&#8249;</button>
            <div id="weatherStrip" class="weather-strip" aria-label="Twenty day weather overview"></div>
            <button type="button" class="wx-scroll wx-scroll-right" aria-label="Later days"
                    onclick="document.getElementById('weatherStrip').scrollBy({left:280,behavior:'smooth'})">&#8250;</button>
          </div>
          <div id="weatherHourly" style="display:none;"></div>
          <p class="credit" style="margin-top:15px;">Weather data from <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a></p>
          ${tideInfoBox}
        </div>
        <div class="col-12" id="seasonalWeather">
          <h4>Seasonal Weather Information</h4>
          <p>Note that some weather stations are close or even on the mountain, others are in nearby towns. 
          Plan accordingly!</p>
          <p class="chart-title">Estimated Rainy Days Per Month</p>
          ${rain}
          <p class="min-height">
            The graph shows the estimated average number of rainy days in the month that had more than 
            1mm rainfall or snow:
          </p>
          <br />
          <p class="chart-title">Estimated Temperature Per Month</p>
          ${temperature}
          <p>
            Estimated average high and low temperature in degrees Celsius for the given month. 
          </p>
        </div>
      </section>`;
        return weatherInfo;
    } catch (e) {
        weatherInfo = '';
        console.log("card weather error for: " + climb.id);
        return weatherInfo;
   } 

}

function getRouteTopo(climb, topoData) {
    var routeTopo = '';
    if(climb.topo.dataFile > 1){
        let belayDisabled = "disabled";
        let altDisabled = "disabled";
        let deceDisabled = "disabled";
        try{
            belayDisabled = topoData.pitches.length >= 1 ? "checked" : "disabled";
        } catch (e) { }
        try {
            altDisabled = topoData.alternatives.length >= 1 ? "checked" : "disabled";
        } catch (e) { }
        try {
            deceDisabled = topoData.decent.length >= 1 ? "checked" : "disabled";
        } catch (e) { }

        routeTopo += `
        <aside class="topo-controls">
            <small>
                The below controls change the image so you can better see the rock if needed.
            </small><br />
            <label for="c1"><input type="checkbox" value="infoBox" checked id="c1" name="c1" onclick="topoInteraction(${climb.id}, '${climb.routeName}', '${climb.cliff}')" /><span>Info Box</span></label>
            <label for="c2"><input type="checkbox" value="routeLine" checked id="c2" name="c2" onclick="topoInteraction(${climb.id}, '${climb.routeName}', '${climb.cliff}')" /><span>Route</span></label>
            <label for="c3"><input type="checkbox" value="belays" ${belayDisabled} id="c3" name="c3" onclick="topoInteraction(${climb.id}, '${climb.routeName}', '${climb.cliff}')" /><span>Belay&nbsp;Points</span></label>
            <label for="c4"><input type="checkbox" value="abseil" ${deceDisabled} id="c4" name="c4" onclick="topoInteraction(${climb.id}, '${climb.routeName}', '${climb.cliff}')" /><span>Approach&nbsp;/&nbsp;Decent</span></label>
            <label for="c5"><input type="checkbox" value="labels" ${belayDisabled} id="c5" name="c5" onclick="topoInteraction(${climb.id}, '${climb.routeName}', '${climb.cliff}')" /><span>Labels</span></label>
            <label for="c6"><input type="checkbox" value="Alternatives" ${altDisabled} id="c6" name="c6" onclick="topoInteraction(${climb.id}, '${climb.routeName}', '${climb.cliff}')" /><span>Alternatives</span></label>
        </aside>`;
    }
    routeTopo += `
        <div class="img-contaner" id="topoHolder">
            <a href="/${climb.topo.url}" target="blank" class="card-img-anch" onClick="trackGA('topo', 'openFullTopoImg', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" >
                <picture class="big-card-map" id="staticTopo">`;
                let url = climb.topo.url.replace('.jpg','');
                // dealing mostly with pixel density below
                if(climb.topo.dataFile === 5 && dataSavingMode !== true){
                    // the max is over 2160 so worth declaring for SEO
                    routeTopo += `<source media="(min-width: 2600px)" type="image/webp" srcset="/${url}.webp">`;
                }
                if(typeof dataSavingMode === undefined){ // for node static file generation
                    var dataSavingMode = false; 
                }
                if(climb.topo.dataFile >= 3 && dataSavingMode !== true){
                    let val = climb.topo.dataFile
                    let big2pdW  = (val === 5) ? `, /${url}-large.webp 2x` : ``;
                    let med2pdW = (val >= 4) ? `, /${url}-medium.webp 2x` : ``;
                    let big3pdW = (val === 5) ? `, /${url}-large.webp 3x` : ``;
                    let big2pdJ = (val === 5) ? `, /${url}-large.jpg 2x` : ``;
                    let med2pdJ = (val >= 4) ? `, /${url}-medium.jpg 2x` : ``;
                    let big3pdJ = (val === 5) ? `, /${url}-large.jpg 3x` : ``;

                    routeTopo += `
                    <source media="(min-width: 1080px)" type="image/webp" 
                        srcset="/${url}-medium.webp 1x${big2pdW}">
                    <source media="(max-width: 1079px)" type="image/webp"
                        srcset="/${url}-small.webp 1x${med2pdW}${big3pdW}">
                    <source media="(max-width: 767px)" type="image/webp"
                        srcset="/${url}-small.webp 1x${med2pdW}">
                    <source media="(min-width: 1080px)" type="image/jpg"
                        srcset="/${url}-medium.jpg 1x${big2pdJ}">
                    <source media="(max-width: 1079px)" type="image/jpg"
                        srcset="/${url}-small.jpg 1x${med2pdJ}${big3pdJ}">
                    <source media="(max-width: 767px)" type="image/jpg"
                        srcset="/${url}-small.jpg 1x${med2pdJ}">`;
                }

                routeTopo += `
                    <img src="/${climb.topo.url}" alt="${climb.topo.alt}" class="crag-hero" >
                </picture>`;
                if(climb.topo.dataFile > 1){
                    routeTopo += `<canvas id="canvas" width="0" height="0" style="margin:auto;display:none;"></canvas>`;
                }
                routeTopo +=
            `</a>
        </div>
        <p class="credit">
            Original Image: <a href="${climb.topo.atributionURL}" target="blank">${climb.topo.attributionText}</a>
        </p>`;
    return routeTopo;
}

function getMap(climb) {
    if (!climb.mapImg || !climb.mapImg.url) {
        return '';
    }
    var mapPicture = `
        <picture class="big-card-map">    
            <source
               media="(max-width: 400px)"
               srcset="/${climb.mapImg.url}400x200x1.webp 1x, /${climb.mapImg.url}400x200x2.webp 2x"
               type="image/webp" >
             <source
               media="(max-width: 1080px)"
               srcset="/${climb.mapImg.url}1080x200x1.webp 1x, /${climb.mapImg.url}1080x200x2.webp 2x"
               type="image/webp" >
             <source
               media="(min-width: 1080px)"
               srcset="/${climb.mapImg.url}1280x200x2.webp"
               type="image/webp" >
            <source
               media="(max-width: 400px)"
               srcset="/${climb.mapImg.url}400x200x1.png 1x, /${climb.mapImg.url}400x200x2.png 2x"
               type="image/png" >
             <source
               media="(max-width: 1080px)"
               srcset="/${climb.mapImg.url}1080x200x1.png 1x, /${climb.mapImg.url}1080x200x2.png 2x"
               type="image/png" >
             <source
               media="(min-width: 1080px)"
               srcset="/${climb.mapImg.url}1280x200x2.png"
               type="image/png" >
             <img
               src="/${climb.mapImg.url}1080x200x1.png"
               class="big-card-map" 
               alt="${climb.mapImg.alt}">
        </picture>`;
    return mapPicture;
}

function getVariants(topoData){
    try {
        let html = '';
        if(topoData.alternatives){
            html += `
            <div class="col-12">
                <h3>Alternative Routes</h3>        
            </div>
            `
            for(let i = 0; i < topoData.alternatives.length; i++){
                html += `<div class="col-12">
                    <details>
                    <summary>
                        ${topoData.alternatives[i].reference}. ${topoData.alternatives[i].routeName} |
                        ${topoData.alternatives[i].grade} - ${topoData.alternatives[i].length}
                    </summary>
                        <p>${topoData.alternatives[i].description}</p>
                    </details>
                    </div>`
            }
        }
        return html;
    } catch (e) {
        // no alternative
        return "";
    }
}

function getOtherClimbs(climbGeo){
    try{
        let allClimbsData = JSON.parse(localStorage.getItem('climbsData'));
        let nearbyClimbs = [];
        for (let i = 0; i < allClimbsData.climbs.length; i++) {
            let compClimb = allClimbsData.climbs[i]; //comparison climb
            if(compClimb.status === "publish") { // ensures unpublished climbs are not processed
                let distance = calcDistanceBetweenPoints(compClimb.geoLocation.split(',')[0], compClimb.geoLocation.split(',')[1], climbGeo.split(',')[0], climbGeo.split(',')[1]);
                if((distance <= 40) && (distance != 0)){
                    let nearbyClimb = {}
                    nearbyClimb.distance = distance;
                    nearbyClimb.id = compClimb.id;
                    nearbyClimb.tileImg = compClimb.tileImage;
                    nearbyClimb.cliff = compClimb.cliff;
                    nearbyClimb.routeName = compClimb.routeName;
                    nearbyClimb.grade = compClimb.originalGrade;
                    nearbyClimb.length = compClimb.length;
                    nearbyClimbs.push(nearbyClimb);
                }
            } 
        }
        return nearbyClimbs;
    } catch(e){
        console.error(e);
        return '';
    }
}

function outputNearbyClimbs(nearbyClimbs){
        let html = "";
        if(nearbyClimbs.length >= 1){
            html +=`
            <div class="col-12">
                <h3>Listed Nearby Climbs</h3>
                <p>The are some top quality multi-pitch rock climbs nearby.
                Guidebooks (see above) will have a more comprehensive list of other local climbing venues.</p>
            </div>`;
            for (let i = 0; i < nearbyClimbs.length; i++) {
                let url = returnClimbURL(nearbyClimbs[i].routeName, nearbyClimbs[i].cliff);
                let webPUrl =  nearbyClimbs[i].tileImg.url.replace(".jpg", ".webp");
                // ToDo: make this pushstate eg onclick="showTile(${nearbyClimbs[i].id});return false;"
                let climbLink = `
                <div class="col-sm-6 col-md-6 col-lg-3 nearby-climb">
                    <a href="/climbs/${url}" id="${nearbyClimbs[i].id}Focus">
                        <picture>
                            <source srcset="/${webPUrl}" type="image/webp">
                            <img src="/${nearbyClimbs[i].tileImg.url}" alt="${nearbyClimbs[i].tileImg.alt}" class="crag-hero" loading="lazy" />
                        </picture>
                    </a>
                </div>
                <div class="col-sm-6 col-md-6 col-lg-3 nearby-climb">
                    <p class="card-text">
                        <a href="/climbs/${url}">${nearbyClimbs[i].routeName} on ${nearbyClimbs[i].cliff}</a><br />
                        ${nearbyClimbs[i].length}m climb graded ${nearbyClimbs[i].grade}.<br />
                        <strong>${nearbyClimbs[i].distance}km away</strong> </p>
                </div>`;
                html += climbLink;
            }
            html += "<br />"
        }
        html += `
        <div class="col-12">
            <p style="text-align:center;margin-top:50px">
                There are currently over 40 published multi-pitch climbs on the site. <br />
                <!-- ToDo: make this use push state for super fast load if it's an option -->
                <br />
                <a class="primary-link" href="/">View All Listed Rock Climbs</a>
            </p>
        </div>`;
        return html;
}

function climbCard(climbData, nearbyClimbsServerSide) {
    let climb = climbData.climbData;
    let topoData = climbData.topoData;

    var variants = getVariants(topoData);
    /* ToDo: LOTS TO REFACTOR HERE */
    var routeTopoModule = getRouteTopo(climb, topoData);
    var approachInfoModule = getApproachInfo(climb);
    var pitchInfoModule = getPitchInfo(climb);
    var referenceModule = getreferenceInfo(climb);
    var guideBookModule = getGuidebook(climb);
    var weatherInfoModule = getWeather(climb);
    var mapModule = getMap(climb);
    if(nearbyClimbsServerSide != null){
        var nearbyClimbs = nearbyClimbsServerSide; 
    } else {
        var nearbyClimbs = getOtherClimbs(climb.geoLocation);
    }
    var otherClimbs = outputNearbyClimbs(nearbyClimbs);
    var folderName = returnClimbURL(climb.routeName, climb.cliff);

    if (climb.techGrade === null) {
        var techGrade = "";
    } else {
        var techGrade = climb.techGrade;
    }

    var tidal = '', abReq = '', face = '';
    const mapping = {'N' : 'North Facing', 'NE' : 'North East Facing', 'E' : 'East Facing', 'SE' : 'South East Facing', 'S' : 'South Facing', 'SW' : 'South West Facing', 'W' : 'West Facing', 'NW' : ' North West Facing'}
    if (Boolean(climb.tidal)){
        tidal = `<div class="info-ring">
            <span class="single-attribute">Tidal<br/> Access</span>
        </div>`
    }
    if (Boolean(climb.abseil)){
        abReq = `<div class="info-ring">
            <span class="single-attribute">Abseil<br/> Required</span>
        </div>`
    }
    if (climb.face){
        face = `<div class="info-ring compass ${climb.face}">
            <span class="single-attribute"  title="${mapping[climb.face]}" id="face">${climb.face}</span>
        </div>`
    }
    var fullCard = `
    <meta name="climbId" id="climbIdMeta" content="${climb.id}" />
    <article id="climbCardDetails" class="main">
        <div style="width:100%;max-height:300px;">
            <a href="/map/?loc=${climb.geoLocation}" class="card-img-anch">
                ${mapModule}
            </a>
        </div> 
        <div class="container">
            <div class="map-card-body">
                <div class="big-card-body pull-onto-map">
                    <div class="row">
                        <div class="col-sm">
                            <h1 id="articleTitle" tabindex="-1">
                                <span class="flag big-flag ${climb.country.toLowerCase().replace(' ', '')}"></span>
                                ${climb.cliff} - ${climb.routeName}
                            </h1>
                        </div>
                    </div>
                    <section class="row">
                        <div class="col">
                            <p id="intro">
                                ${climb.intro}
                            </p>
                        </div>
                    </section>
                    <div class="row">
                        <div class="col-md-12 col-lg-9 info-ring-holder">
                            <div class="info-ring">
                                <span class="grade what">Grade</span>
                                <span class="info-divider"></span>
                                <span class="grade amount" id="grade">${climb.tradGrade}&nbsp;${techGrade}</span>
                            </div>        
                            <div class="info-ring">
                                <span class="grade what">Length</span>
                                <span class="info-divider"></span>
                                <span class="grade amount" id="length">${climb.length}m</span>
                            </div>      
                            <div class="info-ring">
                                <span class="grade what">Pitches</span>
                                <span class="info-divider"></span>
                                <span class="grade amount" id="pitches">${climb.pitches}</span>
                            </div>
                            <div class="info-ring">
                                <span class="grade what">Approach</span>
                                <span class="info-divider"></span>
                                <span class="grade amount" id="approachTimeRing">${climb.approachTime}<small>min</small></span>
                            </div>
                            ${face}
                            <div class="info-ring">
                                <span class="single-attribute" id="rockType">${climb.rock}</span>
                            </div>
                            ${tidal}
                            ${abReq}
                        </div>
                        <div class="col-lg-3 col-md-12 social-share">
                            <p class="share-tip">Share this page:</p>
                            <a  id="whatsappShare" title="Share this page to Whatsapp" aria-label="Share this page to WhatsApp"
                                href="whatsapp://send?text=${climb.routeName} on ${climb.cliff} | https://www.multi-pitch.com/climbs/${folderName}"
                                target="blank"
                                onClick="trackGA('social-share', 'whatsapp', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                                <i class="icon-whatsapp" aria-hidden="true"></i></a>
                            <a  title="Tweet this page" aria-label="Tweet this page"
                                href="https://twitter.com/intent/tweet/?text=${climb.routeName} on ${climb.cliff}&amp;url=https://www.multi-pitch.com/climbs/${folderName}" 
                                target="blank"
                                onClick="trackGA('social-share', 'twitter', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                                <i class="icon-twitter" aria-hidden="true"></i></a>
                            <a  title="Share this page to Facebook" aria-label="Share this page to Facebook"
                                href="https://facebook.com/sharer/sharer.php?u=https://www.multi-pitch.com/climbs/${folderName}" 
                                target="blank"
                                    onClick="trackGA('social-share', 'facebook', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                                <i class="icon-facebook" aria-hidden="true"></i></a>
                            <a  title="Share this page via Email" aria-label="Share this page via email"
                                href="mailto:?subject=${climb.routeName} on ${climb.cliff}&amp;body=https://www.multi-pitch.com/climbs/${folderName}" 
                                target="blank"
                                    onClick="trackGA('social-share', 'email', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                                <i class="icon-mail" aria-hidden="true"></i></a>
                        </div>
                    </div>
                    <hr />  
                    <section class="row">
                        <div class="col">
                            <h2>The Route Topography</h2>
                            <p>
                                This is the route <strong>${climb.routeName}</strong> on ${climb.cliff} in ${climb.county}, ${climb.country}.
                                It represents ${climb.length}m of ${climb.rock} rock climbing, usually over ${climb.pitches} pitches, of a max grade of ${climb.tradGrade}&nbsp;${techGrade}.
                                Clicking the image will load the <a href="/${climb.topo.url}" target="blank">full screen high resolution ${climb.routeName} climb topo</a>.
                            </p>
                            ${routeTopoModule}
                            <aside>
                                <em><small>
                                    Please note: Great care has been taken to create accurate and useful climbing topos. 
                                    However there may be mistakes and cliffs can suffer rockfall and change. Information is provided without guarantee. 
                                    Climbing is dangerous.
                                </small></em>
                            </aside>
                        </div>
                        ${variants}
                    </section>
                    ${approachInfoModule}
                    ${pitchInfoModule}
                    ${guideBookModule}
                    ${weatherInfoModule}
                    ${referenceModule}
                    <hr />  
                    <section class="row">
                        ${otherClimbs}
                    </section>
                </div>
            </div>
        </div>
    </article>`;
    return fullCard;
}

/*/*So then I can use this in nodejs and in the browser
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        climbCard
    };
}*/
export { climbCard, getRouteTopo };
