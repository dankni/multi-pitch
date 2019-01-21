function getMap(mapUrl, latLonLocation, altText) {
    if (mapUrl != null) {
        var mapPicture = `
        <div class="img-contaner">
            <a href="https://www.google.co.uk/maps/place/${latLonLocation}" target="blank" class="card-img-anch">
                <picture class="big-card-map">    
                    <source
                       media="(max-width: 400px)"
                       srcset="/${mapUrl}400x200x1.png 1x, /${mapUrl}400x200x2.png 2x"
                       type="image/png" >
                     <source
                       media="(max-width: 1080px)"
                       srcset="/${mapUrl}1080x200x1.png 1x, /${mapUrl}1080x200x2.png 2x"
                       type="image/png" >
                     <source
                       media="(min-width: 1080px)"
                       srcset="/${mapUrl}1280x200x1.png 1x, /${mapUrl}1280x200x2.png 2x"
                       type="image/png" >                    
                    <source
                       media="(max-width: 400px)"
                       srcset="/${mapUrl}400x200x1.webp 1x, /${mapUrl}400x200x2.webp 2x"
                       type="image/webp" >
                     <source
                       media="(max-width: 1080px)"
                       srcset="/${mapUrl}1080x200x1.webp 1x, /${mapUrl}1080x200x2.webp 2x"
                       type="image/webp" >
                     <source
                       media="(min-width: 1080px)"
                       srcset="/${mapUrl}1280x200x1.webp 1x, /${mapUrl}1280x200x2.webp 2x"
                       type="image/webp" >
                     <img
                       src="/${mapUrl}1080x200x1.png"
                       type="image/png" class="big-card-map" 
                       alt="${altText}">
                </picture>
            </a>
            <span class="txt-ovr-img map-txt">Open in Google Maps</span>
        </div>`;
        return mapPicture;
    } else {
        var urlStart = 'https://api.mapbox.com/styles/v1/mapbox/cj44mfrt20f082snokim4ungi/static/';
        var lon = latLonLocation.split(',')[1];
        var lat = latLonLocation.split(',')[0];
        var mid = ',13.0,0,0/';
        var end = '?access_token=pk.eyJ1IjoiZGFua25pIiwiYSI6ImNqbW9sdm9xYzEyaTMzcXBrazFlN2kyNm4ifQ.GOyRqbgk3G9N9CbM7FXwOw&logo=false'


        /* PRINTS URL FOR SAVING NEW MAP IMAGES TO REMOVE DEPENDECY ON MAPBOX uncomment to add new climb */
        console.log("400x200x1 = " + `${urlStart}${lon},${lat}${mid}400x200${end}`);
        console.log("400x200x2 = " + `${urlStart}${lon},${lat}${mid}400x200@2x${end}`);
        console.log("1080x200x1 = " + `${urlStart}${lon},${lat}${mid}1080x200${end}`);
        console.log("1080x200x2 = " + `${urlStart}${lon},${lat}${mid}1080x200@2x${end}`);
        console.log("1280x200x1 = " + `${urlStart}${lon},${lat}${mid}1280x200${end}`);
        console.log("1280x200x2 = " + `${urlStart}${lon},${lat}${mid}1280x200@2x${end}`);

        return "see console to save images";
    }
}

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
        if (climb.approach != "") {
            var approachInfo = `
    <hr />
    <div class="row accordian">
        <div class="col">
          <input id="tab-two" type="checkbox" name="tabs" class="accordian-input">
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

function getWeather(theId, climb, weatherData, getGraph) {
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
          <input id="tab-three" type="checkbox" name="tabs" class="accordian-input">
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

function climbCard(rootProject, climb, mapUrl, cragImg, topoImg, guideBooks, weatherData, getGraphFunction) {

    var routeTopoModule = getRouteTopo(topoImg);

    var cragImgModule = getCragImg(cragImg);

    var approachInfoModule = getApprochInfo(climb);

    var guideBookModule = getGuidebook(guideBooks, climb);

    var weatherInfoModule = getWeather(climb.id, climb, weatherData, getGraphFunction);

    var mapModule = getMap(mapUrl.url, climb.geoLocation, mapUrl.alt);

    if (climb.techGrade === null) {
        var techGrade = "";
    } else {
        var techGrade = climb.techGrade;
    }

    var fullCard = `
   <div class="card big-card">
    <div class="card-body" style="padding:0;">
      ${mapModule}
      <div class="big-card-body">
        <h4>
          <span class="flag ${climb.flag}"></span>
          ${climb.cliff} - ${climb.routeName}
        </h4>
        <p class="smaller">
          ${climb.intro}
        </p>
        <div class="row">
          <div class="col">
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
        ${approachInfoModule}
        ${guideBookModule}
        ${weatherInfoModule}
      </div>
    </div>
  </div>`;
    return fullCard;
}

//So then I can use this in nodejs and in the browser

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {

    module.exports = {

        climbCard

    };

}