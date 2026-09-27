/* A day of trad climbing: tap a grade each time you top a route out. The gym
   session's ladder with British grades on it - the session is a list of grades
   climbed, so the count and the hardest fall out of it, and taking one back is
   taking one off the list.

   A session can say it is on UKC as well. The overview then counts that day from
   here and leaves the same day out of an imported UKC logbook, so nothing is
   counted twice - see common/ukc.js, which also does the import on this app's
   info panel.

   today(), getLog(), setLog(), saveCurrent(), the save panel, the note and the
   log itself are all shared - see common/functions.js. */

const logKey = "tradLog";
const currentKey = "tradCurrent";
const systemKey = "tradGradeSystem";

let session = null;          // the session being logged or edited

/* The ladder, easiest first: the British adjectival grades a UK crag gives a
   route, and roughly what UIAA calls the same thing, for a climber who thinks in
   Alpine grades. The half steps UK guides barely use - HD, MS, MVS - are left
   off, to keep the ladder to one screen.

   The UIAA column follows the one common/ukc.js reads UIAA grades back with, so a
   grade makes the same trip both ways. It is only ever read for display - a
   session stores the British grade - so correcting a row changes nothing else. */
const grades = [
    { "brit" : "M",   "uiaa" : "II" },
    { "brit" : "D",   "uiaa" : "III" },
    { "brit" : "VD",  "uiaa" : "III+" },
    { "brit" : "HVD", "uiaa" : "IV-" },
    { "brit" : "S",   "uiaa" : "IV" },
    { "brit" : "HS",  "uiaa" : "IV+" },
    { "brit" : "VS",  "uiaa" : "V" },
    { "brit" : "HVS", "uiaa" : "V+" },
    { "brit" : "E1",  "uiaa" : "VI" },
    { "brit" : "E2",  "uiaa" : "VI+" },
    { "brit" : "E3",  "uiaa" : "VII" },
    { "brit" : "E4",  "uiaa" : "VII+" },
    { "brit" : "E5",  "uiaa" : "VIII" },
    { "brit" : "E6",  "uiaa" : "VIII+" },
    { "brit" : "E7",  "uiaa" : "IX" },
    { "brit" : "E8",  "uiaa" : "IX+" },
    { "brit" : "E9",  "uiaa" : "X" },
    { "brit" : "E10", "uiaa" : "X+" },
    { "brit" : "E11", "uiaa" : "XI-" }
];

/* How many rungs a session starts with: M to E3, which covers most days out.
   HARDER puts the next one up, as far as E11 - the hardest trad route there is -
   and that belongs to the session it was asked for. The next starts back at E3.

   It rides along in the session rather than in a setting of its own, so a phone
   locked and picked up again mid-session still has the ladder it was given. */
const defaultGrades = 11;

function shownGrades(){
    return session === null || session.shown === undefined ? defaultGrades : session.shown;
}

function plural(count, noun){
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/* Which system a grade is called by. The other is still shown, small, beside
   it. */
const systems = {
    "british" : { "main" : "brit", "also" : "uiaa" },
    "uiaa"    : { "main" : "uiaa", "also" : "brit" }
};

let gradeSystem = "british";

function mainGrade(grade){
    return grade[systems[gradeSystem].main];
}

function otherGrade(grade){
    return grade[systems[gradeSystem].also];
}

// a session stores British grades, whatever the climber reads them in
function gradeOf(name){
    return grades.find(grade => grade.brit === name);
}

function countOf(name){
    return session === null ? 0 : session.climbs.filter(climbed => climbed === name).length;
}

/* How far up the ladder a session got, by place on it rather than by name - E10
   sorts before E2 as text. -1 for a session with nothing on it. */
function hardestRung(climbs){
    let hardest = -1;
    climbs.forEach(name => {
        let rung = grades.findIndex(grade => grade.brit === name);
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
    session = { "id" : Date.now(), "date" : today(), "climbs" : [], "shown" : defaultGrades,
        "ukc" : false, "rating" : 0, "editing" : false };
    openSession();
}

function editSession(id){
    let entry = getLog(logKey).find(item => item.id === id);
    if(!entry){ return; }
    // far enough up the ladder to see everything this session has on it
    session = { "id" : entry.id, "date" : entry.date, "climbs" : entry.climbs.slice(),
        "shown" : Math.max(defaultGrades, hardestRung(entry.climbs) + 1),
        "ukc" : entry.ukc === true, "rating" : entry.rating, "editing" : true };
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
    document.getElementById("alsoOnUkc").checked = session.ukc === true;
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

// a day logged on the way home, or the next morning, is still that day
function setSessionDate(date){
    if(session && date){
        session.date = date;
        saveCurrent(currentKey, session);
    }
}

function setAlsoOnUkc(checked){
    if(session){
        session.ukc = checked === true;
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

// one too many taps, or a route that turned out to be the one next to it
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
    return checked === null ? "british" : checked.value;
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
    gradeSystem = systems[saved] === undefined ? "british" : saved;
    let radio = document.getElementById("system-" + gradeSystem);
    if(radio){ radio.checked = true; }
}

/* What a trad session is called in the log, and the wrench that reopens one. The
   table, the stars, the note, the two tap delete and the stats line are all
   drawSessionLog() in common/functions.js.

   Ordered by the date climbed rather than by id: a session can be dated by hand,
   so the newest id is not necessarily the newest session. */
const logView = {
    "key" : logKey,
    "order" : (a, b) => b.date.localeCompare(a.date),
    "onEdit" : "editSession",
    // the UKC days alongside, read only - see ukcDays() below
    "extra" : () => ukcDays(),
    "describe" : entry => {
        // a UKC day reads as it does on the overview: its hardest climb by name,
        // and the crag. Names and crags are whatever was typed into UKC, so they
        // go in as text.
        if(entry.readOnly){
            return {
                "title" : plural(entry.climbs.length, "trad climb"),
                "detail" : escapeText([entry.hardest, entry.crags, "from UKC"].filter(part => part).join(" · "))
            };
        }
        let hardest = hardestGrade(entry.climbs);
        return {
            "title" : plural(entry.climbs.length, "trad climb"),
            "detail" : [hardest ? "hardest " + hardest : "", entry.ukc === true ? "UKC data ignored" : ""]
                .filter(part => part !== "").join(" · ")
        };
    },
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let total = log.reduce((count, entry) => count + entry.climbs.length, 0);
        return `${plural(log.length, "session")} (${thisMonth} this month) · ${plural(total, "trad climb")} logged`;
    }
};

function saveSession(){
    let log = getLog(logKey);
    let entry = {
        "id" : session.id,
        "date" : session.date,
        "climbs" : session.climbs.slice(),
        "ukc" : session.ukc === true,
        "rating" : session.rating,
        "comment" : sessionComment
    };
    // an edited session replaces the one it came from rather than joining it
    let existing = log.findIndex(item => item.id === entry.id);
    existing === -1 ? log.push(entry) : log[existing] = entry;
    setLog(logKey, log);
    closeSession();
    drawSessionLog(logView);
    drawUkcSummary();   // a day just ticked as on UKC drops out of the UKC count
    openInfoBox();
}

// confirmReset is in common/functions.js - the first tap only arms the button
function discardSession(){
    confirmReset("discard", session !== null && session.climbs.length > 0, closeSession);
}

/* Drawing */

function gradeRow(grade){
    let done = countOf(grade.brit);
    return `<div class="grade-row${done > 0 ? " done" : ""}" id="row-${grade.brit}">
        <button type="button" class="route grade-add" onclick="addClimb('${grade.brit}')"
            aria-label="Add a ${grade.brit} trad climb, ${done} so far">
            <span class="route-colour">${otherGrade(grade)}</span>
            <span class="route-grade">${mainGrade(grade)}</span>
            <span class="grade-count" aria-hidden="true">${done > 0 ? done : ""}</span>
        </button>
        <button type="button" class="quiet grade-minus" onclick="removeClimb('${grade.brit}')"
            aria-label="Take back a ${grade.brit} trad climb"${done === 0 ? " disabled" : ""}>&minus;</button>
    </div>`;
}

function drawGrades(){
    document.getElementById("grades").innerHTML =
        grades.slice(0, shownGrades()).map(gradeRow).join("")
        + `<button type="button" class="quiet grade-harder" onclick="harder()"
            aria-label="Show a harder grade">HARDER</button>`;
}

/* One more rung, please - for this session only. Past E11 there is nothing to
   add, and saying so is more use than a button that quietly stops working. */
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
    document.getElementById("countNoun").innerText = session.climbs.length === 1 ? "trad climb" : "trad climbs";
    document.getElementById("summary").innerText = session.climbs.length === 0
        ? "Nothing logged yet"
        : `Hardest: ${hardest}`;
}

/* The trad days in an imported UKC logbook, listed in the activity log beside
   this app's own sessions - read only, since they are edited in UKC. The days a
   session here says are on UKC as well are left out by ukc.climbs(), so a day is
   never listed twice (see common/ukc.js).

   Each day is shaped like a session so the shared log can draw it: its grades as
   `climbs`, and the notes of its hardest climb as the note, "Name: notes" - as the
   overview shows it. The id is the date as a negative number, which no saved
   session's id (a timestamp) can ever be. */
function escapeText(text){
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ukcDays(){
    let days = {};
    ukc.climbs().filter(climb => climb.type === "trad").forEach(climb => {
        (days[climb.date] = days[climb.date] || []).push(climb);
    });
    return Object.keys(days).map(date => {
        let climbs = days[date];
        let hardest = ukc.hardest(climbs);
        let named = hardest !== null && hardest.name;
        return {
            "id" : -Number(date.replace(/-/g, "")),
            "date" : date,
            "climbs" : climbs.map(climb => climb.grade),
            "rating" : 0,
            "comment" : named && hardest.notes ? `${hardest.name}: ${hardest.notes}` : "",
            "hardest" : named ? `hardest ${hardest.name} (${hardest.grade})` : "",
            "crags" : [...new Set(climbs.map(climb => climb.crag).filter(crag => crag))].join(", ")
        };
    });
}

// When the logbook came in and how much of it is here, under the import
function drawUkcSummary(){
    let logbook = ukc.load();
    document.getElementById("ukcStats").hidden = logbook === null;
    if(logbook === null){ return; }
    let days = ukcDays();
    let total = days.reduce((count, day) => count + day.climbs.length, 0);
    document.getElementById("ukcSummary").innerText = `Imported ${logDate(logbook.imported)} · `
        + `${plural(days.length, "day")}, ${plural(total, "trad climb")}, in the activity log below.`;
}

// Linked to from the overview as /training/trad/#ukc: straight to the import
function openUkcFromLink(){
    if(location.hash !== "#ukc"){ return; }
    history.replaceState(null, "", location.pathname + location.search);
    openInfoBox();
    document.getElementById("ukcHeading").scrollIntoView();
}

window.addEventListener('DOMContentLoaded', (event) => {
    loadGradeSystem();
    let current = localStorage.getItem(currentKey);
    if(current){
        session = JSON.parse(current);
        openSession();
    }
    drawSessionLog(logView);
    drawUkcSummary();
    openUkcFromLink();
});
