function getGuidebook(rootProject, guideBook, climb) {
    try {
        if (guideBook.title != "") {
            var guideBookModule = `
    <hr />
    <div class="row accordian">
      <div class="col">
        <input id="tab-one" type="checkbox" name="tabs" class="accordian-input" checked="checked">
        <label for="tab-one" class="accordian-label" onclick="gtag('event', 'toggle-guidebook', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':${climb.id}});">Guidebooks</label>
        <div class="smaller accordian-content">
          <div>
            <img style="max-width:120px;float:left;padding-right:1rem;" src="${rootProject}${guideBook.imgURL}" alt="${guideBook.title}" /> 
            <p>
              <strong>${guideBook.title}</strong> - pg. ${guideBook.pg} <br />
              ${guideBook.description}
              <br />
              <a href="${guideBook.link}" onClick="gtag('event', 'guidebook-link', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':${climb.id}});" target="blank">Availible Here</a>
              R.R.P. <strong>£ ${guideBook.rrp}</strong><br />
              <small>ISBN: ${guideBook.isbn} </small>
            </p>
          </div>
        </div>
      </div>
    </div>`;
        } else {
            var guideBookModule = '';
        }
    } catch (e) {
        guideBookModule = '';
    }
    return guideBookModule;
}

function getApprochInfo(rootProject, climb) {
    try {
        if (climb.approach != "") {
            var approachInfo = `
    <hr />
    <div class="row accordian">
        <div class="col">
          <input id="tab-two" type="checkbox" name="tabs" class="accordian-input" checked="checked">
          <label for="tab-two" class="accordian-label" onclick="gtag('event', 'toggle-approach', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':${climb.id}});">Approach & Descent Infomation</label>
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
          <input id="tab-three" type="checkbox" name="tabs" class="accordian-input" checked="checked">
          <label for="tab-three" class="accordian-label" onclick="gtag('event', 'toggle-weather', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':${climb.id}});">Seasonal Weather Infomation</label>
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

function getRouteTopo(rootProject, topoImg) {
    try {
        var routeTopo = `
      <div class="img-contaner">
        <a href="${rootProject}${topoImg.url}" target="blank" class="card-img-anch">
        <img src="${rootProject}${topoImg.url.replace(".jpg", "-s.jpg")}" alt="${topoImg.alt}" class="crag-hero" >
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

function getCragImg(rootProject, cragImg) {
    try {
        var cragImgModule = `
    <div class="img-contaner">
      <a href="${rootProject}${cragImg.url}" target="blank" class="card-img-anch">
     <img src="${rootProject}${cragImg.url.replace(".jpg", "-s.jpg")}" alt="${cragImg.alt}" class="crag-hero" >
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

function getMapUrl(climb) {
// ToDo: cache image then add logic so if there is a saved map image use it - otherwise generate the map from Google API
    mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${climb.geoLocation}&zoom=12&size=800x180&maptype=terrain&scale=2&key=AIzaSyBbmuRJliCb7a1QIKV-PTKmcSsahj20lwM`;
    return mapUrl;
}

function climbCard(rootProject, climb, mapImg, cragImg, topoImg, guideBook, weatherData, getGraphFunction) {

    var routeTopoModule = getRouteTopo(rootProject, topoImg);

    var cragImgModule = getCragImg(rootProject, cragImg);

    var approachInfoModule = getApprochInfo(rootProject, climb);

    var guideBookModule = getGuidebook(rootProject, guideBook, climb);

    var weatherInfoModule = getWeather(climb.id, climb, weatherData, getGraphFunction);

    var mapUrl = getMapUrl(climb);

    var fullCard = `
    <main id="main" style="margin-top:56px">
        <div style="width:100%;max-height:300px;">
            <a href="https://www.google.co.uk/maps/place/${climb.geoLocation}" target="blank" class="card-img-anch">
                <img class="big-card-map" style="width:100%;max-height:180px;" src="${mapUrl}" alt="${climb.cliff} location" />
            </a>
        </div> 
        <div class="container">
            <div class="card-body" style="padding:0;">
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
                                <span class="grade amount">${climb.tradGrade}&nbsp;${climb.techGrade}</span>
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