/* Shared by every training page. A classic script, so everything here is a
   global the apps call directly. */

let sound = true;
let debug = false;

/* ================= Actions =================
   Markup names the function a control calls rather than carrying inline script:
   data-action on a click, data-change and data-input on a field. The function
   is handed the element, to read its value or data-* from. */
function delegate(eventType, attribute){
    document.addEventListener(eventType, event => {
        let target = event.target.closest ? event.target.closest("[" + attribute + "]") : null;
        if(target === null){ return; }
        let handler = window[target.getAttribute(attribute)];
        if(typeof handler !== "function"){ return; }
        if(target.tagName === "A"){ event.preventDefault(); }
        handler(target, event);
        if(eventType === "change" && target.type === "checkbox"){ trackToggle(target); }
    });
}

// GA event "toggle", e.g. toggle = "gym|trackFalls|on"
function trackToggle(box){
    if(typeof gtag !== "function"){ return; }
    let name = box.id || box.dataset.part || box.dataset.name || box.getAttribute("data-change");
    let page = (window.trainingPageName || document.title).toLowerCase();
    gtag("event", "toggle", { "toggle" : page + "|" + name + "|" + (box.checked ? "on" : "off") });
}
delegate("click", "data-action");
delegate("change", "data-change");
delegate("input", "data-input");

/* ================= Pickers =================
   CSS fills the checked chip of a radio picker whatever happens here; this only
   slides the fill over from the chip it was on, so a choice set from code just
   appears. The old chip is noted on the press, before the radio has changed. */
let pickedBefore = null;

function rememberPick(event){
    let picker = event.target.closest ? event.target.closest(".picker") : null;
    pickedBefore = picker === null ? null : picker.querySelector(':scope > [type="radio"]:checked + label');
}
document.addEventListener("pointerdown", rememberPick, true);
document.addEventListener("keydown", rememberPick, true);

document.addEventListener("change", event => {
    let from = pickedBefore;
    pickedBefore = null;
    let label = event.target.type === "radio" ? event.target.nextElementSibling : null;
    if(from === null || label === null || label === from || !label.isConnected || from.parentElement !== label.parentElement){ return; }
    if(!label.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches){ return; }
    let was = from.getBoundingClientRect();
    let now = label.getBoundingClientRect();
    label.animate([
        {inset: `${was.top - now.top}px ${now.right - was.right}px ${now.bottom - was.bottom}px ${was.left - now.left}px`},
        {inset: "0px"}
    ], {duration: 250, easing: "cubic-bezier(0.3, 0, 0.2, 1)", pseudoElement: "::before"});
});

/* ================= Keeping the screen on =================
   A session asks for the wake lock when it starts and lets it go when it ends.
   The browser drops the lock whenever the page is hidden, so wakeLockWanted
   remembers to ask again when it comes back. */
let wakeLock = null;
let wakeLockWanted = false;
let preventSleep = true;   // the Prevent Screen Sleep setting
const preventSleepKey = "preventSleep";

async function requestWakeLock(){
    wakeLockWanted = true;
    if(!preventSleep || !("wakeLock" in navigator) || wakeLock !== null){ return; }
    try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
    } catch(err){
        console.log(`${err.name}, ${err.message}`);
    }
}

// Let go without giving up: the setting turned off mid session
function dropWakeLock(){
    if(wakeLock !== null){
        wakeLock.release();
        wakeLock = null;
    }
}

// The session is over
function releaseWakeLock(){
    wakeLockWanted = false;
    dropWakeLock();
}

function togglePreventSleep(input){
    preventSleep = input.checked;
    localStorage.setItem(preventSleepKey, JSON.stringify(preventSleep));
    if(!preventSleep){
        dropWakeLock();
    } else if(wakeLockWanted){
        requestWakeLock();
    }
}

function loadPreventSleepSetting(){
    let saved = localStorage.getItem(preventSleepKey);
    preventSleep = saved === null ? true : JSON.parse(saved);
    let box = document.getElementById("preventSleep");
    if(box !== null){ box.checked = preventSleep; }
}

document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible" && wakeLockWanted && wakeLock === null){
        requestWakeLock();
    }
});

/* ================= The nav bar =================
   A page writes <nav data-info="its label" data-sound><h1>Name</h1></nav>, leaving
   out data-info for no info button and data-sound in an app that never speaks */
function drawTopNav(){
    let nav = document.querySelector("body > nav:not(.bottom-nav)");
    if(nav === null || nav.querySelector(".left-nav") !== null){ return; }
    let info = nav.dataset.info;
    let left = (info === undefined ? "" : `<button type="button" class="icon-button demo-icon icon-info" data-action="openInfoBox" aria-label="${info || "About this training app"}"></button>`)
        + '<button type="button" class="icon-button demo-icon icon-cog" data-action="openSettings" aria-label="Settings"></button>';
    let right = '<button type="button" id="fullscreen" class="icon-button demo-icon icon-resize-full" data-action="fullscreen" aria-label="Toggle fullscreen" hidden></button>'
        + ("sound" in nav.dataset ? '<button type="button" id="sound" class="icon-button demo-icon icon-volume-high" data-action="toggleSound" aria-label="Toggle sound"></button>' : "");
    nav.insertAdjacentHTML("afterbegin", `<div class="left-nav">${left}</div>`);
    nav.insertAdjacentHTML("beforeend", `<div class="right-nav">${right}</div>`);
}
drawTopNav();   // already parsed where this loads at the end of the body

/* ================= The nav bar's switches ================= */
function fullscreen(){
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
}

// The icon shows what a tap will do, however full screen was entered or left
function showFullscreenState(){
    let icon = document.getElementById("fullscreen");
    if(icon === null){ return; }
    let full = Boolean(document.fullscreenElement);
    icon.classList.toggle("icon-resize-full", !full);
    icon.classList.toggle("icon-resize-normal", full);
}
document.addEventListener("fullscreenchange", showFullscreenState);

// Muted or not is remembered for next time, across every app
const soundOffKey = "soundOff";

function toggleSound(){
    sound = !sound;
    localStorage.setItem(soundOffKey, JSON.stringify(!sound));
    if(!sound){ stopHum(); }
    showSoundState();
}

function showSoundState(){
    let icon = document.getElementById("sound");
    if(icon === null){ return; }
    icon.classList.toggle("icon-volume-high", sound);
    icon.classList.toggle("icon-volume-off", !sound);
}

function loadSoundSetting(){
    sound = localStorage.getItem(soundOffKey) !== "true";
    showSoundState();
}

// Debug mode speeds time up
function toggleDebug(input){
    debug = input.checked;
}

/* ================= Dark mode =================
   The page follows the phone's setting in CSS - light-dark() in style.css. The
   switch overrides it with .light or .dark on <html>, remembered across every
   app - even when it matches the phone, which may change over at night, and
   which a missing key would let a sync fill back in from the account. Applied as
   soon as this loads, in the <head>, so there is no flash of the other theme. */
const themeKey = "trainingTheme";   // not the main site's "theme"

function prefersDark(){
    return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function savedTheme(){
    let theme = localStorage.getItem(themeKey);
    return theme === "dark" || theme === "light" ? theme : null;
}

function isDark(){
    let theme = savedTheme();
    return theme === null ? prefersDark() : theme === "dark";
}

function applyTheme(){
    let theme = savedTheme();
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    showDarkModeSetting(isDark());
}

function toggleDarkMode(input){
    localStorage.setItem(themeKey, input.checked ? "dark" : "light");
    applyTheme();
}

// Every dark mode switch on the page in step - the style guide has two
function showDarkModeSetting(dark){
    document.querySelectorAll('[data-change="toggleDarkMode"]').forEach(box => { box.checked = dark; });
}

applyTheme();
// another app open in another tab switched it, or the phone changed over
window.addEventListener("storage", event => { if(event.key === themeKey){ applyTheme(); } });
if(window.matchMedia){ window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme); }

/* ================= Two tap confirm =================
   For a button that throws a session away. The first tap only arms it - it
   reads SURE? - and a second within a few seconds does the deed; otherwise it
   goes back to its own wording. A session with nothing worth keeping goes on the
   first tap. An app that hides the button should call disarmReset(). */
let resetArmed = false;
let resetButtonId = null;
let resetRestingLabel = null;
let resetDisarmTimer = null;
const resetArmedTimeout = 4000;

function confirmReset(buttonId, worthKeeping, onConfirm){
    if(!resetArmed && worthKeeping){
        let button = document.getElementById(buttonId);
        let icon = button.querySelector("i");
        resetArmed = true;
        resetButtonId = buttonId;
        resetRestingLabel = button.innerHTML;
        button.innerHTML = (icon === null ? "" : icon.outerHTML) + "SURE?";
        resetDisarmTimer = setTimeout(disarmReset, resetArmedTimeout);
        return;
    }
    disarmReset();
    onConfirm();
}

function disarmReset(){
    clearTimeout(resetDisarmTimer);
    resetDisarmTimer = null;
    if(resetArmed && resetButtonId !== null){
        document.getElementById(resetButtonId).innerHTML = resetRestingLabel;
    }
    resetArmed = false;
    resetRestingLabel = null;
}

// What is on screen follows body[data-state], in each app's CSS
function showState(state){
    document.body.dataset.state = state;
}

/* ================= Sessions =================
   An app keeps the session in progress in `session`, and writes it to local
   storage under app.currentKey on every change, so a reload picks it back up.
   Finished sessions go in a log under app.logKey. */
let session = null;

function today(){
    return new Date().toISOString().slice(0, 10); // yyyy-mm-dd
}

function getLog(key){
    let log = localStorage.getItem(key);
    return log ? JSON.parse(log) : [];
}

function setLog(key, log){
    localStorage.setItem(key, JSON.stringify(log));
}

// null for the session clears it
function saveCurrent(key, current){
    current ? localStorage.setItem(key, JSON.stringify(current)) : localStorage.removeItem(key);
}

function keepSession(){
    saveCurrent(app.currentKey, session);
    if(app.onKept){ app.onKept(); }
}

function restoreSession(){
    let saved = localStorage.getItem(app.currentKey);
    session = saved ? JSON.parse(saved) : null;
    return session;
}

// "iPhone" or "iPad", which can report itself as a Mac, or null
function appleDevice(){
    let agent = navigator.userAgent;
    if(/iPhone|iPod/.test(agent)){ return "iPhone"; }
    return /iPad/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1) ? "iPad" : null;
}

// Opened from the home screen, where the app already fills the screen
function installedApp(){
    return navigator.standalone === true || Boolean(window.matchMedia && window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches);
}

/* The note that an iPhone or iPad can clear sessions, as a session is saved: in
   any browser but not the home screen app, and signed out. A card on the summary
   (common/summary.js), or this toast in an app with none. */
function keepNoteDue(){
    return appleDevice() !== null && !installedApp() && localStorage.getItem(accountRefreshKey) === null;
}

function keepNoteText(){
    return `Your ${appleDevice()} can clear your sessions if you don't visit for a week.`;
}

const keepNoteLink = '<button type="button" class="link-button" data-action="keepNoteAccount">Create free account</button>';

function keepNoteToast(){
    if(!keepNoteDue()){ return; }
    hideKeepNote();
    let box = document.createElement("div");
    box.id = "keepNote";
    box.className = "toast warn keep-note";
    box.innerHTML = `<span class="toast-face" aria-hidden="true">⚠︎</span><span class="toast-text">${keepNoteText()}</span>
        <button type="button" class="toast-close" data-action="hideKeepNote" aria-label="Close">×</button>
        <span class="keep-note-links">${keepNoteLink}</span>`;
    toastStack().appendChild(box);
    setTimeout(() => box.classList.add("shown"), 20);
}

function hideKeepNote(){
    let note = document.getElementById("keepNote");
    if(note !== null){ note.remove(); }
}

// at the sign up rather than the backup above it
function keepNoteAccount(){
    hideKeepNote();
    loadAccount().then(() => {
        drawAccountPanel();
        openOverlay("account");
        document.getElementById("accountLogin").scrollIntoView();
    });
}

// iOS can clear a site's storage. Not asked elsewhere, as Firefox makes it a permission prompt
let storageAsked = false;
function askToKeepStorage(){
    if(storageAsked || appleDevice() === null || !navigator.storage || !navigator.storage.persist){ return; }
    storageAsked = true;
    navigator.storage.persist().catch(() => {});
}

// A new entry joins the log; an edited one replaces the one it came from.
// updated decides which copy wins when two phones have both - see common/backup.js
// false, with a warning up until closed, when it couldn't be saved - storage full or blocked
function saveToLog(key, entry){
    try {
        let log = getLog(key);
        entry.updated = Date.now();
        let existing = log.findIndex(item => item.id === entry.id);
        existing === -1 ? log.push(entry) : log[existing] = entry;
        setLog(key, log);
    } catch(err){
        toast("Session not saved", null, true, true);
        return false;
    }
    askToKeepStorage();
    if(typeof syncSoon === "function"){ syncSoon(); }
    return true;
}

// Deleted sessions, kept a while so a merge doesn't bring them back
const deletedKey = "syncDeleted";
const deletedDays = 180;

function noteDeleted(key, id){
    let cutoff = Date.now() - deletedDays * 86400000;
    let marks = getLog(deletedKey).filter(mark => mark.at > cutoff);
    marks.push({ "key" : key, "id" : id, "at" : Date.now() });
    setLog(deletedKey, marks);
    if(typeof syncSoon === "function"){ syncSoon(); }
}

function plural(count, noun){
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// start and finish are epoch ms; minutes is the duration. {} for an untimed session.
function sessionTiming(from){
    if(!from.start || !from.finish){ return {}; }
    return { "start" : from.start, "finish" : from.finish, "minutes" : Math.round((from.finish - from.start) / 60000) };
}

// a timed session's minutes as "45 min" or "1h 25m"; "" for an untimed one
function sessionLength(entry){
    let minutes = Number(entry.minutes);
    if(!isFinite(minutes) || minutes <= 0){ return ""; }
    return minutes < 60 ? minutes + " min" : Math.floor(minutes / 60) + "h " + String(minutes % 60).padStart(2, "0") + "m";
}

// the parts of a log row's detail that are there, as one line
function joinDetail(parts){
    return parts.filter(part => part).join(" · ");
}

// "12 sessions (3 this month)", which every log's stats line starts with
function sessionCount(log){
    let month = today().slice(0, 7);
    let thisMonth = log.filter(entry => entry.date.slice(0, 7) === month).length;
    return `${plural(log.length, "session")} (${thisMonth} this month)`;
}

/* A clock that counts whole seconds while it runs, calling onSecond(seconds) on
   each one. Debug makes a second a tenth as long. */
function secondsClock(onSecond){
    let seconds = 0;
    let timer = null;
    let length = () => debug ? 100 : 1000;
    let tick = () => {
        seconds++;
        timer = setTimeout(tick, length());
        onSecond(seconds);
    };
    return {
        get seconds(){ return seconds; },
        start(){ if(timer === null){ timer = setTimeout(tick, length()); } },
        stop(){ clearTimeout(timer); timer = null; },
        reset(){ this.stop(); seconds = 0; }
    };
}

// h:mm:ss
function formatClock(seconds){
    let whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 3600)}:${String(Math.floor(whole % 3600 / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

// The big mm:ss clock every timing app shows in <h3 id="elapsed">, minutes
// running on past 59 rather than growing an hour
function showElapsed(seconds){
    let whole = Math.max(0, Math.floor(seconds));
    document.getElementById("elapsed").innerText = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

function escapeHtml(text){
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ================= Recent logs =================
   A session's last few taps and how long ago, behind "Show recent logs": the gym
   session, Outside and the lap timer. Kept on the session, never saved. */
const recentShown = 3;
let recentTicker = null;

// before the caller's keepSession()
function noteRecent(text){
    if(session === null){ return; }
    session.recent = [{ "text" : text, "at" : Date.now() }, ...(Array.isArray(session.recent) ? session.recent : [])].slice(0, recentShown);
    drawRecent();
}

function timeAgo(at){
    let seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
    if(seconds === 0){ return "just now"; }
    if(seconds < 60){ return plural(seconds, "sec") + " ago"; }
    // the smaller part left out at 0: "2 mins", not "2 mins 0 secs"
    let both = (big, bigNoun, small, smallNoun) => plural(big, bigNoun) + (small > 0 ? " " + plural(small, smallNoun) : "") + " ago";
    let minutes = Math.floor(seconds / 60);
    return minutes < 60 ? both(minutes, "min", seconds % 60, "sec") : both(Math.floor(minutes / 60), "hour", minutes % 60, "min");
}

function drawRecent(){
    let list = document.getElementById("recentLogs");
    if(list === null){ return; }
    let recent = session !== null && Array.isArray(session.recent) ? session.recent : [];
    list.innerHTML = recent.map(item => `<li>${escapeHtml(item.text)} <span class="recent-ago">${timeAgo(item.at)}</span></li>`).join("");
}

// the "ago"s count on only while it is open
function toggleRecent(details){
    details.querySelector("summary").innerText = details.open ? "Hide recent logs" : "Show recent logs";
    clearInterval(recentTicker);
    recentTicker = details.open ? setInterval(drawRecent, 1000) : null;
    drawRecent();
}

/* ================= The save panel =================
   An app writes <div id="endingDiv" class="ending"></div> and this fills it with
   the stars, a title, the note and the save button, which calls the app's
   saveSession(). The title is optional, and saved only when there is one. */
let sessionRating = 0;
let sessionComment = "";
let sessionTitle = "";
const commentLimit = 300;
const commentCountFrom = 250;   // the count shows from here, red at the limit
const titleLimit = 24;   // fits under the app's name in a log row

function setStar(value){
    document.querySelectorAll(".star-holder .icon-star").forEach((star, index) => {
        star.classList.toggle("active", index < value);
    });
    sessionRating = value;
    if(session){
        session.rating = value;
        keepSession();
    }
}

// on the summary these save as they change - see common/summary.js
function storeChange(){
    if(typeof storeFinished === "function"){ storeFinished(); }
}

function rate(star){
    setStar(Number(star.dataset.stars));
    storeChange();
}

function drawSavePanel(){
    let panel = document.getElementById("endingDiv");
    if(panel === null){ return; }
    let stars = "";
    for(let i = 1; i <= 5; i++){
        stars += `<button type="button" class="icon-button demo-icon icon-star" id="star${i}" data-action="rate" data-stars="${i}" aria-label="Rate session ${i} of 5"></button>`;
    }
    panel.innerHTML = `<p class="save-title">Good Session?</p>
        <div class="star-holder">${stars}</div>
        <input type="text" id="sessionTitle" class="comment-field" maxlength="${titleLimit}" data-input="updateTitle"
            placeholder="Give it a title (optional)" aria-label="A title for this session" />
        <textarea id="sessionComment" class="comment-field" rows="2" maxlength="${commentLimit}" data-input="updateComment"
            placeholder="Anything worth remembering?" aria-label="A note about this session"></textarea>
        <p class="comment-count" id="commentCountLine" hidden><span id="commentCount">0</span>/${commentLimit}</p>
        <button id="saveSession" class="save-session-button" data-action="saveSession">SAVE SESSION</button>`;
}

function updateComment(field){
    setSessionComment(field.value);
    storeChange();
}

// Also how an app hands a saved note back when it reopens a session
function setSessionComment(text){
    sessionComment = String(text === undefined || text === null ? "" : text).slice(0, commentLimit);
    let field = document.getElementById("sessionComment");
    if(field === null){ return; }
    if(field.value !== sessionComment){ field.value = sessionComment; }
    document.getElementById("commentCount").innerText = sessionComment.length;
    let line = document.getElementById("commentCountLine");
    line.hidden = sessionComment.length < commentCountFrom;
    line.classList.toggle("full", sessionComment.length >= commentLimit);
}

function updateTitle(field){
    setSessionTitle(field.value);
    storeChange();
}

// Also how an app hands a saved title back when it reopens a session
function setSessionTitle(text){
    sessionTitle = String(text === undefined || text === null ? "" : text).slice(0, titleLimit);
    let field = document.getElementById("sessionTitle");
    if(field !== null && field.value !== sessionTitle){ field.value = sessionTitle; }
}

// What a log entry saves as its title: trimmed, and left out with none
function titleToSave(){
    return sessionTitle.trim() || undefined;
}

// Ready for the next session
function resetSavePanel(){
    setStar(0);
    setSessionComment("");
    setSessionTitle("");
}

/* ================= The activity log =================
   Drawn into #log as a table, one row a session. An app describes its own:

     drawSessionLog({
         key      : the log's localStorage key,
         describe : entry => ({ title, detail }),
         stats    : log => the line above the table (optional),
         onEdit   : id => reopen that session - drawn as a wrench (optional),
         order    : a comparator (optional, newest id first),
         filter   : entry => whether to list it (optional, all of them),
         extra    : () => read only entries to list as well (optional)
     })

   With no argument it redraws with what it was last given. */
let sessionLogView = null;

function sessionLogEntries(){
    let extra = sessionLogView.extra ? sessionLogView.extra() : [];
    return getLog(sessionLogView.key).filter(sessionLogView.filter || (() => true)).concat(extra.map(entry => Object.assign({}, entry, { "readOnly" : true })));
}

function drawSessionLog(view){
    if(view){ sessionLogView = view; }
    if(sessionLogView === null){ return; }

    let holder = document.getElementById("log");
    let stats = document.getElementById("stats");
    let log = sessionLogEntries().sort(sessionLogView.order || ((a, b) => b.id - a.id));
    if(!holder.dataset.listening){
        holder.addEventListener("click", logClicked);
        holder.dataset.listening = "true";
    }
    if(stats){ stats.innerText = log.length > 0 && sessionLogView.stats ? sessionLogView.stats(log) : ""; }
    foldAboveLog(holder, log.length);
    if(log.length === 0){
        holder.innerHTML = "<p>No sessions saved yet.</p>";
        return;
    }
    holder.innerHTML = `<table class="log-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Session</th>
                <th class="log-rating">${sessionLogView.unrated ? "" : "Rating"}</th>
                <th><span class="sr-only">Delete</span></th>
            </tr>
        </thead>
        <tbody>${log.map(sessionLogRow).join("")}</tbody>
    </table>`;
}

/* With sessions in it, the log is what the info panel opens on: the cards above
   it start folded, once a page load, and stay as they are put after that */
let foldedAboveLog = false;

function foldAboveLog(holder, count){
    if(foldedAboveLog || count === 0){ return; }
    foldedAboveLog = true;
    let card = holder.closest("details.card");
    let panel = holder.closest(".overlay");
    if(card === null || panel === null){ return; }
    panel.querySelectorAll("details.card").forEach(above => {
        if(above.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING){ above.open = false; }
    });
}

// yyyy-mm-dd as "12 Jan" over "2026"; anything else as it was stored
const logMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function logDateParts(date){
    let parts = String(date).split("-");
    let month = logMonths[Number(parts[1]) - 1];
    if(parts.length !== 3 || month === undefined){ return { "day" : date, "year" : "" }; }
    return { "day" : Number(parts[2]) + " " + month, "year" : parts[0] };
}

function logDate(date){
    let when = logDateParts(date);
    return when.year === "" ? when.day : when.day + " " + when.year;
}

// No stars at all for a read only row: UKC has no rating, and five empty stars would read as nought
function sessionStars(entry){
    if(entry.readOnly){ return ""; }
    let stars = "";
    for(let i = 0; i < 5; i++){
        stars += `<i class="demo-icon icon-star ${i < entry.rating ? "active" : ""}"></i>`;
    }
    return stars;
}

function logButton(action, id, icon, label){
    return `<button type="button" class="icon-button demo-icon ${icon}" data-log="${action}" data-id="${id}" aria-label="${label}"></button>`;
}

// The Tindeq mark, two peaks, after a session that was pulled on a Progressor
const tindeqMark = '<svg class="tindeq-mark" viewBox="0 0 100 100" role="img" aria-label="pulled on a Tindeq Progressor">'
    + '<path fill="none" stroke="currentColor" stroke-width="9" d="M44,43.7 L34.6,28.3 L8,71.7 H38.8 L65.4,28.3 L92,71.7 H47.2"/></svg>';

// No stars for a view that says it has no rating, as a game with a score
function logStars(entry){
    return sessionLogView.unrated ? "" : sessionStars(entry);
}

// What was typed about a session, or what an app's view makes of it
function logComment(entry){
    return sessionLogView.comment ? sessionLogView.comment(entry) : entry.comment;
}

// The title typed for a session, on a line of its own over what the app makes of it
function logTitle(entry){
    return typeof entry.title === "string" && entry.title !== ""
        ? `<span class="log-title">${escapeHtml(entry.title.slice(0, titleLimit))}</span><br />` : "";
}

function sessionLogRow(entry){
    let described = sessionLogView.describe(entry);
    let when = logDateParts(entry.date);
    let date = logDate(entry.date);
    let note = logComment(entry) ? logButton("note", entry.id, "icon-note", "Read the note from " + date) : "";
    let edit = sessionLogView.onEdit && !entry.readOnly ? logButton("edit", entry.id, "icon-wrench", "Edit session " + date) : "";
    let remove = entry.readOnly ? "" : " " + logButton("delete", entry.id, "icon-trash", "Delete session " + date);
    return `<tr>
        <td class="log-date">${when.day}${when.year === "" ? "" : `<br /><span class="log-year">${when.year}</span>`}</td>
        <td>${logTitle(entry)}${described.title}${described.detail ? `<br /><span class="log-detail">${described.detail}</span>` : ""}</td>
        <td class="log-rating">${logStars(entry)}</td>
        <td class="log-actions">${note}${edit}${remove}</td>
    </tr>`;
}

function logClicked(event){
    let button = event.target.closest("[data-log]");
    if(button === null){ return; }
    let id = Number(button.dataset.id);
    let action = button.dataset.log;
    if(action === "note"){
        event.stopPropagation();   // or the page's own listener closes it again
        let entry = sessionLogEntries().find(item => item.id === id);
        showNote(button, logComment(entry), logStars(entry), "Note from " + logDate(entry.date));
    }
    if(action === "edit"){ sessionLogView.onEdit(id); }
    // asked in a toast first - see confirmToast()
    if(action === "delete"){
        let entry = sessionLogEntries().find(item => item.id === id);
        confirmToast("Delete the session from " + logDate(entry.date) + "?", "DELETE", () => removeLog(id));
    }
}

function removeLog(id){
    setLog(sessionLogView.key, getLog(sessionLogView.key).filter(entry => entry.id !== id));
    noteDeleted(sessionLogView.key, id);
    drawSessionLog();
}

/* A note read back: a card by the button that opened it, holding the stars and
   the words. Closed by a tap anywhere else, Escape, or the same button again. */
function showNote(button, text, stars, label){
    let open = document.getElementById("sessionNote");
    let sameOne = open !== null && open.opener === button;
    hideSessionNote();
    if(sameOne || !text){ return; }

    let note = document.createElement("div");
    note.id = "sessionNote";
    note.className = "comment-pop";
    note.opener = button;
    note.setAttribute("role", "dialog");
    note.setAttribute("aria-label", label);
    note.innerHTML = (stars ? `<p class="comment-pop-stars">${stars}</p>` : "") + `<p class="comment-pop-text"></p>`;
    note.querySelector(".comment-pop-text").innerText = text;   // what was typed, not markup
    document.body.appendChild(note);

    // centred under the button, never off the side of the screen, above it if there is no room below
    let box = button.getBoundingClientRect();
    let width = note.offsetWidth;
    note.style.left = Math.min(Math.max(8, box.left + (box.width / 2) - (width / 2)), window.innerWidth - width - 8) + "px";
    note.style.top = (box.bottom + 8) + "px";
    if(box.bottom + 8 + note.offsetHeight > window.innerHeight){
        note.style.top = Math.max(8, box.top - 8 - note.offsetHeight) + "px";
    }
}

function hideSessionNote(){
    let note = document.getElementById("sessionNote");
    if(note !== null){ note.remove(); }
}

document.addEventListener("click", event => {
    if(!(event.target.closest && event.target.closest(".comment-pop"))){ hideSessionNote(); }
});

/* ================= Speech and the countdown ================= */
const speechStartTimeout = 1000;
let voiceOff = false;   // the Voice disabled setting: beeps and pings only
const voiceOffKey = "voiceOff";

function toggleVoiceOff(input){
    voiceOff = input.checked;
    localStorage.setItem(voiceOffKey, JSON.stringify(voiceOff));
}

function loadVoiceOffSetting(){
    voiceOff = localStorage.getItem(voiceOffKey) === "true";
    let box = document.getElementById("voiceOff");
    if(box !== null){ box.checked = voiceOff; }
}

/* Says the text. onStart fires the moment the voice actually starts - or at once
   with no voice, or after a second if the engine never says - so what is on
   screen can be timed off the voice rather than off a guess. */
function speak(text, onStart){
    let fired = false;
    let fire = () => {
        if(fired){ return; }
        fired = true;
        if(onStart){ onStart(); }
    };
    if(sound && !voiceOff && "speechSynthesis" in window){
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = fire;
        utterance.onerror = fire;
        setTimeout(fire, speechStartTimeout);
        window.speechSynthesis.speak(utterance);
    } else {
        fire();
    }
}

/* Tones, made with Web Audio so there are no files to cache. A browser only
   lets the sound start from a tap, so a start button calls unlockAudio(). */
let audio = null;
let squash = null;   // the tones' compressor, so they can be loud without clipping

function unlockAudio(){
    let Context = window.AudioContext || window.webkitAudioContext;
    if(audio === null && Context){
        audio = new Context();
        squash = audio.createDynamicsCompressor();
        squash.threshold.value = -24;
        squash.ratio.value = 12;
        squash.attack.value = 0.003;
        squash.release.value = 0.25;
        squash.connect(audio.destination);
    }
    if(audio !== null && audio.state === "suspended"){ audio.resume(); }
}

/* frequency in Hz, length in seconds, volume 0 to 1, fading out. A triangle,
   not a sine: its overtones are what carry over music in headphones. */
function tone(frequency, length, volume){
    if(!sound || audio === null){ return; }
    let oscillator = audio.createOscillator();
    let gain = audio.createGain();
    let now = audio.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    oscillator.connect(gain).connect(squash);
    oscillator.start(now);
    oscillator.stop(now + length);
}

// a bright ring for something done, a quieter tick for a count
function ping(){ tone(1760, 0.7, 0.9); }
function beep(){ tone(1320, 0.12, 0.5); }

/* Android drops a stream that goes quiet, and over Bluetooth the switch can pause
   the music mid rest. A hum far too quiet to hear keeps it open while a clock runs;
   not pure silence, which Chrome treats as no stream at all. */
let hum = null;

function startHum(){
    if(!sound || audio === null || hum !== null){ return; }
    let oscillator = audio.createOscillator();
    let gain = audio.createGain();
    gain.gain.value = 0.0001;
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    hum = oscillator;
}

function stopHum(){
    if(hum === null){ return; }
    hum.stop();
    hum = null;
}

/* A buzz to feel when the screen is out of sight - on whatever the phone allows,
   which is not an iPhone. Not silenced by the mute: that is for the noise, and
   the Vibration disabled setting is for this. */
let vibrateOff = false;
const vibrateOffKey = "vibrateOff";
const canVibrate = typeof navigator.vibrate === "function";

// with nothing to buzz, the switch stays on
function toggleVibrateOff(input){
    if(!canVibrate && !input.checked){
        input.checked = true;
        unsupportedToast("This device can't vibrate.");
        return;
    }
    vibrateOff = input.checked;
    localStorage.setItem(vibrateOffKey, JSON.stringify(vibrateOff));
}

function loadVibrateOffSetting(){
    vibrateOff = !canVibrate || localStorage.getItem(vibrateOffKey) === "true";
    let box = document.getElementById("vibrateOff");
    if(box !== null){ box.checked = vibrateOff; }
}

function vibrate(pattern){
    if(!vibrateOff && navigator.vibrate){ navigator.vibrate(pattern); }
}

// Three, two, one - each colour on its word, each step timed from the one before it
function countdown(onComplete){
    const steps = [
        { "word" : "Three", "colour" : "red" },
        { "word" : "Two",   "colour" : "orange" },
        { "word" : "One",   "colour" : "yellow" }
    ];
    const gap = debug ? 300 : 1000;
    // anything still queued would hold the first word up
    if("speechSynthesis" in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)){
        window.speechSynthesis.cancel();
    }
    let runStep = index => {
        if(index === steps.length){
            onComplete();
            return;
        }
        speak(steps[index].word, () => {
            if(voiceOff){ beep(); }
            background(steps[index].colour);
            setTimeout(() => runStep(index + 1), gap);
        });
    };
    runStep(0);
}

// The page colour for the countdown and the rings' go - "" for the theme's own
const countdownColours = ["red", "orange", "yellow", "green"];

function background(colour){
    document.body.classList.remove(...countdownColours);
    if(colour){ document.body.classList.add(colour); }
}

/* ================= Hints and toasts ================= */

// The first time an app is opened, a word about the cog - until the settings are opened
const cogHintKey = "seenSettings";
const cogHintDelay = 700;
const cogHintLife = 8000;

function showCogHint(){
    if(document.getElementById("settings") === null || document.body.dataset.cogHint === "off" || localStorage.getItem(cogHintKey) === "true"){ return; }
    let hint = document.createElement("div");
    hint.id = "cogHint";
    hint.className = "hint-pop";
    hint.setAttribute("role", "status");
    hint.innerHTML = '<i class="demo-icon icon-cog" aria-hidden="true"></i><span>Your set up lives under the cog.</span>';
    hint.addEventListener("click", hideCogHint);
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add("shown"), cogHintDelay);
    setTimeout(hideCogHint, cogHintDelay + cogHintLife);
}

function hideCogHint(){
    let hint = document.getElementById("cogHint");
    if(hint === null){ return; }
    hint.classList.remove("shown");
    setTimeout(() => hint.remove(), 300);
}

/* A tap that records something flashes green for a moment - the lap button, a
   grade tile - rather than moving the screen about; see .flash in style.css */
function flash(element){
    haptic();
    if(element === null){ return; }
    element.classList.add("flash");
    setTimeout(() => element.classList.remove("flash"), 250);
}

/* And a buzz too short to be more than a tap back: with flash(), and on a tick.
   Android only - iOS Safari has no vibrate, and nothing happens. */
function haptic(){
    if(typeof navigator.vibrate === "function"){ navigator.vibrate(15); }
}

/* A line along the bottom that goes by itself. Each is its own card, stacked
   above any still up, so two things said on one tap are both seen; the same
   message again restarts its clock rather than stacking a copy. With onTap its
   message is a button, and it stays until tapped or closed; sticky keeps a
   plain one up until closed, and warn makes it an orange warning. message is
   text, or a <template> whose markup it shows - for a link. */
const toastLife = 5200;

function toastStack(){
    let stack = document.getElementById("toasts");
    if(stack === null){
        stack = document.createElement("div");
        stack.id = "toasts";
        stack.className = "toast-stack";
        stack.setAttribute("role", "status");   // announced as each arrives, without taking focus
        document.body.appendChild(stack);
    }
    return stack;
}

function toast(message, onTap, sticky, warn){
    const text = typeof message === "string" ? message : message.content.textContent.trim();
    let stack = toastStack();
    let box = [...stack.children].find(card => card.dataset.message === text);
    if(box === undefined){
        box = document.createElement("div");
        box.className = warn ? "toast warn" : "toast";
        box.dataset.message = text;
        box.innerHTML = '<span class="toast-face" aria-hidden="true">' + (warn ? "⚠︎" : "☺") + '</span>'
            + (onTap ? '<button type="button" class="toast-text toast-action"></button>' : '<span class="toast-text"></span>')
            + '<button type="button" class="toast-close" aria-label="Close">×</button>';
        if(typeof message === "string"){
            box.querySelector(".toast-text").innerText = message;
        } else {
            box.querySelector(".toast-text").append(message.content.cloneNode(true));
        }
        box.querySelector(".toast-close").addEventListener("click", () => hideToast(box));
        if(onTap){ box.querySelector(".toast-action").addEventListener("click", onTap); }
        stack.appendChild(box);
        setTimeout(() => box.classList.add("shown"), 20);   // a frame later, so it animates in
    } else {
        clearTimeout(box.removal);   // said again as it was fading out
        box.classList.add("shown");
    }
    clearTimeout(box.timer);
    if(!onTap && !sticky){ box.timer = setTimeout(() => hideToast(box), toastLife); }
}

// The browser or device can't do what was asked: an orange warning, up until closed
function unsupportedToast(message){
    toast(message, null, true, true);
}

/* A warning that asks first, edged in red: the deed, and Cancel. Cancel or the
   cross leave things as they were. One at a time - a second replaces the first. */
function confirmToast(message, deed, onConfirm){
    document.querySelectorAll(".toast.danger").forEach(hideToast);
    let box = document.createElement("div");
    box.className = "toast warn danger";
    box.innerHTML = '<span class="toast-face" aria-hidden="true">⚠︎</span><span class="toast-text"></span>'
        + '<button type="button" class="toast-close" aria-label="Cancel">×</button>'
        + '<span class="toast-choices"><button type="button" class="toast-confirm"></button>'
        + '<button type="button" class="toast-reject">Cancel</button></span>';
    box.querySelector(".toast-text").innerText = message;
    box.querySelector(".toast-confirm").innerText = deed;
    box.querySelector(".toast-confirm").addEventListener("click", () => {
        hideToast(box);
        onConfirm();
    });
    box.querySelector(".toast-reject").addEventListener("click", () => hideToast(box));
    box.querySelector(".toast-close").addEventListener("click", () => hideToast(box));
    toastStack().appendChild(box);
    setTimeout(() => box.classList.add("shown"), 20);
}

function hideToast(box){
    clearTimeout(box.timer);
    box.classList.remove("shown");
    box.removal = setTimeout(() => box.remove(), 300);   // once it has faded
}

/* ================= Overlays =================
   Info behind the i, settings behind the cog. One at a time; CSS holds the page
   still behind whichever is open. */
const overlays = ["about", "settings", "account"];

/* These three sit between the navs, which stay up, and close from the button that
   opened them, the page's name, the current page's in the bottom nav, or Escape. */
const navPanels = { "about" : "openInfoBox", "settings" : "openSettings", "account" : "openAccount" };

function showNavPanel(){
    let open = Object.keys(navPanels).filter(isOpen);
    document.documentElement.classList.toggle("nav-panel", open.length > 0);
    Object.keys(navPanels).forEach(id => {
        let button = document.querySelector(`nav [data-action="${navPanels[id]}"]`);
        if(button !== null){ button.setAttribute("aria-expanded", open.includes(id)); }
    });
}

function openOverlay(id){
    let panel = document.getElementById(id);
    if(panel === null){ return; }
    if(id === "settings"){
        localStorage.setItem(cogHintKey, "true");
        hideCogHint();
    }
    overlays.filter(other => other !== id).forEach(closeOverlay);
    panel.classList.add("open");
    panel.scrollTop = 0;
    showNavPanel();
}

function closeOverlay(id){
    let panel = document.getElementById(id);
    if(panel !== null){ panel.classList.remove("open"); }
    showNavPanel();
}

function isOpen(id){
    let panel = document.getElementById(id);
    return panel !== null && panel.classList.contains("open");
}

// A tap on the nav is handed the button, and closes what that button opened
function toggleOverlay(id, button){
    button && isOpen(id) ? closeOverlay(id) : openOverlay(id);
}

function openInfoBox(button){ toggleOverlay("about", button); }
function hideAccount(){ closeOverlay("account"); }
function hideAbout(){ closeOverlay("about"); }
function openSettings(button){ toggleOverlay("settings", button); }
function hideSettings(){ closeOverlay("settings"); }

// the page's name in the nav: back to the page
document.addEventListener("click", event => {
    if(event.target.closest("nav h1")){ Object.keys(navPanels).forEach(closeOverlay); }
});

document.addEventListener("keydown", event => {
    if(event.code === "Escape"){
        hideSessionNote();
        overlays.forEach(closeOverlay);
    }
});

/* ================= Version, service worker, analytics ================= */

// One worker at /training/ for the whole suite, so every page works offline
function registerServiceWorker(){
    // a test's stand-in navigator can have the property with nothing behind it
    if(!("serviceWorker" in navigator) || !navigator.serviceWorker){ return; }
    navigator.serviceWorker.register("/training/sw.js", {
        "scope" : "/training/",
        "updateViaCache" : "none"
    }).catch(err => console.log("Service worker not registered:", err.message));

    // A new version has taken over, but the screen is still the old one's. The
    // very first install takes over too, with nothing old to replace.
    let hadVersion = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if(!hadVersion){ hadVersion = true; return; }
        toast("There's a new version - tap to reload", () => location.reload());
    });
}

/* The version installed on this device, from the service worker's cache name - or
   null. Newest by part, so v179.10 is after v179.9, and v177 before both, for the
   moment two are there as one takes over. */
function newerFirst(a, b){
    let x = a.slice(1).split(".").map(Number), y = b.slice(1).split(".").map(Number);
    for(let i = 0; i < Math.max(x.length, y.length); i++){
        if((y[i] || 0) !== (x[i] || 0)){ return (y[i] || 0) - (x[i] || 0); }
    }
    return 0;
}
function appVersion(){
    if(!("caches" in window)){ return Promise.resolve(null); }
    return caches.keys().then(names => {
        let versions = names.map(name => /^training-(v\d+(?:\.\d+)*)$/.exec(name)).filter(match => match)
            .map(match => match[1])
            .sort(newerFirst);
        return versions.length > 0 ? versions[0] : null;
    }).catch(() => null);
}

function showAppVersion(){
    let line = document.getElementById("appVersion");
    if(line === null){ return; }
    appVersion().then(version => {
        if(version === null){ return; }
        line.innerText = "App version: " + version;
        line.hidden = false;
    });
}

// Every mailto: gets a subject naming the page and the version
/* ================= Cards =================
   The fold on a card's head, and the contact card every info panel ends with -
   or has where it holds a <div data-contact-card>, as the Apps page does */
// Goals' target, in the bottom nav and by its switch in the account panel
const goalsIcon = '<g fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.25"/><circle cx="8" cy="8" r="3.25"/></g><circle cx="8" cy="8" r="1" fill="currentColor"/>';
const goalsOnKey = "trainingGoalsOn";

// On until switched off
function goalsOn(){
    return localStorage.getItem(goalsOnKey) !== "off";
}

function setGoalsOn(box){
    localStorage.setItem(goalsOnKey, box.checked ? "on" : "off");
    if(typeof drawBottomNav === "function"){ drawBottomNav(); }
    if(typeof syncSoon === "function"){ syncSoon(); }
}

const foldChevron = '<svg class="card-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4"/></svg>';

const contactCard = `<section class="card-group folds">
    <details class="card" open>
        <summary class="card-head">
            <span class="card-icon"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M2 4l6 5 6-5"/></svg></span>
            <h3 class="card-label">Contact</h3>
            ${foldChevron}
        </summary>
        <div class="card-body">
            <p>Feedback and suggested features welcome. If you enjoy it I'd love to hear.</p>
        </div>
        <ul class="card-rows">
            <li><span>Email</span><a href="mailto:multi-pitch@outlook.com">multi-pitch@outlook.com</a></li>
            <li><span>Instagram</span><div class="card-row-links"><a href="https://www.instagram.com/dankni86/" target="_blank" rel="noopener">@dankni86</a> / <a href="https://www.instagram.com/micheluncini/" target="_blank" rel="noopener">@micheluncini</a></div></li>
        </ul>
    </details>
</section>`;

function drawContactCard(){
    let about = document.getElementById("about");
    if(about === null){ return; }
    let spot = about.querySelector("[data-contact-card]");
    if(spot !== null){ spot.outerHTML = contactCard; }
    else { about.insertAdjacentHTML("beforeend", contactCard); }
}

function tagFeedbackLinks(){
    let links = document.querySelectorAll('a[href^="mailto:"]');
    if(links.length === 0){ return; }
    appVersion().then(version => {
        let subject = "Feedback: " + document.title + (version ? " (" + version + ")" : "");
        links.forEach(link => {
            link.href = link.getAttribute("href").split("?")[0] + "?subject=" + encodeURIComponent(subject);
        });
    });
}

/* The account and the backup file, behind the person at the top right of every
   page. Their scripts load when it is first tapped - or straight away when signed
   in, so every page syncs. */
const accountRefreshKey = "accountRefresh";
let accountLoading = null;

function loadAccount(){
    if(accountLoading === null){
        accountLoading = new Promise(resolve => {
            // the UKC import, and what it reads, on a page without it
            let wanted = [["grades.js", typeof tradLadder], ["ukc.js", typeof ukc], ["gilford-routes.js", typeof getRoute], ["dansloft-routes.js", typeof loftBoulderGrade],
                ["charts.js", typeof entryClimbs], ["apps.js", typeof trainingLogs]];
            let files = wanted.filter(([, type]) => type === "undefined").map(([file]) => file);
            files.concat(["aws4fetch.js", "backup.js", "account.js"]).forEach(file => {
                let tag = document.createElement("script");
                tag.src = "/training/common/" + file;
                tag.async = false;   // in order
                if(file === "account.js"){ tag.onload = resolve; }
                document.body.appendChild(tag);
            });
        });
    }
    return accountLoading;
}

function openAccount(button){
    if(button && isOpen("account")){ return closeOverlay("account"); }
    loadAccount().then(() => {
        drawAccountPanel();
        openOverlay("account");
    });
}

// outlined, and solid while signed in
const personIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g class="person-outline" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'
    + '<circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/></g>'
    + '<g class="person-solid" fill="currentColor"><circle cx="8" cy="4.75" r="3.5"/>'
    + '<path d="M1.2 15.2c0-3.7 3-6.1 6.8-6.1s6.8 2.4 6.8 6.1c0 .45-.35.8-.8.8H2c-.45 0-.8-.35-.8-.8z"/></g></svg>';

function addAccountButton(){
    let side = document.querySelector("nav .right-nav");
    if(side === null){ return; }
    let button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button account-button";
    button.dataset.action = "openAccount";
    button.innerHTML = personIcon;
    side.prepend(button);   // floated right, so first is furthest right
    showSignedIn();
}

// Filled in while signed in, and said so
function showSignedIn(){
    let button = document.querySelector("nav .account-button");
    if(button === null){ return; }
    let signedIn = localStorage.getItem(accountRefreshKey) !== null;
    button.classList.toggle("signed-in", signedIn);
    button.setAttribute("aria-label", signedIn ? "Account and backup, signed in" : "Account and backup");
}

// A restored backup file reloads the page, and says what it added once it has
const restoredKey = "backupRestored";

function showRestored(){
    let message = sessionStorage.getItem(restoredKey);
    if(message !== null){
        sessionStorage.removeItem(restoredKey);
        toast(message);
    }
}

const analyticsId = "G-XR0EG1VTTE";
const analyticsClientKey = "analyticsClient";

/* Signed in, no third-party script shares a page with the account's token: the
   page view and the apps' own events go straight to GA with sendBeacon, under a
   random id that has nothing to do with the account, with the page's path and
   title and nothing else of the person's */
function beaconAnalytics(){
    let client = localStorage.getItem(analyticsClientKey);
    if(client === null){
        client = Math.floor(Math.random() * 2147483647) + "." + Math.floor(Date.now() / 1000);
        localStorage.setItem(analyticsClientKey, client);
    }
    let visit = sessionStorage.getItem(analyticsClientKey) || String(Math.floor(Date.now() / 1000));
    sessionStorage.setItem(analyticsClientKey, visit);
    let first = true;
    let send = (name, params) => {
        let hit = new URLSearchParams({ "v" : "2", "tid" : analyticsId, "cid" : client, "sid" : visit, "sct" : "1", "seg" : "1",
            "en" : name, "dl" : location.origin + location.pathname, "dt" : document.title, "ep.signed_in" : "yes" });
        if(first){ hit.set("_ss", "1"); }
        first = false;
        Object.entries(params || {}).forEach(([key, value]) => {
            if(typeof value === "number"){ hit.set("epn." + key, String(value)); }
            else if(typeof value === "string"){ hit.set("ep." + key, value.slice(0, 100)); }
        });
        navigator.sendBeacon("https://www.google-analytics.com/g/collect?" + hit);
    };
    window.gtag = (command, name, params) => { if(command === "event"){ send(name, params); } };
    send("page_view");
}

// Automated browsers run the page's JS too; keep them out of GA. Copied in /js/main.js
function looksLikeBot(){
    return navigator.webdriver === true || /bot|crawl|spider|slurp|headless|lighthouse|phantom|puppeteer|playwright|selenium/i.test(navigator.userAgent);
}

// Off on a page with <body data-analytics="off">, such as the style guide
function loadAnalytics(){
    if(document.body.dataset.analytics === "off" || looksLikeBot()){ return; }
    if(localStorage.getItem(accountRefreshKey) !== null){
        if(navigator.sendBeacon){ beaconAnalytics(); }
        return;
    }
    let tag = document.createElement("script");
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + analyticsId;
    tag.async = true;
    document.body.appendChild(tag);
    window.dataLayer = window.dataLayer || [];
    // global, as on the main site, so an app can send an event of its own
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", analyticsId);
}

/* Each of these looks for what it works on and does nothing without it, so a
   page with no save panel or settings loads this as safely as an app */
document.addEventListener("DOMContentLoaded", () => {
    drawTopNav();
    drawSavePanel();
    loadPreventSleepSetting();
    loadVoiceOffSetting();
    loadSoundSetting();
    loadVibrateOffSetting();
    let recentDetails = document.getElementById("recentDetails");
    if(recentDetails !== null){ recentDetails.addEventListener("toggle", () => toggleRecent(recentDetails)); }
    showDarkModeSetting(isDark());
    showCogHint();
    registerServiceWorker();
    showAppVersion();
    drawContactCard();
    tagFeedbackLinks();
    // hidden where the browser can't go full screen, which an iPhone can't, and in the home screen app
    let full = document.getElementById("fullscreen");
    if(full !== null && document.documentElement.requestFullscreen && document.fullscreenEnabled !== false && !installedApp()){ full.hidden = false; }
    addAccountButton();
    showRestored();
    if(localStorage.getItem(accountRefreshKey) !== null){ loadAccount(); }
    loadAnalytics();
});
