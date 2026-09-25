// A plain lap timer. The clock is worked out from wall clock time rather than by
// counting ticks, so a backgrounded tab or a slow phone can't make it drift.

const logKey = "lapTimerLog";
const currentKey = "lapTimerCurrent";

// session.startedAt is the moment the current running stretch began, or null when
// paused. session.banked is every completed stretch added up. Laps are only ever
// counted - the time of an individual lap isn't tracked.
let session = null;
let ticker = null;

// today(), getLog(), setLog(), saveCurrent() and the session log are shared -
// see common/functions.js. The session is written to local storage on every
// change, so closing the tab by accident doesn't lose the clock.

function isRunning(){
    return session !== null && session.startedAt !== null;
}

function elapsed(){
    if(session === null){ return 0; }
    return session.banked + (session.startedAt === null ? 0 : Date.now() - session.startedAt);
}

// h:mm:ss, to match the timer in the Loft app
function formatTime(milliseconds){
    let whole = Math.floor(milliseconds / 1000);
    let hours = Math.floor(whole / 3600);
    let minutes = Math.floor((whole % 3600) / 60);
    let seconds = whole % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/* Timer */

function toggleTimer(){
    isRunning() ? pauseTimer() : startTimer();
}

function startTimer(){
    if(session === null){
        session = { "id" : Date.now(), "date" : today(), "banked" : 0, "startedAt" : null, "laps" : 0, "rating" : 0 };
    }
    session.startedAt = Date.now();
    delete session.missing; // clocked from here on, so no longer typed in
    requestWakeLock();
    saveCurrent(currentKey, session);
    disarmReset(); // the button is on its way out, don't leave it reading SURE?
    startTicking();
    drawAll();
}

function pauseTimer(){
    if(!isRunning()){ return; }
    session.banked = elapsed();
    session.startedAt = null;
    saveCurrent(currentKey, session);
    stopTicking();
    drawAll();
}

// The display only shows whole seconds, but it is redrawn more often than that so
// it never sits a second behind the clock it is reporting.
function startTicking(){
    if(ticker === null){
        ticker = setInterval(drawTime, 250);
    }
}

function stopTicking(){
    if(ticker !== null){
        clearInterval(ticker);
        ticker = null;
    }
    drawTime(); // land on the exact paused time
}

function recordLap(){
    if(!isRunning()){ return; }
    session.laps = session.laps + 1;
    saveCurrent(currentKey, session);
    let button = document.getElementById("lapButton");
    button.classList.add("flash");
    setTimeout(function(){ button.classList.remove("flash"); }, 250);
    drawAll();
}

// confirmReset is in common/functions.js - the first tap only arms the button
function resetTimer(){
    confirmReset("resetButton", session !== null && (elapsed() > 0 || session.laps > 0), clearSession);
}

function clearSession(){
    stopTicking();
    session = null;
    saveCurrent(currentKey, session);
    releaseWakeLock();
    disarmReset();
    resetSavePanel();   // stars and note, ready for the next session
    document.getElementById("endingDiv").style.display = "none";
    drawAll();  // and the missing session fields go with it
}

/* A missing session - one that happened but never went through the timer. It is
   an ordinary paused session with the clock and lap count typed in rather than
   run up, so the save panel, the stars and the note all work as they always do. */

function addMissingSession(){
    if(session !== null){ return; }
    session = { "id" : Date.now(), "date" : today(), "banked" : 0, "startedAt" : null, "laps" : 0, "rating" : 0, "missing" : true };
    saveCurrent(currentKey, session);
    drawMissingFields();
    hideAbout();
    openSavePanel();
}

function drawMissingFields(){
    let whole = Math.floor(session.banked / 1000);
    document.getElementById("missingDate").value = session.date;
    document.getElementById("missingDate").max = today();
    document.getElementById("missingMinutes").value = Math.floor(whole / 60);
    document.getElementById("missingLaps").value = session.laps;
}

function setMissing(){
    if(session === null || !session.missing){ return; }
    let number = id => Math.max(0, Math.floor(Number(document.getElementById(id).value) || 0));
    let date = document.getElementById("missingDate").value;
    if(date){ session.date = date; }
    // minutes only - an hour long session is rare enough to be typed as 65
    session.banked = number("missingMinutes") * 60 * 1000;
    session.laps = number("missingLaps");
    saveCurrent(currentKey, session);
    drawAll();
}

/* Saving */

function openSavePanel(){
    pauseTimer();
    document.getElementById("endingDiv").style.display = "block";
    drawAll(); // now the save panel is up, FINISH SESSION greys out
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

// setStar() paints the stars; this is what the lap timer does with the number
function onRatingChange(value){
    if(session){ session.rating = value; saveCurrent(currentKey, session); }
}

/* What a lap timer session is called in the log. Everything else about the list -
   the table, the stars, the two tap delete, the stats line - is drawSessionLog()
   in common/functions.js. */
const logView = {
    "key" : logKey,
    "describe" : entry => ({
        "title" : `${entry.laps} lap${entry.laps === 1 ? "" : "s"}`,
        "detail" : `${formatTime(entry.total)} on the clock`
    }),
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let totalLaps = log.reduce((total, entry) => total + entry.laps, 0);
        let totalTime = log.reduce((total, entry) => total + entry.total, 0);
        return `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${totalLaps} laps · ${formatTime(totalTime)} on the clock`;
    }
};

function saveSession(){
    let log = getLog(logKey);
    log.push({
        // the log is sorted by id, so a missing session takes its place by the day
        // it was done rather than the day it was typed in
        "id" : session.missing ? Date.parse(session.date) + Date.now() % 86400000 : session.id,
        "date" : session.date,
        "total" : elapsed(),
        "laps" : session.laps,
        "rating" : session.rating,
        "comment" : sessionComment
    });
    setLog(logKey, log);
    clearSession();
    drawSessionLog(logView);
    openInfoBox();
}

/* Drawing */

function drawTime(){
    document.getElementById("elapsed").innerText = formatTime(elapsed());
}

function drawAll(){
    let running = isRunning();
    let started = session !== null;
    let saving = document.getElementById("endingDiv").style.display === "block";

    drawTime();
    document.getElementById("lapCount").innerText = started ? session.laps : 0;
    document.getElementById("primaryButton").innerHTML = running
        ? '<i class="demo-icon icon-pause"></i>PAUSE'
        : `<i class="demo-icon icon-play"></i>${started ? "RESUME" : "START SESSION"}`;
    // RESET is only offered while the clock is stopped, so it can't be hit by
    // mistake reaching for LAP mid session
    document.getElementById("resetButton").style.display = started && !running ? "inline-block" : "none";
    // LAP and FINISH SESSION appear together once a session is under way, and
    // grey out rather than disappearing after that - if one came and went on its
    // own the other would slide across into its column
    document.getElementById("lapButton").style.display = started ? "inline-block" : "none";
    document.getElementById("lapButton").disabled = !running;
    document.getElementById("finishButton").style.display = started ? "inline-block" : "none";
    document.getElementById("finishButton").disabled = saving;
    // one session at a time - a missing one waits until this one is done with
    document.getElementById("addMissingLink").style.display = started ? "none" : "inline";
    document.getElementById("missingDiv").style.display = started && session.missing ? "block" : "none";
}




// Space to lap and Escape to pause, for anyone using this with a keyboard. Keys
// pressed while a button has focus are left alone so they do that button's job.
document.addEventListener('keydown', (event) => {
    if(document.getElementById("about").style.display === "block"){ return; }
    if(event.target.tagName === "BUTTON" || event.target.tagName === "INPUT"){ return; }
    if(event.code === "Space" && isRunning()){
        event.preventDefault();
        recordLap();
    }
    if(event.code === "Escape" && isRunning()){
        pauseTimer();
    }
});

window.addEventListener('DOMContentLoaded', (event) => {
    let current = localStorage.getItem(currentKey);
    if(current){
        session = JSON.parse(current);
        if(isRunning()){
            requestWakeLock();
            startTicking();
        }
        setStar(session.rating);
        if(session.missing){
            drawMissingFields();
            openSavePanel();
        }
    }
    drawAll();
    drawSessionLog(logView);
});
