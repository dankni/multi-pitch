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
         onKept     : () => anything else on each change to it (optional; common/watch.js sets it),
         logView    : what drawSessionLog() is given,
         timed      : true to save start, finish and minutes (optional),
         fallsKey   : where Track Attempts / Falls is kept - the app puts
                      fallsControl(climb, name) beside each climb
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
        timing(entry), app.fromEntry(entry), { "falls" : Object.assign({}, entry.falls) });
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
    document.getElementById("discard").innerHTML = `<i class="demo-icon icon-cancel"></i>${session.editing ? "CANCEL EDIT" : "DISCARD"}`;
    // a reopened session shows its start and finish from the off, to put right - or put in, if it has none
    document.body.toggleAttribute("data-editing", session.editing === true);
    if(app.timed && session.editing){ drawSessionTimes(); }
    disarmReset();
    openHeart();   // common/heartrate.js
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
    closeSummary();
    forgetHeart();
    resetSavePanel();
    keepSession();
    document.body.removeAttribute("data-editing");
    showState("idle");
    releaseWakeLock();
}

// A session logged on the way home is still that day's
function setSessionDate(input){
    if(session && input.value){
        session.date = input.value;
        keepSession();
        storeChange();
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
    storeChange();
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
    openSummary();   // common/summary.js
}

// back from the summary, to climb on
function resumeSession(){
    showState("running");
}

// on FINISH, and again as the summary changes it
function storeSession(){
    saveToLog(app.logKey, Object.assign({ "id" : session.id, "date" : session.date }, timing(session), app.toEntry(session),
        { "falls" : fallsToSave(session), "rating" : session.rating, "comment" : sessionComment, "title" : titleToSave() }));
}

function saveSession(){
    storeSession();
    closeSession();
    drawSessionLog();
    if(app.onSaved){ app.onSaved(); }
    openInfoBox();
}

function discardSession(){
    confirmReset("discard", session !== null && app.hasClimbs(session), () => {
        unstoreSession();
        closeSession();
    });
}

/* ================= Attempts and falls =================
   With Track Attempts / Falls on under the cog, a red minus and plus by each climb
   count its falls, kept on the session as { climb : count } - a grade, or a route's
   id. Not on the watch. */
const fallsIcon = '<svg class="toggle-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M4 1.5l6 3-5 3 5 3"/><path d="M10 10.5v4M7.5 12.5 10 15l2.5-2.5"/></g></svg>';

function trackingFalls(){
    return Boolean(app.fallsKey) && localStorage.getItem(app.fallsKey) === "true";
}

// beside the other switches, above dark mode
function drawFallsSetting(){
    let settings = document.getElementById("settings");
    if(!app.fallsKey || settings === null){ return; }
    let dark = settings.querySelector('[data-change="toggleDarkMode"]');
    let spot = dark === null ? null : dark.closest(".switch-label");
    let markup = `<label class="switch-label">
            <input type="checkbox" data-change="toggleTrackFalls" id="trackFalls"${trackingFalls() ? " checked" : ""} />
            <span class="label-content">${fallsIcon} Track Attempts / Falls <span class="switch-state"></span></span>
        </label>`;
    if(spot === null){ settings.insertAdjacentHTML("beforeend", markup); }
    else { spot.insertAdjacentHTML("beforebegin", markup); }
    document.body.toggleAttribute("data-falls", trackingFalls());
}

function toggleTrackFalls(input){
    localStorage.setItem(app.fallsKey, input.checked);
    document.body.toggleAttribute("data-falls", input.checked);
    if(session !== null){ app.draw(); }
}

function fallsOn(climb, from){
    let falls = (from || session || {}).falls;
    return falls && Number(falls[climb]) > 0 ? Number(falls[climb]) : 0;
}

function fallsControl(climb, name){
    if(!trackingFalls() || session === null){ return ""; }
    let count = fallsOn(climb);
    return `<div class="falls${count > 0 ? " fell" : ""}" id="falls-${climb}" data-name="${name}">
        <button type="button" class="falls-button" data-action="removeFall" data-climb="${climb}"
            aria-label="Take back a fall on ${name}"${count === 0 ? " disabled" : ""}>&minus;</button>
        <span class="falls-count" aria-label="${plural(count, "fall")} on ${name}"><small aria-hidden="true">Falls</small>${count}</span>
        <button type="button" class="falls-button" data-action="addFall" data-climb="${climb}" aria-label="Add a fall on ${name}">+</button>
    </div>`;
}

function addFall(button){
    changeFalls(button, 1);
}

function removeFall(button){
    changeFalls(button, -1);
}

// just the one control redrawn, so the scroll position stays put
function changeFalls(button, by){
    if(session === null){ return; }
    let climb = button.dataset.climb;
    let control = button.closest(".falls");
    let falls = Object.assign({}, session.falls);
    let count = Math.max(0, fallsOn(climb) + by);
    if(count === 0){ delete falls[climb]; }
    else { falls[climb] = count; }
    session.falls = falls;
    keepSession();
    if(by > 0){ haptic(); }
    control.outerHTML = fallsControl(climb, control.dataset.name);
}

// saved only with some in it
function fallsToSave(from){
    let falls = from.falls || {};
    return Object.keys(falls).length > 0 ? Object.assign({}, falls) : undefined;
}

// for a log row's detail
function fallsDetail(entry){
    let total = Object.values(entry.falls || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
    return total > 0 ? plural(total, "fall") : "";
}

// Sessions here can be dated by hand, so the log is in date order rather than id order
function byDate(a, b){
    return b.date.localeCompare(a.date);
}

document.addEventListener("DOMContentLoaded", () => {
    if(app.onLoad){ app.onLoad(); }
    drawFallsSetting();
    // added after functions.js's data-input delegate, so runs once updateComment has read the field
    document.addEventListener("input", event => { if(event.target.id === "sessionComment" || event.target.id === "sessionTitle"){ keepComment(); } });
    if(restoreSession()){ openSession(); }
    drawSessionLog(app.logView);
});
