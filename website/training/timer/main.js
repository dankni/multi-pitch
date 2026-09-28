/* A plain lap timer. The clock is worked out from the time of day rather than by
   counting ticks, so a backgrounded tab or a slow phone can't make it drift:
   session.startedAt is when the current run began (null when paused) and
   session.banked is every run before it added up.

   What is on screen follows body[data-state] - idle, running, paused or saving -
   and data-missing while a missing session is typed in (see style.css). */

const app = {
    "logKey" : "lapTimerLog",
    "currentKey" : "lapTimerCurrent"
};

let ticker = null;
let saving = false;

function isRunning(){
    return session !== null && session.startedAt !== null;
}

function elapsed(){
    if(session === null){ return 0; }
    return session.banked + (session.startedAt === null ? 0 : Date.now() - session.startedAt);
}

/* The clock */

function toggleTimer(){
    isRunning() ? pauseTimer() : startTimer();
}

function startTimer(){
    if(session === null){
        session = { "id" : Date.now(), "date" : today(), "banked" : 0, "startedAt" : null, "laps" : 0, "rating" : 0 };
    }
    session.startedAt = Date.now();
    delete session.missing;   // clocked from here on, not typed in
    requestWakeLock();
    keepSession();
    disarmReset();
    startTicking();
    drawAll();
}

function pauseTimer(){
    if(!isRunning()){ return; }
    session.banked = elapsed();
    session.startedAt = null;
    keepSession();
    stopTicking();
    drawAll();
}

// More often than once a second, so the display never sits a second behind
function startTicking(){
    if(ticker === null){ ticker = setInterval(drawTime, 250); }
}

function stopTicking(){
    clearInterval(ticker);
    ticker = null;
    drawTime();
}

function recordLap(){
    if(!isRunning()){ return; }
    session.laps = session.laps + 1;
    keepSession();
    let button = document.getElementById("lapButton");
    button.classList.add("flash");
    setTimeout(() => button.classList.remove("flash"), 250);
    drawAll();
}

function resetTimer(){
    confirmReset("resetButton", session !== null && (elapsed() > 0 || session.laps > 0), clearSession);
}

function clearSession(){
    stopTicking();
    session = null;
    saving = false;
    keepSession();
    releaseWakeLock();
    disarmReset();
    resetSavePanel();
    drawAll();
}

/* A missing session: one that happened but never went through the timer. It is
   an ordinary paused session with the time and laps typed in, saved the usual way. */

function addMissingSession(){
    if(session !== null){ return; }
    session = { "id" : Date.now(), "date" : today(), "banked" : 0, "startedAt" : null, "laps" : 0, "rating" : 0, "missing" : true };
    keepSession();
    drawMissingFields();
    hideAbout();
    openSavePanel();
}

function drawMissingFields(){
    document.getElementById("missingDate").value = session.date;
    document.getElementById("missingDate").max = today();
    document.getElementById("missingMinutes").value = Math.floor(session.banked / 60000);
    document.getElementById("missingLaps").value = session.laps;
}

function setMissing(){
    if(session === null || !session.missing){ return; }
    let number = id => Math.max(0, Math.floor(Number(document.getElementById(id).value) || 0));
    let date = document.getElementById("missingDate").value;
    if(date){ session.date = date; }
    session.banked = number("missingMinutes") * 60 * 1000;   // minutes only - an hour is typed as 60
    session.laps = number("missingLaps");
    keepSession();
    drawAll();
}

/* Saving */

function openSavePanel(){
    pauseTimer();
    saving = true;
    drawAll();
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

const logView = {
    "key" : app.logKey,
    "describe" : entry => ({
        "title" : plural(entry.laps, "lap"),
        "detail" : `${formatClock(entry.total / 1000)} on the clock`
    }),
    "stats" : log => {
        let laps = log.reduce((total, entry) => total + entry.laps, 0);
        let time = log.reduce((total, entry) => total + entry.total, 0);
        return `${sessionCount(log)} · ${laps} laps · ${formatClock(time / 1000)} on the clock`;
    }
};

function saveSession(){
    saveToLog(app.logKey, {
        // a missing session takes its place in the log by the day it was done
        "id" : session.missing ? Date.parse(session.date) + Date.now() % 86400000 : session.id,
        "date" : session.date,
        "total" : elapsed(),
        "laps" : session.laps,
        "rating" : session.rating,
        "comment" : sessionComment
    });
    clearSession();
    drawSessionLog(logView);
    openInfoBox();
}

/* Drawing */

function drawTime(){
    document.getElementById("elapsed").innerText = formatClock(elapsed() / 1000);
}

function drawAll(){
    let running = isRunning();
    let started = session !== null;
    showState(!started ? "idle" : saving ? "saving" : running ? "running" : "paused");
    document.body.toggleAttribute("data-missing", started && session.missing === true);
    drawTime();
    document.getElementById("lapCount").innerText = started ? session.laps : 0;
    document.getElementById("primaryButton").innerHTML = running
        ? '<i class="demo-icon icon-pause"></i>PAUSE'
        : `<i class="demo-icon icon-play"></i>${started ? "RESUME" : "START SESSION"}`;
    // LAP greys out while paused rather than going, or FINISH would slide into its place
    document.getElementById("lapButton").disabled = !running;
    document.getElementById("finishButton").disabled = saving;
}

// Space to lap and Escape to pause, when no button or field has the key
document.addEventListener("keydown", event => {
    if(isOpen("about") || event.target.tagName === "BUTTON" || event.target.tagName === "INPUT"){ return; }
    if(event.code === "Space" && isRunning()){
        event.preventDefault();
        recordLap();
    }
    if(event.code === "Escape" && isRunning()){
        pauseTimer();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if(restoreSession()){
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
