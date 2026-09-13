const logKey = "gilfordLog";
const currentKey = "gilfordCurrent";

let session = null;      // the session being logged or edited

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

// Sessions are held in local storage while in progress so a reload doesn't lose ticks
function saveCurrent(){
    session ? localStorage.setItem(currentKey, JSON.stringify(session)) : localStorage.removeItem(currentKey);
}

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
    let entry = getLog().find(item => item.id === id);
    if(!entry){ return; }
    session = { "id" : entry.id, "date" : entry.date, "climbs" : entry.climbs.slice(), "rating" : entry.rating, "editing" : true };
    hideAbout();
    openSession();
}

// Shared set up for both a new session and an edit of a saved one
function openSession(){
    requestWakeLock();
    saveCurrent();
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
    saveCurrent();
    document.getElementById("primaryButton").style.display = "inline-block";
    document.getElementById("discard").style.display = "none";
    document.getElementById("sessionHolder").style.display = "none";
    if(wakeLock != null){
        wakeLock.release().then(() => { wakeLock = null; });
    }
}

function setSessionDate(date){
    if(session && date){
        session.date = date;
        saveCurrent();
    }
}

function toggleClimb(id){
    if(!session){ return; }
    let position = session.climbs.indexOf(id);
    position === -1 ? session.climbs.push(id) : session.climbs.splice(position, 1);
    let button = document.getElementById("route" + id);
    button.classList.toggle("ticked", position === -1);
    button.setAttribute("aria-pressed", position === -1);
    saveCurrent();
    updateSummary();
}

function openSavePanel(){
    document.getElementById("finishButton").style.display = "none";
    document.getElementById("endingDiv").style.display = "block";
    document.getElementById("endingDiv").scrollIntoView({ "behavior" : "smooth", "block" : "end" });
}

function saveSession(){
    let log = getLog();
    let entry = {
        "id" : session.id,
        "date" : session.date,
        "climbs" : session.climbs.slice(),
        "rating" : session.rating
    };
    let existing = log.findIndex(item => item.id === entry.id);
    existing === -1 ? log.push(entry) : log[existing] = entry;
    setLog(log);
    closeSession();
    showSessionLog();
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

function showSessionLog(){
    let log = getLog().sort((a, b) => b.date.localeCompare(a.date));
    let holder = document.getElementById("log");
    holder.innerHTML = "";

    if(log.length === 0){
        holder.innerHTML = "<p>No sessions saved yet.</p>";
        document.getElementById("stats").innerText = "";
        return;
    }

    log.forEach(entry => {
        let hardest = hardestGrade(entry.climbs);
        let singleEntry = `<p>${entry.date} &ndash; ${entry.climbs.length} climb${entry.climbs.length === 1 ? "" : "s"}${hardest ? " &ndash; " + hardest : ""}<br />`;
        for(let i = 0; i < 5; i++){
            singleEntry += `<i class="demo-icon icon-star ${i < entry.rating ? "active" : ""}"></i>`;
        }
        singleEntry += `<i class="demo-icon icon-wrench" role="button" tabindex="0" aria-label="Edit session ${entry.date}" onclick="editSession(${entry.id})"></i>
            <i class="demo-icon icon-trash" role="button" tabindex="0" aria-label="Delete session ${entry.date}" onclick="toggleConfirm(${entry.id})"></i>
            <span style="display:none" id="confirm${entry.id}"> Are you sure? <br />
                <i class="demo-icon icon-ok" role="button" tabindex="0" aria-label="Confirm delete" onclick="removeLog(${entry.id})"></i>
                <i class="demo-icon icon-cancel" role="button" tabindex="0" aria-label="Cancel delete" onclick="toggleConfirm(${entry.id})"></i>
            </span>
            </p>`;
        holder.innerHTML += singleEntry;
    });

    let month = today().slice(0, 7);
    let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
    let totalClimbs = log.reduce((total, entry) => total + entry.climbs.length, 0);
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
    let current = localStorage.getItem(currentKey);
    if(current){
        session = JSON.parse(current);
        openSession();
    }
    showSessionLog();
});
