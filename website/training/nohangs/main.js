/* Emil's sub-max daily no hangs: six grips in turn, each rep a hang and a rest,
   with every grip in a table that marks them off as they go. The session itself
   is common/workout.js. */

const app = { "logKey" : "noHangsLog" };

// the hand shapes, whose photos are above the routine in the info panel
const holds = {
    "open"      : "Open Hand",
    "halfCrimp" : "Half Crimp"
};

const fingerSets = {
    "four"    : "4 Fingers",
    "front3"  : "Front 3",
    "front2"  : "Front 2",
    "middle2" : "Middle 2"
};

const plan = [
    { "hold" : "open",      "fingers" : "four",    "reps" : 6 },
    { "hold" : "open",      "fingers" : "front3",  "reps" : 6 },
    { "hold" : "open",      "fingers" : "front2",  "reps" : 2 },
    { "hold" : "open",      "fingers" : "middle2", "reps" : 2 },
    { "hold" : "halfCrimp", "fingers" : "front2",  "reps" : 2 },
    { "hold" : "halfCrimp", "fingers" : "middle2", "reps" : 2 }
];
const hangSeconds = 10;
const restSeconds = 20;
const warningSeconds = 5;   // the rest goes red this long before the next hang
const beeps = 3;            // a beep a second for the last of the red
const repSeconds = hangSeconds + restSeconds;

// Every rep in order, as { hold, fingers, rep, of, step } - step its row in the plan
const reps = plan.flatMap((step, row) => Array.from({ "length" : step.reps }, (_, index) => ({ "hold" : step.hold, "fingers" : step.fingers, "rep" : index + 1, "of" : step.reps, "step" : row })));
// no rest after the last hang
const totalSeconds = reps.length * repSeconds - restSeconds;

// the main clock counts down what is left of the session
app.clock = secondsClock(seconds => {
    showElapsed(totalSeconds - seconds);
    seconds < totalSeconds ? showSecond(seconds) : finish();
});

app.onGo = () => showSecond(0);

app.onReset = () => {
    showElapsed(totalSeconds);
    document.getElementById("first").hidden = true;
    markHangs(0, false);
};

app.logEntry = () => ({});

app.logView = {
    "key" : app.logKey,
    "describe" : () => ({ "title" : "Sub-max daily" })
};

function gripName(step){
    return fingerSets[step.fingers] + ", " + holds[step.hold];
}

function gripLabel(step){
    return joinDetail([holds[step.hold], fingerSets[step.fingers]]);
}

function showSecond(seconds){
    let index = Math.floor(seconds / repSeconds);
    let into = seconds % repSeconds;
    let rep = reps[index];
    let next = reps[index + 1];
    let hanging = into < hangSeconds;
    let left = hanging ? hangSeconds - into : repSeconds - into;
    document.getElementById("first_count").innerText = left;

    if(into === 0){
        document.getElementById("first").hidden = false;
        document.getElementById("first_task").innerText = gripLabel(rep);
        document.getElementById("first_rep").innerText = `Rep ${rep.rep} of ${rep.of}`;
        markHangs(index, true);
        background("green");
        ping();
        if(rep.rep === 1){ speak(gripName(rep)); }
    }
    if(into === hangSeconds){
        document.getElementById("first_task").innerText = "Rest, then";
        document.getElementById("first_rep").innerText = `Rep ${next.rep} of ${next.of}`;
        markHangs(index + 1, false);
        background("");
        ping();
    }
    if(into === repSeconds - warningSeconds){
        background("red");
    }
    if(!hanging && left <= beeps){
        beep();
    }
}

function finish(){
    background("");
    document.getElementById("first").hidden = true;
    markHangs(reps.length, false);
    speak("Done");
    finishSession();
}

// The routine in the info panel: the hand shape, the fingers and the reps on a line
function drawRoutine(){
    document.getElementById("routine").innerHTML = plan.map(step =>
        `<tr><td>${joinDetail([holds[step.hold], fingerSets[step.fingers], plural(step.reps, "rep")])}</td></tr>`).join("");
}

// The grips on the main screen, a dot a rep
function drawHangs(){
    document.getElementById("hangs").innerHTML = plan.map(step =>
        `<tr><td>${gripLabel(step)}</td><td class="pips" aria-label="${plural(step.reps, "rep")}">${'<span class="pip"></span>'.repeat(step.reps)}</td></tr>`).join("");
}

/* done is how many hangs are over. The grip with the next one is the current
   row, and hanging lights that hang's dot. */
function markHangs(done, hanging){
    let current = done < reps.length ? reps[done].step : plan.length;
    document.querySelectorAll("#hangs tr").forEach((row, index) => {
        row.classList.toggle("done", index < current);
        row.classList.toggle("current", index === current);
    });
    document.querySelectorAll("#hangs .pip").forEach((pip, index) => {
        pip.classList.toggle("done", index < done);
        pip.classList.toggle("hanging", hanging && index === done);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    drawRoutine();
    drawHangs();
    showElapsed(totalSeconds);
    drawSessionLog(app.logView);
});
