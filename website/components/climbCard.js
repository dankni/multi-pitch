function getGuidebook(guideBooks, climb) {
    try {
        var guideBookModule = `
    <hr />
    <div class="row accordian">
      <div class="col">
        <input id="tab-one" type="checkbox" name="tabs" class="accordian-input">
        <label for="tab-one" class="accordian-label" onclick="gtag('event', 'toggle-guidebook', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':0});">Guidebooks</label>
        <div class="smaller accordian-content">`;
        for (var i = 0; i < guideBooks.length; i++) {
            guideBookModule += `
                <div>
                <img style="max-width:120px;float:left;padding-right:1rem;" src="/${guideBooks[i].imgURL}" alt="${guideBooks[i].title}" /> 
                <p>
                    <strong>${guideBooks[i].title}</strong> - pg. ${guideBooks[i].pg} <br />
                    ${guideBooks[i].description}
                    <br />
                    <a href="${guideBooks[i].link}" onClick="gtag('event', 'guidebook-link', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':${guideBooks[i].rrp}});" target="blank">Availible Here</a>
                    R.R.P. <strong>£ ${guideBooks[i].rrp}</strong><br />
                    <small>ISBN: ${guideBooks[i].isbn} </small>
                </p>
                </div>`;
        }
        guideBookModule += `
        </div>
      </div>
    </div>`;
    } catch (e) {
        guideBookModule = '';
    }
    return guideBookModule;
}

function getApprochInfo(climb) {
    try {
        if (climb.approach != '') {
            var approachInfo = `
    <hr />
    <div class="row accordian">
        <div class="col">
          <input id="tab-two" type="checkbox" name="tabs" class="accordian-input" >
          <label for="tab-two" class="accordian-label" onclick="gtag('event', 'toggle-approach', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':0});">Approach & Descent Infomation</label>
          <div class="smaller accordian-content">
            <div>
              <p>${climb.approach}</p>
            </div>
          </div>
        </div>
      </div>`;
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
    <div class="row accordian">
        <div class="col">
          <input id="tab-four" type="checkbox" name="tabs" class="accordian-input" >
          <label for="tab-four" class="accordian-label" onclick="gtag('event', 'toggle-pitches', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':0});">Pitch By Pitch Information</label>
          <div class="smaller accordian-content">
            <div>
              <p>${climb.pitchInfo}</p>
            </div>
          </div>
        </div>
      </div>`;
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
        <div class="row accordian">
            <div class="col">
                <input id="tab-five" type="checkbox" name="tabs" class="accordian-input" >
                <label for="tab-five" class="accordian-label" onclick="gtag('event', 'toggle-referances', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':0});">Referances &amp; additional links</label>
                <div class="smaller accordian-content">
                    <div><p>The following links will take you to external websites related specifically to this climb.
                       They contined relavant infomation at the time of publishing.<br />`;
                    for (let i = 0; i < referanceLines.length; i++) {
                        refInfo += `<a href="${referanceLines[i].url}" target="blank">${referanceLines[i].text} <i class="icon-link-ext"></i></a><br />`;
                    }
                    refInfo += `
                    </p></div>
                </div>
            </div>
        </div>`;
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
        var weather = weatherData.weatherLines.filter(w => w.climbId === climbId);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (type === "temperature") {
            var high = weather.find(h => h.type === 'tempH');
            var chartClass = "temp";
        } else {
            var high = weather.find(h => h.type === 'rainyDays');
            var chartClass = "rain";
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
	    <span style="height:${highTemp}%" title="${months[i]}"></span>`;
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

function getWeather(theId, climb, weatherData) {
    try {
        var temperature = getGraph("temperature", theId, weatherData);
        if (temperature == '') {
            return '';
        }
        var rain = getGraph("rain", theId, weatherData);
        var weatherInfo = `
      <hr />
      <div class="row accordian">
        <div class="col">
          <input id="tab-three" type="checkbox" name="tabs" class="accordian-input" >
          <label for="tab-three" class="accordian-label" onclick="gtag('event', 'toggle-weather', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':0});">Seasonal Weather Infomation</label>
          <div class="smaller accordian-content">
            <div>
              <p>
		            NOTE: <em>The weather data is based off the closest weather station we could find to the crag. 
	              This could be quite far away and at a darmatically different elevation. 
		  	        This means it could be considerably colder or wetter on some mountain climbs.</em>
	            </p>
	            <p>
			          Below shows the estimated average number of rainy days in the month that had more than 1mm rainfall:
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
          </div>
        </div>
      </div>`;
        return weatherInfo;
    } catch (e) {
        weatherInfo = '';
        console.log("weather error for: " + theId);
        return weatherInfo;
    }

}

function getRouteTopo(topoImg) {
    try {
        var routeTopo = `
      <div class="img-contaner">
        <a href="/${topoImg.url}" target="blank" class="card-img-anch">
        <img src="/${topoImg.url.replace(".jpg", "-s.jpg")}" alt="${topoImg.alt}" class="crag-hero" >
          <span class="txt-ovr-img">View Route Topo</span>
        </a>
        <p class="credit">
          <a href="${topoImg.atributionURL}" target="blank">${topoImg.attributionText}</a>
        </p>
    </div>`;
    } catch (e) {
        var routeTopo = '';
    }
    return routeTopo;
}

function getCragImg(cragImg) {
    try {
        var cragImgModule = `
    <div class="img-contaner">
      <a href="/${cragImg.url}" target="blank" class="card-img-anch">
     <img src="/${cragImg.url.replace(".jpg", "-s.jpg")}" alt="${cragImg.alt}" class="crag-hero" >
        <span class="txt-ovr-img">View Crag Photo</span>
      </a>
      <p class="credit">
        <a href="${cragImg.atributionURL}" target="blank">${cragImg.attributionText}</a>
      </p>
    </div>`;
    } catch (e) {
        cragImgModule = '';
    }

    return cragImgModule;
}

function getZoomModule(zoomImg, climb) {
    if (typeof zoomImg !== 'undefined') {
        try {
            var zoomImgModule = `
        <div class="row">
            <div class="col-sm-8">
                <p>Detailed Crag Image With Deep Zoom</p>
                <p class="smaller">
                    The climb ${climb.routeName} has a zoomable image of ${climb.cliff} 
                    taken by multi-pitch.com. It can be used for those who want to understand
                    the crag in more detail.
                </p>
            </div>
            <div class="col-sm-4">
                <a class="open-tile" href="/crag-zoom/?climb=${climb.id}" target="blank" 
                    style="width:100%;margin-top:35px;">
                    Open ${climb.cliff} super zoom
                </a>
            </div>
        </div>`;
        } catch (e) {
            zoomImgModule = '';
        }
    } else {
        zoomImgModule = '';
    }
    return zoomImgModule;
}

function getMap(mapImg, latLonLocation) {
    try {
        if (mapImg.url != null) {
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
               alt="${mapImg.altText}">
        </picture>`;
            return mapPicture;
        }
    } catch (e) {
        var urlStart = 'https://api.mapbox.com/styles/v1/mapbox/cj44mfrt20f082snokim4ungi/static/';
        var lon = latLonLocation.split(',')[1];
        var lat = latLonLocation.split(',')[0];
        var mid = ',13.0,0,0/';
        var defaultSize = '800x200@2x'; // note the pixel density 
        var end = '?access_token=pk.eyJ1IjoiZGFua25pIiwiYSI6ImNqbW9sdm9xYzEyaTMzcXBrazFlN2kyNm4ifQ.GOyRqbgk3G9N9CbM7FXwOw&logo=false'

        // add webP below eg three lots of: <source media = "(max-width: 400px)" srcset = "image-lg_1x.webp 1x, image-lg_2x.webp 2x" type = "image/webp" >

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

    var cragImg = climbImgs.find(img => img.type === 'crag');
    var topoImg = climbImgs.find(img => img.type === 'topo');
    var mapImg = climbImgs.find(img => img.type === 'map');
    var zoomImg = climbImgs.find(img => img.type === 'super');

    var routeTopoModule = getRouteTopo(topoImg);
    var cragImgModule = getCragImg(cragImg);
    var zoomModule = getZoomModule(zoomImg, climb);
    var approachInfoModule = getApprochInfo(climb);
    var pitchInfoModule = getPitchInfo(climb);
    var referanceModule = getReferanceInfo(referanceLines, climb);
    var guideBookModule = getGuidebook(guideBooks, climb);
    var weatherInfoModule = getWeather(climb.id, climb, weatherData);
    var mapModule = getMap(mapImg, climb.geoLocation);

    if (climb.techGrade === null) {
        var techGrade = "";
    } else {
        var techGrade = climb.techGrade;
    }

    var fullCard = `
    <main id="climbCardDetails" class="main">
        <div style="width:100%;max-height:300px;">
            <a href="https://www.google.co.uk/maps/place/${climb.geoLocation}" target="blank" class="card-img-anch">
                ${mapModule}
            </a>
        </div> 
        <div class="container">
            <div class="map-card-body">
                <div class="big-card-body pull-onto-map">
                <div class="row">
                    <div class="col-sm">
                        <h4>
                            <span class="flag ${climb.flag}"></span>
                            ${climb.cliff} - ${climb.routeName}
                        </h4>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                            <p class="smaller">
                            ${climb.intro}
                        </p>
                    </div>
                </div>
                <div class="row">
                    <div class="col-sm">
                        <div class="info-ring">
                            <span class="grade what">grade</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.tradGrade}&nbsp;${techGrade}</span>
                        </div>        
                        <div class="info-ring">
                            <span class="grade what">length</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.length}m</span>
                        </div>      
                        <div class="info-ring">
                            <span class="grade what">pitches</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.pitches}</span>
                        </div>
                        <div class="info-ring">
                            <span class="grade what">approch</span>
                            <span class="info-divider"></span>
                            <span class="grade amount">${climb.approchTime}<small>min</small></span>
                        </div>
                    </div>
                    <div class="col-sm social-share">
                        <a
                            href="whatsapp://send?text=${climb.routeName} on ${climb.cliff} | https://multi-pitch.com/climbs/${climb.folderLocation}"
                            target="blank"
                            onClick="gtag('event', 'social-share', {'event_category':'whatsapp', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                            <i class="icon-whatsapp" style="color:#25d366;"></i></a>
                        <a
                            href="https://twitter.com/intent/tweet/?text=${climb.routeName} on ${climb.cliff}&amp;url=https://multi-pitch.com/climbs/${climb.folderLocation}" 
                            target="blank"
                            onClick="gtag('event', 'social-share', {'event_category':'twitter', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                            <i class="icon-twitter" style="color:#1da1f3;"></i></a>
                        <a
                            href="https://facebook.com/sharer/sharer.php?u=https://multi-pitch.com/climbs/${climb.folderLocation}" 
                            target="blank"
                                onClick="gtag('event', 'social-share', {'event_category':'facebook', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                            <i class="icon-facebook" style="color:#3b5998;"></i></a>
                        <a
                            href="mailto:?subject=${climb.routeName} on ${climb.cliff}&amp;body=https://multi-pitch.com/climbs/${climb.folderLocation}" 
                            target="blank"
                                onClick="gtag('event', 'social-share', {'event_category':'email', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                            <i class="icon-mail" style="color:#111;"></i></a>
                    </div>
                </div>
                <hr />  
                <div class="row">
                    <div class="col-sm">
                        <p>Crag Image</p>
                        ${cragImgModule}
                    </div>    
                    <div class="col-sm">
                        <p>The Route Topography</p>
                        ${routeTopoModule}
                    </div>
                </div>
                ${zoomModule}
                ${approachInfoModule}
                ${guideBookModule}
                ${pitchInfoModule}
                ${weatherInfoModule}
                ${referanceModule}
            </div>
        </div>
    </main>`;
    return fullCard;
}

//So then I can use this in nodejs and in the browser

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {

    module.exports = {

        climbCard

    };

}