/* IMPORT MAPPING FILE */
import { cmsMapping } from '/editor/cms-mapping.js';
let mappings = cmsMapping(); 

/*GLOBAL VARIABLES */
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
initaliseEditMode();

/* FUNCTIONS */
function initaliseEditMode(){
    showCMSNav();
    showGuidebooks();
    mappings.attributes.forEach(element => {
        if(element.type != "object"){
            enableFieldEditing(element.name, element.querySelector);
        } else {
            let objectName = element.objectName;
            mappings[objectName].forEach(subElement => {
                enableObjectEditing(subElement.name, subElement.querySelector);
            });
        }
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

function textAreaWithTitle(title, text){
    return `
    <div class="holder">
        <h2 class="overlay-title">${title}</h2>
        <textarea id="newJSON">${text}</textarea>
    </div>
    `;
}


function showGuidebooks(){
    try {   
        let guidebookImages = document.querySelectorAll('.guidebook-img');
        for(let i = 0; i < guidebookImages.length; i++){
            guidebookImages[i].addEventListener('click', function(){
                showOverlay(
                    `<div class="holder">
                        <h2 class="overlay-title">Edit guidebook image</h2>
                        <p id="src" contentEditable="true">/img/${guidebookImages[i].src.split('/img/')[1]}</p>
                        <a id="saveChanges" class="open-tile inline-button">Save Changes</a>
                    </div>
                    `
                );
                document.getElementById('saveChanges').addEventListener('click', function(){
                    guidebookImages[i].src = document.getElementById('src').textContent; 
                });
            });
        }
    } catch (e) {
        // no guidebook
    }
}

function enableFieldEditing(name, selector) {
    let element = document.querySelector(selector);
    element.id = name;
    element.contentEditable = true;
}
function enableObjectEditing(name, selector){
    let object = document.querySelectorAll(selector);
    for(let i = 0; i < object.length; i++){
        object[i].id = name + [i];
        object[i].contentEditable = true;
    }
}

function toggleHTML(){
    mappings.attributes.forEach(element => {
        let el = document.querySelector(element.querySelector);
        if(element.type === 'text') {
            el.classList.contains('html') ? el.innerHTML = el.textContent : el.textContent = el.innerHTML;
            el.classList.toggle('html');
        }
    });
    
}

function showOverlay(content){
    document.getElementById('overlay').innerHTML = content;
    document.getElementById('overlay').setAttribute("style", "display:block;background:rgba(0,0,0, 0.7);z-index:14;");
    document.getElementById('close').setAttribute("style", "display:block;");
    document.getElementById('bdy').setAttribute("style", "overflow:hidden");
}

function cleanType(type, value){
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
        return(value);
}

function saveChanges(){
    mappings.attributes.forEach(el => {
            if(el.type === 'object'){
                mappings[el.objectName].forEach(subElement => {
                    let objectPart = document.querySelectorAll(subElement.querySelector);
                    for(let i = 0; i < objectPart.length; i++){
                        climbVariable.climbData[el.name][i][subElement.name] = cleanType(subElement.type, objectPart[i].innerHTML);
                    }
                });
            } else {
                climbVariable.climbData[`${el.name}`] = cleanType(el.type, document.querySelector(el.querySelector).innerHTML);
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