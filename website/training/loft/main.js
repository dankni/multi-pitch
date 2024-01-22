let state = {  
    "started" : false,
    "listening" : false,
    "movesMade" : 0,
    "gearPlaced": 0,
    "beleysMade" : 0,
    "justPlaced" : false,
    "anchorJustPlaced" : false,
    "aborted" : false
};
// Global Options
let colours;
let limb = ["left arm", "right arm", "left leg", "right leg"];
let gear = ["cam", "nut", "sling"];

// When the HTML Document Object Model is loaded
document.addEventListener("DOMContentLoaded", (event) => {
    document.getElementById('primaryButton').addEventListener('click',setStarted);
    getOrSetColours();
    checkTradMode();
});

// Get or set the colors
function getOrSetColours(){
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
    colours = newColours; // update global variable 
    localStorage.setItem("colours", JSON.stringify(newColours)); // update local storage
}

// Manage Trad climbing mode
function checkTradMode(){
    let tradMode = false;
    if(localStorage.getItem("tradMode")){
        tradMode = JSON.parse(localStorage.getItem("tradMode"));
    } else {
        localStorage.setItem("tradMode", JSON.stringify(tradMode));
    }
    if(tradMode === true){
        document.getElementById('gearDiv').style.display = 'inline-block';
        document.getElementById('belaysDiv').style.display = 'inline-block';
        document.getElementById('tradMode').checked = true;
        document.getElementById('tradStatus').textContent = "On";
    } else {
        document.getElementById('gearDiv').style.display = 'none';
        document.getElementById('belaysDiv').style.display = 'none';
        document.getElementById('tradMode').checked = false;
        document.getElementById('tradStatus').textContent = "Off";
    }
}
function toggleTradMode(){
    if(document.getElementById('tradMode').checked === true){
        localStorage.setItem("tradMode", JSON.stringify(true));
    } else {
        localStorage.setItem("tradMode", JSON.stringify(false));
    }
    checkTradMode();
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
        state.aborted = true;
        recognition.abort();
        stopTimer();
        document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-play"></i>RESUME';
        document.getElementById('reset').style.display = 'inline-block'

    }
    
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent
var grammar = '#JSGF V1.0; grammar replies; public <reply> = next | compleated | done;';
var recognition = new SpeechRecognition();
var speechRecognitionList = new SpeechGrammarList();

speechRecognitionList.addFromString(grammar, 1);
recognition.grammars = speechRecognitionList;
recognition.continuous = false; // keeps service open to allow multiple words if true
recognition.lang = 'en-GB';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function startSoon (){
    state.started ? console.log("already running") : recognition.start();
}
recognition.onstart = function () {
    state.started = true;
    state.aborted = false;
};

recognition.onresult = function(event) {
    var command = event.results[0][0].transcript;		// if continuous is true the first array needs iteration
//    console.log(command + ' Confidence: ' + event.results[0][0].confidence);
    processResults(command);
}

recognition.onnomatch = function(event) {
    console.log('I didn\'t recognise that command.');
    startSoon();
}
recognition.onerror = function(event) {
    // "no-speech" is time out
    console.log('Error occurred in recognition: ' + event.error);
    startSoon();
}
recognition.onend = function () {
    state.started = false;
    if(state.aborted === false){
        startSoon(); // restarts recognition
    }
};

function processResults(command){
    if(command.includes('next')){
        speak(chooseTask());
    }
    startSoon();
}

function chooseTask(){
    // todo - make this more readable 
    if(JSON.parse(localStorage.getItem('tradMode')) === true){
        if(state.movesMade % 8 === 0 && state.movesMade !== 0 && state.justPlaced !== true && state.anchorJustPlaced !== true){
            if(state.gearPlaced % 4 === 0 && state.gearPlaced !== 0 && state.anchorJustPlaced !== true){
                document.getElementById('color').style.backgroundColor = "white";
                let belayMsg = "Build a belay and take a rest";
                document.getElementById('task').innerHTML = belayMsg;
                state.anchorJustPlaced = true;
                state.beleysMade += 1;
                document.getElementById('belays').innerHTML = state.beleysMade;
                return belayMsg;
            } else {
                document.getElementById('color').style.backgroundColor = "white";
                let gearMsg = "Place a " + gear[Math.floor(Math.random() * gear.length)];
                document.getElementById('task').innerHTML = gearMsg;
                state.gearPlaced += 1;
                document.getElementById('gear').innerHTML = state.gearPlaced;
                state.justPlaced = true;
                return gearMsg;
            }
        } else {
            return randomMove();
        }
    } else {
        return randomMove();
    }
}

function randomMove(){
    let randomLimb = limb[Math.floor(Math.random() * limb.length)];
    let randomColor = colours[Math.floor(Math.random() * colours.length)];
    state.movesMade += 1;
    state.justPlaced = false;
    state.anchorJustPlaced = false;
    document.getElementById('moves').innerHTML = state.movesMade;
    document.getElementById('color').style.backgroundColor = randomColor;
    document.getElementById('task').innerHTML = randomLimb + " to " + randomColor;
    return randomLimb + " to " + randomColor;
}

// To Count Elapsed time
let hr = 0;
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

    if (sec === 1){
        background("");// default
    }
    if (sec < 10 || sec == 0) {
        sec = '0' + sec; // so its 05 sec not just 5
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

    document.getElementById('elapsed').innerHTML = hr + ':' + min + ':' + sec;
    debug ? setTimeout("timerCycle()", 100) : setTimeout("timerCycle()", 1000);
    }
}

function reset() {
    hr = 0;
    min = 0;
    sec = 0;
    stoptime = true;
    document.getElementById('color').style.backgroundColor = '';
    document.getElementById('task').textContent = '';
    document.getElementById("reset").style.display = "none";
    document.querySelector('button').innerHTML = '<i class="demo-icon icon-play"></i>START';
    introRun = false;
    state = {  
        "started" : false,
        "listening" : false,
        "movesMade" : 0,
        "gearPlaced": 0,
        "beleysMade" : 0,
        "justPlaced" : false,
        "anchorJustPlaced" : false,
        "aborted" : true
    };
    document.getElementById('elapsed').innerHTML = '0:00:00';
    document.getElementById('moves').textContent = '0';
    document.getElementById('belays').textContent = '0';
    document.getElementById('gear').textContent = '0';
}