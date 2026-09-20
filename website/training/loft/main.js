let state = {  
    "started" : false,
    "movesMade" : 0,
    "gearPlaced": 0,
    "beleysMade" : 0,
    "justPlaced" : false,
    "anchorJustPlaced" : false,
    "aborted" : false
};
// Where saved sessions live - drawn by the shared log in common/functions.js
const logKey = "loftLog";

// Global Options
let colours;
let limb = ["left arm", "right arm", "left leg", "right leg"];
let gear = ["cam", "nut", "sling"];

// When the HTML Document Object Model is loaded
document.addEventListener("DOMContentLoaded", (event) => {
    document.getElementById('primaryButton').addEventListener('click',setStarted);
    getOrSetColours();
    checkTradMode();
    drawSessionLog(logView);
    // check browser support
    if(SpeechRecognition || webkitSpeechRecognition) { 
        document.getElementById('browserSupport').remove();
    }
});

// Get or set the colors
/* A colour is two things: the word the app calls out, and the colour it paints
   while it says it. They used to be one string, which works while the word is a
   CSS colour ("yellow") and not at all once someone picks a shade by hand - so a
   colour is a { name, colour } pair, and anything stored by an older version is
   brought up to that shape on load. */
function asColour(entry){
    return typeof entry === "string" ? { "name" : entry, "colour" : entry } : entry;
}

function getOrSetColours(){
    let defaultColours = ["white", "yellow", "orange", "grey", "red", "pink", "blue", "purple", "black", "green"];
    let stored = localStorage.getItem("colours");
    colours = stored ? JSON.parse(stored).map(asColour) : defaultColours.map(asColour);
    localStorage.setItem("colours", JSON.stringify(colours));

    colours.forEach(colour => addColorSwitch(colour, "On"));
    defaultColours.forEach(name => {
        if(!colours.some(colour => colour.name === name)){
            addColorSwitch(asColour(name), "Off");
        }
    });
}

/* Black or white, whichever can be read on the colour. Hex is worked out here;
   a name is handed to the browser to resolve, since it knows what "rebeccapurple"
   is and this does not. */
function inkFor(colour){
    let hex = String(colour).replace("#", "");
    let rgb = null;
    if(/^[0-9a-f]{6}$/i.test(hex)){ rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); }
    else if(/^[0-9a-f]{3}$/i.test(hex)){ rgb = hex.split("").map(c => parseInt(c + c, 16)); }
    else if(document.body){
        let probe = document.createElement("span");
        probe.style.color = colour;
        document.body.appendChild(probe);
        let computed = getComputedStyle(probe).color.match(/\d+/g);
        probe.remove();
        if(computed){ rgb = computed.slice(0, 3).map(Number); }
    }
    if(rgb === null){ return "#111111"; }
    return ((0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2])) / 255 > 0.55 ? "#111111" : "#FFFFFF";
}


/* A colour is a chip, the same one the grade and difficulty pickers use: filled
   when it is in play, grey when it is not, and a row of them wraps rather than
   stacking ten switches down the panel. The dot keeps the colour itself. */
/* A chip per colour, wearing the colour. No swatch icon beside the word - the
   chip is the swatch. */
function addColorSwitch(entry, status){
    let colour = asColour(entry);
    let coloursHolder = document.getElementById("coloursHolder");
    // a name someone typed in could be anything; an id cannot
    let id = "colour-" + colour.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
    let check = status === "On" ? ' checked="checked"' : '';

    coloursHolder.innerHTML += `
			<input type="checkbox" class="nice-radios holds" id="${id}" onchange="updateColors()" data-name="${colour.name}" data-colour="${colour.colour}"${check} />
			<label for="${id}" class="colour-chip" style="--chip: ${colour.colour}; --chip-ink: ${inkFor(colour.colour)}">${colour.name}</label>`;
}

/* The add row under the chips: a name to say, and the colour to paint with it. */
function addColour(){
    let name = document.getElementById("newColour").value.trim();
    if(name === ""){ return; }
    addColorSwitch({ "name" : name, "colour" : document.getElementById("newColourSwatch").value }, "On");
    document.getElementById("newColour").value = "";
    updateColors();
}



function updateColors(){
    // a chip shows its own state, so there is no word to keep in step
    colours = [...document.querySelectorAll(".holds")]
        .filter(chip => chip.checked === true)
        .map(chip => ({ "name" : chip.dataset.name, "colour" : chip.dataset.colour }));
    localStorage.setItem("colours", JSON.stringify(colours));
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
        disarmReset(); // the button is on its way out, don't leave it reading SURE?
    } else {
        pauseSession();

    }
    
}

/* Stopping the clock without ending the session - what PAUSE does, and the
   first thing FINISH SESSION does. */
function pauseSession(){
    if(stoptime === true){ return; } // the clock is already stopped
    state.aborted = true; // so it stops listening
    state.started === false; // so it can resume on next click
    recognition.abort();
    stopTimer();
    document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-play"></i>RESUME';
    document.getElementById('reset').style.display = 'inline-block';
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
var recognition = new SpeechRecognition();
recognition.continuous = false; // keeps service open to allow multiple words if true
recognition.lang = 'en-GB';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

function startSoon (){
    if(!state.started){ 
        recognition.start();
    }
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
    // the swatch is painted, the name is spoken
    document.getElementById('color').style.backgroundColor = randomColor.colour;
    document.getElementById('task').innerHTML = randomLimb + " to " + randomColor.name;
    return randomLimb + " to " + randomColor.name;
}

// To Count Elapsed time
let hr = 0;
let min = 0;
let sec = 0;
let stoptime = true;
let introRun = false;

function startTimer() {

    if(introRun === false && stoptime === true) {
        // Nothing to pause until the session is actually running, and the
        // countdown can't be stopped once the voice is underway, so take the
        // button out of play until the first task is announced.
        let button = document.getElementById('primaryButton');
        button.disabled = true;
        countdown(function(){ // in common/functions.js, paced by the voice
            background(""); // default
            speak(chooseTask());
            recognition.start();
            introRun = true;
            startCycle();
            button.disabled = false;
            // there is a session to save from here on
            document.getElementById('finishButton').style.display = 'inline-block';
        });
        return;
    }
    if (introRun === true && stoptime == true) {
        recognition.start(); // restart listening 
        startCycle();
    }
}

// Starts the clock ticking a full second from now, so the display reads 0:00:00
// for its first second instead of jumping straight to 0:00:01 and staying a
// second ahead of the session for good.
function startCycle(){
    stoptime = false;
    setTimeout(timerCycle, debug ? 100 : 1000);
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


    document.getElementById('elapsed').innerHTML = hr + ':' + min + ':' + sec;
    setTimeout(timerCycle, debug ? 100 : 1000);
    }
}

/* Saving

   A session can be saved whenever there is one, the way the lap timer's can -
   FINISH SESSION stops the clock and asks for a rating. Only the two numbers on
   screen are kept: how long it ran and how many moves were called. */

// hr, min and sec are what the clock shows, and carry leading zeros
function elapsedSeconds(){
    return (parseInt(hr, 10) * 3600) + (parseInt(min, 10) * 60) + parseInt(sec, 10);
}

function formatTime(seconds){
    let whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 3600)}:${String(Math.floor(whole % 3600 / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

function openSavePanel(){
    pauseSession();
    document.getElementById("endingDiv").style.display = "block";
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

/* What a loft session is called in the log. The table, the stars, the two tap
   delete and the stats line are drawSessionLog() in common/functions.js. */
const logView = {
    "key" : logKey,
    "describe" : entry => ({
        "title" : `${entry.moves} move${entry.moves === 1 ? "" : "s"}`,
        "detail" : `${formatTime(entry.seconds)} on the clock`
    }),
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let totalMoves = log.reduce((total, entry) => total + entry.moves, 0);
        let totalTime = log.reduce((total, entry) => total + entry.seconds, 0);
        return `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${totalMoves} moves · ${formatTime(totalTime)} on the clock`;
    }
};

function saveSession(){
    let log = getLog(logKey);
    log.push({
        "id" : Date.now(),
        "date" : today(),
        "seconds" : elapsedSeconds(),
        "moves" : state.movesMade,
        "rating" : sessionRating,  // set by setStar() in common/functions.js
        "comment" : sessionComment
    });
    setLog(logKey, log);
    clearSession();
    drawSessionLog(logView);
    openInfoBox();
}

// confirmReset is in common/functions.js - the first tap only arms the button
function reset() {
    confirmReset("reset", state.movesMade > 0 || hr > 0 || min > 0 || sec > 0, clearSession);
}

function clearSession() {
    releaseWakeLock(); // the session is over, the screen can sleep
    resetSavePanel();   // stars and note, ready for the next session
    document.getElementById("endingDiv").style.display = "none";
    document.getElementById("finishButton").style.display = "none";
    hr = 0;
    min = 0;
    sec = 0;
    stoptime = true;
    document.getElementById('color').style.backgroundColor = '';
    document.getElementById('task').textContent = '';
    document.getElementById("reset").style.display = "none";
    document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-play"></i>START SESSION';
    introRun = false;
    state = {  
        "started" : false,
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