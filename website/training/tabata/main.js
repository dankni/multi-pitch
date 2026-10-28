/* A Tabata interval timer: work and rest, so many reps of them. In repeater mode,
   so many sets of those reps with a longer rest between, each set a track of its
   own that can be named, and the whole saved as a named routine. Set on the main
   screen and remembered for next time. The session itself is common/workout.js. */

const app = { "logKey" : "tabataLog" };
const settingsKey = "tabataSettings";
const repeatersKey = "tabataRepeaters";       // the repeater settings in use, routine or not
const routinesKey = "tabataRoutines";         // the named routines saved
const repeaterModeKey = "tabataRepeaterMode";
const oneSecondKey = "tabataOneSecond";

// what each setting can be, and how far a tap of - or + moves it
const limits = {
    "work" :    { "min" : 5, "max" : 300, "step" : 5, "seconds" : true },
    "rest" :    { "min" : 0, "max" : 300, "step" : 5, "seconds" : true },
    "reps" :    { "min" : 1, "max" : 50,  "step" : 1 },
    "sets" :    { "min" : 1, "max" : 20,  "step" : 1 },
    "setRest" : { "min" : 0, "max" : 900, "step" : 15 }   // minutes long, so 15 s a tap whatever the increments
};
const nameLimit = 40;
const setNameLimit = 24;

// the classic Tabata: 20 seconds on, 10 off, eight times
const tabata = { "work" : 20, "rest" : 10, "reps" : 8 };
// a hangboard repeater: 7 on, 3 off, ten times, six sets four minutes apart
const repeaterDefaults = { "name" : "", "work" : 7, "rest" : 3, "reps" : 10, "sets" : 6, "setRest" : 240, "setNames" : [] };
const repeaters = copyRoutine(repeaterDefaults);
let routines = [];
let repeaterMode = false;
let oneSecond = false;   // the Use 1 second increments setting: work and rest step by 1, not 5
const warningSeconds = 3;   // a rest goes red, a beep a second, this long before the next work
const vibrateSeconds = 1;   // the phone buzzes this long before a work or a rest
const goSoonBuzz = [200];            // one long one: go, as no hangs
const stopSoonBuzz = [100, 80, 100]; // two short ones: stop

const current = () => repeaterMode ? repeaters : tabata;
const setsOf = () => repeaterMode ? repeaters.sets : 1;

/* The whole session as work, rest and the rest between sets, in order: a set's
   last rep has the rest between sets after it instead of its own rest */
let plan = [];

function buildPlan(){
    let settings = current();
    let at = 0;
    plan = [];
    let add = (kind, length, set, rep) => {
        plan.push({ "kind" : kind, "length" : length, "set" : set, "rep" : rep, "start" : at });
        at += length;
    };
    for(let set = 0; set < setsOf(); set++){
        for(let rep = 0; rep < settings.reps; rep++){
            add("work", settings.work, set, rep);
            if(rep < settings.reps - 1){ add("rest", settings.rest, set, rep); }
        }
        if(set < setsOf() - 1){ add("setRest", repeaters.setRest, set, settings.reps - 1); }
    }
}

const totalSeconds = () => {
    let last = plan[plan.length - 1];
    return last.start + last.length;
};

// the main clock counts down what is left of the session
app.clock = secondsClock(seconds => {
    showElapsed(totalSeconds() - seconds);
    showProgress(seconds);
    seconds < totalSeconds() ? showSecond(seconds) : finish();
});

app.onGo = () => {
    showProgress(0);
    showSecond(0);
};

app.onReset = () => {
    showElapsed(totalSeconds());
    document.getElementById("first").hidden = true;
    showRestBar(null);
    showProgress(0);
};

app.logEntry = () => Object.assign(repeaterMode
    ? { "routine" : repeaters.name.trim() || undefined, "work" : repeaters.work, "rest" : repeaters.rest,
        "reps" : repeaters.reps, "sets" : repeaters.sets, "setRest" : repeaters.setRest }
    : { "work" : tabata.work, "rest" : tabata.rest, "reps" : tabata.reps }, { "kind" : chosenKind() });

// saved before reps were called reps, a session's reps were its "sets"
const repsOf = entry => typeof entry.reps === "number" ? entry.reps : entry.sets;

app.logView = {
    "key" : app.logKey,
    "describe" : entry => typeof entry.setRest === "number"
        ? { "title" : escapeHtml(entry.routine || "Repeaters"), "detail" : `${plural(entry.sets, "set")} of ${entry.reps} · ${entry.work}s on, ${entry.rest}s off` }
        : { "title" : plural(repsOf(entry), "rep"), "detail" : `${entry.work}s on, ${entry.rest}s off` },
    "onEdit" : editSession   // its note, title, rating and kind - see common/workout.js
};

/* On the watch (common/watch.js): work or rest and what is left of it, sent as
   each starts and as the session starts, pauses and stops - the watch counts down */
app.watchKey = "tabataWatch";
app.watch = {
    "state" : () => {
        let state = { "m" : "interval", "s" : document.body.dataset.state };
        let seconds = app.clock.seconds;
        let phase = countedIn ? plan.find(each => seconds < each.start + each.length) : undefined;
        if(phase){
            state.k = phase.kind === "work" ? "work" : "rest";
            state.p = plan.indexOf(phase);
            state.left = phase.start + phase.length - seconds;
        }
        return state;
    },
    "receive" : () => {},
    "active" : () => countedIn
};

function setName(set){
    return (repeaters.setNames[set] || "").trim();
}

// "Set 2 of 6 · Half crimp"
function setLine(set){
    return [`Set ${set + 1} of ${repeaters.sets}`, setName(set)].filter(part => part !== "").join(" · ");
}

function showSecond(seconds){
    let settings = current();
    let phase = plan.find(each => seconds < each.start + each.length);
    let left = phase.start + phase.length - seconds;
    document.getElementById("first_count").innerText = left;

    if(seconds === phase.start){
        showRestBar(phase);
        let line = document.getElementById("first_set");
        document.getElementById("first").hidden = false;
        if(phase.kind === "work"){
            document.getElementById("first_task").innerText = "Work";
            document.getElementById("first_rep").innerText = `Rep ${phase.rep + 1} of ${settings.reps}`;
            line.innerText = setLine(phase.set);
            background("green");
            ping();
            if(!repeaterMode && phase.rep === settings.reps - 1 && settings.reps > 1){ speak("Last one"); }
            if(repeaterMode && phase.rep === 0 && phase.set === repeaters.sets - 1 && repeaters.sets > 1){ speak("Last set"); }
        } else if(phase.kind === "rest"){
            document.getElementById("first_task").innerText = "Rest, then";
            document.getElementById("first_rep").innerText = `Rep ${phase.rep + 2} of ${settings.reps}`;
            background("");
            ping();
        } else {
            document.getElementById("first_task").innerText = "Rest, then";
            document.getElementById("first_rep").innerText = `Set ${phase.set + 2} of ${repeaters.sets}`;
            line.innerText = setName(phase.set + 1);
            background("");
            ping();
            if(setName(phase.set + 1)){ speak("Next, " + setName(phase.set + 1)); }
        }
        line.hidden = !repeaterMode || line.textContent === "";
        if(app.onState){ app.onState(); }
    }
    if(phase.kind !== "work" && left === Math.min(warningSeconds, phase.length)){
        background("red");
    }
    if(phase.kind !== "work" && left <= warningSeconds){
        beep();
    }
    if(left === vibrateSeconds){
        vibrate(phase.kind === "work" ? stopSoonBuzz : goSoonBuzz);
    }
}

// Across the foot of the screen through a rest, full as it ends; paused with the clock in CSS
function showRestBar(phase){
    let bar = document.getElementById("restBar");
    bar.classList.remove("running");
    bar.hidden = phase === null || phase.kind === "work" || phase.length === 0;
    if(bar.hidden){ return; }
    bar.style.setProperty("--rest-length", phase.length * (debug ? 0.1 : 1) + "s");   // as secondsClock
    void bar.offsetWidth;   // or the animation won't start over
    bar.classList.add("running");
}

function finish(){
    background("");
    document.getElementById("first").hidden = true;
    showRestBar(null);
    speak("Done");
    drawKindPicker(repeaterMode ? "Fingerboard" : "Other");
    finishSession();
}

/* What the session counts as on the progress page's time split, chosen as it is
   saved: repeaters are fingerboard sessions and a classic Tabata other, unless changed */
const sessionKinds = ["Climbing", "Fingerboard", "Other"];

function drawKindPicker(chosen){
    let picker = document.getElementById("kindPicker") || document.createElement("fieldset");
    picker.id = "kindPicker";
    picker.className = "setting-group";
    picker.innerHTML = "<legend>Count it as</legend><div class=\"picker\">" + sessionKinds.map(kind =>
        `<input type="radio" name="sessionKind" class="nice-radios" id="kind-${kind}" value="${kind}"${kind === chosen ? " checked" : ""} />`
        + `<label for="kind-${kind}">${kind}</label>`).join("") + "</div>";
    document.getElementById("endingDiv").insertBefore(picker, document.getElementById("saveSession"));
}

function chosenKind(){
    let checked = document.querySelector('input[name="sessionKind"]:checked');
    return checked === null ? undefined : checked.value;
}

// A saved session reopened from the log: saved before it had a kind, as the progress page counts it
app.onEditOpen = entry => drawKindPicker(sessionKinds.includes(entry.kind) ? entry.kind
    : typeof entry.setRest === "number" ? "Fingerboard" : "Other");
app.editEntry = () => ({ "kind" : chosenKind() });

/* ================= Settings ================= */

function readJson(key){
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch(err){
        return null;   // storage blocked or hand-edited: the defaults will do
    }
}

function store(key, value){
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch(err){
        // storage blocked: it works, it just won't remember
    }
}

function settingValue(value, name, fallback){
    let limit = limits[name];
    return typeof value === "number" && Number.isFinite(value) ? Math.min(limit.max, Math.max(limit.min, Math.round(value))) : fallback;
}

function textValue(value, limit){
    return typeof value === "string" ? value.slice(0, limit) : "";
}

function copyRoutine(from){
    return Object.assign({}, from, { "setNames" : from.setNames.slice() });
}

// a saved routine or the repeater settings, onto `into`, anything missing or out of range left as it was
function readRoutine(saved, into){
    ["work", "rest", "reps", "sets", "setRest"].forEach(name => { into[name] = settingValue(saved[name], name, into[name]); });
    into.name = textValue(saved.name, nameLimit);
    into.setNames = Array.isArray(saved.setNames) ? saved.setNames.slice(0, limits.sets.max).map(name => textValue(name, setNameLimit)) : [];
    return into;
}

function loadSettings(){
    let saved = readJson(settingsKey) || {};
    tabata.work = settingValue(saved.work, "work", tabata.work);
    tabata.rest = settingValue(saved.rest, "rest", tabata.rest);
    tabata.reps = settingValue(saved.reps ?? saved.sets, "reps", tabata.reps);
    readRoutine(readJson(repeatersKey) || {}, repeaters);
    let savedRoutines = readJson(routinesKey);
    routines = (Array.isArray(savedRoutines) ? savedRoutines : [])
        .filter(routine => routine && typeof routine.name === "string" && routine.name.trim() !== "")
        .map(routine => readRoutine(routine, copyRoutine(repeaterDefaults)));
    repeaterMode = readJson(repeaterModeKey) === true;
    oneSecond = readJson(oneSecondKey) === true;
    document.getElementById("repeaterMode").checked = repeaterMode;
    document.getElementById("oneSecond").checked = oneSecond;
}

function saveSettings(){
    repeaterMode ? store(repeatersKey, repeaters) : store(settingsKey, tabata);
}

function toggleOneSecond(input){
    oneSecond = input.checked;
    store(oneSecondKey, oneSecond);
}

function toggleRepeaterMode(input){
    repeaterMode = input.checked;
    store(repeaterModeKey, repeaterMode);
    drawSettings();
}

function stepOf(name){
    return oneSecond && limits[name].seconds ? 1 : limits[name].step;
}

// A - or + button: data-setting is which, data-step the direction
function stepSetting(button){
    let name = button.dataset.setting;
    let settings = current();
    let limit = limits[name];
    let step = stepOf(name);
    let direction = Number(button.dataset.step);
    // off the grid after 1 second steps, a 17 goes to 20 or 15, not 22 or 12
    let onGrid = direction > 0 ? Math.floor(settings[name] / step) * step : Math.ceil(settings[name] / step) * step;
    settings[name] = Math.min(limit.max, Math.max(limit.min, onGrid + direction * step));
    saveSettings();
    drawSettings();
}

function shownValue(name, value){
    if(name === "setRest" && value >= 60){ return Math.floor(value / 60) + ":" + String(value % 60).padStart(2, "0"); }
    return limits[name].seconds || name === "setRest" ? value + "s" : String(value);
}

function drawSettings(){
    let settings = current();
    document.body.toggleAttribute("data-repeater", repeaterMode);
    Object.keys(settings).filter(name => limits[name]).forEach(name => {
        document.getElementById(name + "Value").innerText = shownValue(name, settings[name]);
        document.querySelector(`[data-setting="${name}"][data-step="-1"]`).disabled = settings[name] <= limits[name].min;
        document.querySelector(`[data-setting="${name}"][data-step="1"]`).disabled = settings[name] >= limits[name].max;
    });
    let field = document.getElementById("routineName");
    if(field.value !== repeaters.name){ field.value = repeaters.name; }
    document.getElementById("saveRoutine").disabled = repeaters.name.trim() === "";
    buildPlan();
    showElapsed(totalSeconds());
    drawTimeline();
}

/* ================= Routines =================
   The repeater settings saved under a name, listed under the cog. Saving with a
   name already there puts the new settings in its place. */

function setRoutineName(input){
    repeaters.name = input.value.slice(0, nameLimit);
    saveSettings();
    document.getElementById("saveRoutine").disabled = repeaters.name.trim() === "";
}

function setSetName(input){
    let set = Number(input.dataset.set);
    repeaters.setNames[set] = input.value.slice(0, setNameLimit);
    saveSettings();
    input.parentNode.querySelector(".set-label").innerText = setLine(set);
}

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

function saveRoutine(){
    let name = repeaters.name.trim();
    if(name === ""){ return; }
    let routine = copyRoutine(repeaters);
    routine.name = name;
    routine.setNames = routine.setNames.slice(0, routine.sets);
    let place = routines.findIndex(each => sameName(each.name, name));
    place === -1 ? routines.push(routine) : routines.splice(place, 1, routine);
    routines.sort((a, b) => a.name.localeCompare(b.name));
    store(routinesKey, routines);
    drawRoutines();
    toast(place === -1 ? "Routine saved" : "Routine updated");
}

// not mid-session: the session is the settings it started with
function openRoutine(button){
    if(document.body.dataset.state !== "idle"){
        toast("Reset the session to open a routine", null, false, true);
        return;
    }
    readRoutine(routines[Number(button.dataset.routine)], repeaters);
    repeaterMode = true;
    store(repeaterModeKey, true);
    document.getElementById("repeaterMode").checked = true;
    saveSettings();
    drawSettings();
    hideSettings();
}

// The bin asks in a toast first, as a session in the log does. By name, as the
// list could change while it asks.
function askDeleteRoutine(button){
    let name = routines[Number(button.dataset.routine)].name;
    confirmToast("Delete the " + name + " routine?", "DELETE", () => {
        routines = routines.filter(routine => routine.name !== name);
        store(routinesKey, routines);
        drawRoutines();
    });
}

function drawRoutines(){
    document.getElementById("noRoutines").hidden = routines.length > 0;
    document.getElementById("routineList").innerHTML = routines.map((routine, index) => {
        let name = escapeHtml(routine.name);
        return `<li>
            <button type="button" class="link-button routine-open" data-action="openRoutine" data-routine="${index}">${name}</button>
            <span class="routine-detail">${routine.sets} × ${routine.reps} · ${routine.work}s / ${routine.rest}s</span>
            <button type="button" class="icon-button demo-icon icon-trash routine-bin" data-action="askDeleteRoutine" data-routine="${index}" aria-label="Delete ${name}"></button>
        </li>`;
    }).join("");
}

/* ================= The session, drawn to scale =================
   A track a set: a block a rep's work and a line its rest, so 20/10 looks like
   20/10. Two copies of each: the faint one is all of it, and the solid one on
   top is cut off where the session has got to. In repeater mode each set's
   track has its name over it, typed in before the start. */

function drawTimeline(){
    let html = "";
    for(let set = 0; set < setsOf(); set++){
        let blocks = plan.filter(phase => phase.set === set && phase.kind !== "setRest").map(phase => phase.kind === "work"
            ? `<i class="work" style="flex-grow: ${phase.length}"></i>`
            // no rest still leaves a gap between reps
            : `<i class="${phase.length > 0 ? "rest" : "gap"}" style="flex-grow: ${phase.length}"></i>`).join("");
        let label = repeaterMode ? `<input type="text" class="field set-name-field" data-input="setSetName" data-set="${set}"
                maxlength="${setNameLimit}" placeholder="Set ${set + 1}" aria-label="Name of set ${set + 1}" value="${escapeHtml(setName(set))}" />
            <p class="set-label">${escapeHtml(setLine(set))}</p>` : "";
        html += `<div class="set-track" data-set="${set}">${label}
            <div class="tracks"><div class="track todo">${blocks}</div><div class="track done">${blocks}</div></div>
        </div>`;
    }
    let timeline = document.getElementById("timeline");
    timeline.innerHTML = html;
    // each block in the solid copies, by the phase it draws
    let drawn = plan.filter(phase => phase.kind !== "setRest");
    [...timeline.querySelectorAll(".done i")].forEach((element, index) => { drawn[index].element = element; });
    timeline.setAttribute("aria-valuemax", totalSeconds());
    showProgress(0);
}

// From the blocks as drawn rather than the seconds, as each gap has a width of its own
function showProgress(seconds){
    let timeline = document.getElementById("timeline");
    let settings = current();
    timeline.querySelectorAll(".set-track").forEach(track => {
        let set = Number(track.dataset.set);
        let drawn = plan.filter(phase => phase.set === set && phase.element);
        let last = drawn[drawn.length - 1];
        let done = track.querySelector(".done");
        let percent;
        if(seconds >= last.start + last.length){
            percent = 0;
        } else if(seconds <= drawn[0].start){
            percent = 100;
        } else {
            let phase = drawn.find(each => seconds < each.start + each.length);
            let into = Math.min(1, (seconds - phase.start) / (phase.length || 1));
            let edge = phase.element.offsetLeft + phase.element.offsetWidth * into;
            percent = done.offsetWidth ? 100 - edge / done.offsetWidth * 100 : 100;
        }
        done.style.clipPath = `inset(0 ${percent}% 0 0)`;
    });
    let phase = plan.find(each => seconds < each.start + each.length) || plan[plan.length - 1];
    timeline.querySelectorAll(".set-track").forEach(track => track.classList.toggle("current", countedIn && Number(track.dataset.set) === phase.set));
    timeline.setAttribute("aria-valuenow", seconds);
    // countedIn is common/workout.js's: whether the session has begun
    let rep = `Rep ${Math.min(settings.reps, phase.rep + 1)} of ${settings.reps}`;
    timeline.setAttribute("aria-valuetext", !countedIn
        ? (repeaterMode ? `${plural(repeaters.sets, "set")} of ${plural(repeaters.reps, "rep")}` : plural(tabata.reps, "rep"))
        : (repeaterMode ? `Set ${phase.set + 1} of ${repeaters.sets}, ${rep.toLowerCase()}` : rep));
}

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    drawSettings();
    drawRoutines();
    drawSessionLog(app.logView);
});
