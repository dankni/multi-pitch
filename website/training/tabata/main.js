/* A Tabata interval timer: work, rest, and how many sets of them, set on the
   main screen and remembered for next time. The session itself is
   common/workout.js. */

const app = { "logKey" : "tabataLog" };
const settingsKey = "tabataSettings";
const oneSecondKey = "tabataOneSecond";

// what each setting can be, and how far a tap of - or + moves it
const limits = {
    "work" : { "min" : 5, "max" : 300, "step" : 5 },
    "rest" : { "min" : 0, "max" : 300, "step" : 5 },
    "sets" : { "min" : 1, "max" : 50,  "step" : 1 }
};
// the classic Tabata: 20 seconds on, 10 off, eight times
const settings = { "work" : 20, "rest" : 10, "sets" : 8 };
let oneSecond = false;   // the Use 1 second increments setting: work and rest step by 1, not 5
const warningSeconds = 3;   // the rest goes red, a beep a second, this long before the next set

const setSeconds = () => settings.work + settings.rest;
// no rest after the last set
const totalSeconds = () => settings.sets * setSeconds() - settings.rest;

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
    showProgress(0);
};

app.logEntry = () => ({ "work" : settings.work, "rest" : settings.rest, "sets" : settings.sets });

app.logView = {
    "key" : app.logKey,
    "describe" : entry => ({ "title" : plural(entry.sets, "set"), "detail" : `${entry.work}s on, ${entry.rest}s off` })
};

function showSecond(seconds){
    let index = Math.floor(seconds / setSeconds());
    let into = seconds % setSeconds();
    let working = into < settings.work;
    let left = working ? settings.work - into : setSeconds() - into;
    document.getElementById("first_count").innerText = left;

    if(into === 0){
        document.getElementById("first").hidden = false;
        document.getElementById("first_task").innerText = "Work";
        document.getElementById("first_rep").innerText = `Set ${index + 1} of ${settings.sets}`;
        background("green");
        ping();
        if(index === settings.sets - 1 && settings.sets > 1){ speak("Last one"); }
    }
    if(into === settings.work){
        document.getElementById("first_task").innerText = "Rest, then";
        document.getElementById("first_rep").innerText = `Set ${index + 2} of ${settings.sets}`;
        background("");
        ping();
    }
    if(!working && left === Math.min(warningSeconds, settings.rest)){
        background("red");
    }
    if(!working && left <= warningSeconds){
        beep();
    }
}

function finish(){
    background("");
    document.getElementById("first").hidden = true;
    speak("Done");
    finishSession();
}

/* ================= Settings ================= */

function loadSettings(){
    try {
        let saved = JSON.parse(localStorage.getItem(settingsKey)) || {};
        Object.keys(limits).forEach(name => {
            let value = saved[name];
            let limit = limits[name];
            if(typeof value === "number" && Number.isFinite(value)){ settings[name] = Math.min(limit.max, Math.max(limit.min, Math.round(value))); }
        });
        oneSecond = localStorage.getItem(oneSecondKey) === "true";
    } catch(err){
        // storage blocked or hand-edited: the classic Tabata will do
    }
    document.getElementById("oneSecond").checked = oneSecond;
}

function toggleOneSecond(input){
    oneSecond = input.checked;
    try {
        localStorage.setItem(oneSecondKey, JSON.stringify(oneSecond));
    } catch(err){
        // storage blocked: it works, it just won't remember
    }
}

function stepOf(name){
    return oneSecond && name !== "sets" ? 1 : limits[name].step;
}

function saveSettings(){
    try {
        localStorage.setItem(settingsKey, JSON.stringify(settings));
    } catch(err){
        // storage blocked: it works, it just won't remember
    }
}

// A - or + button: data-setting is which, data-step the direction
function stepSetting(button){
    let name = button.dataset.setting;
    let limit = limits[name];
    let step = stepOf(name);
    let direction = Number(button.dataset.step);
    // off the grid after 1 second steps, a 17 goes to 20 or 15, not 22 or 12
    let onGrid = direction > 0 ? Math.floor(settings[name] / step) * step : Math.ceil(settings[name] / step) * step;
    settings[name] = Math.min(limit.max, Math.max(limit.min, onGrid + direction * step));
    saveSettings();
    drawSettings();
}

function drawSettings(){
    Object.keys(limits).forEach(name => {
        document.getElementById(name + "Value").innerText = name === "sets" ? settings[name] : settings[name] + "s";
        document.querySelector(`[data-setting="${name}"][data-step="-1"]`).disabled = settings[name] <= limits[name].min;
        document.querySelector(`[data-setting="${name}"][data-step="1"]`).disabled = settings[name] >= limits[name].max;
    });
    showElapsed(totalSeconds());
    drawTimeline();
}

/* ================= The session, drawn to scale =================
   A block a set's work and a line its rest, so 20/10 looks like 20/10. Two
   copies of it: the faint one is all of it, and the solid one on top is cut
   off where the session has got to. */

// each work and rest in the solid copy, with when it starts and how long it is
let phases = [];

function drawTimeline(){
    let html = "";
    for(let set = 0; set < settings.sets; set++){
        html += `<i class="work" style="flex-grow: ${settings.work}"></i>`;
        // no rest after the last set; none at all still leaves a gap between sets
        if(set < settings.sets - 1){ html += `<i class="${settings.rest > 0 ? "rest" : "gap"}" style="flex-grow: ${settings.rest}"></i>`; }
    }
    document.getElementById("todo").innerHTML = html;
    document.getElementById("done").innerHTML = html;
    let start = 0;
    phases = [...document.querySelectorAll("#done i")].map((element, index) => {
        let length = index % 2 === 0 ? settings.work : settings.rest;
        start += length;
        return { "element" : element, "start" : start - length, "length" : length };
    });
    document.getElementById("timeline").setAttribute("aria-valuemax", totalSeconds());
    showProgress(0);
}

// From the blocks as drawn rather than the seconds, as each gap has a width of its own
function showProgress(seconds){
    let timeline = document.getElementById("timeline");
    let phase = phases.find(each => seconds < each.start + each.length) || phases[phases.length - 1];
    let into = Math.min(1, (seconds - phase.start) / (phase.length || 1));
    let edge = phase.element.offsetLeft + phase.element.offsetWidth * into;
    let percent = timeline.offsetWidth ? 100 - edge / timeline.offsetWidth * 100 : 100;
    document.getElementById("done").style.clipPath = `inset(0 ${percent}% 0 0)`;
    timeline.setAttribute("aria-valuenow", seconds);
    // countedIn is common/workout.js's: whether the session has begun
    timeline.setAttribute("aria-valuetext", !countedIn ? plural(settings.sets, "set")
        : `Set ${Math.min(settings.sets, Math.floor(seconds / setSeconds()) + 1)} of ${settings.sets}`);
}

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    drawSettings();
    drawSessionLog(app.logView);
});
