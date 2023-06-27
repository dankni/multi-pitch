/* IMPORT SUPPORTING FILES */
import { 
    cmsMapping 
} from '/editor/cms-mapping.js';

import { 
    textAreaWithTitle, 
    cmsNavigation, 
    saveAndCancelOptions,
    labelAndInput,
    labelAndCheckbox,
    face,
    button,
    pitch,
    reference
} from '/components/cmsParts.js';

/* GLOBAL VARIABLES */
let mappings = cmsMapping();
const climbId = parseInt(document.getElementById('climbIdMeta').content);
let allClimbsData = JSON.parse(localStorage.getItem('climbsData'));
let climbVariable;
if(localStorage.getItem('climb' + climbId)){
    climbVariable = JSON.parse(localStorage.getItem('climb' + climbId)); 
    innit();
} else {
    // this is mandetory so need to ensure it's loaded
    fetch('/data/climbs/' + climbId + '.json')
    .then(res => res.json())
    .then(data => {
        climbVariable = data;
    })
    .then(() => {
        localStorage.setItem('climb' + climbId, JSON.stringify(climbVariable));
    }).then(() => {
        innit()
    });
}

/* INITIALISE */
function innit(){
    addAnyMissingElementsToPage();
    makeEditable();
    showCMSNav();
    updateFromLocalStorage();
    removeReference();
    addReference();
}

/* FUNCTIONS */
function addAnyMissingElementsToPage(){
    // face element
    if(!document.getElementById('face')){
        document.querySelector('.info-ring-holder').innerHTML += face(null);
    }
    // attributes
    document.querySelector('.info-ring-holder').innerHTML += button();

    // pitch info ToDo: refactor this
    if(!document.getElementById('pitchInfo')){
       let newSection = document.createElement('section');
       newSection.classList.add('row');
       newSection.id = "pitchesSection";
       let sections = document.querySelectorAll('section');
       let hr = document.createElement('hr');
       sections[2].after(newSection);
       sections[2].after(hr);
       if(climbVariable.climbData.pitchInfo !== null) {
            // it's there locally but not on the sever
            newSection.innerHTML = `
                <div class="col">
                    <h3 tabindex="0">Pitch By Pitch Information</h3>
                    <p id="pitchInfo" contenteditable="true">${climbVariable.climbData.pitchInfo}</p>
                </div>`;
       } else {
            newSection.innerHTML = `<a class="open-tile inline-button" id="addPitch">Add Pitch Info</a>`;
            document.getElementById('addPitch').addEventListener('click', function(){
                    newSection.innerHTML = pitch('Pitch By Pitch Information', 'pitch');
            });
        }
    }
}

function makeEditable(){

        mappings.items.filter(item => item.type === 'object').map(object => {
            object.arrayParts.map(part => {
                if(part.visible === false){ 
                    addTextBoxsToEditAttributes(part.elementSelector, part.attribute, part.label, part.querySelector);
                }
                if(part.hidden === true) {
                    addHiddenElementsToPage(part);
                }
                enableFieldEditing(part.querySelector);
            });
        });

        mappings.items.forEach(item => {
            if(item.hidden === true) {
                addHiddenElementsToPage(item);
            }
            enableFieldEditing(item.querySelector);
        });
}

function showCMSNav(){
    let url = window.location.href.split('?')[0];
    let cmsNav = cmsNavigation(url);
    let nav = document.getElementsByTagName("nav")[0];
    nav.style.backgroundColor = '#5f1430';
    nav.innerHTML = cmsNav;
    document.getElementById('showJSON').addEventListener('click', function(){
        showOverlay( 
            textAreaWithTitle(`Overwrite ${climbId}.json`, JSON.stringify(climbVariable))
        );
    });
    document.getElementById('showDataFile').addEventListener('click', function(){
        showOverlay(
            textAreaWithTitle('Overwrite data.json',JSON.stringify(allClimbsData))
        );
    });
    document.getElementById('save').addEventListener('click', saveChanges);
    document.getElementById('showHTML').addEventListener('click', toggleHTML);
    document.querySelector('.card-img-anch').removeAttribute('href');
}

// To help stop acidently overwritting changes not commited
// Also adds non visable data to the waiting page elements
function updateFromLocalStorage(){

    // Objects like guidebooks or rain
    mappings.items.filter(item => item.type === 'object').map(object => {
        object.arrayParts.map(part => {
            document.querySelectorAll(part.querySelector).forEach((element, i) => {
                let localValue = (object.multiple === true) ? climbVariable.climbData[object.name][i][part.name] : climbVariable.climbData[object.name][part.name];
                element.innerHTML = localValue;
            });
        });
    });

    // all other items
    mappings.items.map(part => {
        document.querySelectorAll(part.querySelector).forEach((element) => {
            element.innerHTML = climbVariable.climbData[part.name];
        });
    });

    // set checkboxes for boolean values that are true
    mappings.items.filter(item => item.type === 'bool' && Boolean(climbVariable.climbData[`${item.name}`])).map(part => {
        document.querySelector(`${part.querySelector}Check`).checked = true;
    });

    updateWeatherBars();
}
function removeReference(){
    let references = document.querySelectorAll('.reference');
    let urls = document.querySelectorAll('.url');
    for(let i = 0; i < references.length; i++){
        let deleteButton = document.createElement('i');
        deleteButton.id = 'deleteRef' + i;
        deleteButton.classList = "icon-cancel"
        references[i].before(deleteButton);
        deleteButton.addEventListener('click', function(){
            references[i].remove();
            urls[i].remove();
            document.getElementById('deleteRef'+i).remove();
            climbVariable.climbData.references.splice(i,1);
        });
    }
}
function addReference(){
    let refHeading = document.getElementById('refs');
    let addButton = document.createElement('i');
    addButton.id = 'addRefButton';
    addButton.classList = "icon-cancel"
    addButton.style.transform = 'rotate(45deg)';
    addButton.style.display = 'inline-block';
    refHeading.append(addButton);
    addButton.addEventListener('click', function(){
        let count = document.querySelectorAll('.reference').count;
        let refs = document.getElementById('refs');
        refs.parentElement.innerHTML += reference(count+1);
    });
}

function updateWeatherBars(climbData = climbVariable.climbData){
    let hiddenDiv = document.createElement('div');
    hiddenDiv.style.display = 'none';
    hiddenDiv.id = "hiddenWeatherDiv";
    document.body.append(hiddenDiv);
    document.getElementById('hiddenWeatherDiv').innerHTML = getWeather(climbData);
    let rain = document.querySelector('#hiddenWeatherDiv .seasonal-rain').innerHTML;
    let temp = document.querySelector('#hiddenWeatherDiv .temp').innerHTML;
    document.querySelector('.seasonal-rain').innerHTML = rain;
    document.querySelector('.temp').innerHTML = temp;
    document.getElementById('hiddenWeatherDiv').remove();
}

function addTextBoxsToEditAttributes(attributeSelector, attribute, label, cssClass){
    try { 
        let array = document.querySelectorAll(attributeSelector);
        let value;
        for(let i = 0; i < array.length; i++){
            let element = document.createElement('p');
            element.classList = cssClass.replace(/[^a-zA-Z ]/g, ""); 
            element.contentEditable = true;
            element.textContent = value
            array[i].after(element);
        }    
    } catch (e) {
        // no guidebook etc
        console.log("The page has no guidebooks to edit.");
    }
}

function addHiddenElementsToPage(item){
    // check if the group can have multiple or it's not been created yet
    if(!document.querySelector(item.groupSelector)){
        let holderElement = document.createElement('div');
        holderElement.id = item.groupSelector.substring(1, item.groupSelector.length);
        holderElement.style.display = 'none';
        document.body.appendChild(holderElement);
        try{
            let tiggerElements = document.querySelectorAll(item.trigger);
            tiggerElements.forEach(element => {
                    element.addEventListener('click', function(){
                    hiddenEdit(holderElement.id);
                });
            });
        } catch (e) {
            // there are no attributes on the page
            console.log("No trigger for " + item.name + ". ie. this climb probubly has no attributes.");
        }
    }
    let hiddenGroupHolder = document.querySelector(item.groupSelector)
    let labelText;
    item.label ? labelText = item.label : labelText = item.name;
    let id = item.querySelector.substring(1, item.querySelector.length);
    if(item.type === 'bool'){
        hiddenGroupHolder.innerHTML += labelAndCheckbox(labelText, id);
    } else {
        hiddenGroupHolder.innerHTML += labelAndInput(labelText, id);
    }
}

function hiddenEdit(hiddenGroupName){
    
    let hiddenGroup = document.getElementById(hiddenGroupName);
    let html = hiddenGroup.innerHTML;
    hiddenGroup.innerHTML = '';
    let content = saveAndCancelOptions(hiddenGroupName, html);
    showOverlay(content);

    // if its a checkbox and not null or false, check it. bit of a waste for non checkbox overlays
    mappings.items.forEach(el => {
        if(el.type === 'bool' && Boolean(document.querySelector(el.querySelector).textContent)){
            document.querySelector(`${el.querySelector}Check`).checked = true;
        }
    });

    // hide close button to ensure content is properly handled.
    document.getElementById('close').style.display = 'none';

    document.getElementById('saveHid').addEventListener('click', function(){
        document.getElementById(hiddenGroupName).innerHTML = document.getElementById('newHiddenContent').innerHTML;
        document.getElementById('newHiddenContent').innerHTML = "";
        hideTile();
        // updates weather bars
        if(hiddenGroupName === 'seasonalRain' || hiddenGroupName === 'temp'){
            climbVariable.climbData.weatherData.rainyDays = cleanType('array', document.querySelector('#rainyDays').innerHTML, false);
            climbVariable.climbData.weatherData.tempH = cleanType('array', document.querySelector('#tempH').innerHTML, false);
            climbVariable.climbData.weatherData.tempL = cleanType('array', document.querySelector('#tempL').innerHTML, false);
            updateWeatherBars();
        }
    }); 

    document.getElementById('cancel').addEventListener('click', function(){
        document.getElementById(hiddenGroupName).innerHTML = html;
        document.getElementById('newHiddenContent').innerHTML = "";
        hideTile();
    }); 
}

function showOverlay(content){
    document.getElementById('overlay').innerHTML = content;
    document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.85);z-index:14;");
    document.getElementById('close').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");
}

function enableFieldEditing(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.contentEditable = true;
    });
}

function toggleHTML(){
    // dosen't toggle any HTML in nested objects like guidebooks but thats fine. 
    mappings.items.filter(item => item.acceptsHTML === true).forEach(i => {
        if(document.querySelector(i.querySelector)){ // check it's on the page
            let el = document.querySelector(i.querySelector);
            el.classList.contains('html') ? el.innerHTML = el.textContent : el.textContent = el.innerHTML;
            el.classList.toggle('html');
        }
    });
}

function cleanType(type, value, acceptsHTML){
    switch (type) {
        case 'int':
          value = parseInt(value.replace(/[^\d.]/g,"")); // regex removes anything not a digit or . or ?
          break;
        case 'float':
            value = parseFloat(value.replace(/[^\d.]/g,""));
          break;
        case 'array':
            value = value.split(',');
            value = value.map(Number); // converts to ints
            break
        default:
            value = value.trim(); // is text or html
    }
    // strips out any html tags
    if(acceptsHTML !== true && type === "text"){
        let regex = /<[^>]*>?/gm;
        value = value.toString().replace(regex, '')
    }
    return(value);
}

function saveChanges(){

        mappings.items.forEach(item => {
            document.querySelectorAll(item.querySelector).forEach(el => {
                climbVariable.climbData[item.name] = cleanType(item.type, el.innerHTML, item.acceptsHTML);
            });
        });

        mappings.items.filter(item => item.type === 'object').map(object => {
            object.arrayParts.map(part => {
                document.querySelectorAll(part.querySelector).forEach((el, i) => {
                    if(object.multiple === true){
                        climbVariable.climbData[object.name][i][part.name] = cleanType(part.type, el.innerHTML, part.acceptsHTML);
                    } else {
                        climbVariable.climbData[object.name][part.name] = cleanType(part.type, el.innerHTML, part.acceptsHTML);
                    }
                });              
            });
        });

    // sets the climb lastUpdate date in 3 places. 
    // For minor edits only incremnet 1 second on the old date to cache bust but not disrupt sort order
    let now = new Date();
    let lastUpdate = new Date(climbVariable.climbData.lastUpdate);
    if(document.getElementById('minor').checked){
        lastUpdate = new Date(lastUpdate.setSeconds(lastUpdate.getSeconds() + 1));
    } else {
        lastUpdate = now;
    }
    climbVariable.climbData.lastUpdate = lastUpdate;
    allClimbsData.lastUpdate = now; // to ensure cache busting

    let arrayIndex = allClimbsData.climbs.findIndex(
        function(item, i){
            return item.id === climbId
        });
    allClimbsData.climbs[arrayIndex].lastUpdate = lastUpdate;

    // Add other key attributes to allClimbsData
    mappings.items.filter(item => item.allClimbData === true).forEach(attribute => {
        allClimbsData.climbs[arrayIndex][attribute.name] = climbVariable.climbData[attribute.name];
    });

    // saves the changes to local storage
    localStorage.setItem('climb' + climbId, JSON.stringify(climbVariable));
    localStorage.setItem('climbsData', JSON.stringify(allClimbsData));
}