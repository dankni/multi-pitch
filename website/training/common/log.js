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
         logView    : what drawSessionLog() is given,
         timed      : true to save start, finish and minutes (optional)
     };

   What is on screen follows body[data-state] - idle, running or saving - in
   common/log.css. */

function startSession(){
    session = Object.assign({ "id" : Date.now(), "date" : today(), "rating" : 0, "comment" : "", "title" : "", "editing" : false }, app.newSession());
    if(app.timed){ session.start = session.id; }
    openSession();
}

function timing(from){
    return app.timed ? sessionTiming(from) : {};
}

function editSession(id){
    let entry = getLog(app.logKey).find(item => item.id === id);
    if(!entry){ return; }
    session = Object.assign({ "id" : entry.id, "date" : entry.date, "rating" : entry.rating, "comment" : entry.comment, "title" : entry.title, "editing" : true },
        timing(entry), app.fromEntry(entry));
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
    setSessionComment(session.comment);
    setSessionTitle(session.title);
}

// The note and title are written during the session, so they are kept with it like a climb
function keepComment(){
    if(session){
        session.comment = sessionComment;
        session.title = sessionTitle;
        keepSession();
    }
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

/* Started and finished, to put right before saving: a start forgotten until the
   second climb, or a finish tapped on the drive home. A time is on the session's
   date, and a finish before the start is the next morning. */
function clockTime(at){
    let when = new Date(at);
    return String(when.getHours()).padStart(2, "0") + ":" + String(when.getMinutes()).padStart(2, "0");
}

function drawSessionTimes(){
    document.getElementById("sessionStart").value = session.start ? clockTime(session.start) : "";
    document.getElementById("sessionFinish").value = session.finish ? clockTime(session.finish) : "";
    document.getElementById("sessionLengthShown").innerText = sessionLength(sessionTiming(session));
}

// Both read back, so they land on the same day whichever was changed
function setSessionTime(){
    if(!session){ return; }
    let start = document.getElementById("sessionStart").value;
    let finish = document.getElementById("sessionFinish").value;
    // local time, with no zone given
    if(start){ session.start = Date.parse(session.date + "T" + start); }
    if(finish){ session.finish = Date.parse(session.date + "T" + finish); }
    if(session.start && session.finish && session.finish < session.start){ session.finish += 86400000; }
    keepSession();
    drawSessionTimes();
}

function openSavePanel(){
    // a reopened session keeps its times; finishing again after climbing on moves the finish
    if(app.timed && !session.editing){
        session.finish = Date.now();
        keepSession();
    }
    if(app.timed){ drawSessionTimes(); }
    // the longest session is said once it is done, and not again on a reopened one - see common/records.js
    if(app.sessionSize && !session.editing){ cheerLongest(app.logKey, app.sessionSize(session), app.sessionSize); }
    showState("saving");
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

function saveSession(){
    saveToLog(app.logKey, Object.assign({ "id" : session.id, "date" : session.date }, timing(session), app.toEntry(session),
        { "rating" : session.rating, "comment" : sessionComment, "title" : titleToSave() }));
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
    // added after functions.js's data-input delegate, so runs once updateComment has read the field
    document.addEventListener("input", event => { if(event.target.id === "sessionComment" || event.target.id === "sessionTitle"){ keepComment(); } });
    if(restoreSession()){ openSession(); }
    drawSessionLog(app.logView);
});
