/* A workout that runs to a clock once counted in: rock rings, no hangs and tabata.

   The app gives `app`:
     clock    : a secondsClock()
     onGo     : called as the count in ends, before the clock starts
     onReset  : put the app's own screen back as it was
     logEntry : what a saved session records beyond its id, date, rating and note
     logView  : for drawSessionLog()

   And to let a saved session be edited from the log's wrench (optional):
     onEditOpen : entry => draw the app's own part of the save panel from it
     editEntry  : () => the app's own fields to save over it

   The session saves as the clock runs out, and the stars, note and title save
   again as they change (storeFinished, from storeChange() in functions.js).

   What is on screen follows body[data-state] - idle, counting (the three, two,
   one), running, paused or finished - and data-saving once the save panel is up.
   See common/workout.css.

   app.onState, if set, is called on each change of state - common/watch.js sets it. */

let paused = true;
let countedIn = false;
let editing = null;   // the saved entry the save panel is open on, from the log
let storedId = null;  // this session's id in the log, once the finish has saved it

function toggleSession(){
    paused ? startSession() : pauseSession();
}

function drawState(state){
    showState(state);
    document.getElementById("primaryButton").innerHTML = paused
        ? `<i class="demo-icon icon-play"></i>${countedIn ? "RESUME" : "START SESSION"}`
        : '<i class="demo-icon icon-pause"></i>PAUSE';
    if(app.onState){ app.onState(); }   // the watch - see common/watch.js
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
        startHum();
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
        startHum();
        button.disabled = false;
    });
}

function pauseSession(){
    paused = true;
    app.clock.stop();
    stopHum();
    drawState("paused");
}

// The clock has run out: nothing left but to save or reset
function finishSession(){
    paused = true;
    app.clock.stop();
    stopHum();
    releaseWakeLock();
    storeWorkout();
    showSavePanel();
    drawState("finished");
}

function storeWorkout(){
    storedId = storedId || Date.now();
    saveToLog(app.logKey, Object.assign({ "id" : storedId, "date" : today() }, app.logEntry(), {
        "seconds" : app.clock.seconds   // how long it ran, for the time trained on the progress page
    }, { "rating" : sessionRating, "comment" : sessionComment, "title" : titleToSave() }));
    drawSessionLog(app.logView);
}

function storeFinished(){
    if(storedId !== null && editing === null){ storeWorkout(); }
}

function reset(){
    releaseWakeLock();
    stopHum();
    app.clock.reset();
    paused = true;
    countedIn = false;
    storedId = null;
    background("");
    showElapsed(0);
    document.body.removeAttribute("data-saving");
    if(editing !== null){
        editing = null;
        resetSavePanel();
        document.getElementById("saveSession").innerText = "SAVE SESSION";
    }
    app.onReset();
    drawState("idle");
}

// The save panel on a saved session, its workout left as it was; RESET leaves it unchanged
function editSession(id){
    if(countedIn){
        toast("Reset the session to edit a saved one", null, false, true);
        return;
    }
    let entry = getLog(app.logKey).find(item => item.id === id);
    if(!entry){ return; }
    editing = entry;
    hideAbout();
    app.onEditOpen(entry);
    setStar(entry.rating || 0);
    setSessionComment(entry.comment);
    setSessionTitle(entry.title);
    document.getElementById("saveSession").innerText = "UPDATE SESSION";
    showSavePanel();
    drawState("finished");
}

function saveSession(){
    let said = { "rating" : sessionRating, "comment" : sessionComment, "title" : titleToSave() };
    if(editing !== null){
        saveToLog(app.logKey, Object.assign({}, editing, app.editEntry(), said));
        drawSessionLog(app.logView);
        reset();
        return;
    }
    storeWorkout();   // kept till reset, as rings can save before the clock runs out
    document.body.removeAttribute("data-saving");
    resetSavePanel();
    keepNoteToast();
}
