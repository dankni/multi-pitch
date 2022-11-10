/* IMPORT MAPPING FILE */
import { cmsMapping } from '/editor/cms-mapping.js';
let mappings = cmsMapping(); 

/*GLOBAL VARIABLES */
const climbId = parseInt(document.getElementById('climbIdMeta').content);
let climbVariable = JSON.parse(localStorage.getItem('climb' + climbId)); // to accept changes from the UI


/* INITIALISE */
initaliseEditMode();

/* FUNCTIONS */
function initaliseEditMode(){
    showCMSNav();
    mappings.attributes.forEach(element => {
        enableFieldEditing(element.name, element.querySelector);
    });
}

function showCMSNav(){
    let url = window.location.href.split('?')[0];
    let cmsNav = `<div class="container">
    <a class="navbar-brand" href="/"><img src="/img/logo/mp-logo-white.png" style="width:30px;" alt="multi-pitch logo"></a>
    <ul>
        <li><a href="${url}">Exit CMS mode</a></li>
        <li><a id="save">Save changes</a></li>
        <li><a id="showJSON">Show new JSON</a></li>
        <li><a href="/editor/topo-edit/?climbId=${climbId}">Topo editor</a></li>
        <li><a id="showHTML">Toggle HTML</a></li>
    </ul></div>`;
    let nav = document.getElementsByTagName("nav")[0];
    nav.style.backgroundColor = '#5f1430';
    nav.innerHTML = cmsNav;
    document.getElementById('showJSON').addEventListener('click', function(){
        showOverlay( `<div class="holder">
            <h2 class="overlay-title">Overwrite ${climbId}.js</h2>
            <textarea id="newJSON">${JSON.stringify(climbVariable)}</textarea>
        </div>`);
    });
    document.getElementById('save').addEventListener('click', saveChanges);
    document.getElementById('showHTML').addEventListener('click', toggleHTML);
}

function enableFieldEditing(name, selector) {
    let element = document.querySelector(selector);
    element.id = name;
    element.contentEditable = true;
}

function toggleHTML(){
    mappings.attributes.forEach(element => {
        let el = document.querySelector(element.querySelector);
        console.log(el);
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

function saveChanges(){
    mappings.attributes.forEach(el => {
        climbVariable.climbData[`${el.name}`] = document.querySelector(el.querySelector).innerHTML.trim();
    });
    climbVariable.climbData.lastUpdate = new Date();
    localStorage.setItem('climb' + climbId, JSON.stringify(climbVariable));
}