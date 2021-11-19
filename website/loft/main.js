let started = false;
let wakeLock = null;

// Function that attempts to request a screen stay awake.
const requestWakeLock = async () => {
    try {
        wakeLock = await navigator.wakeLock.request();
        wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock released:', wakeLock.released);
        });
        console.log('Screen Wake Lock released:', wakeLock.released);
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};
// kick of the first task and give chrome permission to use speechSynthesis
function setStarted(value){
    requestWakeLock();
    document.querySelector('button').innerHTML = 'Stop';
    started = value;
    speak(chooseTask());
    recognition.start();
    startTimer();
    console.log('Microphone ready to receive a command.');
}

function fullscreen(elem){
if (elem.requestFullscreen) {
    elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
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

// restart in 0.2secs because the Google API won't constantly run
function startSoon (startIn = 200){
    setTimeout(function(){
        recognition.start();
    }, startIn);
}

recognition.onresult = function(event) {
    var command = event.results[0][0].transcript;				// if continuous is true the first array needs iteration
    console.log(command + ' Confidence: ' + event.results[0][0].confidence);
    processResults(command);
}

recognition.onspeechend = function() {}
recognition.onstart = function () {};

recognition.onnomatch = function(event) {
    console.log('I didn\'t recognise that command.');
    startSoon();
}
recognition.onerror = function(event) {
    console.log('Error occurred in recognition: ' + event.error);
    startSoon();
}
recognition.onend = function () {
    startSoon(1500);
};

function processResults(command){
    if(command.includes('completed')){
    speak(chooseTask());
    } else {
    speak("I didn't understand");
    }
    recognition.abort();
}

function chooseTask(){
    // ToDo: Make all these configurable 
    let limb = ["left arm", "right arm", "left leg", "right leg"]
    let color = ["white", "yellow", "orange", "grey", "red", "pink", "blue", "purple", "black", "green"]
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

function speak(inputTxt){
    if (started === true){										// Chrome needs user activation
    var utterThis = new SpeechSynthesisUtterance(inputTxt);
    window.speechSynthesis.speak(utterThis);
    }
}

// To Count Elapsed time... why not eh
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