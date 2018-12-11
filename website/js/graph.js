function getGraph(type, climbId, weatherData){

  try { 
	var weather = weatherData.weatherLines.filter(w => w.climbId === climbId);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
	
	if (type == "temperature") {
	  var high = weather.find(h => h.type === 'tempH');
	  var chartClass = "temp";
    } else {
	  var high = weather.find(h => h.type === 'rainyDays');
	  var chartClass = "rain";
	}		

	var highArray = [];
	for(let i = 2; i < 14; i++){
	  highArray.push(parseInt(Object.values(high)[i]));
	}
	var maxValue = Math.max.apply(null,highArray);
    var graphHeight = 40;
	if (maxValue < 18) graphHeight -= 5; // makes the bars fill more of the height
	
	var lowArray = [];
	if (type == "temperature") {
	  var tempL = weather.find(l => l.type === 'tempL');
	  for(let i = 2; i < 14; i++){
	    lowArray.push(parseInt(Object.values(tempL)[i]));
	  }
	  var minTemprature = Math.min.apply(null,lowArray);
	} else {
	  for(let i = 0; i < 12; i++){
	    lowArray.push(0);
	  }
	}

    var tempInfo = `<ul class="chart ${chartClass}">`;

	for(let i = 0; i < 12; i++){
	  if(minTemprature < -8) {
		// if its really cold adjust the graph a lot
		var lowTemp = (lowArray[i] + 16) / graphHeight*100;
		var highTemp = ((highArray[i] + 16) - (lowArray[i] + 16)) / graphHeight*100;
	  } else if(minTemprature < 0) { 			
	    // if its a bit cold adjust it a little
	    var lowTemp = (lowArray[i] + 8) / graphHeight*100;
	    var highTemp = ((highArray[i] + 8) - (lowArray[i] + 8)) / graphHeight*100;
	  } else {
		// if all temps are above 0 no adjustment needed 
	    var lowTemp = (lowArray[i]) / graphHeight*100;
	    var highTemp = (highArray[i] - lowArray[i]) / graphHeight*100;
	  }
	  
   	  tempInfo += `
  	  <li>
	    ${highArray[i]}
	    <span style="height:${highTemp}%" title="${months[i]}"></span>`;
      if (type == "temperature"){
	    tempInfo += `<span style="height:${lowTemp}%;background-color:rgba(0,0,0,0);">${lowArray[i]}</span>`;
	  }
      tempInfo += `</li>`;
	}
	tempInfo += `</ul>`;
     
  } catch(e) {
    tempInfo = '';
  }
  return tempInfo;
}
//So then I can use this in nodejs and in the browser

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {

    module.exports = {

        getGraph

    };

}