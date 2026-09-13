// A plain lap timer. The clock is worked out from wall clock time rather than by
// counting ticks, so a backgrounded tab or a slow phone can't make it drift.

const logKey = "lapTimerLog";
const currentKey = "lapTimerCurrent";

// session.startedAt is the moment the current running stretch began, or null when
// paused. session.banked is every completed stretch added up. Laps are only ever
// counted - the time of an individual lap isn't tracked.
let session = null;
let ticker = null;

function today(){
    return new Date().toISOString().slice(0, 10); // yyyy-mm-dd
}

function getLog(){
    let log = localStorage.getItem(logKey);
    return log ? JSON.parse(log) : [];
}

function setLog(log){
    localStorage.setItem(logKey, JSON.stringify(log));
}

// The session is held in local storage as it runs, so closing the tab by accident
// doesn't lose the clock - it is still running when the page comes back.
function saveCurrent(){
    session ? localStorage.setItem(currentKey, JSON.stringify(session)) : localStorage.removeItem(currentKey);
}

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
    requestWakeLock();
    saveCurrent();
    disarmReset(); // the button is on its way out, don't leave it reading SURE?
    startTicking();
    drawAll();
}

function pauseTimer(){
    if(!isRunning()){ return; }
    session.banked = elapsed();
    session.startedAt = null;
    saveCurrent();
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
    saveCurrent();
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
    saveCurrent();
    if(wakeLock != null){
        wakeLock.release().then(() => { wakeLock = null; });
    }
    disarmReset();
    setStar(0);
    document.getElementById("endingDiv").style.display = "none";
    drawAll();
}

/* Saving */

function openSavePanel(){
    pauseTimer();
    document.getElementById("endingDiv").style.display = "block";
    drawAll(); // now the save panel is up, FINISH SESSION greys out
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

function saveSession(){
    let log = getLog();
    log.push({
        "id" : session.id,
        "date" : session.date,
        "total" : elapsed(),
        "laps" : session.laps,
        "rating" : session.rating
    });
    setLog(log);
    clearSession();
    showSessionLog();
    openInfoBox();
}

// Only the stars in the rating panel, the log draws stars of its own
function setStar(value){
    let stars = document.querySelectorAll('.star-holder .icon-star');
    for(let i = 0; i < stars.length; i++){
        if(i < value){
            if(!stars[i].classList.contains('active')){
                stars[i].classList.add('active');
            }
        } else {
            if(stars[i].classList.contains('active')){
                stars[i].classList.remove('active');
            }
        }
    }
    if(session){
        session.rating = value;
        saveCurrent();
    }
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
        : `<i class="demo-icon icon-play"></i>${started ? "RESUME" : "START"}`;
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
}

function showSessionLog(){
    let log = getLog().sort((a, b) => b.id - a.id);
    let holder = document.getElementById("log");
    holder.innerHTML = "";

    if(log.length === 0){
        holder.innerHTML = "<p>No sessions saved yet.</p>";
        document.getElementById("stats").innerText = "";
        return;
    }

    log.forEach(entry => {
        let singleEntry = `<p>${entry.date} &ndash; ${formatTime(entry.total)} &ndash; ${entry.laps} lap${entry.laps === 1 ? "" : "s"}<br />`;
        for(let i = 0; i < 5; i++){
            singleEntry += `<i class="demo-icon icon-star ${i < entry.rating ? "active" : ""}"></i>`;
        }
        singleEntry += `<i class="demo-icon icon-trash" role="button" tabindex="0" aria-label="Delete session ${entry.date}" onclick="toggleConfirm(${entry.id})"></i>
            <span style="display:none" id="confirm${entry.id}"> Are you sure? <br />
                <i class="demo-icon icon-ok" role="button" tabindex="0" aria-label="Confirm delete" onclick="removeLog(${entry.id})"></i>
                <i class="demo-icon icon-cancel" role="button" tabindex="0" aria-label="Cancel delete" onclick="toggleConfirm(${entry.id})"></i>
            </span>
            </p>`;
        holder.innerHTML += singleEntry;
    });

    let month = today().slice(0, 7);
    let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
    let totalLaps = log.reduce((total, entry) => total + entry.laps, 0);
    let totalTime = log.reduce((total, entry) => total + entry.total, 0);
    document.getElementById("stats").innerText =
        `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${totalLaps} laps · ${formatTime(totalTime)} on the clock`;
}

function toggleConfirm(id){
    let element = document.getElementById("confirm" + id);
    element.style.display === "none" ? element.style.display = "block" : element.style.display = "none";
}

function removeLog(id){
    let log = getLog().filter(entry => entry.id !== id);
    setLog(log);
    showSessionLog();
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
    }
    drawAll();
    showSessionLog();
});
