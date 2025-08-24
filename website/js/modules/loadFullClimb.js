import { returnClimbURL } from "/js/modules/convertNameToURL.js";

export function isClimbInLocalStorage(climbId) {

    climbId = parseInt(climbId);
    let climb = localStorage.getItem('climb' + climbId) ? JSON.parse(localStorage.getItem('climb' + climbId)) : null;
    let localClimbFileDate = localStorage.getItem('climb' + climbId) ? Date.parse(climb.climbData.lastUpdate) : null; 
    let summaryFileClimbTime = Date.parse(climbsData.climbs.find(climb => climb.id === climbId).lastUpdate);

    if(localClimbFileDate >= summaryFileClimbTime){
        return true;
    } else {
        return false;
    }
}

export const loadClimbIntoStorage =  async(climbId) => {
    try {
        const climbData = '/data/climbs/' + climbId + '.json';
        const response = await fetch(climbData, {cache: "no-cache"});
        localStorage.setItem('climb' + climbId, await response.json());
        return true;
    } catch (error) {
        console.log(error.message);
    }
}

export function loadClimb(climbId, popped){
    let climbData =  JSON.parse(localStorage.getItem('climb' + climbId));
    localStorage.setItem('focusId', climbData.id + 'Focus');
    localStorage.setItem('lastClimb', climbData.id );
     
    let url = '/climbs/' + returnClimbURL(climbData.routeName, climbData.cliff);
    if(popped === false) {
        window.history.pushState({"page": url}, climbData.cliff, url);
    }
    document.getElementById('overlay').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");
    let fullCard = climbCard(climb);
    document.getElementById('overlay').innerHTML = fullCard;
    let navHeight = document.getElementsByTagName("nav")[0].height;
    document.getElementById('climbCardDetails').style = `margin: ${navHeight}px 0 0 0;Background: #fff;`;
    document.title = climbData.cliff + " - " + climbData.routeName;
    document.getElementById('articleTitle').focus(); // Set focus on the climb card article for accessibility 
    loadCurrentWeatherModule(climbData.id);
    if(climbData.tidal >= 1){
        loadTides(climbData.id);
    }
}
