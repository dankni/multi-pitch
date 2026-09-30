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
    });
}
delegate("click", "data-action");
delegate("change", "data-change");
delegate("input", "data-input");

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

function toggleSound(){
    sound = !sound;
    let icon = document.getElementById("sound");
    icon.classList.toggle("icon-volume-high", sound);
    icon.classList.toggle("icon-volume-off", !sound);
}

// Debug mode speeds time up
function toggleDebug(input){
    debug = input.checked;
}

/* ================= Dark mode =================
   The page follows the phone's setting in CSS - light-dark() in style.css. The
   switch overrides it for this visit with .light or .dark on the body. */
function prefersDark(){
    return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function toggleDarkMode(input){
    let dark = input.checked;
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("light", !dark);
    showDarkModeSetting(dark);
}

// Every dark mode switch on the page in step - the style guide has two
function showDarkModeSetting(dark){
    document.querySelectorAll('[data-change="toggleDarkMode"]').forEach(box => { box.checked = dark; });
}

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
}

function restoreSession(){
    let saved = localStorage.getItem(app.currentKey);
    session = saved ? JSON.parse(saved) : null;
    return session;
}

// A new entry joins the log; an edited one replaces the one it came from
function saveToLog(key, entry){
    let log = getLog(key);
    let existing = log.findIndex(item => item.id === entry.id);
    existing === -1 ? log.push(entry) : log[existing] = entry;
    setLog(key, log);
}

function plural(count, noun){
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
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

function escapeHtml(text){
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ================= The save panel =================
   An app writes <div id="endingDiv" class="ending"></div> and this fills it with
   the stars, the note and the save button, which calls the app's saveSession(). */
let sessionRating = 0;
let sessionComment = "";
const commentLimit = 300;

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

function rate(star){
    setStar(Number(star.dataset.stars));
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
        <textarea id="sessionComment" class="comment-field" rows="2" maxlength="${commentLimit}" data-input="updateComment"
            placeholder="Anything worth remembering?" aria-label="A note about this session"></textarea>
        <p class="comment-count"><span id="commentCount">0</span>/${commentLimit}</p>
        <button id="saveSession" class="save-session-button" data-action="saveSession">SAVE SESSION</button>`;
}

function updateComment(field){
    setSessionComment(field.value);
}

// Also how an app hands a saved note back when it reopens a session
function setSessionComment(text){
    sessionComment = String(text === undefined || text === null ? "" : text).slice(0, commentLimit);
    let field = document.getElementById("sessionComment");
    if(field === null){ return; }
    if(field.value !== sessionComment){ field.value = sessionComment; }
    document.getElementById("commentCount").innerText = sessionComment.length;
}

// Ready for the next session
function resetSavePanel(){
    setStar(0);
    setSessionComment("");
}

/* ================= The activity log =================
   Drawn into #log as a table, one row a session. An app describes its own:

     drawSessionLog({
         key      : the log's localStorage key,
         describe : entry => ({ title, detail }),
         stats    : log => the line above the table (optional),
         onEdit   : id => reopen that session - drawn as a wrench (optional),
         order    : a comparator (optional, newest id first),
         extra    : () => read only entries to list as well (optional)
     })

   With no argument it redraws with what it was last given. */
let sessionLogView = null;

function sessionLogEntries(){
    let extra = sessionLogView.extra ? sessionLogView.extra() : [];
    return getLog(sessionLogView.key).concat(extra.map(entry => Object.assign({}, entry, { "readOnly" : true })));
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
    if(log.length === 0){
        holder.innerHTML = "<p>No sessions saved yet.</p>";
        return;
    }
    holder.innerHTML = `<table class="log-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Session</th>
                <th class="log-rating">Rating</th>
                <th><span class="sr-only">Delete</span></th>
            </tr>
        </thead>
        <tbody>${log.map(sessionLogRow).join("")}</tbody>
    </table>`;
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

function sessionLogRow(entry){
    let described = sessionLogView.describe(entry);
    let when = logDateParts(entry.date);
    let date = logDate(entry.date);
    let note = entry.comment ? logButton("note", entry.id, "icon-note", "Read the note from " + date) : "";
    let edit = sessionLogView.onEdit && !entry.readOnly ? logButton("edit", entry.id, "icon-wrench", "Edit session " + date) : "";
    let remove = entry.readOnly ? "" : " " + logButton("delete", entry.id, "icon-trash", "Delete session " + date).replace("<button", `<button id="delete${entry.id}"`)
        + ` <span hidden id="confirm${entry.id}">Sure?
            ${logButton("confirm", entry.id, "icon-ok", "Confirm delete")}${logButton("cancel", entry.id, "icon-cancel", "Cancel delete")}
        </span>`;
    return `<tr>
        <td class="log-date">${when.day}${when.year === "" ? "" : `<br /><span class="log-year">${when.year}</span>`}</td>
        <td>${described.title}${described.detail ? `<br /><span class="log-detail">${described.detail}</span>` : ""}</td>
        <td class="log-rating">${sessionStars(entry)}</td>
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
        showNote(button, entry.comment, sessionStars(entry), "Note from " + logDate(entry.date));
    }
    if(action === "edit"){ sessionLogView.onEdit(id); }
    if(action === "delete" || action === "cancel"){ toggleConfirm(id); }
    if(action === "confirm"){ removeLog(id); }
}

// Deleting takes two taps: the bin gives way to a tick and a cross
function toggleConfirm(id){
    let confirm = document.getElementById("confirm" + id);
    confirm.hidden = !confirm.hidden;
    document.getElementById("delete" + id).hidden = !confirm.hidden;
}

function removeLog(id){
    setLog(sessionLogView.key, getLog(sessionLogView.key).filter(entry => entry.id !== id));
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
    if(sound && "speechSynthesis" in window){
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = fire;
        utterance.onerror = fire;
        setTimeout(fire, speechStartTimeout);
        window.speechSynthesis.speak(utterance);
    } else {
        fire();
    }
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
    if(document.getElementById("settings") === null || localStorage.getItem(cogHintKey) === "true"){ return; }
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
   message is a button, and it stays until tapped or closed. */
const toastLife = 5200;

function toast(message, onTap){
    let stack = document.getElementById("toasts");
    if(stack === null){
        stack = document.createElement("div");
        stack.id = "toasts";
        stack.className = "toast-stack";
        stack.setAttribute("role", "status");   // announced as each arrives, without taking focus
        document.body.appendChild(stack);
    }
    let box = [...stack.children].find(card => card.dataset.message === message);
    if(box === undefined){
        box = document.createElement("div");
        box.className = "toast";
        box.dataset.message = message;
        box.innerHTML = '<span class="toast-face" aria-hidden="true">☺</span>'
            + (onTap ? '<button type="button" class="toast-text toast-action"></button>' : '<span class="toast-text"></span>')
            + '<button type="button" class="toast-close" aria-label="Close">×</button>';
        box.querySelector(".toast-text").innerText = message;
        box.querySelector(".toast-close").addEventListener("click", () => hideToast(box));
        if(onTap){ box.querySelector(".toast-action").addEventListener("click", onTap); }
        stack.appendChild(box);
        setTimeout(() => box.classList.add("shown"), 20);   // a frame later, so it animates in
    } else {
        clearTimeout(box.removal);   // said again as it was fading out
        box.classList.add("shown");
    }
    clearTimeout(box.timer);
    if(!onTap){ box.timer = setTimeout(() => hideToast(box), toastLife); }
}

function hideToast(box){
    clearTimeout(box.timer);
    box.classList.remove("shown");
    box.removal = setTimeout(() => box.remove(), 300);   // once it has faded
}

/* ================= Overlays =================
   Info behind the i, settings behind the cog. One at a time; CSS holds the page
   still behind whichever is open. */
const overlays = ["about", "settings"];

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
}

function closeOverlay(id){
    let panel = document.getElementById(id);
    if(panel !== null){ panel.classList.remove("open"); }
}

function isOpen(id){
    let panel = document.getElementById(id);
    return panel !== null && panel.classList.contains("open");
}

function openInfoBox(){ openOverlay("about"); }
function hideAbout(){ closeOverlay("about"); }
function openSettings(){ openOverlay("settings"); }
function hideSettings(){ closeOverlay("settings"); }

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

// The version installed on this device, from the service worker's cache name - or null
function appVersion(){
    if(!("caches" in window)){ return Promise.resolve(null); }
    return caches.keys().then(names => {
        let versions = names.map(name => /^training-(v\d+)$/.exec(name)).filter(match => match)
            .map(match => match[1])
            .sort((a, b) => Number(b.slice(1)) - Number(a.slice(1)));
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

// Off on a page with <body data-analytics="off">, such as the style guide
function loadAnalytics(){
    if(document.body.dataset.analytics === "off"){ return; }
    let tag = document.createElement("script");
    tag.src = "https://www.googletagmanager.com/gtag/js?id=G-XR0EG1VTTE";
    tag.async = true;
    document.body.appendChild(tag);
    window.dataLayer = window.dataLayer || [];
    // global, as on the main site, so an app can send an event of its own
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", "G-XR0EG1VTTE");
}

/* Each of these looks for what it works on and does nothing without it, so a
   page with no save panel or settings loads this as safely as an app */
document.addEventListener("DOMContentLoaded", () => {
    drawSavePanel();
    loadPreventSleepSetting();
    showDarkModeSetting(prefersDark());
    showCogHint();
    registerServiceWorker();
    showAppVersion();
    tagFeedbackLinks();
    // hidden where the browser can't go full screen, which an iPhone can't
    let full = document.getElementById("fullscreen");
    if(full !== null && document.documentElement.requestFullscreen){ full.hidden = false; }
    loadAnalytics();
});
