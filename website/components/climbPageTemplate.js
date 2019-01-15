function getGuidebook(rootProject, guideBook, climb) {
    try {
        if (guideBook.title != "") {
            var guideBookModule = `
    <hr />
    <div class="row accordian">
      <div class="col">
        <input id="tab-one" type="checkbox" name="tabs" class="accordian-input" checked="checked">
        <label for="tab-one" class="accordian-label" onclick="gtag('event', 'toggle-guidebook', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value':0});">Guidebooks</label>
        <div class="smaller accordian-content">
          <div>
            <img class="guidebook-img" src="${rootProject}${guideBook.imgURL}" alt="${guideBook.title}" /> 
            <p>
              <strong>${guideBook.title}</strong> - pg. ${guideBook.pg} <br />
              ${guideBook.description}
              <br />
              <a href="${guideBook.link}" onClick="gtag('event', 'guidebook-link', {'event_category':'climb-detail', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': ${guideBook.rrp}});" target="blank">Availible Here</a>
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
          <input id="tab-three" type="checkbox" name="tabs" class="accordian-input" checked="checked">
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

function climbCard(rootProject, climb, mapImg, cragImg, topoImg, guideBook, weatherData, getGraphFunction) {

    var routeTopoModule = getRouteTopo(rootProject, topoImg);

    var cragImgModule = getCragImg(rootProject, cragImg);

    var approachInfoModule = getApprochInfo(rootProject, climb);

    var guideBookModule = getGuidebook(rootProject, guideBook, climb);

    var weatherInfoModule = getWeather(climb.id, climb, weatherData, getGraphFunction);

    var mapModule = getMap(mapImg, climb.geoLocation);

    if (climb.techGrade === null) {
        var techGrade = "";
    } else {
        var techGrade = climb.techGrade;
    }

    var fullCard = `
    <main id="main" class="main">
        <div style="width:100%;max-height:300px;">
            <a href="https://www.google.co.uk/maps/place/${climb.geoLocation}" target="blank" class="card-img-anch">
                ${mapModule}
            </a>
        </div> 
        <div class="container full-screen-container">
            <div class="map-card-body">
                <div class="big-card-body pull-onto-map">
                <div class="row">
                        <div class="col-sm">
                          <h4>
                            <span class="flag ${climb.flag}"></span>
                             ${climb.cliff} - ${climb.routeName}
                         </h4>
                            
   
                        </div>    
                        <div class="col-sm">
                            <div class="row">
                                <div class="col">
                                    <div style="text-decoration:none">
                                        SHARE: 
                                        <a
                                            href="whatsapp://send?text=${climb.routeName} on ${climb.cliff} | https://multi-pitch.com/climbs/${climb.folderLocation}"
                                            target="blank"
                                            onClick="gtag('event', 'social-share', {'event_category':'whatsapp', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                                            <i class="icon-whatsapp" style="font-size:24px;color:#25d366;text-decoration:none"></i>
                                        </a>
                                        <a
                                            href="https://twitter.com/intent/tweet/?text=${climb.routeName} on ${climb.cliff}&amp;url=https://multi-pitch.com/climbs/${climb.folderLocation}" 
                                            target="blank"
                                            onClick="gtag('event', 'social-share', {'event_category':'twitter', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                                            <i class="icon-twitter" style="font-size:24px;color:#1da1f3;"></i>
                                        </a>
                                        <a
                                            href="https://facebook.com/sharer/sharer.php?u=https://multi-pitch.com/climbs/${climb.folderLocation}" 
                                            target="blank"
                                             onClick="gtag('event', 'social-share', {'event_category':'facebook', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                                            <i class="icon-facebook" style="font-size:24px;color:#3b5998;"></i>
                                        </a>
                                        <a
                                            href="mailto:?subject=${climb.routeName} on ${climb.cliff}&amp;body=https://multi-pitch.com/climbs/${climb.folderLocation}" 
                                            target="blank"
                                             onClick="gtag('event', 'social-share', {'event_category':'email', 'event_label':'${climb.routeName} on ${climb.cliff}', 'value': 0});">
                                            <i class="icon-mail" style="font-size:24px;color:#111;"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    
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