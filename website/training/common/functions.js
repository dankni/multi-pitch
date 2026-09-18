// Global Variables 
let wakeLock = null;
/* Whether there is a session running that wants the screen kept awake.

   A wake lock does not survive the page being hidden - a tab switch, a call, the
   phone locked by hand once - and the browser never hands it back on its own. So
   this remembers whether to ask again when the page comes back, which it does in
   the visibilitychange listener at the bottom of this file. */
let wakeLockWanted = false;
let sound = true;
let darkMode = false;
let debug = false;

// Asks the screen to stay awake, and says that it should stay that way until the
// session ends - call it when one starts.
const requestWakeLock = async () => {
    wakeLockWanted = true;
    if (!('wakeLock' in navigator)) {
        console.log(`Wakelock unsupported by browser`);
        return;
    }
    if (wakeLock !== null) { return; } // already holding one
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        // The browser drops the lock by itself when the page is hidden. Letting go
        // of our reference is what tells the listener below to ask for a new one.
        wakeLock.addEventListener('release', () => {
            if(debug === true) { console.log('Screen Wake Lock released'); }
            wakeLock = null;
        });
    } catch (err) {
        console.log(`${err.name}, ${err.message}`);
    }
};

// The session is over - let the screen sleep again
function releaseWakeLock(){
    wakeLockWanted = false;
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// Back on screen with a session still running: the lock the browser took away
// when the page was hidden has to be asked for again
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeLockWanted === true && wakeLock === null) {
        requestWakeLock();
    }
});

// Function that can be called by onClick from icon to fullscreen the browser
function fullscreen(){
    let icon = document.getElementById('fullscreen');
    let fsClass = "icon-resize-full";
    let resizeClass = "icon-resize-normal";

    if(document.fullscreenElement === null) {
        // App is not fullscreen so make it full
        document.documentElement.requestFullscreen();
        icon.classList.remove(fsClass);
        icon.classList.add(resizeClass);
    } else {
        document.exitFullscreen();
        icon.classList.remove(resizeClass);
        icon.classList.add(fsClass);
    }
}

/* Two tap confirm, shared by any app with a button that throws a session away.

   The first tap only arms the button - it swaps to reading SURE? and nothing is
   lost until a second tap arrives. If that tap doesn't come the button goes back
   to its own wording on its own, so a session can't sit one stray touch away from
   being wiped.

   Apps call confirmReset() from the button's onclick, passing the id of their own
   button, whether there is anything worth protecting (a session with nothing in
   it yet just clears on the first tap) and what to actually do on the second. An
   app that hides the button again - on resume, say - should call disarmReset() so
   it can't come back still reading SURE?.

   The wording and icon are whatever the app already put in the button - RESET in
   the Loft and Lap Timer apps, DISCARD in the Gilford one - so they are put back
   exactly as they were rather than assumed here. */
let resetArmed = false;
let resetButtonId = null;
let resetRestingLabel = null;
let resetDisarmTimer = null;
const resetArmedTimeout = 4000;

function confirmReset(buttonId, worthKeeping, onConfirm){
    if(resetArmed === false && worthKeeping === true){
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

// Safe to call whether or not the button was ever armed - it only touches the
// page when there is a SURE? on screen to put back
function disarmReset(){
    if(resetDisarmTimer !== null){
        clearTimeout(resetDisarmTimer);
        resetDisarmTimer = null;
    }
    if(resetArmed === true && resetButtonId !== null){
        document.getElementById(resetButtonId).innerHTML = resetRestingLabel;
    }
    resetArmed = false;
    resetRestingLabel = null;
}

/* Sessions: storing them, rating them, and listing the ones already done.

   Every app that keeps a log used to carry its own copy of the next few
   functions - four of them, drifting apart a line at a time. They are the same
   job in each app, so they live here now. What genuinely differs between apps is
   which storage key a log lives under and what a session is worth saying about,
   so those are the two things an app passes in. */

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

// A session in progress, written on every change so a reload picks it back up.
// Passing null for the session clears it - the session is over.
function saveCurrent(key, session){
    session ? localStorage.setItem(key, JSON.stringify(session)) : localStorage.removeItem(key);
}

/* The star rating on the save panel.

   The stars are painted here; what an app does with the number is its own
   business, so if it defines onRatingChange() that gets called with the new
   rating - typically to write it into the session in progress. */
let sessionRating = 0;

function setStar(value){
    let stars = document.querySelectorAll('.star-holder .icon-star');
    for(let i = 0; i < stars.length; i++){
        stars[i].classList.toggle('active', i < value);
    }
    sessionRating = value;
    if(typeof onRatingChange === 'function'){
        onRatingChange(value);
    }
}

/* The save panel at the end of a session.

   Five apps each carried the same twelve lines of markup for this - the title,
   five stars with their own handlers, the save button - which is five places for
   it to drift. An app now writes one empty div and this fills it:

     <div id="endingDiv" class="ending"></div>

   It is filled on load, so an app can still relabel the button afterwards, as
   the tick list does when it reopens a saved session. */
function drawSavePanel(){
    let panel = document.getElementById("endingDiv");
    if(panel === null){ return; }

    let stars = "";
    for(let i = 1; i <= 5; i++){
        stars += `<i class="demo-icon icon-star" id="star${i}" role="button" tabindex="0" aria-label="Rate session ${i} of 5"></i>`;
    }
    panel.innerHTML = `<p class="save-title">Good Session?</p>
        <div class="star-holder">${stars}</div>
        <button id="saveSession" class="save-session-button">SAVE SESSION</button>`;

    for(let i = 1; i <= 5; i++){
        let star = document.getElementById("star" + i);
        star.addEventListener("click", () => setStar(i));
        star.addEventListener("keydown", event => {
            if(event.code === "Enter" || event.code === "Space"){
                event.preventDefault();
                setStar(i);
            }
        });
    }
    // saveSession() is the app's own - what a session is worth keeping differs
    document.getElementById("saveSession").addEventListener("click", () => {
        if(typeof saveSession === "function"){ saveSession(); }
    });
}

/* The activity log.

   A log is a table - every row the same fields - so it is drawn as one: the date
   in its own column so two sessions can be compared down the page, the rating in
   another, and the delete in a cell of its own rather than trailing the end of a
   sentence.

   An app describes its own sessions and nothing else:

     drawSessionLog({
         key      : the localStorage key the log lives under,
         describe : entry => ({ title, detail }) - the line, and the smaller line
                    under it; detail is optional,
         stats    : log => the summary line above the table (optional),
         onEdit   : the name of a global function taking an id, drawn as a
                    wrench beside the bin (optional),
         order    : a comparator (optional, newest id first)
     })

   Called again with no argument it redraws with whatever it was last given,
   which is how the delete below puts the list back. */
let sessionLogView = null;

function drawSessionLog(view){
    if(view){ sessionLogView = view; }
    if(sessionLogView === null){ return; }

    let holder = document.getElementById("log");
    let stats = document.getElementById("stats");
    let log = getLog(sessionLogView.key).sort(sessionLogView.order || ((a, b) => b.id - a.id));

    if(log.length === 0){
        holder.innerHTML = "<p>No sessions saved yet.</p>";
        if(stats){ stats.innerText = ""; }
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
    if(stats){ stats.innerText = sessionLogView.stats ? sessionLogView.stats(log) : ""; }

    // Enter and Space on every icon in the list, in one place rather than in an
    // onkeydown attribute on each of the four icons a row can hold
    holder.querySelectorAll('[role="button"]').forEach(icon => {
        icon.addEventListener("keydown", event => {
            if(event.code === "Enter" || event.code === "Space"){
                event.preventDefault();
                icon.click();
            }
        });
    });
}

/* Sessions are stored as yyyy-mm-dd - it sorts, it filters by month, and it is
   what a date input speaks - but it reads back as "12 Jan 26". Anything that
   isn't a date in that shape is shown exactly as it was stored. */
const logMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* The day and the month on one line, the year underneath: a column of dates
   scans better when the part that changes every session is on top and the part
   that changes once a year is beneath it. Anything that is not a date in the
   stored shape comes back as it was, with no year to put under it. */
function logDateParts(date){
    let parts = String(date).split("-");
    let month = logMonths[Number(parts[1]) - 1];
    if(parts.length !== 3 || month === undefined){ return { "day" : date, "year" : "" }; }
    return { "day" : Number(parts[2]) + " " + month, "year" : parts[0] };
}

// the whole thing on one line, for anything that is read rather than seen
function logDate(date){
    let when = logDateParts(date);
    return when.year === "" ? when.day : when.day + " " + when.year;
}

function sessionLogRow(entry){
    let described = sessionLogView.describe(entry);
    let when = logDateParts(entry.date);
    let stars = "";
    for(let i = 0; i < 5; i++){
        stars += `<i class="demo-icon icon-star ${i < entry.rating ? "active" : ""}"></i>`;
    }
    let edit = sessionLogView.onEdit
        ? `<i class="demo-icon icon-wrench" role="button" tabindex="0" aria-label="Edit session ${logDate(entry.date)}" onclick="${sessionLogView.onEdit}(${entry.id})"></i>`
        : "";

    return `<tr>
        <td class="log-date">${when.day}${when.year === "" ? "" : `<br /><span class="log-year">${when.year}</span>`}</td>
        <td>${described.title}${described.detail ? `<br /><span class="log-detail">${described.detail}</span>` : ""}</td>
        <td class="log-rating">${stars}</td>
        <td class="log-actions">${edit}
            <i class="demo-icon icon-trash" id="delete${entry.id}" role="button" tabindex="0" aria-label="Delete session ${logDate(entry.date)}" onclick="toggleConfirm(${entry.id})"></i>
            <span style="display:none" id="confirm${entry.id}">Sure?
                <i class="demo-icon icon-ok" role="button" tabindex="0" aria-label="Confirm delete" onclick="removeLog(${entry.id})"></i>
                <i class="demo-icon icon-cancel" role="button" tabindex="0" aria-label="Cancel delete" onclick="toggleConfirm(${entry.id})"></i>
            </span>
        </td>
    </tr>`;
}

// Deleting a session takes two taps like everything else destructive: the bin
// gives way to a tick and a cross, and nothing is lost until the tick is hit
function toggleConfirm(id){
    let confirm = document.getElementById("confirm" + id);
    let bin = document.getElementById("delete" + id);
    let arming = confirm.style.display === "none";
    confirm.style.display = arming ? "inline" : "none";
    if(bin){ bin.style.display = arming ? "none" : "inline-block"; }
}

function removeLog(id){
    setLog(sessionLogView.key, getLog(sessionLogView.key).filter(entry => String(entry.id) !== String(id)));
    drawSessionLog();
}

// How long to wait for the speech engine to start before carrying on without it
const speechStartTimeout = 1000;

// Function that uses uses speech synthesis to say text.
// onStart (optional) fires the moment the audio actually begins, so anything on
// screen can be timed off the voice instead of off a guessed delay. It also fires
// when there is no voice at all (sound off, unsupported browser, speech error) and
// is capped by a safety timeout so a silent engine can never stall the caller.
function speak(inputTxt, onStart){
    let fired = false;
    let fire = function(){
        if(fired === true){ return; }
        fired = true;
        if(onStart){ onStart(); }
    };

    if (sound === true && 'speechSynthesis' in window){
        var utterThis = new SpeechSynthesisUtterance(inputTxt); // Note: Chrome needs user interaction to work
        utterThis.onstart = fire;
        utterThis.onerror = fire;
        setTimeout(fire, speechStartTimeout); // in case the engine never reports a start
        window.speechSynthesis.speak(utterThis);
    } else {
        fire();
    }
}

// Counts "Three, Two, One" down. Each colour flips when its own word actually
// starts speaking, and the next step is scheduled from that moment, so the screen
// and the voice stay locked together however long the engine takes to warm up.
// onComplete runs one step after "One" has begun.
function countdown(onComplete){
    const steps = [
        { "word" : "Three", "colour" : "red" },
        { "word" : "Two",   "colour" : "orange" },
        { "word" : "One",   "colour" : "yellow" }
    ];
    const gap = debug ? 300 : 1000;

    // Drop anything still queued from a previous run, otherwise the countdown has
    // to wait its turn behind it before a single word is heard.
    if('speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)){
        window.speechSynthesis.cancel();
    }

    let runStep = function(index){
        if(index === steps.length){
            onComplete();
            return;
        }
        speak(steps[index].word, function(){
            background(steps[index].colour);
            setTimeout(function(){ runStep(index + 1); }, gap);
        });
    };
    runStep(0);
}

// Function to toggle Dark Mode based onChange of checkbox
function toggleDarkMode(){
    if(darkMode === true){
        darkMode = false;
        if(document.body.classList.contains('dark')){
            document.body.classList.remove('dark');
        }
        document.getElementById('darkStatus').innerText = `Off`;
    } else {
        darkMode = true;
        if(!document.body.classList.contains('dark')){
            document.body.classList.add('dark');
        }
        document.getElementById('darkStatus').innerText = `On`;
    }
}

// Function to toggle sound on and off
function toggleSound(){
    if(sound === true){
        sound = false;
        document.getElementById('sound').classList.replace("icon-volume-high", "icon-volume-off");
    } else {
        sound = true;
        document.getElementById('sound').classList.replace("icon-volume-off", "icon-volume-high");
    }
}

// Next two functions load the tracking script
function loadNonEssential(type, url){
        const tag =  document.createElement(type);
        tag.src = url
        tag.async = true;
        tag.defer = true;
        document.getElementsByTagName("body")[0].appendChild(tag);
}
function loadAnalytics(){
    window.performance.mark('gta-start');
    loadNonEssential("script", "https://www.googletagmanager.com/gtag/js?id=G-XR0EG1VTTE");
    setTimeout(function(){
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-XR0EG1VTTE');
        window.performance.mark('gta-end');
    }, 1000);

}

// function to change the background color and manage the defult color based on DarkMode
function background(color){
    let base = "white";
    if(darkMode === true) {
        base = "dark";
    }
    document.body.classList = color + " " + base;
}
// Show or hide the info menu (top left)
/* A word about the cog, the first time an app is opened.

   Settings moved out of the info panel and behind an icon of their own, which is
   tidier but quieter: someone who knew where the grades were would find them
   gone. So the app says where they went - small, beside the cog, and only until
   the panel has been opened once, which is the point at which the nudge has done
   its job. One flag for the whole suite: it is the same lesson in every app. */
const cogHintKey = "seenSettings";
const cogHintDelay = 700;      // let the app draw first
const cogHintLife = 8000;      // then a few seconds to read it

function showCogHint(){
    // nothing to point at in an app with no settings of its own
    if(document.getElementById("settings") === null){ return; }
    if(localStorage.getItem(cogHintKey) === "true"){ return; }

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

/* The two overlays.

   Info, behind the i: what the app is, where to find it, and the sessions
   already done. Settings, behind the cog: the knobs - grades, difficulty, rests,
   dark mode. They are the same component, opened and closed the same way, and
   only one can be up at a time. */
const overlays = ["about", "settings"];

function openOverlay(id){
    let panel = document.getElementById(id);
    if(panel === null){ return; }
    if(id === "settings"){
        // they have found it; the nudge has nothing left to say
        localStorage.setItem(cogHintKey, "true");
        hideCogHint();
    }
    overlays.forEach(other => {
        if(other !== id){ closeOverlay(other); }
    });
    panel.style.display = "block";
    panel.scrollTop = 0; // opened again, start at the top of it
    holdPageStill(true);
}

function closeOverlay(id){
    let panel = document.getElementById(id);
    if(panel === null){ return; }
    panel.style.display = "none";
    holdPageStill(false);
}

// the names the markup uses
function openInfoBox(){ openOverlay("about"); }
function hideAbout(){ closeOverlay("about"); }
function openSettings(){ openOverlay("settings"); }
function hideSettings(){ closeOverlay("settings"); }

/* Stops the page behind the panel scrolling while the panel is over it.

   An inline style rather than a class on the body: background() rewrites
   body.classList wholesale on every colour change, and would drop a class put
   there by anything else. */
function holdPageStill(still){
    document.body.style.overflow = still ? "hidden" : "";
    document.documentElement.style.overflow = still ? "hidden" : "";
}

// Toggles debug/preview mode on which speeds up time (it could do other things in the future)
function toggleDebug(){
    if(debug === false){
        debug = true;
        document.getElementById('debugStatus').innerText = `On`;
    } else {
        debug = false;
        document.getElementById('debugStatus').innerText = `Off`;
    }
}
/* The service worker, which is what lets an app open with no signal at all.

   It lives at /training/ rather than in each app, so one cache holds the shared
   stylesheet, the icon font and this file rather than five copies. Registration
   is here because these five apps are the only pages that load functions.js.

   It needs https (or localhost) - over file:// or plain http the browser refuses
   and the apps carry on exactly as they did before. */
function registerServiceWorker(){
    // the truthiness check as well as the 'in' one: a test that stubs the
    // navigator leaves the property there with nothing behind it
    if(!('serviceWorker' in navigator) || !navigator.serviceWorker){ return; }
    navigator.serviceWorker.register('/training/sw.js', {
        "scope" : '/training/',
        // never satisfy the update check from the http cache - an app that cannot
        // be updated is worse than one that cannot be installed
        "updateViaCache" : 'none'
    }).catch(err => console.log('Service worker not registered:', err.message));
}

// Events to show or hide icons based on browser support
document.addEventListener('DOMContentLoaded', (event) => {
    drawSavePanel();
    registerServiceWorker();
    showCogHint();
    if (document.documentElement.requestFullscreen && document.getElementById("fullscreen")) {
        //supports fullscreen mode
        document.getElementById("fullscreen").style.display = "inline-block";
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && document.getElementById("darkMode")) {
        // user is in dark mode
        toggleDarkMode();
        document.getElementById("darkMode").checked = true;
    }
    loadAnalytics();
});