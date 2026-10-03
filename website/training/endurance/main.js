/* Circuit training on the Gilford wall: a warm up, then sets of laps with a rest
   between, each set on one route a set number of grades below the climber's max.
   Grades step by letter - a plus is a shade of its own grade - so one below 7b is
   7a. The ladder is gradeSteps() in common/gilford-routes.js.

   What is on screen follows body[data-state]: idle, then warmup, rest, set and
   choice as the session goes, and saving (see style.css). */

const app = {
    "logKey" : "enduranceLog",
    "currentKey" : "enduranceCurrent"
};
const wallKey = "enduranceWall";
const restKey = "enduranceRest";
const gradeKey = "enduranceGrade";
const styleKey = "enduranceStyle";

const warmUpSize = 4;
const warmUpSteps = [0, 1];     // the warm up is 4s and 5s, whatever the max
const defaultRestMinutes = 5;
const setsBeforeChoice = 3;     // then it offers to finish

// How big a set is, and how many grades below the max its route comes from
const sessionTypes = {
    "endurance" : { "climbs" : 4, "gradesBelow" : [2, 3, 4], "name" : "Endurance" },
    "power"     : { "climbs" : 2, "gradesBelow" : [1, 2],    "name" : "Power endurance" }
};

// 6a upwards, one per letter - 6a+ would build the same session as 6a
const maxGrades = gradeSteps.slice(gradeStep("6a")).map(step => step[0]);

let restTicker = null;
let saving = false;

/* Picking climbs. With the Gilford wall on, a pick is a named route off it;
   off, it is only a grade, for training the same way anywhere else. */

function stepsBelow(maxGrade, style){
    return sessionTypes[style].gradesBelow.map(below => gradeStep(maxGrade) - below).filter(step => step >= 0);
}

function poolFor(steps, useWall){
    return useWall
        ? routes.filter(route => steps.includes(gradeStep(route.grade)))
        : steps.map(step => gradeSteps[step][0]);
}

function setPool(maxGrade, style, useWall){
    return poolFor(stepsBelow(maxGrade, style), useWall);
}

// On the wall a route is never picked twice; off it, a grade can come up again
function pickClimbs(pool, count, useWall){
    let picked = [];
    if(useWall){
        let remaining = pool.slice();
        while(picked.length < count && remaining.length > 0){
            let route = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
            picked.push({ "route" : route.id, "grade" : route.grade, "colour" : route.colour, "section" : route.section });
        }
        return picked;
    }
    while(picked.length < count && pool.length > 0){
        picked.push({ "route" : null, "grade" : pool[Math.floor(Math.random() * pool.length)], "colour" : null, "section" : null });
    }
    return picked;
}

// A set is laps on one route, a different one from the last set's where there is one
function pickSetClimb(maxGrade, style, useWall, previous){
    let pool = setPool(maxGrade, style, useWall);
    let fresh = useWall
        ? pool.filter(route => previous === null || route.id !== previous.route)
        : pool.filter(grade => previous === null || grade !== previous.grade);
    let picked = pickClimbs(fresh.length > 0 ? fresh : pool, 1, useWall);
    return picked.length === 0 ? null : picked[0];
}

function repeatClimb(climb, count){
    return climb === null ? [] : Array.from({ "length" : count }, () => Object.assign({}, climb));
}

/* Settings. They stick between visits; a session under way keeps what it started with. */

function checkedValue(name, fallback){
    let checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked === null ? fallback : checked.value;
}

function selectedGrade(){ return checkedValue("maxGrade", maxGrades[0]); }
function selectedStyle(){ return checkedValue("style", "endurance"); }
function selectedRest(){ return parseInt(checkedValue("restMinutes", defaultRestMinutes), 10); }

function usingWall(){
    let box = document.getElementById("useWall");
    return box === null ? true : box.checked;
}

function setGrade(){
    localStorage.setItem(gradeKey, selectedGrade());
    drawStyleHint();
}

function setStyle(){
    localStorage.setItem(styleKey, selectedStyle());
    drawStyleHint();
}

function setRest(){
    localStorage.setItem(restKey, JSON.stringify(selectedRest()));
    drawStyleHint();
}

function toggleWall(){
    localStorage.setItem(wallKey, JSON.stringify(usingWall()));
    drawStyleHint();
}

// Sessions from before the rest could be chosen ran to five minutes
function restMinutesOf(entry){
    return entry && entry.rest ? entry.rest : defaultRestMinutes;
}

function loadSettings(){
    let style = localStorage.getItem(styleKey);
    let styleRadio = style === null ? null : document.querySelector(`input[name="style"][value="${style}"]`);
    if(styleRadio){ styleRadio.checked = true; }

    let wall = localStorage.getItem(wallKey);
    if(wall !== null){ document.getElementById("useWall").checked = JSON.parse(wall); }

    let rest = localStorage.getItem(restKey);
    let minutes = rest === null ? defaultRestMinutes : JSON.parse(rest);
    // an option since taken off the list would leave nothing checked
    (document.getElementById("rest" + minutes) || document.getElementById("rest" + defaultRestMinutes)).checked = true;

    let grade = localStorage.getItem(gradeKey);
    let chosen = maxGrades.includes(grade) ? grade : maxGrades[0];
    document.getElementById("gradePicker").innerHTML = maxGrades.map((name, index) =>
        `<input type="radio" name="maxGrade" class="nice-radios" id="grade${index}" value="${name}"${name === chosen ? " checked" : ""} data-change="setGrade" />
        <label for="grade${index}">${name}</label>`).join("");
}

/* The session */

function startSession(){
    session = {
        "id" : Date.now(),
        "date" : today(),
        "maxGrade" : selectedGrade(),
        "style" : selectedStyle(),
        "wall" : usingWall(),
        "rest" : selectedRest(),
        "stage" : "warmup",   // warmup | rest | set | choice
        "setNumber" : 0,
        "climbs" : [],        // the list on screen, as picks
        "ticked" : [],        // positions in it that are done
        "logged" : [],        // every climb ticked this session
        "restEndsAt" : null,
        "rating" : 0,
        "setClimb" : null     // the route the set on screen repeats
    };
    session.climbs = pickClimbs(poolFor(warmUpSteps, session.wall), warmUpSize, session.wall);
    session.start = session.id;
    requestWakeLock();
    keepSession();
    drawAll();
}

function closeSession(){
    stopRestTicker();
    session = null;
    saving = false;
    keepSession();
    releaseWakeLock();
    resetSavePanel();
    drawAll();
}

function discardSession(){
    confirmReset("discard", session !== null && session.logged.length > 0, closeSession);
}

// By place in the list: with the wall off, two climbs can be the same grade
function toggleClimb(button){
    if(session === null || (session.stage !== "warmup" && session.stage !== "set")){ return; }
    let index = Number(button.dataset.index);
    let position = session.ticked.indexOf(index);
    position === -1 ? session.ticked.push(index) : session.ticked.splice(position, 1);
    if(position === -1){ haptic(); }   // a tick, not taking one back
    keepSession();
    session.ticked.length === session.climbs.length ? completeList() : drawAll();
}

function completeList(){
    session.logged = session.logged.concat(session.climbs);
    if(session.stage === "set" && session.setNumber >= setsBeforeChoice){
        session.stage = "choice";
        session.climbs = [];
        session.ticked = [];
        keepSession();
        drawAll();
        return;
    }
    startRest();
}

// Rests end at a fixed moment, so a reload mid rest picks up where it was
function startRest(){
    session.stage = "rest";
    session.climbs = [];
    session.ticked = [];
    session.restEndsAt = Date.now() + (debug ? 5000 : restMinutesOf(session) * 60 * 1000);
    keepSession();
    startRestTicker();
    drawAll();
}

// Also SKIP THE REST
function endRest(){
    stopRestTicker();
    session.stage = "set";
    session.setNumber = session.setNumber + 1;
    session.restEndsAt = null;
    session.setClimb = pickSetClimb(session.maxGrade, session.style, session.wall, session.setClimb || null);
    session.climbs = repeatClimb(session.setClimb, sessionTypes[session.style].climbs);
    session.ticked = [];
    keepSession();
    drawAll();
}

// ANOTHER SET, offered once the third is done
function addSet(){
    startRest();
}

function restRemaining(){
    if(session === null || session.restEndsAt === null){ return 0; }
    return Math.max(0, session.restEndsAt - Date.now());
}

function startRestTicker(){
    if(restTicker === null){ restTicker = setInterval(tickRest, 250); }
}

function stopRestTicker(){
    clearInterval(restTicker);
    restTicker = null;
}

function tickRest(){
    restRemaining() === 0 ? endRest() : drawRestClock();
}

/* Saving */

function openSavePanel(){
    session.finish = Date.now();
    keepSession();
    saving = true;
    drawAll();
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

const logView = {
    "key" : app.logKey,
    "describe" : entry => ({
        "title" : `${sessionTypes[entry.style] ? sessionTypes[entry.style].name : entry.style} off ${entry.maxGrade}`,
        "detail" : `${plural(entry.sets, "set")} · ${entry.climbs} climbs · ${restMinutesOf(entry)} min rests · ${entry.wall === false ? "grades only" : "Gilford wall"}${entry.minutes ? " · " + sessionLength(entry) : ""}`
    }),
    "stats" : log => `${sessionCount(log)} · ${log.reduce((total, entry) => total + entry.climbs, 0)} climbs logged`
};

// A session can end part way through a list: what was ticked on it counts
function climbsDone(){
    let onScreen = session.stage === "warmup" || session.stage === "set" ? session.ticked.map(index => session.climbs[index]) : [];
    return session.logged.concat(onScreen);
}

// a set finished on before a lap of it was ticked isn't one
function setsDone(){
    return session.stage === "set" && session.ticked.length === 0 ? session.setNumber - 1 : session.setNumber;
}

function saveSession(){
    let climbs = climbsDone();
    saveToLog(app.logKey, Object.assign({
        "id" : session.id,
        "date" : session.date,
        "style" : session.style,
        "maxGrade" : session.maxGrade,
        "wall" : session.wall,
        "rest" : restMinutesOf(session),
        "sets" : setsDone(),
        "climbs" : climbs.length,
        "grades" : climbs.map(climb => climb.grade),   // for the progress charts
        "rating" : session.rating,
        "comment" : sessionComment
    }, sessionTiming(session)));
    closeSession();
    drawSessionLog(logView);
    openInfoBox();
}

/* Drawing */

function formatRest(milliseconds){
    let whole = Math.ceil(milliseconds / 1000);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

// What the settings add up to, on the set up screen and under the settings
function drawStyleHint(){
    let style = selectedStyle();
    let wall = usingWall();
    let pool = setPool(selectedGrade(), style, wall);
    let grades = [...new Set(wall ? pool.map(route => route.grade) : pool)]
        .sort((first, second) => gradeOrder.indexOf(first) - gradeOrder.indexOf(second));
    let line = `${sessionTypes[style].climbs} laps a set, a route of its own each set, ${setsBeforeChoice} sets, ${selectedRest()} minutes between. `
        + `${wall ? "Picked from routes at" : "Picked from grades"}: ${grades.join(", ")}.`;
    document.querySelectorAll(".style-hint").forEach(hint => { hint.innerText = line; });
}

function drawAll(){
    showState(session === null ? "idle" : saving ? "saving" : session.stage);
    if(session === null){
        drawStyleHint();
        return;
    }
    document.getElementById("stageTitle").innerText = stageTitle();
    document.getElementById("stageHint").innerText = stageHint();
    drawRestClock();
    drawClimbs();
}

function stageTitle(){
    if(session.stage === "warmup"){ return "Warm up"; }
    if(session.stage === "rest"){ return "Rest"; }
    return session.setNumber <= setsBeforeChoice ? `Set ${session.setNumber} of ${setsBeforeChoice}` : `Set ${session.setNumber}`;
}

function stageHint(){
    if(session.stage === "rest"){ return `Set ${session.setNumber + 1} next`; }
    if(session.stage === "choice"){ return `${session.logged.length} climbs done. Finish, or keep going with another set.`; }
    return `${session.ticked.length} of ${session.climbs.length} ticked`;
}

function drawRestClock(){
    document.getElementById("restClock").innerText = formatRest(restRemaining());
}

// On the wall a climb shows its hold colour and panel; a set's laps are numbered
function drawClimbs(){
    let laps = session.stage === "set";
    document.getElementById("climbs").innerHTML = session.climbs.map((climb, index) => {
        let ticked = session.ticked.includes(index);
        let onWall = climb.colour !== null;
        let detail = [laps ? `Lap ${index + 1}` : null, onWall ? `${climb.colour} &middot; panel ${climb.section}` : null]
            .filter(part => part !== null).join(" &middot; ");
        return `<button type="button" id="climb${index}" data-action="toggleClimb" data-index="${index}"
            class="route ${onWall ? "hold-" + climb.colour.toLowerCase() : "plain"}${ticked ? " ticked" : ""}"
            aria-pressed="${ticked}"
            aria-label="${laps ? `Lap ${index + 1}, ` : ""}${onWall ? `${climb.colour} ${climb.grade}, panel ${climb.section}` : climb.grade}">
            ${detail === "" ? "" : `<span class="route-colour">${detail}</span>`}
            <span class="route-grade">${climb.grade}</span>
            <i class="demo-icon icon-ok tick" aria-hidden="true"></i>
        </button>`;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    if(restoreSession()){
        requestWakeLock();
        if(session.stage === "rest"){ startRestTicker(); }
        setStar(session.rating);
    }
    drawAll();
    drawSessionLog(logView);
});
