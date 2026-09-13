// Circuit training on the Gilford wall. The session is a warm up, then sets of
// climbs with a rest between each, picked to sit a set number of grades below
// whatever the climber says their max is.
//
// Grades step by letter here - a plus is a shade of its own grade rather than a
// grade of its own - so one grade below 7b is 7a and two below is 6c. The ladder
// itself is gradeSteps() in common/gilford-routes.js.

const logKey = "enduranceLog";
const currentKey = "enduranceCurrent";
const wallKey = "enduranceWall";
const restKey = "enduranceRest";

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

function today(){
    return new Date().toISOString().slice(0, 10); // yyyy-mm-dd
}

function getLog(){
    let log = localStorage.getItem(logKey);
    return log ? JSON.parse(log) : [];
}

function setLog(log){
    localStorage.setItem(logKey, JSON.stringify(log));
}

// The session is held in local storage as it runs, so a reload mid circuit picks
// up where it left off - rest timers included, as they end at a fixed moment
function saveCurrent(){
    session ? localStorage.setItem(currentKey, JSON.stringify(session)) : localStorage.removeItem(currentKey);
}

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

// Sets are drawn fresh each time, so a climb can come round again later in the
// session. On the wall the same route is never picked twice within one list -
// off it there is nothing telling two climbs of a grade apart, so a grade can
// come up more than once.
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

/* Session handling */

function selectedGrade(){
    let checked = document.querySelector('input[name="maxGrade"]:checked');
    return checked === null ? maxGrades[0] : checked.value;
}

function selectedStyle(){
    let checked = document.querySelector('input[name="style"]:checked');
    return checked === null ? "endurance" : checked.value;
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
        "rating" : 0
    };
    session.climbs = pickClimbs(warmUpPool(session.wall), warmUpSize, session.wall);
    requestWakeLock();
    saveCurrent();
    drawAll();
}

function closeSession(){
    stopRestTicker();
    session = null;
    saveCurrent();
    if(wakeLock != null){
        wakeLock.release().then(() => { wakeLock = null; });
    }
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
    saveCurrent();
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
        saveCurrent();
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
    saveCurrent();
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
    session.climbs = pickClimbs(setPool(session.maxGrade, session.style, session.wall), sessionTypes[session.style].climbs, session.wall);
    session.ticked = [];
    saveCurrent();
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

function saveSession(){
    let log = getLog();
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
    setLog(log);
    closeSession();
    showSessionLog();
    openInfoBox();
}

// Only the stars in the rating panel, the log draws stars of its own
function setStar(value){
    let stars = document.querySelectorAll('.star-holder .icon-star');
    for(let i = 0; i < stars.length; i++){
        if(i < value){
            if(!stars[i].classList.contains('active')){
                stars[i].classList.add('active');
            }
        } else {
            if(stars[i].classList.contains('active')){
                stars[i].classList.remove('active');
            }
        }
    }
    if(session){
        session.rating = value;
        saveCurrent();
    }
}

/* Drawing */

function formatRest(milliseconds){
    let whole = Math.ceil(milliseconds / 1000);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function drawGradePicker(){
    document.getElementById("gradePicker").innerHTML = maxGrades.map((grade, index) => {
        return `<input type="radio" name="maxGrade" class="nice-radios" id="grade${index}" value="${grade}"${index === 0 ? " checked" : ""} onchange="drawStyleHint()" />
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
    document.getElementById("styleHint").innerText =
        `${type.climbs} climbs a set, ${setsBeforeChoice} sets, ${selectedRest()} minutes between. `
        + `${wall ? "Routes at" : "Grades"}: ${grades.join(", ")}.`;
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
// there is only the grade, and the button is drawn plain.
function drawClimbs(){
    let holder = document.getElementById("climbs");
    holder.innerHTML = session.climbs.map((climb, index) => {
        let ticked = session.ticked.includes(index);
        let onWall = climb.colour !== null;
        return `<button type="button"
            id="climb${index}"
            class="route ${onWall ? "hold-" + climb.colour.toLowerCase() : "plain"}${ticked ? " ticked" : ""}"
            aria-pressed="${ticked}"
            aria-label="${onWall ? `${climb.colour} ${climb.grade}, panel ${climb.section}` : climb.grade}"
            onclick="toggleClimb(${index})">
            ${onWall ? `<span class="route-colour">${climb.colour} &middot; panel ${climb.section}</span>` : ""}
            <span class="route-grade">${climb.grade}</span>
            <i class="demo-icon icon-ok tick" aria-hidden="true"></i>
        </button>`;
    }).join("");
}

function showSessionLog(){
    let log = getLog().sort((a, b) => b.id - a.id);
    let holder = document.getElementById("log");
    holder.innerHTML = "";

    if(log.length === 0){
        holder.innerHTML = "<p>No sessions saved yet.</p>";
        document.getElementById("stats").innerText = "";
        return;
    }

    log.forEach(entry => {
        let type = sessionTypes[entry.style] ? sessionTypes[entry.style].name : entry.style;
        let singleEntry = `<p>${entry.date} &ndash; ${type} off ${entry.maxGrade}<br />
            ${entry.sets} set${entry.sets === 1 ? "" : "s"}, ${entry.climbs} climbs, ${restMinutesOf(entry)} min rests
            &ndash; ${entry.wall === false ? "grades only" : "Gilford wall"}<br />`;
        for(let i = 0; i < 5; i++){
            singleEntry += `<i class="demo-icon icon-star ${i < entry.rating ? "active" : ""}"></i>`;
        }
        singleEntry += `<i class="demo-icon icon-trash" role="button" tabindex="0" aria-label="Delete session ${entry.date}" onclick="toggleConfirm(${entry.id})"></i>
            <span style="display:none" id="confirm${entry.id}"> Are you sure? <br />
                <i class="demo-icon icon-ok" role="button" tabindex="0" aria-label="Confirm delete" onclick="removeLog(${entry.id})"></i>
                <i class="demo-icon icon-cancel" role="button" tabindex="0" aria-label="Cancel delete" onclick="toggleConfirm(${entry.id})"></i>
            </span>
            </p>`;
        holder.innerHTML += singleEntry;
    });

    let month = today().slice(0, 7);
    let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
    let totalClimbs = log.reduce((total, entry) => total + entry.climbs, 0);
    document.getElementById("stats").innerText =
        `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${totalClimbs} climbs logged`;
}

function toggleConfirm(id){
    let element = document.getElementById("confirm" + id);
    element.style.display === "none" ? element.style.display = "block" : element.style.display = "none";
}

function removeLog(id){
    let log = getLog().filter(entry => entry.id !== id);
    setLog(log);
    showSessionLog();
}

window.addEventListener('DOMContentLoaded', (event) => {
    loadWallSetting();
    loadRestSetting();
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
    showSessionLog();
});
