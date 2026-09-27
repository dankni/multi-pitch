/* A session at the climbing wall: tap a grade each time you top something out,
   on the bouldering ladder or the sport one - a picker above the ladder switches
   between them. The session is two lists of grades climbed, so the counts and
   the hardest of each fall out of it, and taking one back is taking one off its
   list.

   Boulders stay in `climbs`, as they always have, so sessions saved before sport
   was added - and the overview charts that read them - need nothing changed.
   Sport climbs are a second list, `sport`, which an old session simply lacks.

   today(), getLog(), setLog(), saveCurrent(), the save panel, the note and the
   log itself are all shared - see common/functions.js. */

const logKey = "boulderLog";
const currentKey = "boulderCurrent";
const systemKey = "boulderGradeSystem";

let session = null;          // the session being logged or edited

/* The bouldering ladder, easiest first. Each rung is one problem in the three
   systems a UK wall might label it in: Hueco (the V grades), Fontainebleau, and
   the British technical grade.

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

/* The sport ladder, in French grades as a UK wall labels its routes: 4, 4+, 5
   and 5+, then whole grades from 6a - a gym tops its routes out by the letter,
   not the plus. Every one of these is on the overview's sport ladder too, so a
   session's sport climbs land on its chart as they are. */
const sportGrades = ["4", "4+", "5", "5+", "6a", "6b", "6c", "7a", "7b", "7c",
    "8a", "8b", "8c", "9a", "9b", "9c"];

/* The two ladders, and how much of each a session starts with: V0 to V10, and 4
   to 7c, which cover the wall on a normal night. HARDER puts the next rung up,
   as far as V17 or 9c - the hardest anyone has climbed - and that belongs to the
   session it was asked for. The next session starts back at V10 and 7c.

   It rides along in the session rather than in a setting of its own, so a phone
   locked and picked up again mid-session still has the ladder it was given. */
const ladders = {
    "boulder" : { "list" : "climbs", "shown" : "shown",      "names" : grades.map(grade => grade.v),
                  "starts" : 11, "noun" : "boulder" },
    "sport"   : { "list" : "sport",  "shown" : "sportShown", "names" : sportGrades,
                  "starts" : 10, "noun" : "sport climb" }
};

function plural(count, noun){
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// the ladder on show - bouldering unless the session has been switched to sport
function currentLadder(){
    return session !== null && session.tab === "sport" ? "sport" : "boulder";
}

// which ladder a grade is on, from its name - V grades and French ones never clash
function ladderOf(name){
    return Object.keys(ladders).find(ladder => ladders[ladder].names.includes(name));
}

function climbsOn(ladder, from){
    let list = (from || session || {})[ladders[ladder].list];
    return Array.isArray(list) ? list : [];
}

function shownGrades(ladder){
    let shown = session === null ? undefined : session[ladders[ladder].shown];
    return shown === undefined ? ladders[ladder].starts : shown;
}

/* Which system a boulder grade is called by. The other two are still shown,
   small, beside it - the wall labels its holds in one system and the climber
   often thinks in another. Sport grades are French whatever this says. */
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
    let ladder = ladderOf(name);
    return session === null || ladder === undefined
        ? 0 : climbsOn(ladder).filter(climbed => climbed === name).length;
}

/* How far up a ladder a session got. Rungs are compared by their place on it
   rather than by name, so it does not matter which system is selected or how the
   names happen to sort. -1 for nothing on it. */
function hardestRung(ladder, climbs){
    let hardest = -1;
    climbs.forEach(name => {
        let rung = ladders[ladder].names.indexOf(name);
        if(rung > hardest){ hardest = rung; }
    });
    return hardest;
}

// the same thing, named as it is shown: a boulder in the system chosen
function hardestGrade(ladder, climbs){
    let hardest = hardestRung(ladder, climbs);
    if(hardest === -1){ return ""; }
    return ladder === "boulder" ? mainGrade(grades[hardest]) : sportGrades[hardest];
}

/* Session handling */

function startSession(){
    session = { "id" : Date.now(), "date" : today(), "climbs" : [], "sport" : [], "tab" : "boulder",
        "shown" : ladders.boulder.starts, "sportShown" : ladders.sport.starts, "rating" : 0, "editing" : false };
    openSession();
}

function editSession(id){
    let entry = getLog(logKey).find(item => item.id === id);
    if(!entry){ return; }
    let sport = climbsOn("sport", entry).slice();
    // far enough up each ladder to see everything this session has on it, or an
    // 8A ticked last week would be uneditable
    session = { "id" : entry.id, "date" : entry.date, "climbs" : entry.climbs.slice(), "sport" : sport,
        // opened on sport if that is all it has
        "tab" : entry.climbs.length === 0 && sport.length > 0 ? "sport" : "boulder",
        "shown" : Math.max(ladders.boulder.starts, hardestRung("boulder", entry.climbs) + 1),
        "sportShown" : Math.max(ladders.sport.starts, hardestRung("sport", sport) + 1),
        "rating" : entry.rating, "editing" : true };
    // the note comes back with it, or saving again would wipe what it said
    setSessionComment(entry.comment);
    hideAbout();
    openSession();
}

// Shared set up for both a new session and an edit of a saved one
function openSession(){
    // one saved mid-session before sport was added has no list for it yet
    if(!Array.isArray(session.sport)){ session.sport = []; }
    requestWakeLock();
    saveCurrent(currentKey, session);
    document.getElementById("primaryButton").style.display = "none";
    document.getElementById("discard").style.display = "inline-block";
    document.getElementById("sessionHolder").style.display = "block";
    document.getElementById("endingDiv").style.display = "none";
    document.getElementById("finishButton").style.display = "inline-block";
    document.getElementById("sessionDate").value = session.date;
    document.getElementById("saveSession").innerText = session.editing ? "UPDATE SESSION" : "SAVE SESSION";
    document.getElementById("tab-" + currentLadder()).checked = true;
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

// Bouldering or sport, from the picker above the ladder
function setLadder(ladder){
    if(session === null || ladders[ladder] === undefined){ return; }
    session.tab = ladder;
    saveCurrent(currentKey, session);
    drawGrades();
    updateSummary();
}

function addClimb(name){
    let ladder = ladderOf(name);
    if(session === null || ladder === undefined){ return; }
    climbsOn(ladder).push(name);
    saveCurrent(currentKey, session);
    drawGradeRow(name);
    updateSummary();
}

// one too many taps, or one that turned out to be a sit start
function removeClimb(name){
    let ladder = ladderOf(name);
    if(session === null || ladder === undefined){ return; }
    let list = climbsOn(ladder);
    let position = list.lastIndexOf(name);
    if(position === -1){ return; }
    list.splice(position, 1);
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

/* What a session is called in the log, and the wrench that reopens one. The
   table, the stars, the note, the two tap delete and the stats line are all
   drawSessionLog() in common/functions.js.

   Ordered by the date climbed rather than by id: a session can be dated by hand,
   so the newest id is not necessarily the newest session. */
const logView = {
    "key" : logKey,
    "order" : (a, b) => b.date.localeCompare(a.date),
    "onEdit" : "editSession",
    "describe" : entry => {
        let sport = climbsOn("sport", entry);
        // boulders are named even at none, unless the session was all sport
        let title = [entry.climbs.length > 0 || sport.length === 0 ? plural(entry.climbs.length, "boulder") : "",
                     sport.length > 0 ? plural(sport.length, "sport climb") : ""];
        let hardest = [hardestGrade("boulder", entry.climbs), hardestGrade("sport", sport)];
        return {
            "title" : title.filter(part => part !== "").join(", "),
            "detail" : hardest.some(grade => grade !== "")
                ? "hardest " + hardest.filter(grade => grade !== "").join(" · ") : ""
        };
    },
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let boulders = log.reduce((count, entry) => count + entry.climbs.length, 0);
        let sport = log.reduce((count, entry) => count + climbsOn("sport", entry).length, 0);
        return `${plural(log.length, "session")} (${thisMonth} this month) · ${boulders} boulders`
            + (sport > 0 ? ` · ${plural(sport, "sport climb")}` : "") + " logged";
    }
};

function saveSession(){
    let log = getLog(logKey);
    let entry = {
        "id" : session.id,
        "date" : session.date,
        "climbs" : session.climbs.slice(),
        "sport" : session.sport.slice(),
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
    confirmReset("discard", session !== null && session.climbs.length + session.sport.length > 0, closeSession);
}

/* Drawing */

// A tile for a rung on either ladder. A boulder tile names the other two systems
// small above the grade; a sport one has only the French grade to show.
function gradeRow(name){
    let done = countOf(name);
    let grade = gradeOf(name);
    let noun = ladders[ladderOf(name)].noun;
    return `<div class="grade-row${done > 0 ? " done" : ""}" id="row-${name}">
        <button type="button" class="route grade-add" onclick="addClimb('${name}')"
            aria-label="Add a ${name} ${noun}, ${done} so far">
            ${grade ? `<span class="route-colour">${otherGrades(grade)}</span>` : ""}
            <span class="route-grade">${grade ? mainGrade(grade) : name}</span>
            <span class="grade-count" aria-hidden="true">${done > 0 ? done : ""}</span>
        </button>
        <button type="button" class="quiet grade-minus" onclick="removeClimb('${name}')"
            aria-label="Take back a ${name} ${noun}"${done === 0 ? " disabled" : ""}>&minus;</button>
    </div>`;
}

function drawGrades(){
    let ladder = currentLadder();
    document.getElementById("grades").innerHTML =
        ladders[ladder].names.slice(0, shownGrades(ladder)).map(gradeRow).join("")
        + `<button type="button" class="quiet grade-harder" onclick="harder()"
            aria-label="Show a harder grade">HARDER</button>`;
}

/* One more rung, please - for this session only. Past V17 or 9c there is nothing
   to add, and saying so is more use than a button that quietly stops working. */
function harder(){
    if(session === null){ return; }
    let ladder = currentLadder();
    if(shownGrades(ladder) >= ladders[ladder].names.length){
        toast("You wish! Less clicking more climbing");
        return;
    }
    session[ladders[ladder].shown] = shownGrades(ladder) + 1;
    saveCurrent(currentKey, session);
    drawGrades();
}

// one row, after a tap: redrawing the ladder would lose the scroll position
function drawGradeRow(name){
    let row = document.getElementById("row-" + name);
    if(ladderOf(name) === undefined || row === null){ return; }
    row.outerHTML = gradeRow(name);
}

// The count is the ladder on show; the other one is mentioned once it has anything on it
function updateSummary(){
    let ladder = currentLadder();
    let other = ladder === "boulder" ? "sport" : "boulder";
    let climbs = climbsOn(ladder);
    let others = climbsOn(other).length;
    document.getElementById("climbCount").innerText = climbs.length;
    document.getElementById("countNoun").innerText = ladders[ladder].noun + (climbs.length === 1 ? "" : "s");
    document.getElementById("summary").innerText =
        (climbs.length === 0 ? "Nothing logged yet" : `Hardest: ${hardestGrade(ladder, climbs)}`)
        + (others > 0 ? ` · ${plural(others, ladders[other].noun)}` : "");
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
