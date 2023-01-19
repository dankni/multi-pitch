/* IMPORT MAPPING FILE */
import { cmsMapping } from '/editor/cms-mapping.js';
let mappings = cmsMapping(); 

/* GLOBAL VARIABLES */
const climbId = parseInt(document.getElementById('climbIdMeta').content);
let allClimbsData = JSON.parse(localStorage.getItem('climbsData'));
let climbVariable;
if(localStorage.getItem('climb' + climbId)){
    climbVariable = JSON.parse(localStorage.getItem('climb' + climbId)); 
} else {
    fetch('/data/climbs/' + climbId + '.json')
    .then(res => res.json())
    .then(data => {
        climbVariable = data;
    })
    .then(() => {
        localStorage.setItem('climb' + climbId, JSON.stringify(climbVariable));
    });
}

/* INITIALISE */
showCMSNav();
initaliseEditMode();
updateFromLocalStorage();

/* FUNCTIONS */
function initaliseEditMode(){
    
    mappings.items.forEach(item => {
        if(item.type != "object"){
            enableFieldEditing(item.querySelector);
            if(item.hidden === true) {
                addHiddenElementsToPage(item);
            }
        } else {
            item.arrayParts.forEach(part =>{
                enableFieldEditing(part.querySelector);
                if(part.visible === false){
                    addTextBoxsToEditAttributes(part.elementSelector, part.attribute, part.label, part.querySelector);
                }
            });
        }
    });

    document.getElementById('grade').addEventListener('click', function(){
        hiddenEdit('gradeGroup');
    });
}

function showCMSNav(){
    let url = window.location.href.split('?')[0];
    let cmsNav = `<div class="container">
    <a class="navbar-brand" href="/"><img src="/img/logo/mp-logo-white.png" style="width:30px;" alt="multi-pitch logo"></a>
    <ul>
        <li><a href="${url}">Exit CMS mode</a></li>
        <li><a id="save">Save changes</a></li>
        <li><a id="showHTML">Toggle HTML</a></li>
        <li><a id="showJSON">Show new JSON</a></li>
        <li><a href="/editor/topo-edit/?climbId=${climbId}">Topo editor</a></li>
        <li><a id="showDataFile">Show all-climb data file</a></li>
    </ul></div>`;
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
}

// To help stop acidently overwritting changes not commited
function updateFromLocalStorage(){
    mappings.items.forEach(el => {
        if(el.type === 'object'){
            el.arrayParts.forEach(arrayPart => {
                let item = document.querySelectorAll(arrayPart.querySelector);
                for(let i = 0; i < item.length; i++){
                    item[i].innerHTML = climbVariable.climbData[el.name][i][arrayPart.name];
                }
            });
        } else {
            document.querySelector(el.querySelector).innerHTML = climbVariable.climbData[`${el.name}`];
        }
    });
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
    }
}

function addHiddenElementsToPage(item){
    // check if the group can have multiple or it's not been created yet
    if(item.groupSelector.charAt(0) != "#" || !document.querySelector(item.groupSelector)){
        let holderElement = document.createElement('div');
        if(item.groupSelector.charAt(0) === "#"){
            holderElement.id = item.groupSelector.substring(1, item.groupSelector.length);
        } else {
            holderElement.classList = item.groupSelector.substring(1, item.groupSelector.length);
        }
        holderElement.style.display = 'none';
        document.body.appendChild(holderElement);
    }
    let label = document.createElement('p');
    label.textContent = item.name;
    let hiddenElement = document.createElement('p');
    hiddenElement.id = item.name; // a little risky, as could be different 
    hiddenElement.contentEditable = true;
    let hiddenGroupHolder = document.querySelector(item.groupSelector)
    hiddenGroupHolder.appendChild(label);
    hiddenGroupHolder.appendChild(hiddenElement);
    hiddenGroupHolder.innerHTML += "<br />";
}

function hiddenEdit(hiddenGroupName){
    
    let hiddenGroup = document.getElementById(hiddenGroupName);
    let html = hiddenGroup.innerHTML;
    hiddenGroup.innerHTML = '';
    close
    showOverlay(
        `<div class="holder">
            <h2 class="overlay-title">Edit grade</h2>
            <div id="newHiddenContent">
                ${html}
            </div>
            <button class="open-tile inline-button primary" id="saveHid">Keep Changes & Close</button>
            <button class="open-tile inline-button" id="cancel">Cancel</button>
        </div>
        `
    );
    // hide close to ensure content is properly handled.
    document.getElementById('close').style.display = 'none';

    document.getElementById('saveHid').addEventListener('click', function(){
        document.getElementById(hiddenGroupName).innerHTML = document.getElementById('newHiddenContent').innerHTML;
        document.getElementById('newHiddenContent').innerHTML = "";
        hideTile();
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

function textAreaWithTitle(title, text){
    return `
    <div class="holder">
        <h2 class="overlay-title">${title}</h2>
        <textarea id="newJSON">${text}</textarea>
    </div>
    `;
}

function enableFieldEditing(selector) {
    let array = document.querySelectorAll(selector);
    for(let i = 0; i < array.length; i++){
        array[i].contentEditable = true;
    }
}

function toggleHTML(){
    // dosen't toggle any HTML in arrays like guidebooks but I think thats fine. 
    mappings.items.forEach(element => {
        let el = document.querySelector(element.querySelector);
        if(element.type === 'text') {
            el.classList.contains('html') ? el.innerHTML = el.textContent : el.textContent = el.innerHTML;
            el.classList.toggle('html');
        }
    });
    
}

function cleanType(type, value, acceptsHTML){
    switch (type) {
        case 'int':
          value = parseInt(value.replace(/[^\d.]/g,"")); // regex removes anything not a digit or dot
          break;
        case 'float':
            value = parseFloat(value.replace(/[^\d.]/g,""));
          break;
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
    mappings.items.forEach(el => {
            if(el.type === 'object'){
                el.arrayParts.forEach(arrayPart => {
                    let item = document.querySelectorAll(arrayPart.querySelector);
                    for(let i = 0; i < item.length; i++){
                        climbVariable.climbData[el.name][i][arrayPart.name] = cleanType(arrayPart.type, item[i].innerHTML, arrayPart.acceptsHTML);
                    }
                });
            } else {
                climbVariable.climbData[`${el.name}`] = cleanType(el.type, document.querySelector(el.querySelector).innerHTML, el.acceptsHTML);
            }
    });

    // sets the climb lastUpdate date in 3 places 
    let now = new Date();
    climbVariable.climbData.lastUpdate = now;
    allClimbsData.lastUpdate = now;
    let arrayIndex = allClimbsData.climbs.findIndex(
        function(item, i){
            return item.id === climbId
        });
    allClimbsData.climbs[arrayIndex].lastUpdate = now;

    // saves the changes to local storage
    localStorage.setItem('climb' + climbId, JSON.stringify(climbVariable));
    localStorage.setItem('climbsData', JSON.stringify(allClimbsData));
}