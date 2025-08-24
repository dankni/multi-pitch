import { convertTime } from "/js/modules/convertTime.js";

export const loadTides =  async() => {
    const tideUrl = 'https://s3-eu-west-1.amazonaws.com/multi-pitch.data/climbing-data-extended-tides.json';
    try {
        const response = await fetch(tideUrl);
        const tidesFromServer = await response.json();
        window.tideData = tidesFromServer; // makes tide a global variable to save re-calling it
        return tidesFromServer;
    } catch (error) {
        console.log(error.message);
    }
}

export function fullTideDataForOneClimb(tideData, climbId){
    let thisTideData = tideData.find(tide => tide.climbId === parseInt(climbId));
    let cleanArray = [];
    let max = 0;
    let min = 0;
    for(let i = 0; i < thisTideData.heights.length; i++){
        cleanArray.push(thisTideData.heights[i]);
        max = (thisTideData.heights[i].height > max) ? thisTideData.heights[i].height : max;
        min = (thisTideData.heights[i].height < min) ? thisTideData.heights[i].height : min;
    }
    let base = (min < 0) ? Math.abs(min) : min;
    cleanArray.push({'base': base});
    let diff = max - min;
    window.multiplier = 70 / diff;
  
    cleanArray.sort(function(a, b){
        return a.timestamp - b.timestamp;
    });
    return cleanArray;
}

export function updateSpecificClimbTideInfo(climbTideInfo, climbTimeZone) {
    
    const options = {timeZone : climbTimeZone, weekday: 'short', day: "numeric", month: 'short'};
    const base = climbTideInfo.find(item => item.hasOwnProperty('base')).base;
    let localDay = convertTime(climbTideInfo[0].timestamp, options);
    //let day =  new Date(localDate).getDay();
    let html = `<p class="chart-title">Hourly Tide Heights for ${localDay}</p><ul class="chart" style="margin-bottom:2em;max-width:100%;width:100%">`;
    for(let i = 0; i < climbTideInfo.length -1; i++){ // -1 to avoid the base object
        let height = (base * multiplier) + (climbTideInfo[i].height * multiplier) + 15; // makes the smallest bar 15% and largest 85%
        let color = (new Date().getHours() === new Date(climbTideInfo[i].timestamp * 1000).getHours()) ? 'background-color:rgba(53, 135, 216, 0.87);font-weight:600;' : '';
        html += `
                <li>
                   <span class="tide" style="height:${height.toFixed(1)}%;writing-mode: vertical-rl;text-orientation: mixed;${color}" title="${new Date(climbTideInfo[i].timestamp * 1000).getHours()}:00">
                        ${climbTideInfo[i].height.toFixed(1)}m
                    </span>
                </li>`;
    }
    html += `</ul><style>.chart .tide::before{padding: 1em 2em;}</style>`;
    document.getElementById('tideHolder').innerHTML = html;
}