if(typeof gtagId === 'undefined'){
  var gtagId = 'gtag_UA_123782847_1'; // needed per event for some reason
} 

function getGuidebook(guideBooks, climb) {
    guideBookModule = '';
    if(Array.isArray(guideBooks) && guideBooks.length){
        try {
            var guideBookModule = `
        <hr />
        <section class="row">
            <div class="col-sm-12">
                <h3>Guidebooks</h3>
            </div>`;
                for (var i = 0; i < guideBooks.length; i++) {
                    guideBookModule += `
                        <div class="col-sm-2">
                            <img src="/${guideBooks[i].imgURL}" alt="${guideBooks[i].title}" class="guidebook-img" /> 
                        </div>
                        <div class="col-sm-10">
                            <p>
                                <strong>${guideBooks[i].title}</strong> - pg. ${guideBooks[i].pg} <br />
                                ${guideBooks[i].description}
                                <br />
                                <a href="${guideBooks[i].link}" onClick="ga('${gtagId}.send', 'event', 'external-link', 'guidebook', 'ID = ${climb.id} | B = ${guideBooks[i].title}', '${guideBooks[i].rrp}');" target="blank">Availible Here</a>
                                R.R.P. <strong>£ ${guideBooks[i].rrp}</strong><br />
                                <small>ISBN: ${guideBooks[i].isbn} </small>
                            </p>
                        </div>`;
                }
                guideBookModule += `

        </section>`;
        } catch (e) {
            guideBookModule = '';
        }
    }
    return guideBookModule;
}

function getApprochInfo(climb) {
    try {
        if (climb.approach != '') {
            var approachInfo = `
    <hr />
    <section class="row">
        <div class="col">
            <h3>Approach & Descent Infomation</h3>
            <p>${climb.approach}</p>
            <p style="text-align:center"> 
                <a href="/map/?loc=${climb.geoLocation}">
                    See ${climb.cliff} on the climb map
                </a> | 
                <a href="https://www.google.com/maps/place/${climb.geoLocation}" target="blank">
                    Open climb location in Google Maps<i class="icon-link-ext"></i>
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
    <section class="row">
        <div class="col">
           <h3>Pitch By Pitch Information</h3>
           <p>${climb.pitchInfo}</p>
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

function getReferanceInfo(referanceLines, climb) {
    try {
        if (referanceLines.length >= 1) {
            var refInfo = `
        <hr />
        <section class="row">
            <div class="col">
                <h3>Referances &amp; additional links</h3>
                <p>
                    The following links will take you to external websites related specifically related to this climb: ${climb.routeName} on ${climb.cliff}.<br />
                    <em>Note: They contined relavant infomation at the time of publishing.</em>
                </p>
                <p>`;
                    for (let i = 0; i < referanceLines.length; i++) {
                        refInfo += `<a href="${referanceLines[i].url}" target="blank">${referanceLines[i].text} <i class="icon-link-ext"></i></a><br />`;
                    }
                    refInfo += `
                </p>
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

function getGraph(type, climbId, weatherData) {

    try {
        var date = new Date;
        var curentMonth = date.getMonth();
        var bold = "";
        var weather = weatherData.weatherLines.filter(w => w.climbId === climbId);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (type === "temperature") {
            var high = weather.find(h => h.type === 'tempH');
            var chartClass = "temp";
        } else {
            var high = weather.find(h => h.type === 'rainyDays');
            var chartClass = "seasonal-rain";
        }

        var highArray = [];
        for (let i = 2; i < 14; i++) {
            highArray.push(parseInt(Object.values(high)[i]));
        }
        var maxValue = Math.max.apply(null, highArray);
        var graphHeight = 40;
        if (maxValue < 18) graphHeight -= 5; // makes the bars fill more of the height

        var lowArray = [];
        if (type === "temperature") {
            var tempL = weather.find(l => l.type === 'tempL');
            for (let i = 2; i < 14; i++) {
                lowArray.push(parseInt(Object.values(tempL)[i]));
            }
            var minTemprature = Math.min.apply(null, lowArray);
        } else {
            for (let i = 0; i < 12; i++) {
                lowArray.push(0);
            }
        }

        var tempInfo = `<ul class="chart ${chartClass}">`;

        for (let i = 0; i < 12; i++) {
            i === curentMonth ? bold = "font-weight:900;" : bold = "";
            if (minTemprature < -8) {
                // if its really cold adjust the graph a lot
                var lowTemp = (lowArray[i] + 16) / graphHeight * 100;
                var highTemp = ((highArray[i] + 16) - (lowArray[i] + 16)) / graphHeight * 100;
            } else if (minTemprature < 0) {
                // if its a bit cold adjust it a little
                var lowTemp = (lowArray[i] + 8) / graphHeight * 100;
                var highTemp = ((highArray[i] + 8) - (lowArray[i] + 8)) / graphHeight * 100;
            } else {
                // if all temps are above 0 no adjustment needed 
                var lowTemp = (lowArray[i]) / graphHeight * 100;
                var highTemp = (highArray[i] - lowArray[i]) / graphHeight * 100;
            }

            tempInfo += `
  	  <li>
	    ${highArray[i]}
	    <span style="height:${highTemp}%;${bold}"  title="${months[i]}"></span>`;
            if (type === "temperature") {
                tempInfo += `<span style="height:${lowTemp}%;background-color:rgba(0,0,0,0);">${lowArray[i]}</span>`;
            }
            tempInfo += `</li>`;
        }
        tempInfo += `</ul>`;

    } catch (e) {
        tempInfo = '';
    }
    return tempInfo;
}

function getWeather(theId, weatherData, climb) {
    try {
        var temperature = getGraph("temperature", theId, weatherData);
        if (temperature == '') {
            return '';
        }
        var rain = getGraph("rain", theId, weatherData);
        if (climb.seepage >= 1) {
            var seepage = `<p>The climb ${climb.routeName} on ${climb.cliff} suffers from seepage 
            and will need time to dry out after rain. Rock climbing after heavy rainfall could 
            be a slimy unpleasnt experiance.</p>`;
        } else {
            var seepage = "";
        }
        var weatherInfo = `
      <hr />
      <section class="row" id="weather">
        <div class="col-12">
          <h3>Weather & Local Conditions</h3>
          ${seepage}
          <aside style="margin-bottom:2.5rem;">
            <small>
            Please Note: <em>The weather data is based off the closest weather station we could find to the crag. 
            This could be quite far away and at a darmatically different elevation. 
            This means it could be considerably colder or wetter on some mountain climbs.</em>
            </small>
          </aside>
          
        </div>
        <div class="col-12 col-lg-6" id="currentWeather" style="display:none;">
          <h4>Current Weather - <span id="wIcon" class="weather wLarge"></span></h4>
          <p class="min-height">
            The current weather at ${climb.cliff} in ${climb.county} looks like <strong id="weatheName"></strong>,
            with temperatures between <strong id="lowT"></strong> & <strong id="highT"></strong>&#176;c. 
            Below is the estimated daily amount of rain.
          </p>
          <ul class="chart">
            <li id="offsetMinus3"><span style="height:0%;" title="-3 days"></span></li>
            <li id="offsetMinus2"><span style="height:0%;" title="-2 days"></span></li>
            <li id="offsetMinus1"><span style="height:0%;" title="Yest"></span></li>
            <li id="currently"><span style="height:0%;font-weight:900;" title="Today"></span></li>
            <li id="offsetPlus1"><span style="height:0%;" title="Tomor"></span></li>
            <li id="offsetPlus2"><span style="height:0%;" title="+2 days"></span></li>
            <li id="offsetPlus3"><span style="height:0%;" title="+3 days"></span></li>
          </ul>
          <p class="credit" style="margin-top:15px;">Weather by Dark Sky API</p>
        </div>
        <div class="col-12" id="seasonalWeather">
          <h4>Seasonal Weather Infomation</h4>
          <p class="min-height">
            Below shows the estimated average number of rainy days in the month that had more than 
            1mm rainfall or snow:
          </p>
          ${rain}
          <br />
          <p>
            Estimated average high and low temperature in degrees Celsius for the given month below. 
            Again note that some weather stations are close or even on the mountain, others are in nearby towns. 
            Plan accordingly! 
          </p>
          ${temperature}
        </div>
      </section>`;
        return weatherInfo;
    } catch (e) {
        weatherInfo = '';
        console.log("weather error for: " + theId);
        return weatherInfo;
    }

}

function getRouteTopo(topoImg, climb) {
    var routeTopo = '';
    if(topoImg.dataFile > 1){
        routeTopo += `
        <aside class="topo-controls">
            <small>
                The below controls change the image so you can better see the rock if needed.
            </small><br />
            <label for="c1"><input type="checkbox" value="infoBox" checked id="c1" name="c1" onclick="draw();toggleTopo();ga('${gtagId}.send', 'event', 'topo', 'infoBox', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" />Info Box</label>
            <label for="c2"><input type="checkbox" value="routeLine" checked id="c2" name="c2" onclick="draw();toggleTopo();ga('${gtagId}.send', 'event', 'topo', 'routeLine', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" />Route</label>
            <label for="c3"><input type="checkbox" value="belays" checked id="c3" name="c3" onclick="draw();toggleTopo();ga('${gtagId}.send', 'event', 'topo', 'belays', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" />Belay&nbsp;Points</label>
            <label for="c4"><input type="checkbox" value="absail" checked id="c4" name="c4" onclick="draw();toggleTopo();ga('${gtagId}.send', 'event', 'topo', 'approachDecent', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" />Approch&nbsp;/&nbsp;Decent</label>
            <label for="c5"><input type="checkbox" value="labels" checked id="c5" name="c5" onclick="draw();toggleTopo();ga('${gtagId}.send', 'event', 'topo', 'labels', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" />Labels</label>
        </aside>`;
    }
    routeTopo += `
        <div class="img-contaner" id="topoHolder">
            <a href="/${topoImg.url}" target="blank" class="card-img-anch" onClick="ga('${gtagId}.send', 'event', 'topo', 'openFullTopoImg', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);" >
                <picture class="big-card-map" id="staticTopo">`;
                // dealing mostly with pixel density below
                if(topoImg.dataFile === 5){ // the max is over 2160 so worth declaring for SEO
                    routeTopo += `<source media="(min-width: 4000)" type="image/webp"
                        srcset="/${topoImg.url}.webp 1x, /${topoImg.url}.webp 2x, /${topoImg.url}.webp 3x">`;
                }
                if(topoImg.dataFile >= 3){
                    let big2pdW, med2pdW, big3pdW, big2pdJ, med2pdJ, big3pdJ;
                    topoImg.dataFile === 5 ? big2pdW = `, /${topoImg.url}-large.webp x2` : big2pd = '';
                    topoImg.dataFile >= 4 ? med2pdW = `, /${topoImg.url}-medium.webp x2` : med2pd = '';
                    topoImg.dataFile === 5 ? big3pdW = `, /${topoImg.url}-large.webp x3` : big3pd = '';
                    topoImg.dataFile === 5 ? big2pdJ = `, /${topoImg.url}-large.jpg x2` : big2pd = '';
                    topoImg.dataFile >= 4 ? med2pdJ = `, /${topoImg.url}-medium.jpg x2` : med2pd = '';
                    topoImg.dataFile === 5 ? big3pdJ = `, /${topoImg.url}-large.jpg x3` : big3pd = '';

                    routeTopo += `
                    <source media="(min-width: 1080)" type="image/webp"
                        srcset="/${topoImg.url}-small.webp 1x ${big2pdW}">
                    <source media="(min-width: 768)" type="image/webp"
                        srcset="/${topoImg.url}-small.webp 1x ${med2pdW} ${big3pdW}">
                    <source media="(max-width: 767)" type="image/webp"
                        srcset="/${topoImg.url}-small.webp 1x  ${med2pdW}">
                        
                    <source media="(min-width: 1080)" type="image/jpg"
                        srcset="/${topoImg.url}-small.jpg 1x ${big2pdJ}">
                    <source media="(min-width: 768)" type="image/jpg"
                        srcset="/${topoImg.url}-small.jpg 1x ${med2pdJ} ${big3pdJ}">
                    <source media="(max-width: 767)" type="image/jpg"
                        srcset="/${topoImg.url}-small.jpg 1x  ${med2pdJ}">`;
                }

                routeTopo += `
                    <img src="/${topoImg.url}" alt="${topoImg.alt}" class="crag-hero" >
                </picture>`;
                if(topoImg.dataFile > 1){
                    routeTopo += `<canvas id="canvas" width="0" height="0" style="margin:auto;display:none;"></canvas>`;
                }
                routeTopo +=
            `</a>
        </div>
        <p class="credit">
            Image Credit: <a href="${topoImg.atributionURL}" target="blank">${topoImg.attributionText}</a>
        </p>`;
    return routeTopo;
}

function getMap(mapImg, latLonLocation) {
    try {
        if (mapImg.url) {
            var mapPicture = `
        <picture class="big-card-map">    
            <source
               media="(max-width: 400px)"
               srcset="/${mapImg.url}400x200x1.webp 1x, /${mapImg.url}400x200x2.webp 2x"
               type="image/webp" >
             <source
               media="(max-width: 1080px)"
               srcset="/${mapImg.url}1080x200x1.webp 1x, /${mapImg.url}1080x200x2.webp 2x"
               type="image/webp" >
             <source
               media="(min-width: 1080px)"
               srcset="/${mapImg.url}1280x200x2.webp"
               type="image/webp" >
            <source
               media="(max-width: 400px)"
               srcset="/${mapImg.url}400x200x1.png 1x, /${mapImg.url}400x200x2.png 2x"
               type="image/png" >
             <source
               media="(max-width: 1080px)"
               srcset="/${mapImg.url}1080x200x1.png 1x, /${mapImg.url}1080x200x2.png 2x"
               type="image/png" >
             <source
               media="(min-width: 1080px)"
               srcset="/${mapImg.url}1280x200x2.png"
               type="image/png" >
             <img
               src="/${mapImg.url}1080x200x1.png"
               type="image/png" class="big-card-map" 
               alt="${mapImg.alt}">
        </picture>`;
            return mapPicture;
        }
    } catch (e) {
        var urlStart = 'https://api.mapbox.com/styles/v1/mapbox/cj44mfrt20f082snokim4ungi/static/';
        var lon = latLonLocation.split(',')[1];
        var lat = latLonLocation.split(',')[0];
        var mid = ',13.0,0,0/';
        var end = '?access_token=pk.eyJ1IjoiZGFua25pIiwiYSI6ImNqbW9sdm9xYzEyaTMzcXBrazFlN2kyNm4ifQ.GOyRqbgk3G9N9CbM7FXwOw&logo=false'
        // note the pixel density of a 800 x 200 img = 800x200@2x
        var mapPicture = `
        <picture class="big-card-map">    
            <source
               media="(max-width: 400px)"
               srcset="${urlStart}${lon},${lat}${mid}400x200${end} 1x, ${urlStart}${lon},${lat}${mid}400x200@2x${end} 2x"
               type="image/jpeg" >
             <source
               media="(max-width: 1080px)"
               srcset="${urlStart}${lon},${lat}${mid}1080x200${end} 1x, ${urlStart}${lon},${lat}${mid}1080x200@2x${end} 2x"
               type="image/jpeg" >
             <source
               media="(min-width: 1080px)"
               srcset="${urlStart}${lon},${lat}${mid}1280x200${end} 1x, ${urlStart}${lon},${lat}${mid}1280x200@2x${end} 2x"
               type="image/jpeg" >
             <img
               src="${urlStart}${lon},${lat}${mid}1080x200${end}"
               type="image/jpeg" class="big-card-map" 
               alt="Climb Location">
        </picture>`;

        console.log("400x200x1 = " + `${urlStart}${lon},${lat}${mid}400x200${end}`);
        console.log("400x200x2 = " + `${urlStart}${lon},${lat}${mid}400x200@2x${end}`);
        console.log("1080x200x1 = " + `${urlStart}${lon},${lat}${mid}1080x200${end}`);
        console.log("1080x200x2 = " + `${urlStart}${lon},${lat}${mid}1080x200@2x${end}`);
        console.log("1280x200x1 = " + `${urlStart}${lon},${lat}${mid}1280x200${end}`);
        console.log("1280x200x2 = " + `${urlStart}${lon},${lat}${mid}1280x200@2x${end}`);
        return mapPicture;
    }
}

function climbCard(climb, climbImgs, guideBooks, weatherData, referanceLines) {

    var topoImg = climbImgs.find(img => img.type === 'topo');
    var mapImg = climbImgs.find(img => img.type === 'map');
    var routeTopoModule = getRouteTopo(topoImg, climb);
    var approachInfoModule = getApprochInfo(climb);
    var pitchInfoModule = getPitchInfo(climb);
    var referanceModule = getReferanceInfo(referanceLines, climb);
    var guideBookModule = getGuidebook(guideBooks, climb);
    var weatherInfoModule = getWeather(climb.id, weatherData, climb);
    var mapModule = getMap(mapImg, climb.geoLocation);

    var folderName = "".concat(climb.routeName, '-on-', climb.cliff)
            .toLowerCase()
            .replace(/'/g, "")
            .replace(/\//g, "")
            .replace(/ /g, "-");
        folderName = folderName + '/';

    if (climb.techGrade === null) {
        var techGrade = "";
    } else {
        var techGrade = climb.techGrade;
    }
    if (climb.tidal === 1){
        var tidal = `<div class="info-ring">
        <span class="single-attribute">Tidal<br/> Access</span>
        </div>`
    } else {
        var tidal = '';
    } 
    if (climb.absail === 1){
        var abReq = `<div class="info-ring">
        <span class="single-attribute">Abseil<br/> Required</span>
        </div>`
    } else {
        var abReq = '';
    }
    var fullCard = `
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
                        <h1>
                            <span class="flag big-flag ${climb.flag}"></span>
                            ${climb.cliff} - ${climb.routeName}
                        </h1>
                    </div>
                </div>
                <section class="row">
                    <div class="col">
                        <p class="smaller">
                            ${climb.intro}
                        </p>
                    </div>
                </section>
                <div class="row">
                    <div class="col-md-12 col-lg-9 info-ring-holder">
                        <div class="info-ring">
                            <span class="grade what">Grade</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.tradGrade}&nbsp;${techGrade}</span>
                        </div>        
                        <div class="info-ring">
                            <span class="grade what">Length</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.length}m</span>
                        </div>      
                        <div class="info-ring">
                            <span class="grade what">Pitches</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.pitches}</span>
                        </div>
                        <div class="info-ring">
                            <span class="grade what">Approch</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.approchTime}<small>min</small></span>
                        </div>
                        <div class="info-ring">
                            <span class="single-attribute">${climb.rock}</span>
                        </div>
                        ${tidal}
                        ${abReq}
                    </div>
                    <div class="col-lg-3 col-md-12 social-share">
                        <a  id="whatsappShare"
                            href="whatsapp://send?text=${climb.routeName} on ${climb.cliff} | https://multi-pitch.com/climbs/${folderName}"
                            target="blank"
                            onClick="ga('${gtagId}.send', 'event', 'social-share', 'whatsapp', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                            <i class="icon-whatsapp"></i></a>
                        <a
                            href="https://twitter.com/intent/tweet/?text=${climb.routeName} on ${climb.cliff}&amp;url=https://multi-pitch.com/climbs/${folderName}" 
                            target="blank"
                            onClick="ga('${gtagId}.send', 'event', 'social-share', 'twitter', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                            <i class="icon-twitter"></i></a>
                        <a
                            href="https://facebook.com/sharer/sharer.php?u=https://multi-pitch.com/climbs/${folderName}" 
                            target="blank"
                                onClick="ga('${gtagId}.send', 'event', 'social-share', 'facebook', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                            <i class="icon-facebook"></i></a>
                        <a
                            href="mailto:?subject=${climb.routeName} on ${climb.cliff}&amp;body=https://multi-pitch.com/climbs/${folderName}" 
                            target="blank"
                                onClick="ga('${gtagId}.send', 'event', 'social-share', 'email', 'ID = ${climb.id} | N = ${climb.routeName} on ${climb.cliff}', 0);">
                            <i class="icon-mail"></i></a>
                    </div>
                </div>
                <hr />  
                <section class="row">
                    <div class="col">
                        <h2>The Route Topography</h2>
                        <p>
                            This is the route <strong>${climb.routeName}</strong> on ${climb.cliff} in ${climb.county}, ${climb.country}. Clicking the image will load it full screen.
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
                </section>
                ${approachInfoModule}
                ${pitchInfoModule}
                ${guideBookModule}
                ${weatherInfoModule}
                ${referanceModule}
            </div>
        </div>
    </article>`;
    return fullCard;
}

//So then I can use this in nodejs and in the browser

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {

    module.exports = {

        climbCard

    };

}