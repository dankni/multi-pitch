// Circuit training on the Gilford wall. The session is a warm up, then sets of
// laps with a rest between each, every set on a single route picked to sit a set
// number of grades below whatever the climber says their max is.
//
// Grades step by letter here - a plus is a shade of its own grade rather than a
// grade of its own - so one grade below 7b is 7a and two below is 6c. The ladder
// itself is gradeSteps() in common/gilford-routes.js.

const logKey = "enduranceLog";
const currentKey = "enduranceCurrent";
const wallKey = "enduranceWall";
const restKey = "enduranceRest";
const gradeKey = "enduranceGrade";
const styleKey = "enduranceStyle";

const warmUpSize = 4;          // climbs in the warm up
const warmUpTopStep = 1;       // warm up comes from the 4s and 5s, whatever the max
const defaultRestMinutes = 5;  // the other rests on offer sit with the picker in the settings panel
const setsBeforeChoice = 3;    // after this many sets the app offers to finish

// How each session type is built: how many climbs a set holds, and how many
// grades below the climber's max those climbs are drawn from.
const sessionTypes = {
    "endurance" : { "climbs" : 4, "gradesBelow" : [2, 3, 4], "name" : "Endurance" },
    "power"     : { "climbs" : 2, "gradesBelow" : [1, 2],    "name" : "Power endurance" }
};

// One option per grade on the ladder, 6a upwards. There is no separate 6a+ or
// 7a+ to pick: a plus sits with its own grade, so those would build exactly the
// same session as 6a and 7a.
const maxGrades = gradeSteps.slice(gradeStep("6a")).map(step => step[0]);

let session = null;
let restTicker = null;

// today(), getLog(), setLog(), saveCurrent() and the session log itself are
// shared - see common/functions.js. The session is held in local storage as it
// runs, so a reload mid circuit picks up where it left off, rest timers included
// (they end at a fixed moment rather than counting down seconds).
/* Picking climbs

   With the Gilford wall switched on a list is named routes off that wall, hold
   colour and panel and all. Switched off it is nothing but grades, for anyone
   training the same session somewhere else. Either way a list is an array of
   picks, each holding a grade and - on the wall - the route it came from. */

// Rungs of the grade ladder the warm up is drawn from: the 4s and the 5s,
// whatever the climber's max
const warmUpSteps = [0, warmUpTopStep];

// Rungs a set is drawn from, e.g. power endurance off a 7b max is one and two
// grades below, so 7a and 6c. A max low enough to run off the bottom of the
// ladder just has fewer rungs to draw from.
function stepsBelow(maxGrade, style){
    return sessionTypes[style].gradesBelow
        .map(below => gradeStep(maxGrade) - below)
        .filter(step => step >= 0);
}

// What those rungs offer: routes on the wall at those grades, or the grades
// themselves when the wall is off
function poolFor(steps, useWall){
    return useWall === true
        ? routes.filter(route => steps.includes(gradeStep(route.grade)))
        : steps.map(step => gradeSteps[step][0]);
}

function warmUpPool(useWall){
    return poolFor(warmUpSteps, useWall);
}

function setPool(maxGrade, style, useWall){
    return poolFor(stepsBelow(maxGrade, style), useWall);
}

// The warm up is a list of different climbs: on the wall the same route is never
// picked twice within it - off it there is nothing telling two climbs of a grade
// apart, so a grade can come up more than once.
function pickClimbs(pool, count, useWall){
    let picked = [];
    if(useWall === true){
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

/* Sets are laps on one route

   A set is one route climbed over and over, and each set gets a route of its own,
   picked as the set starts. The route just climbed is left out of that pick, so
   two sets running are never the same route - unless the grades on offer hold
   nothing else, in which case it comes round again. The laps are held as separate
   picks so each one can be ticked off on its own. */
function pickSetClimb(maxGrade, style, useWall, previous){
    let pool = setPool(maxGrade, style, useWall);
    let fresh = useWall === true
        ? pool.filter(route => previous === null || route.id !== previous.route)
        : pool.filter(grade => previous === null || grade !== previous.grade);
    let picked = pickClimbs(fresh.length > 0 ? fresh : pool, 1, useWall);
    return picked.length === 0 ? null : picked[0];
}

function repeatClimb(climb, count){
    return climb === null ? [] : Array.from({ "length" : count }, () => Object.assign({}, climb));
}

/* Session handling */

function selectedGrade(){
    let checked = document.querySelector('input[name="maxGrade"]:checked');
    return checked === null ? maxGrades[0] : checked.value;
}

function selectedStyle(){
    let checked = document.querySelector('input[name="style"]:checked');
    return checked === null ? "endurance" : checked.value;
}

/* The grade and the style are set up rather than session choices now - they live
   under the cog with the wall and the rests - so they stick between visits the
   same way. A session already under way keeps what it started with. */
function setGrade(){
    localStorage.setItem(gradeKey, selectedGrade());
    drawStyleHint();
}

function setStyle(){
    localStorage.setItem(styleKey, selectedStyle());
    drawStyleHint();
}

function loadStyleSetting(){
    let saved = localStorage.getItem(styleKey);
    let radio = saved === null ? null : document.querySelector('input[name="style"][value="' + saved + '"]');
    if(radio){ radio.checked = true; }
}

// Whether to build the session out of the Gilford wall's own routes. It lives in
// the settings panel and sticks between visits - which wall you train on isn't
// something to pick again every session. A session already under way keeps the
// setting it started with; a change only tells on the next one.
function usingWall(){
    let box = document.getElementById("useWall");
    return box === null ? true : box.checked;
}

function toggleWall(){
    localStorage.setItem(wallKey, JSON.stringify(usingWall()));
    drawWallStatus();
    drawStyleHint();
}

function drawWallStatus(){
    document.getElementById("wallStatus").innerText = usingWall() ? "On" : "Off";
}

function loadWallSetting(){
    let saved = localStorage.getItem(wallKey);
    if(saved !== null){
        document.getElementById("useWall").checked = JSON.parse(saved);
    }
    drawWallStatus();
}

/* How long the rest between sets runs for

   Five minutes is the standard, but a harder session off a higher max wants
   longer, so ten and fifteen are there too. It sits in the settings panel beside
   the wall switch and sticks between visits for the same reason: it is how you
   train rather than something to pick again every session. A session already
   under way keeps the rest it started with - the length is written into the
   session when it starts - so a change only tells on the next one. */
function selectedRest(){
    let checked = document.querySelector('input[name="restMinutes"]:checked');
    return checked === null ? defaultRestMinutes : parseInt(checked.value, 10);
}

// A session started before the rest was configurable carries no rest of its own,
// and neither does a log entry from back then. Both ran to five minutes.
function restMinutesOf(entry){
    return entry && entry.rest ? entry.rest : defaultRestMinutes;
}

function setRest(){
    localStorage.setItem(restKey, JSON.stringify(selectedRest()));
    drawStyleHint();
}

function loadRestSetting(){
    let saved = localStorage.getItem(restKey);
    let minutes = saved === null ? defaultRestMinutes : JSON.parse(saved);
    // an option that has since gone from the list would leave nothing checked
    let radio = document.getElementById("rest" + minutes) || document.getElementById("rest" + defaultRestMinutes);
    radio.checked = true;
}

function startSession(){
    session = {
        "id" : Date.now(),
        "date" : today(),
        "maxGrade" : selectedGrade(),
        "style" : selectedStyle(),
        "wall" : usingWall(),
        "rest" : selectedRest(),
        "stage" : "warmup",   // warmup | rest | set | choice
        "setNumber" : 0,      // 0 until the first set after the warm up
        "climbs" : [],        // the list on screen now, as picks
        "ticked" : [],        // positions in that list which are done
        "logged" : [],        // every climb ticked so far this session
        "restEndsAt" : null,
        "rating" : 0,
        "setClimb" : null    // the route the set on screen repeats, once one starts
    };
    session.climbs = pickClimbs(warmUpPool(session.wall), warmUpSize, session.wall);
    requestWakeLock();
    saveCurrent(currentKey, session);
    drawAll();
}

function closeSession(){
    stopRestTicker();
    session = null;
    saveCurrent(currentKey, session);
    releaseWakeLock();
    setStar(0);
    document.getElementById("endingDiv").style.display = "none";
    drawAll();
}

// confirmReset is in common/functions.js - the first tap only arms the button
function discardSession(){
    confirmReset("discard", session !== null && session.logged.length > 0, closeSession);
}

// Climbs are ticked off by their place in the list rather than by which route
// they are - with the wall off, two climbs in a list can be the same grade
function toggleClimb(index){
    if(session === null || (session.stage !== "warmup" && session.stage !== "set")){ return; }
    let position = session.ticked.indexOf(index);
    position === -1 ? session.ticked.push(index) : session.ticked.splice(position, 1);
    saveCurrent(currentKey, session);
    // Finishing the list moves the session on, so redraw everything rather than
    // just the button that was tapped
    session.ticked.length === session.climbs.length ? completeList() : drawAll();
}

// Every climb of the warm up or of a set is ticked
function completeList(){
    session.logged = session.logged.concat(session.climbs);
    if(session.stage === "set" && session.setNumber >= setsBeforeChoice){
        session.stage = "choice";
        session.climbs = [];
        session.ticked = [];
        saveCurrent(currentKey, session);
        speak("Set " + session.setNumber + " done");
        drawAll();
        return;
    }
    startRest();
}

function startRest(){
    session.stage = "rest";
    session.climbs = [];
    session.ticked = [];
    session.restEndsAt = Date.now() + (debug ? 5000 : restMinutesOf(session) * 60 * 1000);
    saveCurrent(currentKey, session);
    startRestTicker();
    speak("Rest");
    drawAll();
}

// Also the SKIP REST button, for anyone who doesn't want the full rest
function endRest(){
    stopRestTicker();
    session.stage = "set";
    session.setNumber = session.setNumber + 1;
    session.restEndsAt = null;
    // a session started before the sets became laps carries no route of its own,
    // which pickSetClimb reads as nothing to avoid
    session.setClimb = pickSetClimb(session.maxGrade, session.style, session.wall, session.setClimb || null);
    session.climbs = repeatClimb(session.setClimb, sessionTypes[session.style].climbs);
    session.ticked = [];
    saveCurrent(currentKey, session);
    speak("Set " + session.setNumber);
    drawAll();
}

// Offered once the third set is done, instead of finishing
function addSet(){
    startRest();
}

function restRemaining(){
    if(session === null || session.restEndsAt === null){ return 0; }
    return Math.max(0, session.restEndsAt - Date.now());
}

function startRestTicker(){
    if(restTicker === null){
        restTicker = setInterval(tickRest, 250);
    }
}

function stopRestTicker(){
    if(restTicker !== null){
        clearInterval(restTicker);
        restTicker = null;
    }
}

function tickRest(){
    restRemaining() === 0 ? endRest() : drawRestClock();
}

/* Saving */

function openSavePanel(){
    document.getElementById("choice").style.display = "none";
    document.getElementById("endingDiv").style.display = "block";
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

// setStar() paints the stars; this is what the endurance app does with the number
function onRatingChange(value){
    if(session){ session.rating = value; saveCurrent(currentKey, session); }
}

/* What an endurance session is called in the log. The table, the stars, the two
   tap delete and the stats line are all drawSessionLog() in common/functions.js. */
const logView = {
    "key" : logKey,
    "describe" : entry => ({
        "title" : `${sessionTypes[entry.style] ? sessionTypes[entry.style].name : entry.style} off ${entry.maxGrade}`,
        "detail" : `${entry.sets} set${entry.sets === 1 ? "" : "s"} · ${entry.climbs} climbs · ${restMinutesOf(entry)} min rests · ${entry.wall === false ? "grades only" : "Gilford wall"}`
    }),
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let totalClimbs = log.reduce((total, entry) => total + entry.climbs, 0);
        return `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${totalClimbs} climbs logged`;
    }
};

function saveSession(){
    let log = getLog(logKey);
    log.push({
        "id" : session.id,
        "date" : session.date,
        "style" : session.style,
        "maxGrade" : session.maxGrade,
        "wall" : session.wall,
        "rest" : restMinutesOf(session),
        "sets" : session.setNumber,
        "climbs" : session.logged.length,
        "rating" : session.rating
    });
    setLog(logKey, log);
    closeSession();
    drawSessionLog(logView);
    openInfoBox();
}

// Only the stars in the rating panel, the log draws stars of its own

/* Drawing */

function formatRest(milliseconds){
    let whole = Math.ceil(milliseconds / 1000);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function drawGradePicker(){
    let saved = localStorage.getItem(gradeKey);
    // the grade last trained off, or the bottom of the ladder on a first visit
    let chosen = maxGrades.includes(saved) ? saved : maxGrades[0];
    document.getElementById("gradePicker").innerHTML = maxGrades.map((grade, index) => {
        return `<input type="radio" name="maxGrade" class="nice-radios" id="grade${index}" value="${grade}"${grade === chosen ? " checked" : ""} onchange="setGrade()" />
            <label for="grade${index}">${grade}</label>`;
    }).join("");
}

// Spells out what the current pair of choices actually gives you, so the session
// isn't a surprise once it starts
function drawStyleHint(){
    let style = selectedStyle();
    let wall = usingWall();
    let type = sessionTypes[style];
    let pool = setPool(selectedGrade(), style, wall);
    let grades = [...new Set(wall ? pool.map(route => route.grade) : pool)]
        .sort((first, second) => gradeOrder.indexOf(first) - gradeOrder.indexOf(second));
    let line =
        `${type.climbs} laps a set, a route of its own each set, ${setsBeforeChoice} sets, ${selectedRest()} minutes between. `
        + `${wall ? "Picked from routes at" : "Picked from grades"}: ${grades.join(", ")}.`;
    // once on the set up screen, once inside the settings panel, so a change can
    // be seen as it is made
    document.querySelectorAll(".style-hint").forEach(hint => { hint.innerText = line; });
}

function drawAll(){
    let running = session !== null;
    let stage = running ? session.stage : "";
    let saving = document.getElementById("endingDiv").style.display === "block";

    document.getElementById("setup").style.display = running ? "none" : "block";
    document.getElementById("sessionHolder").style.display = running ? "block" : "none";
    document.getElementById("discard").style.display = running ? "inline-block" : "none";
    // block, not inline-block: it needs a line of its own rather than sharing
    // one with the DISCARD button below it
    document.getElementById("skipRest").style.display = stage === "rest" ? "block" : "none";
    document.getElementById("choice").style.display = stage === "choice" && !saving ? "block" : "none";
    document.getElementById("restClock").style.display = stage === "rest" ? "block" : "none";

    if(!running){
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
    return session.setNumber <= setsBeforeChoice
        ? `Set ${session.setNumber} of ${setsBeforeChoice}`
        : `Set ${session.setNumber}`;
}

function stageHint(){
    if(session.stage === "rest"){
        return `Set ${session.setNumber + 1} next`;
    }
    if(session.stage === "choice"){
        return `${session.logged.length} climbs done. Finish, or keep going with another set.`;
    }
    return `${session.ticked.length} of ${session.climbs.length} ticked`;
}

function drawRestClock(){
    document.getElementById("restClock").innerText = formatRest(restRemaining());
}

// With the wall on, each climb carries its hold colour and panel. With it off
// there is only the grade, and the button is drawn plain. A set is the same route
// every time, so its buttons are numbered to tell one lap from the next.
function drawClimbs(){
    let holder = document.getElementById("climbs");
    let laps = session.stage === "set";
    holder.innerHTML = session.climbs.map((climb, index) => {
        let ticked = session.ticked.includes(index);
        let onWall = climb.colour !== null;
        let detail = [laps ? `Lap ${index + 1}` : null, onWall ? `${climb.colour} &middot; panel ${climb.section}` : null]
            .filter(part => part !== null).join(" &middot; ");
        return `<button type="button"
            id="climb${index}"
            class="route ${onWall ? "hold-" + climb.colour.toLowerCase() : "plain"}${ticked ? " ticked" : ""}"
            aria-pressed="${ticked}"
            aria-label="${laps ? `Lap ${index + 1}, ` : ""}${onWall ? `${climb.colour} ${climb.grade}, panel ${climb.section}` : climb.grade}"
            onclick="toggleClimb(${index})">
            ${detail === "" ? "" : `<span class="route-colour">${detail}</span>`}
            <span class="route-grade">${climb.grade}</span>
            <i class="demo-icon icon-ok tick" aria-hidden="true"></i>
        </button>`;
    }).join("");
}




window.addEventListener('DOMContentLoaded', (event) => {
    loadWallSetting();
    loadRestSetting();
    loadStyleSetting();
    drawGradePicker();
    let current = localStorage.getItem(currentKey);
    if(current){
        session = JSON.parse(current);
        requestWakeLock();
        if(session.stage === "rest"){
            startRestTicker();
        }
        setStar(session.rating);
    }
    drawAll();
    drawSessionLog(logView);
});
