const logKey = "gilfordLog";
const currentKey = "gilfordCurrent";

let session = null;      // the session being logged or edited

// today(), getLog(), setLog(), saveCurrent() and the session log are shared - see
// common/functions.js. A session is held in local storage while it is in progress
// so a reload doesn't lose the ticks.
function hardestGrade(climbs){
    let hardest = -1;
    climbs.forEach(id => {
        let route = getRoute(id);
        if(route && gradeOrder.indexOf(route.grade) > hardest){
            hardest = gradeOrder.indexOf(route.grade);
        }
    });
    return hardest === -1 ? "" : gradeOrder[hardest];
}

/* Session handling */

function startSession(){
    session = { "id" : Date.now(), "date" : today(), "climbs" : [], "rating" : 0, "editing" : false };
    openSession();
}

function editSession(id){
    let entry = getLog(logKey).find(item => item.id === id);
    if(!entry){ return; }
    session = { "id" : entry.id, "date" : entry.date, "climbs" : entry.climbs.slice(), "rating" : entry.rating, "editing" : true };
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
    drawRoutes();
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

function setSessionDate(date){
    if(session && date){
        session.date = date;
        saveCurrent(currentKey, session);
    }
}

function toggleClimb(id){
    if(!session){ return; }
    // what was already true before this tap, so the cheer only fires on the tick
    // that completes a set and not on every one after it
    let before = { "sevens" : allTicked(sevens), "wall" : allTicked(everything),
        "count" : session.climbs.length };
    let position = session.climbs.indexOf(id);
    position === -1 ? session.climbs.push(id) : session.climbs.splice(position, 1);
    let button = document.getElementById("route" + id);
    button.classList.toggle("ticked", position === -1);
    button.setAttribute("aria-pressed", position === -1);
    saveCurrent(currentKey, session);
    updateSummary();
    cheer(before);
}

/* Three things worth saying something about: half the wall, the three sevens -
   the hard ones on it - and the whole 24, which is what the paper tracker was for.

   All three are read off the routes rather than written down here, so a re-set
   wall with four sevens or thirty routes on it still says the right thing. */
const sevens = routes.filter(route => route.grade.startsWith("7")).map(route => route.id);
const everything = routes.map(route => route.id);
const halfway = Math.ceil(routes.length / 2);

function allTicked(ids){
    return ids.length > 0 && ids.every(id => session.climbs.indexOf(id) !== -1);
}

/* Said once, as the tick that completes the set goes on - never on the way back
   down when one comes off, and never twice for the same set.

   One tick can finish more than one of them, and only one thing can be said: the
   whole wall beats the sevens, and the sevens beat the half, hardest first. */
function cheer(before){
    if(allTicked(everything)){
        if(!before.wall){ toast("Amazing! you ticked them all, that's the goal this app was made for"); }
        return;
    }
    if(allTicked(sevens) && !before.sevens){
        toast("Nice work ticking the 7's");
        return;
    }
    if(session.climbs.length === halfway && before.count < halfway){
        toast("Half the routes on the wall ticked, nice one!");
    }
}

function openSavePanel(){
    document.getElementById("finishButton").style.display = "none";
    document.getElementById("endingDiv").style.display = "block";
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

// setStar() paints the stars; this is what the tick list does with the number
function onRatingChange(value){
    if(session){ session.rating = value; saveCurrent(currentKey, session); }
}

/* What a tick list session is called in the log, and the wrench that reopens one.
   The table, the stars, the two tap delete and the stats line are all
   drawSessionLog() in common/functions.js.

   Sessions here are ordered by the date climbed rather than by id: a session can
   be dated by hand, so the newest id isn't necessarily the newest session. */
const logView = {
    "key" : logKey,
    "order" : (a, b) => b.date.localeCompare(a.date),
    "onEdit" : "editSession",
    "describe" : entry => {
        let hardest = hardestGrade(entry.climbs);
        return {
            "title" : `${entry.climbs.length} climb${entry.climbs.length === 1 ? "" : "s"}`,
            "detail" : hardest ? `hardest ${hardest}` : ""
        };
    },
    "stats" : log => {
        let month = today().slice(0, 7);
        let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
        let totalClimbs = log.reduce((total, entry) => total + entry.climbs.length, 0);
        return `${log.length} session${log.length === 1 ? "" : "s"} (${thisMonth} this month) · ${totalClimbs} climbs logged`;
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

function drawRoutes(){
    let holder = document.getElementById("routes");
    let sections = [...new Set(routes.map(route => route.section))];
    holder.innerHTML = "";
    sections.forEach(number => {
        let block = `<section class="section-block">
            <span class="section-number" aria-hidden="true"><small>Panel</small>${number}</span>`;
        routes.filter(route => route.section === number).forEach(route => {
            let ticked = session.climbs.includes(route.id);
            block += `<button type="button"
                id="route${route.id}"
                class="route hold-${route.colour.toLowerCase()}${ticked ? " ticked" : ""}"
                aria-pressed="${ticked}"
                aria-label="${route.colour} ${route.grade}, panel ${number}"
                onclick="toggleClimb(${route.id})">
                <span class="route-colour">${route.colour}</span>
                <span class="route-grade">${route.grade}</span>
                <i class="demo-icon icon-ok tick" aria-hidden="true"></i>
            </button>`;
        });
        holder.innerHTML += block + "</section>";
    });
}

function updateSummary(){
    let hardest = hardestGrade(session.climbs);
    document.getElementById("tickCount").innerText = session.climbs.length;
    document.getElementById("summary").innerText = session.climbs.length === 0
        ? "Nothing ticked yet"
        : `Hardest: ${hardest}`;
}

// Only the stars in the rating panel, the log draws stars of its own




window.addEventListener('DOMContentLoaded', (event) => {
    let current = localStorage.getItem(currentKey);
    if(current){
        session = JSON.parse(current);
        openSession();
    }
    drawSessionLog(logView);
});
