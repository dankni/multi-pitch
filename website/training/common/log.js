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
         fallsKey   : where Track Falls or Ascent Style is kept - the app puts
                      fallsControl(climb, name) beside each climb, and calls
                      noteSend(climb) / noteUnsend(climb) as one is sent or taken back,
         sendClimb  : (climb, style) => send one from the waffle (optional; addGrade otherwise),
         unsendClimb: climb => take its last send back for undo (optional; removeGrade otherwise),
         drawClimb  : climb => redraw its row (optional; drawGradeRow otherwise)
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
        timing(entry), app.fromEntry(entry), { "falls" : Object.assign({}, entry.falls), "ascents" : JSON.parse(JSON.stringify(entry.ascents || {})) });
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
    drawUndo();
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
        { "falls" : fallsToSave(session), "ascents" : ascentsToSave(session), "rating" : session.rating, "comment" : sessionComment, "title" : titleToSave() }));
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

/* ================= Falls and ascent style =================
   With Track Falls or Ascent Style on under the cog, a waffle by each climb fans
   out fall, dog, tick and flash in a quarter circle. A fall is counted on the session as { climb : count }
   - a grade, or a route's id; dog, tick and flash send it. What was marked on each
   climb is kept in order as { climb : ["fall", "dog", ...] } (`ascents`), a plain
   tap on the climb a tick. The session's `undo` lists each mark as it was made,
   for the undo button by the last one. Not on the watch. */
const fallsIcon = '<svg class="toggle-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M4 1.5l6 3-5 3 5 3"/><path d="M10 10.5v4M7.5 12.5 10 15l2.5-2.5"/></g></svg>';
const waffleIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g fill="currentColor">'
    + [2, 8, 14].map(y => [2, 8, 14].map(x => `<circle cx="${x}" cy="${y}" r="1.7"/>`).join("")).join("") + '</g></svg>';
const strokeIcon = paths => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
    + paths + '</g></svg>';
const undoIcon = strokeIcon('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>');
const ascentStyles = [
    { "style" : "fall",  "label" : "Fall",  "icon" : strokeIcon('<path d="M12 4v15M6 13l6 6 6-6"/>') },
    // Zzz: a rest on the rope
    { "style" : "dog",   "label" : "Dog",   "icon" : strokeIcon('<path d="M3 13h7l-7 7h7"/><path d="M12.5 7.5h5l-5 5h5"/><path d="M19 2.5h3l-3 3h3" stroke-width="2"/>') },
    { "style" : "tick",  "label" : "Tick",  "icon" : strokeIcon('<path d="M5 12.5 9.5 17 19 7"/>') },
    { "style" : "flash", "label" : "Flash", "icon" : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14 2 4.5 13.5H11L9.5 22 19.5 9.5H13z"/></svg>' }
];
const sendStyles = ["dog", "tick", "flash"];
const fanRadius = 130;   // px from the waffle's centre to each button's, on a quarter circle centred to its left
let ascentStyle = null;   // the style a climb sent from the waffle goes in with

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
            <span class="label-content">${fallsIcon} Track Falls or Ascent Style <span class="switch-state"></span></span>
        </label>`;
    if(spot === null){ settings.insertAdjacentHTML("beforeend", markup); }
    else { spot.insertAdjacentHTML("beforebegin", markup); }
    document.body.toggleAttribute("data-falls", trackingFalls());
}

function toggleTrackFalls(input){
    localStorage.setItem(app.fallsKey, input.checked);
    document.body.toggleAttribute("data-falls", input.checked);
    if(session !== null){
        app.draw();
        drawUndo();
    }
}

function fallsOn(climb, from){
    let falls = (from || session || {}).falls;
    return falls && Number(falls[climb]) > 0 ? Number(falls[climb]) : 0;
}

function ascentsOf(climb, from){
    let ascents = (from || session || {}).ascents;
    return ascents && Array.isArray(ascents[climb]) ? ascents[climb] : [];
}

function setAscents(climb, marks){
    let ascents = Object.assign({}, session.ascents);
    if(marks.length > 0){ ascents[climb] = marks; }
    else { delete ascents[climb]; }
    session.ascents = ascents;
}

function lastSend(marks){
    for(let at = marks.length - 1; at >= 0; at--){
        if(sendStyles.includes(marks[at])){ return at; }
    }
    return -1;
}

/* The undo list: { c : climb } a mark, with `was` where a send's style was changed
   ("" for one that had none) */
function undoList(){
    return session !== null && Array.isArray(session.undo) ? session.undo : [];
}

function lastMarked(){
    let list = undoList();
    return list.length > 0 ? String(list[list.length - 1].c) : null;
}

function pushUndo(step){
    session.undo = undoList().concat(step);
    queueMicrotask(drawUndo);   // once the app has redrawn the climb
}

// the last for this climb, which is the last of all when undone from the button
function dropUndo(climb){
    let list = undoList().slice();
    for(let at = list.length - 1; at >= 0; at--){
        if(String(list[at].c) === String(climb)){
            list.splice(at, 1);
            break;
        }
    }
    session.undo = list;
    queueMicrotask(drawUndo);
}

/* The undo slides in on a climb as it becomes the last marked; a row redrawn
   while it still is the last has it there already (.settled) */
let undoShownOn = null;

function drawUndo(){
    let last = lastMarked();
    document.querySelectorAll(".ascent").forEach(control => {
        let here = control.dataset.climb === last;
        if(here && undoShownOn !== last){ control.classList.remove("settled"); }
        control.toggleAttribute("data-last", here);
    });
    undoShownOn = last;
}

// The app calls these as a climb is sent or taken back, before keeping the session
function noteSend(climb){
    if(session === null || !trackingFalls()){ return; }
    setAscents(climb, ascentsOf(climb).concat(ascentStyle || "tick"));
    pushUndo({ "c" : climb });
}

function noteUnsend(climb){
    if(session === null){ return; }
    let marks = ascentsOf(climb).slice();
    let at = lastSend(marks);
    if(at === -1){ return; }
    marks.splice(at, 1);
    setAscents(climb, marks);
    dropUndo(climb);
}

// A climb sent once at most - a tick list route - changes its style instead
function restyleSend(climb, style){
    let marks = ascentsOf(climb).slice();
    let at = lastSend(marks);
    pushUndo({ "c" : climb, "was" : at === -1 ? "" : marks[at] });
    if(at === -1){ marks.push(style); }
    else { marks[at] = style; }
    setAscents(climb, marks);
    keepSession();
}

function fallsControl(climb, name){
    if(!trackingFalls() || session === null){ return ""; }
    let count = fallsOn(climb);
    let fan = ascentStyles.map((each, index) => {
        let angle = (135 + index * 30) * Math.PI / 180;
        let x = Math.round(Math.cos(angle) * fanRadius), y = -Math.round(Math.sin(angle) * fanRadius);
        return `<button type="button" class="ascent-style ascent-${each.style}" style="--i:${index};--x:${x}px;--y:${y}px" data-action="markAscent"
            data-climb="${climb}" data-style="${each.style}" aria-label="${each.label} on ${name}"><span class="ascent-label">${each.label}</span><span class="ascent-dot">${each.icon}</span></button>`;
    }).join("");
    let settled = lastMarked() === String(climb) && undoShownOn === String(climb);
    return `<div class="ascent${settled ? " settled" : ""}" id="ascent-${climb}" data-climb="${climb}" data-name="${name}"${settled ? " data-last" : ""}>
        <div class="ascent-pick">
            <button type="button" class="icon-button ascent-open" data-action="toggleAscentMenu" aria-expanded="false"
                aria-label="Fall, dog, tick or flash on ${name}${count > 0 ? ", " + plural(count, "fall") + " so far" : ""}">${waffleIcon}${count > 0 ? `<span class="ascent-falls" aria-hidden="true">${count}</span>` : ""}</button>
            <div class="ascent-menu" hidden>${fan}</div>
        </div>
        <button type="button" class="icon-button ascent-undo" data-action="undoAscent" aria-label="Undo the last on ${name}">${undoIcon}</button>
    </div>`;
}

/* The fan, over the page greyed behind it */
function ascentScrim(){
    let scrim = document.getElementById("ascentScrim");
    if(scrim === null){
        scrim = document.createElement("div");
        scrim.id = "ascentScrim";
        scrim.className = "ascent-scrim";
        scrim.hidden = true;
        document.body.appendChild(scrim);
    }
    return scrim;
}

function closeAscentMenus(except){
    document.querySelectorAll(".ascent.open").forEach(control => {
        if(control === except){ return; }
        control.classList.remove("open");
        control.querySelector(".ascent-menu").hidden = true;
        control.querySelector(".ascent-open").setAttribute("aria-expanded", "false");
    });
    if(except === undefined){ ascentScrim().hidden = true; }
}

function toggleAscentMenu(button){
    let control = button.closest(".ascent");
    closeAscentMenus(control);
    let open = !control.classList.contains("open");
    control.classList.toggle("open", open);
    let menu = control.querySelector(".ascent-menu");
    menu.hidden = !open;
    ascentScrim().hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if(open){ keepOnScreen(menu, button); }
}

// Worked out from where the buttons end up rather than measured, as they start the pop small
function keepOnScreen(menu, button){
    let centre = button.getBoundingClientRect();
    let cx = centre.left + centre.width / 2, cy = centre.top + centre.height / 2;
    let box = { "left" : Infinity, "right" : -Infinity, "top" : Infinity, "bottom" : -Infinity };
    menu.querySelectorAll(".ascent-style").forEach(each => {
        let x = cx + parseFloat(each.style.getPropertyValue("--x")), y = cy + parseFloat(each.style.getPropertyValue("--y"));
        let dot = each.querySelector(".ascent-dot").offsetWidth / 2;
        box.left = Math.min(box.left, x + dot - each.offsetWidth);
        box.right = Math.max(box.right, x + dot);
        box.top = Math.min(box.top, y - dot);
        box.bottom = Math.max(box.bottom, y + dot);
    });
    let gutter = 8;
    let topNav = document.querySelector("nav:not(.bottom-nav)");
    let bottomNav = document.querySelector("nav.bottom-nav");
    // a nav scrolled away no longer covers anything
    let top = Math.max(0, topNav === null ? 0 : topNav.getBoundingClientRect().bottom) + gutter;
    let bottom = Math.min(window.innerHeight, bottomNav === null ? window.innerHeight : bottomNav.getBoundingClientRect().top) - gutter;
    let shiftX = box.left < gutter ? gutter - box.left : Math.min(0, document.documentElement.clientWidth - gutter - box.right);
    let shiftY = box.top < top ? top - box.top : Math.min(0, bottom - box.bottom);
    menu.style.setProperty("--shift-x", shiftX + "px");
    menu.style.setProperty("--shift-y", shiftY + "px");
}

document.addEventListener("click", event => {
    if(!event.target.closest || event.target.closest(".ascent-pick") === null){ closeAscentMenus(); }
});

function markAscent(button){
    if(session === null){ return; }
    let climb = button.dataset.climb;
    let style = button.dataset.style;
    let name = button.closest(".ascent").dataset.name;
    closeAscentMenus();
    if(style === "fall"){
        noteRecent(name + " fall");
        changeFalls(climb, 1);
        return;
    }
    ascentStyle = style;
    try { app.sendClimb ? app.sendClimb(climb, style) : addGrade(climb); }
    finally { ascentStyle = null; }
}

// The last fall, send or change of style, whichever climb it was on
function undoAscent(){
    let list = undoList();
    if(list.length === 0){ return; }
    let step = list[list.length - 1];
    let climb = String(step.c);
    let marks = ascentsOf(climb).slice();
    if(step.was !== undefined){
        session.undo = list.slice(0, -1);
        let at = lastSend(marks);
        if(at !== -1){
            if(step.was === ""){ marks.splice(at, 1); }
            else { marks[at] = step.was; }
            setAscents(climb, marks);
        }
        keepSession();
        drawUndo();
        return;
    }
    if(marks[marks.length - 1] === "fall"){
        let control = document.getElementById("ascent-" + climb);
        noteRecent((control === null ? climb : control.dataset.name) + " fall taken back");
        changeFalls(climb, -1);
        return;
    }
    app.unsendClimb ? app.unsendClimb(climb) : removeGrade(climb);
}

// the climb's row redrawn where the app can, otherwise just its control, so the scroll position stays put
function changeFalls(climb, by){
    let falls = Object.assign({}, session.falls);
    let count = Math.max(0, fallsOn(climb) + by);
    if(count === 0){ delete falls[climb]; }
    else { falls[climb] = count; }
    session.falls = falls;
    let marks = ascentsOf(climb).slice();
    if(by > 0){
        marks.push("fall");
        pushUndo({ "c" : climb });
    } else if(marks.lastIndexOf("fall") !== -1){
        marks.splice(marks.lastIndexOf("fall"), 1);
        dropUndo(climb);
    }
    setAscents(climb, marks);
    keepSession();
    if(by > 0){ haptic(); }
    if(app.drawClimb){ app.drawClimb(climb); }
    else if(typeof drawGradeRow === "function"){ drawGradeRow(climb); }
    else {
        let control = document.getElementById("ascent-" + climb);
        if(control !== null){ control.outerHTML = fallsControl(climb, control.dataset.name); }
    }
}

// saved only with some in them
function fallsToSave(from){
    let falls = from.falls || {};
    return Object.keys(falls).length > 0 ? Object.assign({}, falls) : undefined;
}

function ascentsToSave(from){
    let ascents = from.ascents || {};
    return Object.keys(ascents).length > 0 ? JSON.parse(JSON.stringify(ascents)) : undefined;
}

// for a log row's detail: its flashes, not its falls
function flashDetail(entry){
    let ascents = entry.ascents && typeof entry.ascents === "object" ? Object.values(entry.ascents) : [];
    let total = ascents.reduce((sum, marks) => sum + (Array.isArray(marks) ? marks.filter(mark => mark === "flash").length : 0), 0);
    return total === 0 ? "" : total + (total === 1 ? " flash" : " flashes");
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
