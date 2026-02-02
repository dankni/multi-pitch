import { setTopoData, getTopoData } from "/js/main.js";
window.setTopoData = setTopoData;
window.getTopoData = getTopoData;
/** overwrite the scaling function **/
window.sThis = function(number){
  return number;
};
var canvas = document.getElementById('canvas');
/** MAKE A DROP DOWN WITH A LIST OF ALL CLIMBS **/
var selectHolder = document.getElementById("selectHolder");
var selectList = document.createElement("select");
 //   if(topoData.belaySize){
    //    document.getElementById('belaySize').value = topoData.belaySize;
 //  }
const climbsData = JSON.parse(localStorage.getItem('climbsData'));
//  console.log(climbsData);
selectList.setAttribute("id", "climbList");
selectList.setAttribute("name", "climbList");
selectHolder.appendChild(selectList);
for (let i = 0; i < climbsData.climbs.length; i++) {
    var option = document.createElement("option");
    option.setAttribute("value", climbsData.climbs[i].id);
    option.text = climbsData.climbs[i].cliff;
    let climb = JSON.parse(localStorage.getItem('climb' + climbsData.climbs[i].id));
    try{
        if(climb.climbData.topo.dataFile < 2){
            option.style.background = 'rgba(174, 39, 41, 0.54)';
        }
    } catch (e) {
        option.style.background = 'rgba(174, 39, 41, 0.54)';
    }
    selectList.appendChild(option);
}

/** BUILDER STEP 1 - GET CLIMB DETAILS **/
document.addEventListener('DOMContentLoaded', function () {
    document.querySelector('select[name="climbList"]').onchange = changeEventHandler;
}, false);
var mapping = {
    'england': 'en.png', 'scotland': 'sco.png', 'wales': 'wa.png', 'ireland': 'ie.png', 'spain': 'es.png', 'portugal': 'pt.png',
    'italy': 'it.png', 'usa': 'us.png', 'norway': 'no.png', 'canada': 'ca.png', 'hongkong': 'cn.png', 'greece': 'gr.png',
    'france': 'fr.png', 'switzerland': 'ch.png', 'belgium' : 'be.png'
}; // base 64 images from the css as vectors on canvas don't play nice :(
function changeEventHandler(event) {
    if (event.target.value) {
        tryLoadTopo(event.target.value);
    }
}

canvas.addEventListener('click', getCursorPosition, false);
var tempArray = [];
var decentPath = [];
const labelPositionX = document.getElementById('labelPositionX');
const labelPositionY = document.getElementById('labelPositionY');
const belayPositionX = document.getElementById('belayPositionX');
const belayPositionY = document.getElementById('belayPositionY');
const dLabelPositionX = document.getElementById('dLabelPositionX');
const dLabelPositionY = document.getElementById('dLabelPositionY');
const dBelayPositionX = document.getElementById('dBelayPositionX');
const dBelayPositionY = document.getElementById('dBelayPositionY');
const decentRoute = document.getElementById('decentRoute');
const pitchGrade = document.getElementById('grade');
const pitchHeight = document.getElementById('height');
const label = document.getElementById('label');

function getCursorPosition(event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    var what = getRadioValue();
    switch(what){
        case'rt':
            document.getElementById('routeOutput').value += 
            "[" + x.toFixed(1) + ", " + y.toFixed(1) + "] ";
            tempArray.push(parseInt(x.toFixed(1)), parseInt(y.toFixed(1)));
            let _td = getTopoData(); _td.route = [..._td.route, tempArray]; setTopoData(_td);
            tempArray = [];
            break;
        case'lp':
            labelPositionX.value = x.toFixed(1);
            labelPositionY.value = y.toFixed(1);
            break;
        case'bp':
            belayPositionX.value = x.toFixed(1);
            belayPositionY.value = y.toFixed(1);
            break;
        case'dlp':
            dLabelPositionX.value = x.toFixed(1);
            dLabelPositionY.value = y.toFixed(1);
            break;
        case'dbp':
            dBelayPositionX.value = x.toFixed(1);
            dBelayPositionY.value = y.toFixed(1);
            break;
        case'dr':
            let decentTempArray = [];
            document.getElementById('decentRoute').value += 
            "[" + x.toFixed(1) + ", " + y.toFixed(1) + "] ";
            decentTempArray.push(parseInt(x.toFixed(1)), parseInt(y.toFixed(1)));
            decentPath.push(decentTempArray);
            break;
    }
}

function pushPitch(){
    let tempPitch;
    let tempLabelPosition = [];
    let tempBelayPosition = [];
    tempLabelPosition.push(parseInt(labelPositionX.value), parseInt(labelPositionY.value));
    tempBelayPosition.push(parseInt(belayPositionX.value), parseInt(belayPositionY.value));
    tempPitch = new Pitch(tempBelayPosition, tempLabelPosition, pitchGrade.value, pitchHeight.value);
    let _td = getTopoData(); _td.pitches = [..._td.pitches, tempPitch]; setTopoData(_td);
    labelPositionX.value = '';
    labelPositionY.value = '';
    belayPositionX.value = '';
    belayPositionY.value = '';
    pitchGrade.value = '';
    pitchHeight.value = '';
    draw();
}
window.pushPitch = pushPitch;

function pushDecent(){
    let tempDecent;
    let tempLabelPosition = [];
    let tempBelayPosition = [];
    tempLabelPosition.push(parseInt(dLabelPositionX.value), parseInt(dLabelPositionY.value));
    tempBelayPosition.push(parseInt(dBelayPositionX.value), parseInt(dBelayPositionY.value));
    tempDecent = new Decent(tempBelayPosition, tempLabelPosition, decentPath, label.value);
    let _td = getTopoData(); _td.decent = [..._td.decent, tempDecent]; setTopoData(_td);
    dLabelPositionX.value = '';
    dLabelPositionY.value = '';
    dBelayPositionX.value = '';
    dBelayPositionY.value = '';
    label.value = '';
    decentRoute.value = '';
    decentPath = [];
    draw();
}
window.pushDecent = pushDecent;

const radios = document.getElementsByName("what");

function getRadioValue (){
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return radios[i].value;              
        }
    }
}


/** CONSTRUCTION OF JSON **/
function Pitch (belayPosition,labelPosition, grade, height){
    this.belayPosition = belayPosition;
    this.labelPosition = labelPosition;
    this.grade = grade;
    this.height = height;
}

function Decent (belayPosition, labelPosition, route, label){
    this.anchor = belayPosition;
    this.labelPosition = labelPosition;
    this.path = route;
    this.label = label;
}

// Smoke-test: verify setTopoData/getTopoData round-trip and report result
// This is non-invasive: it restores any original topo data afterwards.
document.addEventListener('DOMContentLoaded', function() {
    try {
        const orig = getTopoData();
        // write a tiny marker
        setTopoData(Object.assign({}, orig || {}, { __smoke_test: true }));
        const ok = getTopoData() && getTopoData().__smoke_test === true;
        console.log('topo-edit smoke test:', ok ? 'PASS' : 'FAIL');
        // restore original value
        if (typeof orig === 'undefined' || orig === null) {
            setTopoData(orig);
        } else {
            // ensure original __smoke_test removed if present
            if (Object.prototype.hasOwnProperty.call(orig, '__smoke_test')) delete orig.__smoke_test;
            setTopoData(orig);
        }
        document.body.dataset.topoSmoke = ok ? 'pass' : 'fail';
    } catch (e) {
        console.error('topo-edit smoke test error', e);
        document.body.dataset.topoSmoke = 'error';
    }
});