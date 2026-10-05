/* A workout that runs to a clock once counted in: rock rings and no hangs.

   The app gives `app`:
     clock    : a secondsClock()
     onGo     : called as the count in ends, before the clock starts
     onReset  : put the app's own screen back as it was
     logEntry : what a saved session records beyond its id, date, rating and note
     logView  : for drawSessionLog()

   What is on screen follows body[data-state] - idle, counting (the three, two,
   one), running, paused or finished - and data-saving once the save panel is up.
   See common/workout.css. */

let paused = true;
let countedIn = false;

function toggleSession(){
    paused ? startSession() : pauseSession();
}

function drawState(state){
    showState(state);
    document.getElementById("primaryButton").innerHTML = paused
        ? `<i class="demo-icon icon-play"></i>${countedIn ? "RESUME" : "START SESSION"}`
        : '<i class="demo-icon icon-pause"></i>PAUSE';
}

function showElapsed(seconds){
    document.getElementById("elapsed").innerText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function showSavePanel(){
    document.body.setAttribute("data-saving", "");
}

// The first start counts in
function startSession(){
    requestWakeLock();
    unlockAudio();
    paused = false;
    if(countedIn){
        app.clock.start();
        drawState("running");
        return;
    }
    let button = document.getElementById("primaryButton");
    button.disabled = true;   // nothing to pause until the countdown has had its say
    drawState("counting");
    countdown(() => {
        countedIn = true;
        drawState("running");
        app.onGo();
        app.clock.start();
        button.disabled = false;
    });
}

function pauseSession(){
    paused = true;
    app.clock.stop();
    drawState("paused");
}

// The clock has run out: nothing left but to save or reset
function finishSession(){
    paused = true;
    app.clock.stop();
    releaseWakeLock();
    showSavePanel();
    drawState("finished");
}

function reset(){
    releaseWakeLock();
    app.clock.reset();
    paused = true;
    countedIn = false;
    background("");
    showElapsed(0);
    document.body.removeAttribute("data-saving");
    app.onReset();
    drawState("idle");
}

function saveSession(){
    saveToLog(app.logKey, Object.assign({ "id" : Date.now(), "date" : today() }, app.logEntry(), {
        "rating" : sessionRating,
        "comment" : sessionComment
    }));
    document.body.removeAttribute("data-saving");
    resetSavePanel();
    drawSessionLog(app.logView);
}
