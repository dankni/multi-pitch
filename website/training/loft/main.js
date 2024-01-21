let state = {  
    "started" : false,
    "listening" : false,
    "movesMade" : 0,
    "gearPlaced": 0,
    "beleysMade" : 0,
    "justPlaced" : false,
    "anchorJustPlaced" : false
};


// When the HTML Document Object Model is loaded
document.addEventListener("DOMContentLoaded", (event) => {
    document.getElementById('primaryButton').addEventListener('click',setStarted);
    getOrSetColours();
});

// Get or set the colors
function getOrSetColours(){
    let colours;
    let defaulColours = ["white", "yellow", "orange", "grey", "red", "pink", "blue", "purple", "black", "green"]
    if(localStorage.getItem("colours")){
        colours = JSON.parse(localStorage.getItem("colours"));
    } else {
        colours = defaulColours;
        localStorage.setItem("colours", JSON.stringify(colours));
    }
    colours.forEach(colour => {
        addColorSwitch(colour, "On");
    });
    defaulColours.forEach(defaulColour => {
        if(colours.includes(defaulColour) !== true){
            addColorSwitch(defaulColour, "Off");
        }
    })
}

function addColorSwitch(colour, status){
    let coloursHolder = document.getElementById("coloursHolder");
    let check = '';
    if (status === 'On') {
        check = 'checked="checked"';
    }
    
    let html = `
        <label class="switch-label">
			<input type="checkbox" onchange="updateColors()" class="holds" data-color="${colour}" ${check}/>
			<span class="label-content">
				<i style="color:${colour}">&#x25CD;</i> ${colour} <span id="${colour}Status">${status}</span>
			</span>
		</label>`;
    coloursHolder.innerHTML += html;
}

function updateColors(){
    let allColourSwitches = document.querySelectorAll(".holds"); 
    let newColours = [];
    allColourSwitches.forEach(holdSwitch =>{
        if(holdSwitch.checked === true){
            document.getElementById(holdSwitch.dataset.color + "Status").textContent = "On";
            newColours.push(holdSwitch.dataset.color);
        } else {
            document.getElementById(holdSwitch.dataset.color + "Status").textContent = "Off";
        }
    });
    localStorage.setItem("colours", JSON.stringify(newColours));
}


// kick of the first task and give chrome permission to use speechSynthesis
function setStarted(){
    if(state.started === false) {
        requestWakeLock(); // in common.js
        state.started = true;
        startTimer();
        document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-pause"></i>PAUSE';
        document.getElementById('reset').style.display = 'none';
    } else {
        state.started = false;
        stopTimer();
        recognition.abort();
        document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-play"></i>RESUME';
        document.getElementById('reset').style.display = 'inline-block'

    }
    
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent
const grammar = '#JSGF V1.0; grammar word;'// public <word> = ' + word.join(' | ') + ' ;'
var recognition = new SpeechRecognition();
var speechRecognitionList = new SpeechGrammarList();

speechRecognitionList.addFromString(grammar, 1);
recognition.grammars = speechRecognitionList;
recognition.continuous = false; // keeps service open to allow multiple words if true
recognition.lang = 'en-GB';
recognition.interimResults = false;
recognition.maxAlternatives = 1;
let movesMade = 0;
let gearPlaced = 0;
let beleysMade = 0;
let justPlaced = false;
let anchorJustPlaced = false;

function startSoon (){
    state.started ? console.log("already running") : recognition.start();
    console.log("func startSoon");
}

recognition.onresult = function(event) {
    var command = event.results[0][0].transcript;				// if continuous is true the first array needs iteration
    console.log(command + ' Confidence: ' + event.results[0][0].confidence);
    processResults(command);
}

recognition.onspeechend = function() {state.started = false}
recognition.onstart = function () {state.started = true};

recognition.onnomatch = function(event) {
    console.log('I didn\'t recognise that command.');
    startSoon();
}
recognition.onerror = function(event) {
    console.log('Error occurred in recognition: ' + event.error);
    startSoon();
}
recognition.onend = function () {
    startSoon();
};

function processResults(command){
    if(command.includes('next')){
        speak(chooseTask());
    } else {
        speak("I didn't understand");
    }
//    recognition.abort();
}

function chooseTask(){
    // ToDo: Make all these configurable 
    let limb = ["left arm", "right arm", "left leg", "right leg"];
    let gear = ["cam", "nut", "sling"];
    
    // todo - make this more readable 
    if(movesMade % 8 === 0 && movesMade !== 0 && justPlaced !== true && anchorJustPlaced !== true){
        if(gearPlaced % 4 === 0 && gearPlaced !== 0 && anchorJustPlaced !== true){
            document.getElementById('color').style.backgroundColor = "white";
            let belayMsg = "Build a belay and take a rest";
            document.getElementById('task').innerHTML = belayMsg;
            anchorJustPlaced = true;
            beleysMade += 1;
            document.getElementById('belays').innerHTML = beleysMade;
            return belayMsg;
        } else {
            document.getElementById('color').style.backgroundColor = "white";
            let gearMsg = "Place a " + gear[Math.floor(Math.random() * gear.length)];
            document.getElementById('task').innerHTML = gearMsg;
            gearPlaced += 1;
            document.getElementById('gear').innerHTML = gearPlaced;
            justPlaced = true;
            return gearMsg;
        }
    } else {
        let randomLimb = limb[Math.floor(Math.random() * limb.length)];
        let randomColor = color[Math.floor(Math.random() * color.length)];
        movesMade += 1;
        justPlaced = false;
        anchorJustPlaced = false;
        document.getElementById('moves').innerHTML = movesMade;
        document.getElementById('color').style.backgroundColor = randomColor;
        document.getElementById('task').innerHTML = randomLimb + " to " + randomColor;
        return randomLimb + " to " + randomColor;
    }
}

// To Count Elapsed time
let min = 0;
let sec = 0;
let stoptime = true;
let introRun = false;

function startTimer() {

    if(introRun === false && stoptime === true) { 
      setTimeout(function(){
          speak("Three");
          background("red");
          setTimeout(function(){
                speak("Two");
                background("orange");
                setTimeout(function(){
                    speak("One");
                    background("yellow");
                    setTimeout(function(){
                        speak(chooseTask());
                        recognition.start();
                        stoptime = false;
                        timerCycle();
                        introRun = true
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);
    }
    if (introRun === true && stoptime == true) {
        stoptime = false;
        timerCycle();
    }
}
function stopTimer() {
    if (stoptime == false) {
        stoptime = true;
    }
}

function timerCycle() {
    if (stoptime == false) {
    sec = parseInt(sec);
    min = parseInt(min);

    sec = sec + 1;
    if (sec === 1){
        background("");// default
    }
    if (sec < 10 || sec == 0) {
        sec = '0' + sec;
    }
    if (min < 10 || min == 0) {
        min = '0' + min;
    }
    if (min === 60 && wakeLock != null){
        //don't force the screen to stay awake anymore 
        wakeLock.release()
        .then(() => {
            wakeLock = null;
        });
    }

    document.getElementById('elapsed').innerHTML = min + ':' + sec;
        debug ? setTimeout("timerCycle()", 100) : setTimeout("timerCycle()", 1000);
    }
}

function reset() {
    document.getElementById('elapsed').innerHTML = '00:00';
    min = 0;
    sec = 0;
    stoptime = true;
    document.getElementById("first").style.display = "none";
    document.getElementById("second").style.display = "none";
    document.getElementById("reset").style.display = "none";
    document.querySelector('button').innerHTML = '<i class="demo-icon icon-play"></i>START';
    introRun = false;
    if(document.getElementById("endingDiv").style.display === "block"){
        document.getElementById("endingDiv").style.display = "none";
    }
}

/*/ To Count Elapsed time... why not eh
const timer = document.getElementById('elapsed');

var hr = 0;
var min = 0;
var sec = 0;
var stoptime = true;

function startTimer() {
    if (stoptime == true) {
        stoptime = false;
        timerCycle();
    }
}
function stopTimer() {
    if (stoptime == false) {
    stoptime = true;
    }
}

function timerCycle() {
    if (stoptime == false) {
    sec = parseInt(sec);
    min = parseInt(min);
    hr = parseInt(hr);

    sec = sec + 1;

    if (sec == 60) {
        min = min + 1;
        sec = 0;
    }
    if (min == 60) {
        hr = hr + 1;
        min = 0;
        sec = 0;
    }

    if (sec < 10 || sec == 0) {
        sec = '0' + sec;
    }
    if (min < 10 || min == 0) {
        min = '0' + min;
    }
    if (hr < 10 || hr == 0) {
        hr = '0' + hr;
    }

    timer.innerHTML = hr.substring(1, 2) + ':' + min + ':' + sec;

    setTimeout("timerCycle()", 1000);
    }
}

function resetTimer() {
    timer.innerHTML = '00:00:00';
}
*/