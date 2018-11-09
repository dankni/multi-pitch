function insertGraph(type, climbId, target){

  try {
	  
	var weather = weatherData.weatherLines.filter(w => w.climbId === climbId);
    var tempH = weather.find(h => h.type === 'tempH');
	delete tempH.climbId;
    delete tempH.type; 
  
    var tempL = weather.find(l => l.type === 'tempL');
    delete tempL.climbId;
    delete tempL.type;
	
	var highArray = [];
	for(let i = 0; i < 12; i++){
	  highArray.push(parseInt(Object.values(tempH)[i]));
	}
	var maxTemprature = Math.max.apply(null,highArray);

	var lowArray = [];
	for(let i = 0; i < 12; i++){
	  lowArray.push(parseInt(Object.values(tempL)[i]));
	}
	var minTemprature = Math.min.apply(null,lowArray);

	var graphHeight = 40;
	if (maxTemprature < 20) graphHeight -= 5; // makes the bars fill more of the height

    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    var tempInfo = `
	  <p>
	    Estimated average high and low temperature in degrees Celsius for the given month below. 
		Again note that some weather stations are close or even on the mountain, others are in nearby towns. 
		Plan accordingly! 
	  </p>
	  <ul class="chart temp">`;


	if(lowArray.length == 12){
      for(let i = 0; i < 12; i++){
		  
		if(minTemprature < -8) { // if its really cold adjust the graph a lot
		  var lowTemp = (lowArray[i] + 16) / graphHeight*100;
		  var highTemp = ((highArray[i] + 16) - (lowArray[i] + 16)) / graphHeight*100;
		} else if(minTemprature < 0) { // if its a bit cold adjust it a little
		  var lowTemp = (lowArray[i] + 8) / graphHeight*100;
		  var highTemp = ((highArray[i] + 8) - (lowArray[i] + 8)) / graphHeight*100;
		} else	{ // if all temps are above 0 no adjustment needed
		  var lowTemp = (lowArray[i]) / graphHeight*100;
		  var highTemp = (highArray[i] - lowArray[i]) / graphHeight*100
		}

		tempInfo += `
		<li>
		  ${highArray[i]}
		  <span style="height:${highTemp}%" title="${months[i]}"></span>
		  <span style="height:${lowTemp}%;background-color:rgba(0,0,0,0);">${lowArray[i]}</span>
		</li>`;
		
	  }
	  tempInfo += `</ul>`;
     
    } else {
      tempInfo = '';
    }  
  } catch {
    tempInfo = '';
  }
  return tempInfo;
}