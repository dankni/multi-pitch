/* The session in the apps that log what was climbed - the tick list, the gym
   session and trad. Start one, tap what you climbed, finish, rate and save; a
   saved one can be reopened from the log with the wrench.

   The app describes what differs in a global `app`:

     const app = {
         logKey, currentKey,
         newSession : () => the fields a new session starts with,
         fromEntry  : entry => the same, from a saved log entry,
         toEntry    : session => the fields to save,
         hasClimbs  : session => whether there is anything to lose,
         draw       : () => draw the session on screen,
         onLoad     : () => set up before a session is picked back up (optional),
         onOpen     : () => anything else when a session opens (optional),
         onSaved    : () => anything else once one is saved (optional),
         logView    : what drawSessionLog() is given
     };

   What is on screen follows body[data-state] - idle, running or saving - in
   common/log.css. */

function startSession(){
    session = Object.assign({ "id" : Date.now(), "date" : today(), "rating" : 0, "editing" : false }, app.newSession());
    openSession();
}

function editSession(id){
    let entry = getLog(app.logKey).find(item => item.id === id);
    if(!entry){ return; }
    session = Object.assign({ "id" : entry.id, "date" : entry.date, "rating" : entry.rating, "editing" : true }, app.fromEntry(entry));
    setSessionComment(entry.comment);   // or saving again would wipe it
    hideAbout();
    openSession();
}

// A new session, one reopened from the log, or one picked back up after a reload
function openSession(){
    requestWakeLock();
    keepSession();
    showState("running");
    document.getElementById("sessionDate").value = session.date;
    document.getElementById("saveSession").innerText = session.editing ? "UPDATE SESSION" : "SAVE SESSION";
    disarmReset();
    if(app.onOpen){ app.onOpen(); }
    app.draw();
    setStar(session.rating);
}

function closeSession(){
    session = null;
    resetSavePanel();
    keepSession();
    showState("idle");
    releaseWakeLock();
}

// A session logged on the way home is still that day's
function setSessionDate(input){
    if(session && input.value){
        session.date = input.value;
        keepSession();
    }
}

function openSavePanel(){
    showState("saving");
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

function saveSession(){
    saveToLog(app.logKey, Object.assign({ "id" : session.id, "date" : session.date }, app.toEntry(session),
        { "rating" : session.rating, "comment" : sessionComment }));
    closeSession();
    drawSessionLog();
    if(app.onSaved){ app.onSaved(); }
    openInfoBox();
}

function discardSession(){
    confirmReset("discard", session !== null && app.hasClimbs(session), closeSession);
}

// Sessions here can be dated by hand, so the log is in date order rather than id order
function byDate(a, b){
    return b.date.localeCompare(a.date);
}

document.addEventListener("DOMContentLoaded", () => {
    if(app.onLoad){ app.onLoad(); }
    if(restoreSession()){ openSession(); }
    drawSessionLog(app.logView);
});
