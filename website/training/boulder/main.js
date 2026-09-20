/* A session at a bouldering wall: tap a grade each time you top something out.
   The session is a list of grades climbed, so the count and the hardest one fall
   out of it, and taking one back is taking one off the list.

   today(), getLog(), setLog(), saveCurrent(), the save panel, the note and the
   log itself are all shared - see common/functions.js. */

const logKey = "boulderLog";
const currentKey = "boulderCurrent";
const systemKey = "boulderGradeSystem";

let session = null;          // the session being logged or edited

/* The ladder, easiest first. Each rung is one problem in the three systems a UK
   wall might label it in: Hueco (the V grades), Fontainebleau, and the British
   technical grade.

   The Font grades carry their f - f6A rather than 6A - so a tile cannot be read as
   the French sport grade of the same name.

   Conversions between bouldering systems are approximate and argued over, and
   walls differ. These follow the usual UK gym tables. They are only ever read for
   display - a session stores the V grade as the rung's name - so correcting a row
   here changes nothing else. */
const grades = [
    { "v" : "V0",  "font" : "f4",   "brit" : "4a" },
    { "v" : "V1",  "font" : "f5",   "brit" : "4b" },
    { "v" : "V2",  "font" : "f5+",  "brit" : "4c" },
    { "v" : "V3",  "font" : "f6A",  "brit" : "5a" },
    { "v" : "V4",  "font" : "f6B",  "brit" : "5b" },
    { "v" : "V5",  "font" : "f6C",  "brit" : "5c" },
    { "v" : "V6",  "font" : "f7A",  "brit" : "6a" },
    { "v" : "V7",  "font" : "f7A+", "brit" : "6b" },
    { "v" : "V8",  "font" : "f7B",  "brit" : "6b" },
    { "v" : "V9",  "font" : "f7C",  "brit" : "6c" },
    { "v" : "V10", "font" : "f7C+", "brit" : "7a" },
    { "v" : "V11", "font" : "f8A",  "brit" : "7a" },
    { "v" : "V12", "font" : "f8A+", "brit" : "7b" },
    { "v" : "V13", "font" : "f8B",  "brit" : "7b" },
    { "v" : "V14", "font" : "f8B+", "brit" : "7b" },
    { "v" : "V15", "font" : "f8C",  "brit" : "7c" },
    { "v" : "V16", "font" : "f8C+", "brit" : "7c" },
    { "v" : "V17", "font" : "f9A",  "brit" : "7c" }
];

/* How many rungs a session starts with: V0 to V10, which covers the wall on a
   normal night. HARDER puts the next one up, as far as V17 - the hardest boulder
   anyone has climbed - and that belongs to the session it was asked for. The next
   session starts back at V10, because most of them are V10 sessions.

   It rides along in the session rather than in a setting of its own, so a phone
   locked and picked up again mid-session still has the ladder it was given. */
const defaultGrades = 11;

function shownGrades(){
    return session === null || session.shown === undefined ? defaultGrades : session.shown;
}

/* Which system a grade is called by. The other two are still shown, small, beside
   it - the wall labels its holds in one system and the climber often thinks in
   another. */
const systems = {
    "hueco"   : { "name" : "Hueco (V)", "main" : "v",    "also" : ["font", "brit"] },
    "font"    : { "name" : "Font",      "main" : "font", "also" : ["v", "brit"] },
    "british" : { "name" : "British",   "main" : "brit", "also" : ["v", "font"] }
};

let gradeSystem = "hueco";

function mainGrade(grade){
    return grade[systems[gradeSystem].main];
}

function otherGrades(grade){
    return systems[gradeSystem].also.map(system => grade[system]).join(" · ");
}

// a session stores V grades, whatever the wall or the climber calls them
function gradeOf(name){
    return grades.find(grade => grade.v === name);
}

function countOf(name){
    return session === null ? 0 : session.climbs.filter(climbed => climbed === name).length;
}

/* How far up the ladder a session got. Rungs are compared by their place on it
   rather than by name, so it does not matter which system is selected or how the
   names happen to sort. -1 for a session with nothing on it. */
function hardestRung(climbs){
    let hardest = -1;
    climbs.forEach(name => {
        let rung = grades.findIndex(grade => grade.v === name);
        if(rung > hardest){ hardest = rung; }
    });
    return hardest;
}

// the same thing, named in the system on show
function hardestGrade(climbs){
    let hardest = hardestRung(climbs);
    return hardest === -1 ? "" : mainGrade(grades[hardest]);
}

/* Session handling */

function startSession(){
    session = { "id" : Date.now(), "date" : today(), "climbs" : [], "shown" : defaultGrades, "rating" : 0, "editing" : false };
    openSession();
}

function editSession(id){
    let entry = getLog(logKey).find(item => item.id === id);
    if(!entry){ return; }
    // far enough up the ladder to see everything this session has on it, or an
    // 8A ticked last week would be uneditable
    session = { "id" : entry.id, "date" : entry.date, "climbs" : entry.climbs.slice(),
        "shown" : Math.max(defaultGrades, hardestRung(entry.climbs) + 1),
        "rating" : entry.rating, "editing" : true };
    // the note comes back with it, or saving again would wipe what it said
    setSessionComment(entry.comment);
    hideAbout();
    openSession();
}

// Shared set up for both a new session and an edit of a saved one
function openSession(){
    requestWakeLock();
    saveCurrent(currentKey, session);
    document.getElementById("primaryButton").style.display = "none";
    document.getElementById("discard").style.display = "inline-block";
    document.getElementById("sessionHolder").style.display = "block";
    document.getElementById("endingDiv").style.display = "none";
    document.getElementById("finishButton").style.display = "inline-block";
    document.getElementById("sessionDate").value = session.date;
    document.getElementById("saveSession").innerText = session.editing ? "UPDATE SESSION" : "SAVE SESSION";
    disarmReset();
    drawGrades();
    setStar(session.rating);
    updateSummary();
}

function closeSession(){
    session = null;
    resetSavePanel();   // stars and note, ready for the next session
    saveCurrent(currentKey, session);
    document.getElementById("primaryButton").style.display = "inline-block";
    document.getElementById("discard").style.display = "none";
    document.getElementById("sessionHolder").style.display = "none";
    releaseWakeLock();
}

// the tick list can be dated by hand, and so can this: a session logged on the
// way home is still last night's session
function setSessionDate(date){
    if(session && date){
        session.date = date;
        saveCurrent(currentKey, session);
    }
}

function addClimb(name){
    if(session === null || gradeOf(name) === undefined){ return; }
    session.climbs.push(name);
    saveCurrent(currentKey, session);
    drawGradeRow(name);
    updateSummary();
}

// one too many taps, or one that turned out to be a sit start
function removeClimb(name){
    if(session === null){ return; }
    let position = session.climbs.lastIndexOf(name);
    if(position === -1){ return; }
    session.climbs.splice(position, 1);
    saveCurrent(currentKey, session);
    drawGradeRow(name);
    updateSummary();
}

function openSavePanel(){
    document.getElementById("finishButton").style.display = "none";
    document.getElementById("endingDiv").style.display = "block";
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

// setStar() paints the stars; this is what this app does with the number
function onRatingChange(value){
    if(session){ session.rating = value; saveCurrent(currentKey, session); }
}

/* Settings */

function selectedSystem(){
    let checked = document.querySelector('input[name="gradeSystem"]:checked');
    return checked === null ? "hueco" : checked.value;
}

function setGradeSystem(){
    gradeSystem = selectedSystem();
    localStorage.setItem(systemKey, gradeSystem);
    if(session !== null){
        drawGrades();
        updateSummary();
    }
    drawSessionLog(logView);   // the log names its grades in the same system
}

function loadGradeSystem(){
    let saved = localStorage.getItem(systemKey);
    gradeSystem = systems[saved] === undefined ? "hueco" : saved;
    let radio = document.getElementById("system-" + gradeSystem);
    if(radio){ radio.checked = true; }
}

/* What a bouldering session is called in the log, and the wrench that reopens
   one. The table, the stars, the note, the two tap delete and the stats line are
   all drawSessionLog() in common/functions.js.

   Ordered by the date climbed rather than by id: a session can be dated by hand,
   so the newest id is not necessarily the newest session. */
const logView = {
    "key" : logKey,
    "order" : (a, b) => b.date.localeCompare(a.date),
    "onEdit" : "editSession",
    "describe" : entry => {
        let hardest = hardestGrade(entry.climbs);
        return {
            "title" : `${entry.climbs.length} boulder${entry.climbs.length === 1 ? "" : "s"}`,
            "detail" : hardest ? `hardest ${hardest}` : ""
        };
    },
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let total = log.reduce((count, entry) => count + entry.climbs.length, 0);
        return `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${total} boulders logged`;
    }
};

function saveSession(){
    let log = getLog(logKey);
    let entry = {
        "id" : session.id,
        "date" : session.date,
        "climbs" : session.climbs.slice(),
        "rating" : session.rating,
        "comment" : sessionComment
    };
    // an edited session replaces the one it came from rather than joining it
    let existing = log.findIndex(item => item.id === entry.id);
    existing === -1 ? log.push(entry) : log[existing] = entry;
    setLog(logKey, log);
    closeSession();
    drawSessionLog(logView);
    openInfoBox();
}

// confirmReset is in common/functions.js - the first tap only arms the button
function discardSession(){
    confirmReset("discard", session !== null && session.climbs.length > 0, closeSession);
}

/* Drawing */

function gradeRow(grade){
    let done = countOf(grade.v);
    return `<div class="grade-row${done > 0 ? " done" : ""}" id="row-${grade.v}">
        <button type="button" class="route grade-add" onclick="addClimb('${grade.v}')"
            aria-label="Add a ${grade.v} boulder, ${done} so far">
            <span class="route-colour">${otherGrades(grade)}</span>
            <span class="route-grade">${mainGrade(grade)}</span>
            <span class="grade-count" aria-hidden="true">${done > 0 ? done : ""}</span>
        </button>
        <button type="button" class="quiet grade-minus" onclick="removeClimb('${grade.v}')"
            aria-label="Take back a ${grade.v} boulder"${done === 0 ? " disabled" : ""}>&minus;</button>
    </div>`;
}

function drawGrades(){
    document.getElementById("grades").innerHTML =
        grades.slice(0, shownGrades()).map(gradeRow).join("")
        + `<button type="button" class="quiet grade-harder" onclick="harder()"
            aria-label="Show a harder grade">HARDER</button>`;
}

/* One more rung, please - for this session only. Past V17 there is nothing to add,
   and saying so is more use than a button that quietly stops working. */
function harder(){
    if(session === null){ return; }
    if(shownGrades() >= grades.length){
        toast("You wish! Less clicking more climbing");
        return;
    }
    session.shown = shownGrades() + 1;
    saveCurrent(currentKey, session);
    drawGrades();
}

// one row, after a tap: redrawing the ladder would lose the scroll position
function drawGradeRow(name){
    let grade = gradeOf(name);
    let row = document.getElementById("row-" + name);
    if(grade === undefined || row === null){ return; }
    row.outerHTML = gradeRow(grade);
}

function updateSummary(){
    let hardest = hardestGrade(session.climbs);
    document.getElementById("climbCount").innerText = session.climbs.length;
    document.getElementById("summary").innerText = session.climbs.length === 0
        ? "Nothing logged yet"
        : `Hardest: ${hardest}`;
}

window.addEventListener('DOMContentLoaded', (event) => {
    loadGradeSystem();
    let current = localStorage.getItem(currentKey);
    if(current){
        session = JSON.parse(current);
        openSession();
    }
    drawSessionLog(logView);
});
