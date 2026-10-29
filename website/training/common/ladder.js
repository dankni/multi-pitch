/* A ladder of grades to tap each time one is climbed: the gym session's
   bouldering and sport ladders, and trad's one. Runs inside common/log.js; the
   app adds to its `app`:

     ladders  : { name : { list, shown, names, starts, noun, order, band, title } } - the
                session field a ladder's climbs go in, the one saying how many
                rungs are on show, its grades easiest first, how many a session
                starts with, what one climb is called, and optionally every grade
                it has ever had, easiest first, to find the hardest by, and the
                gradeBands function for a tile's edge, and a title for the
                watch (common/watch.js) where the plural noun won't do,
     grades   : a row per grade naming it in each system,
     gradeKey : the system a session stores a grade by,
     systems  : { name : { main, also } } - the system a grade is called by, and
                the ones shown small beside it,
     systemKey, defaultSystem.

   A grade with no row - the gym's sport grades - is shown by its name alone.
   HARDER adds a rung for that session only; the next starts back at `starts`. */
let gradeSystem = null;

function ladderNames(){
    return Object.keys(app.ladders);
}

// the ladder on show - the first, unless the session has been switched
function currentLadder(){
    let tab = session === null ? undefined : session.tab;
    return app.ladders[tab] ? tab : ladderNames()[0];
}

// grade names never clash between ladders
function ladderOf(name){
    return ladderNames().find(ladder => app.ladders[ladder].names.includes(name));
}

function climbsOn(ladder, from){
    let list = (from || session || {})[app.ladders[ladder].list];
    return Array.isArray(list) ? list : [];
}

function shownGrades(ladder){
    let shown = session === null ? undefined : session[app.ladders[ladder].shown];
    return shown === undefined ? app.ladders[ladder].starts : shown;
}

function gradeOf(name){
    return app.grades.find(grade => grade[app.gradeKey] === name);
}

function mainGrade(grade){
    return grade[app.systems[gradeSystem].main];
}

// a grade as its tile shows it
function shownName(name){
    let grade = gradeOf(name);
    return grade ? mainGrade(grade) : name;
}

function otherGrades(grade){
    return app.systems[gradeSystem].also.map(system => grade[system]).join(" · ");
}

function countOf(name){
    let ladder = ladderOf(name);
    return session === null || ladder === undefined ? 0 : climbsOn(ladder).filter(climbed => climbed === name).length;
}

// by place on the ladder, not by name - E10 sorts before E2 as text. -1 for none.
function hardestRung(ladder, climbs){
    return climbs.reduce((hardest, name) => Math.max(hardest, app.ladders[ladder].names.indexOf(name)), -1);
}

// by a ladder's order where it has one - a grade that is no longer on it still counts
function hardestGrade(ladder, climbs){
    let order = app.ladders[ladder].order || app.ladders[ladder].names;
    let rung = climbs.reduce((hardest, name) => Math.max(hardest, order.indexOf(name)), -1);
    if(rung === -1){ return ""; }
    let name = order[rung];
    let grade = gradeOf(name);
    return grade ? mainGrade(grade) : name;
}

/* The session's fields, for app.newSession, fromEntry, toEntry and hasClimbs */
function ladderSession(){
    let fields = { "tab" : ladderNames()[0] };
    ladderNames().forEach(name => {
        fields[app.ladders[name].list] = [];
        fields[app.ladders[name].shown] = app.ladders[name].starts;
    });
    return fields;
}

// far enough up each ladder to show everything on it, opened on one with something on it
function ladderFromEntry(entry){
    let fields = {};
    ladderNames().forEach(name => {
        let ladder = app.ladders[name];
        fields[ladder.list] = climbsOn(name, entry).slice();
        fields[ladder.shown] = Math.max(ladder.starts, hardestRung(name, fields[ladder.list]) + 1);
    });
    fields.tab = ladderNames().find(name => fields[app.ladders[name].list].length > 0) || ladderNames()[0];
    return fields;
}

function ladderEntry(from){
    let fields = {};
    ladderNames().forEach(name => { fields[app.ladders[name].list] = climbsOn(name, from).slice(); });
    return fields;
}

function ladderHasClimbs(from){
    return ladderNames().some(name => climbsOn(name, from).length > 0);
}

function drawLadder(){
    // a session saved before a ladder existed has no list for it
    ladderNames().forEach(name => {
        if(!Array.isArray(session[app.ladders[name].list])){ session[app.ladders[name].list] = []; }
    });
    let tab = document.getElementById("tab-" + currentLadder());
    if(tab !== null){ tab.checked = true; }
    drawGrades();
    updateSummary();
    drawRecent();
}

/* Tapping */

// the picker above the gym's ladders
function setLadder(input){
    showLadder(input.value);
}

// also from the watch
function showLadder(name){
    if(session === null || !app.ladders[name]){ return; }
    session.tab = name;
    let tab = document.getElementById("tab-" + name);
    if(tab !== null){ tab.checked = true; }
    keepSession();
    drawGrades();
    updateSummary();
}

function addClimb(button){
    addGrade(button.dataset.grade);
}

// also from the watch, when its tile may be on the other ladder
function addGrade(name){
    let ladder = ladderOf(name);
    if(session === null || ladder === undefined){ return; }
    let earlier = climbsOn(ladder).slice();
    climbsOn(ladder).push(name);
    noteRecent(shownName(name) + " tapped");
    heartTick(name, shownName(name));
    keepSession();
    drawGradeRow(name);
    // the redrawn tile, found by id: as a selector the + in 5+ or 6a+ is CSS
    let row = document.getElementById("row-" + name);
    flash(row === null ? null : row.querySelector(".grade-add"));
    updateSummary();
    // a ladder is named for its kind of climb - see common/records.js
    if(recordKinds[ladder]){ cheerGrade(ladder, name, earlier); }
}

// one tap too many, or a climb that turned out to be the one next to it
function removeClimb(button){
    removeGrade(button.dataset.grade);
}

function removeGrade(name){
    let ladder = ladderOf(name);
    if(session === null || ladder === undefined){ return; }
    let list = climbsOn(ladder);
    let position = list.lastIndexOf(name);
    if(position === -1){ return; }
    list.splice(position, 1);
    noteRecent(shownName(name) + " taken back");
    heartUntick(name);
    keepSession();
    drawGradeRow(name);
    updateSummary();
}

// Past the top of the ladder, saying so is more use than a button that quietly does nothing
function harder(){
    if(session === null){ return; }
    let ladder = currentLadder();
    if(shownGrades(ladder) >= app.ladders[ladder].names.length){
        toast("You wish! Less clicking more climbing");
        return;
    }
    session[app.ladders[ladder].shown] = shownGrades(ladder) + 1;
    keepSession();
    drawGrades();
}

/* Drawing */

// A tile to add a climb, and a minus beside it to take one back
function gradeRow(name){
    let done = countOf(name);
    let grade = gradeOf(name);
    let ladder = app.ladders[ladderOf(name)];
    let noun = ladder.noun;
    let band = ladder.band ? " " + ladder.band(name).cls : "";
    return `<div class="grade-row${done > 0 ? " done" : ""}${band}" id="row-${name}">
        <button type="button" class="route grade-add" data-action="addClimb" data-grade="${name}"
            aria-label="Add a ${name} ${noun}, ${done} so far">
            ${grade ? `<span class="route-colour">${otherGrades(grade)}</span>` : ""}
            <span class="route-grade">${grade ? mainGrade(grade) : name}</span>
            <span class="grade-count" aria-hidden="true">${done > 0 ? done : ""}</span>
        </button>
        <button type="button" class="quiet grade-minus" data-action="removeClimb" data-grade="${name}"
            aria-label="Take back a ${name} ${noun}"${done === 0 ? " disabled" : ""}>&minus;</button>
    </div>`;
}

function drawGrades(){
    let ladder = currentLadder();
    document.getElementById("grades").innerHTML =
        app.ladders[ladder].names.slice(0, shownGrades(ladder)).map(gradeRow).join("")
        + `<button type="button" class="quiet grade-harder" data-action="harder" aria-label="Show a harder grade">HARDER</button>`;
}

// just the row that was tapped: redrawing the ladder would lose the scroll position
function drawGradeRow(name){
    let row = document.getElementById("row-" + name);
    if(ladderOf(name) === undefined || row === null){ return; }
    row.outerHTML = gradeRow(name);
}

// The count is the ladder on show; any other gets a mention once it has climbs on it
function updateSummary(){
    let ladder = currentLadder();
    let climbs = climbsOn(ladder);
    let others = ladderNames().filter(name => name !== ladder && climbsOn(name).length > 0)
        .map(name => plural(climbsOn(name).length, app.ladders[name].noun));
    document.getElementById("climbCount").innerText = climbs.length;
    document.getElementById("countNoun").innerText = app.ladders[ladder].noun + (climbs.length === 1 ? "" : "s");
    document.getElementById("summary").innerText = joinDetail([climbs.length === 0 ? "" : `Hardest: ${hardestGrade(ladder, climbs)}`, ...others]);
}

/* Which system a grade is called by, under the cog */
function setGradeSystem(input){
    gradeSystem = input.value;
    localStorage.setItem(app.systemKey, gradeSystem);
    if(session !== null){
        keepSession();   // for the watch, which names grades the same way
        drawGrades();
        updateSummary();
    }
    drawSessionLog();   // the log names its grades the same way
}

function loadGradeSystem(){
    let saved = localStorage.getItem(app.systemKey);
    gradeSystem = app.systems[saved] ? saved : app.defaultSystem;
    let radio = document.getElementById("system-" + gradeSystem);
    if(radio !== null){ radio.checked = true; }
}

/* On the watch (common/watch.js), an app's `app.watch`: the ladders as far as
   they are on show here, named as here, and what is tapped there tapped here */
const ladderWatch = {
    "state" : () => {
        let state = { "m" : "ladder", "s" : session === null ? "idle" : document.body.dataset.state };
        if(session !== null){
            state.id = session.id;
            state.l = currentLadder();
            state.L = ladderNames().map(name => {
                let ladder = app.ladders[name];
                return { "k" : name, "n" : ladder.title || ladder.noun + "s",
                         "r" : ladder.names.slice(0, shownGrades(name)).map(grade =>
                             [grade, shownName(grade), countOf(grade), ...watchColour("grade-row " + (ladder.band ? ladder.band(grade).cls : ""))]) };
            });
        }
        return state;
    },
    "receive" : message => {
        if(message.t === "finish" && document.body.dataset.state === "running"){ openSavePanel(); }
        if(session === null){ return; }
        if(message.t === "add"){ addGrade(message.g); }
        else if(message.t === "undo"){ removeGrade(message.g); }
        else if(message.t === "tab"){ showLadder(message.l); }
        else if(message.t === "harder"){
            showLadder(message.l);
            harder();
        }
    },
    "active" : () => session !== null
};
