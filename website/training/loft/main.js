/* Climbing Twister, for the loft wall: say "next" and it calls out a limb and a
   hold colour to move it to. Trad mode now and then says to place gear, or to
   build a belay.

   What is on screen follows body[data-state]: idle, counting (the three, two,
   one), running, paused or saving (see style.css). */

const app = { "logKey" : "loftLog" };
const limbs = ["left arm", "right arm", "left leg", "right leg"];
const gear = ["cam", "nut", "sling"];
const defaultColours = ["white", "yellow", "orange", "grey", "red", "pink", "blue", "purple", "black", "green"];

let colours = [];
let moves = freshMoves();
let paused = true;       // the clock and the listening are stopped
let countedIn = false;   // this session's countdown has run
let listening = false;   // the recogniser is on, from its start to its end

function freshMoves(){
    return { "made" : 0, "gear" : 0, "belays" : 0, "justPlaced" : false, "anchorJustPlaced" : false };
}

const clock = secondsClock(seconds => {
    if(seconds === 1){ background(""); }   // the countdown's yellow goes after a second
    document.getElementById("elapsed").innerText = formatClock(seconds);
});

/* Listening for "next" */
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = Recognition ? new Recognition() : null;
if(recognition !== null){
    recognition.continuous = false;
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { listening = true; };
    recognition.onend = () => {
        listening = false;
        listen();   // a phrase heard, or silence timed out: carry on listening
    };
    recognition.onresult = event => {
        if(event.results[0][0].transcript.includes("next")){ speak(chooseTask()); }
    };
}

function listen(){
    if(recognition !== null && !paused && !listening){ recognition.start(); }
}

/* Colours: a name to call out and a colour to paint with it. An older version
   stored only the name, which is brought up to that shape here. */
function asColour(entry){
    return typeof entry === "string" ? { "name" : entry, "colour" : entry } : entry;
}

function loadColours(){
    let stored = localStorage.getItem("colours");
    colours = stored ? JSON.parse(stored).map(asColour) : defaultColours.map(asColour);
    localStorage.setItem("colours", JSON.stringify(colours));
    colours.forEach(colour => addColourChip(colour, true));
    defaultColours.filter(name => !colours.some(colour => colour.name === name))
        .forEach(name => addColourChip(asColour(name), false));
}

// Black or white, whichever reads on the colour. A name is left to the browser to resolve.
function inkFor(colour){
    let hex = String(colour).replace("#", "");
    let rgb = null;
    if(/^[0-9a-f]{6}$/i.test(hex)){ rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)); }
    else if(/^[0-9a-f]{3}$/i.test(hex)){ rgb = hex.split("").map(c => parseInt(c + c, 16)); }
    else {
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

// A chip wearing the colour, on or off
function addColourChip(colour, on){
    let id = "colour-" + colour.name.replace(/[^a-z0-9]/gi, "").toLowerCase();   // a typed name could be anything
    document.getElementById("coloursHolder").insertAdjacentHTML("beforeend", `
        <input type="checkbox" class="nice-radios holds" id="${id}" data-change="updateColours" data-name="${colour.name}" data-colour="${colour.colour}"${on ? " checked" : ""} />
        <label for="${id}" class="colour-chip" style="--chip: ${colour.colour}; --chip-ink: ${inkFor(colour.colour)}">${colour.name}</label>`);
}

function addColour(){
    let name = document.getElementById("newColour").value.trim();
    if(name === ""){ return; }
    addColourChip({ "name" : name, "colour" : document.getElementById("newColourSwatch").value }, true);
    document.getElementById("newColour").value = "";
    updateColours();
}

function updateColours(){
    colours = [...document.querySelectorAll(".holds")]
        .filter(chip => chip.checked)
        .map(chip => ({ "name" : chip.dataset.name, "colour" : chip.dataset.colour }));
    localStorage.setItem("colours", JSON.stringify(colours));
}

/* Trad mode */
function tradMode(){
    return JSON.parse(localStorage.getItem("tradMode") || "false") === true;
}

function toggleTradMode(input){
    localStorage.setItem("tradMode", JSON.stringify(input.checked));
    showTradMode();
}

function showTradMode(){
    let on = tradMode();
    document.getElementById("tradMode").checked = on;
    document.getElementById("gearDiv").hidden = !on;
    document.getElementById("belaysDiv").hidden = !on;
}

/* The session */

function drawState(state){
    showState(state);
    document.getElementById("primaryButton").innerHTML = paused
        ? `<i class="demo-icon icon-play"></i>${countedIn ? "RESUME" : "START SESSION"}`
        : '<i class="demo-icon icon-pause"></i>PAUSE';
}

function toggleSession(){
    paused ? resumeSession() : pauseSession();
}

// The first start counts in, and says the first move as it ends
function resumeSession(){
    requestWakeLock();
    paused = false;
    disarmReset();
    if(countedIn){
        listen();
        clock.start();
        drawState("running");
        return;
    }
    let button = document.getElementById("primaryButton");
    button.disabled = true;   // nothing to pause until the voice has had its say
    drawState("counting");
    countdown(() => {
        background("");
        speak(chooseTask());
        countedIn = true;
        listen();
        clock.start();
        button.disabled = false;
        drawState("running");
    });
}

function pauseSession(){
    if(paused){ return; }
    paused = true;
    if(recognition !== null){ recognition.abort(); }
    clock.stop();
    drawState("paused");
}

function chooseTask(){
    // in trad mode, every eighth move is gear - and every fourth piece a belay
    if(tradMode() && moves.made % 8 === 0 && moves.made !== 0 && !moves.justPlaced && !moves.anchorJustPlaced){
        document.getElementById("color").style.backgroundColor = "white";
        if(moves.gear % 4 === 0 && moves.gear !== 0){
            moves.anchorJustPlaced = true;
            moves.belays += 1;
            return showTask("Build a belay and take a rest");
        }
        moves.gear += 1;
        moves.justPlaced = true;
        return showTask("Place a " + gear[Math.floor(Math.random() * gear.length)]);
    }
    let limb = limbs[Math.floor(Math.random() * limbs.length)];
    let colour = colours[Math.floor(Math.random() * colours.length)];
    moves.made += 1;
    moves.justPlaced = false;
    moves.anchorJustPlaced = false;
    document.getElementById("color").style.backgroundColor = colour.colour;   // painted; the name is said
    return showTask(limb + " to " + colour.name);
}

function showTask(task){
    document.getElementById("task").innerText = task;
    document.getElementById("moves").innerText = moves.made;
    document.getElementById("gear").innerText = moves.gear;
    document.getElementById("belays").innerText = moves.belays;
    return task;
}

/* Saving: how long it ran and how many moves were called */

function openSavePanel(){
    pauseSession();
    drawState("saving");
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

const logView = {
    "key" : app.logKey,
    "describe" : entry => ({
        "title" : plural(entry.moves, "move"),
        "detail" : `${formatClock(entry.seconds)} on the clock`
    }),
    "stats" : log => {
        let moveCount = log.reduce((total, entry) => total + entry.moves, 0);
        let time = log.reduce((total, entry) => total + entry.seconds, 0);
        return `${sessionCount(log)} · ${moveCount} moves · ${formatClock(time)} on the clock`;
    }
};

function saveSession(){
    saveToLog(app.logKey, {
        "id" : Date.now(),
        "date" : today(),
        "seconds" : clock.seconds,
        "moves" : moves.made,
        "rating" : sessionRating,
        "comment" : sessionComment
    });
    clearSession();
    drawSessionLog(logView);
    openInfoBox();
}

function reset(){
    confirmReset("reset", moves.made > 0 || clock.seconds > 0, clearSession);
}

function clearSession(){
    releaseWakeLock();
    resetSavePanel();
    clock.reset();
    paused = true;
    countedIn = false;
    moves = freshMoves();
    document.getElementById("color").style.backgroundColor = "";
    document.getElementById("elapsed").innerText = formatClock(0);
    showTask("");
    drawState("idle");
}

document.addEventListener("DOMContentLoaded", () => {
    loadColours();
    showTradMode();
    drawSessionLog(logView);
    document.getElementById("browserSupport").hidden = recognition !== null;
});
