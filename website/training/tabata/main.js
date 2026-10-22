/* A Tabata interval timer: work, rest, and how many sets of them, set on the
   main screen and remembered for next time. The session itself is
   common/workout.js. */

const app = { "logKey" : "tabataLog" };
const settingsKey = "tabataSettings";

// what each setting can be, and how far a tap of - or + moves it
const limits = {
    "work" : { "min" : 5, "max" : 300, "step" : 5 },
    "rest" : { "min" : 0, "max" : 300, "step" : 5 },
    "sets" : { "min" : 1, "max" : 50,  "step" : 1 }
};
// the classic Tabata: 20 seconds on, 10 off, eight times
const settings = { "work" : 20, "rest" : 10, "sets" : 8 };
const warningSeconds = 3;   // the rest goes red, a beep a second, this long before the next set

const setSeconds = () => settings.work + settings.rest;
// no rest after the last set
const totalSeconds = () => settings.sets * setSeconds() - settings.rest;

// the main clock counts down what is left of the session
app.clock = secondsClock(seconds => {
    showElapsed(totalSeconds() - seconds);
    seconds < totalSeconds() ? showSecond(seconds) : finish();
});

app.onGo = () => showSecond(0);

app.onReset = () => {
    showElapsed(totalSeconds());
    document.getElementById("first").hidden = true;
    markSets(0, false);
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
        markSets(index, true);
        background("green");
        ping();
        if(index === settings.sets - 1 && settings.sets > 1){ speak("Last one"); }
    }
    if(into === settings.work){
        document.getElementById("first_task").innerText = "Rest, then";
        document.getElementById("first_rep").innerText = `Set ${index + 2} of ${settings.sets}`;
        markSets(index + 1, false);
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
    markSets(settings.sets, false);
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
            // onto the steppers' grid, so a hand-edited 7 doesn't step 12, 17...
            if(typeof value === "number" && Number.isFinite(value)){ settings[name] = Math.min(limit.max, Math.max(limit.min, Math.round(value / limit.step) * limit.step)); }
        });
    } catch(err){
        // storage blocked or hand-edited: the classic Tabata will do
    }
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
    settings[name] = Math.min(limit.max, Math.max(limit.min, settings[name] + Number(button.dataset.step) * limit.step));
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
    drawSets();
}

/* ================= The sets, a dot each ================= */

function drawSets(){
    document.getElementById("sets").innerHTML = '<span class="pip"></span>'.repeat(settings.sets);
    document.getElementById("sets").setAttribute("aria-label", plural(settings.sets, "set"));
}

// done is how many sets are over, and working lights the next one's dot
function markSets(done, working){
    document.querySelectorAll("#sets .pip").forEach((pip, index) => {
        pip.classList.toggle("done", index < done);
        pip.classList.toggle("working", working && index === done);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadSettings();
    drawSettings();
    drawSessionLog(app.logView);
});
