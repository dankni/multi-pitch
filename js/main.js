/** 
  GLOBAL VARIABLES 
**/
const root = "/"; // adjust per enviroment
var start = document.URL;
var history_data = {"Start": start}; // push state
var isCardTurned = start.includes('?overview');


/**
  THE SLIDER FUNCTION FOR FILTERS 
**/
(function() {
"use strict";

var supportsMultiple = self.HTMLInputElement && "valueLow" in HTMLInputElement.prototype;

var descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

self.multirange = function(input) {
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
    get: function() { return this.value; },
    set: function(v) { this.value = v; }
  });

  Object.defineProperties(input, {
    valueLow: {
      get: function() { return Math.min(this.originalValue, ghost.value); },
      set: function(v) { this.originalValue = v; },
      enumerable: true
    },
    valueHigh: {
      get: function() { return Math.max(this.originalValue, ghost.value); },
      set: function(v) { ghost.value = v; },
      enumerable: true
    }
  });

  if (descriptor.get) {
    Object.defineProperty(input, "value", {
      get: function() { return this.valueLow + "," + this.valueHigh; },
      set: function(v) {
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
}

multirange.init = function() {
  [].slice.call(document.querySelectorAll("input[type=range][multiple]:not(.multirange)")).forEach(multirange);
}

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", multirange.init);
}
else {
  multirange.init();
}

})();

/**
  SHOW THE CURRENT VALUE OF THE SLIDERS
**/
function showVal(values, field){
  
  var lowerValue = values.split(',')[0];
  var higherValue = values.split(',')[1];
  
  if (field == 'grade'){
    const gradeMappings = { 1: 'Diff', 2: 'VDiff', 3: 'HVD', 4: 'Sev', 5: 'HS', 6: 'VS', 7: 'HVS' };
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
    ){
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
if( typeof helper == 'undefined' ) {
  var helper = { } ;
}

helper.arr = {

    // param {array} [arr] Source array
    // param {array} [columns] List of columns to sort
    // param {array} [order_by] List of directions (ASC, DESC)
    // returns {array}

    multisort: function(arr, columns, order_by) {
        if(typeof columns == 'undefined') {
            columns = []
            for(x=0;x<arr[0].length;x++) {
                columns.push(x);
            }
        }
        if(typeof order_by == 'undefined') {
            order_by = []
            for(x=0;x<arr[0].length;x++) {
                order_by.push('ASC');
            }
        }
        function multisort_recursive(a,b,columns,order_by,index) {  
            var direction = order_by[index] == 'DESC' ? 1 : 0;

            var is_numeric = !isNaN(a[columns[index]]-b[columns[index]]);

            var x = is_numeric ? a[columns[index]] : a[columns[index]].toLowerCase();
            var y = is_numeric ? b[columns[index]] : b[columns[index]].toLowerCase();

            if(!is_numeric) {
                x = helper.string.to_ascii(a[columns[index]].toLowerCase(),-1),
                y = helper.string.to_ascii(b[columns[index]].toLowerCase(),-1);
            }
            if(x < y) {
                    return direction == 0 ? -1 : 1;
            }
            if(x == y)  {
                return columns.length-1 > index ? multisort_recursive(a,b,columns,order_by,index+1) : 0;
            }
            return direction == 0 ? 1 : -1;
        }
        return arr.sort(function (a,b) {
            return multisort_recursive(a,b,columns,order_by,0);
        });
    }
}

/**
  PUBLISH THE FRONT OF THE CARDS
**/
function publishCards(climbsArr){
  for (let i = 0; i < climbsArr.length; i++) {
   if(climbsArr[i].status === 'publish'){
    var cImgs = climbImgs.imgs.filter(img => img.climbId === climbsArr[i].id); // get all the imgs for the climb
      var tileImg = cImgs.find(img => img.type === 'tile'); // get the map img object 

      var card = `
    <div data-grade="${climbsArr[i].dataGrade}" data-height="${climbsArr[i].length}" id="${climbsArr[i].id}" data-approch="${climbsArr[i].approchTime}" class="card">
      <img src="${tileImg.url}" alt="${tileImg.alt}" class="crag-hero">
      <div class="card-body">
      <h4>
      <span class="flag ${climbsArr[i].flag}"></span>
      ${climbsArr[i].cliff}
      </h4>
      <p class="card-text">
      <span class="what">Target Route:</span> ${climbsArr[i].routeName} <br />
        <span class="what">Grade:</span> ${climbsArr[i].tradGrade} ${climbsArr[i].techGrade} <br />
      <span class="what">Location:</span> <a href="https://www.google.co.uk/maps/place/${climbsArr[i].geoLocation}" target="blank">${climbsArr[i].county}</a> <br />
      <span class="what">Length:</span> ${climbsArr[i].length}m - ${climbsArr[i].pitches} pitches <br />
      <span class="what">Approach:</span> ${climbsArr[i].approchTime}min - <span class="approach-${climbsArr[i].approchDifficulty}"></span> <br />
      </p>
      </div>
      <a class="open-tile" onclick="showTile(${climbsArr[i].id});">SHOW MORE INFO</a>
    </div>`;
    
      cardHolder.innerHTML += card; 
    }
  }
}

/** 
  REMOVES ALL THE CARDS THEN SORTS THE ARRAY AND PUBLISHES IT
**/
function sortCards(sortBy, direction){
  var c = document.getElementsByClassName("card");
  while (c.length > 0) c[0].remove();
  var climbsSorted = helper.arr.multisort(climbsData.climbs, [sortBy, 'dataGrade'], [direction,'ASC']);
  publishCards(climbsSorted);
}

/** 
  SHOW FULL CLIMB INFO - IE LOAD THE BACK OF THE CARD
**/
function showTile(theId){
  var climb = climbsData.climbs.find(c => c.id === theId); // get the climb object by id
  var cImgs = climbImgs.imgs.filter(img => img.climbId === theId);  //note find returns first vs fillter returns all.
  var mapImg = cImgs.find(img => img.type === 'map'); // get the map img object 
  var cragImg = cImgs.find(img => img.type === 'crag'); 
  var topoImg = cImgs.find(img => img.type === 'topo'); 
  var guideBook = guideBooks.books.find(book => book.climbId === theId); // ToDo: update to filter then allow multiple to show
  var weather = weatherData.weatherLines.filter(w => w.climbId === theId);
  var rain = weather.find(r => r.type === 'rainyDays');
  var tempH = weather.find(h => h.type === 'tempH');
  var tempL = weather.find(l => l.type === 'tempL');

  // a check to see if the user has landed on a page from a direct link
  if(isCardTurned != true){
    var url =  '?overview=' + `${climb.id}`.toLowerCase();
    url = url.replace(' ', '-');
    window.history.pushState(history_data, climb.cliff, url);
  }
  
  document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);");
  document.getElementById('close').setAttribute("style", "display:block;");
  document.getElementById('bdy').setAttribute("style", "overflow:hidden");

  // If there is a saved map image use it - otherwise generate the map from Google API
  try{
      var mapUrl = root + mapImg.url;
  } catch {
      var mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${climb.geoLocation}&zoom=13&size=800x180&maptype=terrain&scale=2&markers=icon:|${climb.geoLocation}&key=AIzaSyBbmuRJliCb7a1QIKV-PTKmcSsahj20lwM`;
  }
  
  try {
    var routeTopo = `
      <div class="img-contaner">
        <a href="${root}${topoImg.url}" target="blank" class="card-img-anch">
        <img src="${root}${topoImg.url.replace(".jpg", "-s.jpg")}" alt="${topoImg.alt}" class="crag-hero" >
          <span class="txt-ovr-img">View Route Topo</span>
        </a>
        <p class="credit">
          <a href="${topoImg.atributionURL}" target="blank">${topoImg.attributionText}</a>
        </p>
    </div>`;
  } catch {
    var routeTopo = '';
  }
  
  try {
     var cragImg = `
    <div class="img-contaner">
      <a href="${root}${cragImg.url}" target="blank" class="card-img-anch">
     <img src="${root}${cragImg.url.replace(".jpg", "-s.jpg")}" alt="${cragImg.alt}" class="crag-hero" >
        <span class="txt-ovr-img">View Crag Photo</span>
      </a>
      <p class="credit">
        <a href="${cragImg.atributionURL}" target="blank">${cragImg.attributionText}</a>
      </p>
    </div>`;
  } catch {
    var cragImg = '';
  }

  try {
    if(guideBook.title != ""){
      var guideBookModule = `
    <hr />
    <div class="row accordian">
      <div class="col">
        <input id="tab-one" type="checkbox" name="tabs" class="accordian-input">
        <label for="tab-one" class="accordian-label">Guidebooks</label>
        <div class="smaller accordian-content">
          <div>
            <img style="max-width:120px;float:left;padding-right:1rem;" src="${guideBook.imgURL}" alt="${guideBook.title}" /> 
            <p>
              <strong>${guideBook.title}</strong> - pg. ${guideBook.pg} <br />
              ${guideBook.description}
              <br />
              <a href="${guideBook.link}" target="blank">Availible Here</a>
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
  } catch {
    var guideBookModule = '';
  }
  
  try{
  if(climb.approach != ""){
      var approachInfo = `
    <hr />
    <div class="row accordian">
        <div class="col">
          <input id="tab-two" type="checkbox" name="tabs" class="accordian-input">
          <label for="tab-two" class="accordian-label">Approach & Descent Infomation</label>
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
  } catch {
    var approachInfo = '';
    var approachInfo = '';
  }  
  var tempInfo = '';
    /** TODO: Refactor into on graph generator function **/
  try {
    if(tempH.Jan != ""){
      var janO = tempL.Jan/40*100; var janH = (tempH.Jan - tempL.Jan) /40*100;
      var febO = tempL.Feb/40*100; var febH = (tempH.Feb - tempL.Feb) /40*100;
      var marO = tempL.Mar/40*100; var marH = (tempH.Mar - tempL.Mar) /40*100;
      var aprO = tempL.Apr/40*100; var aprH = (tempH.Apr - tempL.Apr) /40*100;
      var mayO = tempL.May/40*100; var mayH = (tempH.May - tempL.May) /40*100;
      var junO = tempL.Jun/40*100; var junH = (tempH.Jun - tempL.Jun) /40*100;
      var julO = tempL.Jul/40*100; var julH = (tempH.Jul - tempL.Jul) /40*100;
      var augO = tempL.Aug/40*100; var augH = (tempH.Aug - tempL.Aug) /40*100;
      var sepO = tempL.Sep/40*100; var sepH = (tempH.Sep - tempL.Sep) /40*100;
      var octO = tempL.Oct/40*100; var octH = (tempH.Oct - tempL.Oct) /40*100;
      var novO = tempL.Nov/40*100; var novH = (tempH.Nov - tempL.Nov) /40*100;
      var decO = tempL.Dec/40*100; var decH = (tempH.Dec - tempL.Dec) /40*100;
	
      tempInfo = `
	  <p>
	    Estimated average high and low temperature in degrees celsiusfor the given month:
	  </p>
	  <ul class="chart temp">
	    <li>${tempH.Jan}<span style="height:${janH}%" title="Jan"></span><span style="height:${janO}%;background-color:rgba(0,0,0,0);">${tempL.Jan}</span></li>
	    <li>${tempH.Feb}<span style="height:${febH}%" title="Feb"></span><span style="height:${febO}%;background-color:rgba(0,0,0,0);">${tempL.Feb}</span></li>
	    <li>${tempH.Mar}<span style="height:${marH}%" title="Mar"></span><span style="height:${marO}%;background-color:rgba(0,0,0,0);">${tempL.Mar}</span></li>
	    <li>${tempH.Apr}<span style="height:${aprH}%" title="Apr"></span><span style="height:${aprO}%;background-color:rgba(0,0,0,0);">${tempL.Apr}</span></li>
	    <li>${tempH.May}<span style="height:${mayH}%" title="May"></span><span style="height:${mayO}%;background-color:rgba(0,0,0,0);">${tempL.May}</span></li>
	    <li>${tempH.Jun}<span style="height:${junH}%" title="Jun"></span><span style="height:${junO}%;background-color:rgba(0,0,0,0);">${tempL.Jun}</span></li>
	    <li>${tempH.Jul}<span style="height:${julH}%" title="Jul"></span><span style="height:${julO}%;background-color:rgba(0,0,0,0);">${tempL.Jul}</span></li>
	    <li>${tempH.Aug}<span style="height:${augH}%" title="Aug"></span><span style="height:${augO}%;background-color:rgba(0,0,0,0);">${tempL.Aug}</span></li>
	    <li>${tempH.Sep}<span style="height:${sepH}%" title="Sep"></span><span style="height:${sepO}%;background-color:rgba(0,0,0,0);">${tempL.Sep}</span></li>
	    <li>${tempH.Oct}<span style="height:${octH}%" title="Oct"></span><span style="height:${octO}%;background-color:rgba(0,0,0,0);">${tempL.Oct}</span></li>
	    <li>${tempH.Nov}<span style="height:${novH}%" title="Nov"></span><span style="height:${novO}%;background-color:rgba(0,0,0,0);">${tempL.Nov}</span></li>
	    <li>${tempH.Dec}<span style="height:${decH}%" title="Dec"></span><span style="height:${decO}%;background-color:rgba(0,0,0,0);">${tempL.Dec}</span></li>
	  </ul>`;
    } else {
      tempInfo = '';
    }  
  } catch {
    tempInfo = '';
  } 
  
  try {
    if(rain.Jan != ""){
      var janR = rain.Jan/20*100;
      var febR = rain.Feb/20*100;
      var marR = rain.Mar/20*100;
      var aprR = rain.Apr/20*100;
      var mayR = rain.May/20*100;
      var junR = rain.Jun/20*100;
      var julR = rain.Jul/20*100;
      var augR = rain.Aug/20*100;
      var sepR = rain.Sep/20*100;
      var octR = rain.Oct/20*100;
      var novR = rain.Nov/20*100;
      var decR = rain.Dec/20*100;
      var weatherInfo = `
    <hr />
    <div class="row accordian">
      <div class="col">
        <input id="tab-three" type="checkbox" name="tabs" class="accordian-input">
        <label for="tab-three" class="accordian-label">Seasonal Weather Infomation</label>
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
            <ul class="chart">
              <li>${rain.Jan}<span style="height:${janR}%" title="Jan"></span></li>
              <li>${rain.Feb}<span style="height:${febR}%" title="Feb"></span></li>
              <li>${rain.Mar}<span style="height:${marR}%" title="Mar"></span></li>
              <li>${rain.Apr}<span style="height:${aprR}%" title="Apr"></span></li>
              <li>${rain.May}<span style="height:${mayR}%" title="May"></span></li>
              <li>${rain.Jun}<span style="height:${junR}%" title="Jun"></span></li>
              <li>${rain.Jul}<span style="height:${julR}%" title="Jul"></span></li>
              <li>${rain.Aug}<span style="height:${augR}%" title="Aug"></span></li>
              <li>${rain.Sep}<span style="height:${sepR}%" title="Sep"></span></li>
              <li>${rain.Oct}<span style="height:${octR}%" title="Oct"></span></li>
              <li>${rain.Nov}<span style="height:${novR}%" title="Nov"></span></li>
              <li>${rain.Dec}<span style="height:${decR}%" title="Dec"></span></li>
            </ul>
			<br />
			${tempInfo}
          </div>
        </div>
      </div>
    </div>`;
  } else {
      var weatherInfo = '';
	  console.log(1);
    }  
  } catch {
    var weatherInfo = '';
    console.log(2);
  }   
 
  var fullCard = `
   <div class="card big-card">
    <div class="card-body" style="padding:0;">
      <div class="img-contaner">
        <a href="https://www.google.co.uk/maps/place/${climb.geoLocation}" target="blank" class="card-img-anch">
          <img class="big-card-map" src="${mapUrl}" alt="${climb.cliff} location"/>
        </a>
        <span class="txt-ovr-img map-txt">Open in Google Maps</span>
      </div>
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
            ${cragImg}
          </div>    
          <div class="col-sm">
            <p>The Route Topography</p>
            ${routeTopo}
         </div>
        </div>
        ${approachInfo}
        ${guideBookModule}
        ${weatherInfo}
      </div>
    </div>
  </div>`;
  document.getElementById('overlay').innerHTML = fullCard; 
  document.title = climb.cliff + " - " + climb.routeName;
}

/**
  CLOASE THE CLIMB OVERVIEW - IE CLOSE THE BACK OF THE CARD
**/
function hideTile(){
  history.replaceState(start, 'The best multi-pitch climbs', root);
  isCardTurned = false; // ensure future clicks don't think its first load again
  document.getElementById('close').setAttribute("style", "display:none;");
  document.getElementById('overlay').setAttribute("style", "display:none;background:rgba(0,0,0, 0.0);");
  document.getElementById('bdy').setAttribute("style", "");
  document.title = "The best multi-pitch rock climbs";
}

// need to handel history.onPopstate ie. user presses back
window.onpopstate = function(event) {
  hideTile();
}

window.onload = function() {
  // Sorts and publishes the cards
  sortCards('length', 'DESC');
  if(isCardTurned === true){
    var overview = start.split('=');
    var cardToLoad = overview[1];
    showTile(parseInt(cardToLoad));
  }
}