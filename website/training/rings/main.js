/* The Metolius rock ring workout: ten minutes, a minute's exercise at a time,
   with the next one shown 15 seconds before it starts. The session itself is
   common/workout.js. */

const app = { "logKey" : "rockRingsLog" };

// Which minute, which hold, what to do. A minute with two exercises has an order 2.
const plans = {
    "easy" : [
        { "min" : 1,  "order" : 1, "hold" : "jug.png",           "task" : "2 pull ups" },
        { "min" : 2,  "order" : 1, "hold" : "three_fingers.png", "task" : "10 second bent-arm hang" },
        { "min" : 2,  "order" : 2, "hold" : "two_fingers.png",   "task" : "10 second straight-arm hang" },
        { "min" : 3,  "order" : 1, "hold" : "offset.png",        "task" : "2 pull ups" },
        { "min" : 3,  "order" : 2, "hold" : "offset2.png",       "task" : "2 pull ups" },
        { "min" : 4,  "order" : 1, "hold" : "four_fingers.png",  "task" : "10 second sit hang" },
        { "min" : 4,  "order" : 2, "hold" : "three_fingers.png", "task" : "10 second straight-arm hang" },
        { "min" : 5,  "order" : 1, "hold" : "four_fingers.png",  "task" : "4 pull ups" },
        { "min" : 6,  "order" : 1, "hold" : "three_fingers.png", "task" : "12 second bent-arm hang" },
        { "min" : 6,  "order" : 2, "hold" : "two_fingers.png",   "task" : "10 second straight-arm hang" },
        { "min" : 7,  "order" : 1, "hold" : "four_fingers.png",  "task" : "10 second sit hang" },
        { "min" : 7,  "order" : 2, "hold" : "four_fingers.png",  "task" : "10 second straight-arm hang" },
        { "min" : 8,  "order" : 1, "hold" : "offset.png",        "task" : "10 second offset hang" },
        { "min" : 8,  "order" : 2, "hold" : "offset2.png",       "task" : "10 second offset hang" },
        { "min" : 9,  "order" : 1, "hold" : "four_fingers.png",  "task" : "15 second sit hang" },
        { "min" : 10, "order" : 1, "hold" : "three_fingers.png", "task" : "4 pull ups" },
        { "min" : 10, "order" : 2, "hold" : "three_fingers.png", "task" : "Straight-arm hang to failure" }
    ],
    "original" : [
        { "min" : 1,  "order" : 1, "hold" : "jug.png",           "task" : "3 pull ups" },
        { "min" : 2,  "order" : 1, "hold" : "three_fingers.png", "task" : "10 second bent-arm hang" },
        { "min" : 2,  "order" : 2, "hold" : "two_fingers.png",   "task" : "15 second straight-arm hang" },
        { "min" : 3,  "order" : 1, "hold" : "offset.png",        "task" : "2 pull ups" },
        { "min" : 3,  "order" : 2, "hold" : "offset2.png",       "task" : "2 pull ups" },
        { "min" : 4,  "order" : 1, "hold" : "four_fingers.png",  "task" : "20 second sit hang" },
        { "min" : 4,  "order" : 2, "hold" : "three_fingers.png", "task" : "10 second straight-arm hang" },
        { "min" : 5,  "order" : 1, "hold" : "four_fingers.png",  "task" : "5 pull ups" },
        { "min" : 6,  "order" : 1, "hold" : "three_fingers.png", "task" : "20 second bent-arm hang" },
        { "min" : 6,  "order" : 2, "hold" : "two_fingers.png",   "task" : "10 second straight-arm hang" },
        { "min" : 7,  "order" : 1, "hold" : "four_fingers.png",  "task" : "15 second sit hang" },
        { "min" : 7,  "order" : 2, "hold" : "four_fingers.png",  "task" : "15 second straight-arm hang" },
        { "min" : 8,  "order" : 1, "hold" : "offset.png",        "task" : "10 second offset hang" },
        { "min" : 8,  "order" : 2, "hold" : "offset2.png",       "task" : "10 second offset hang" },
        { "min" : 9,  "order" : 1, "hold" : "four_fingers.png",  "task" : "20 second sit hang" },
        { "min" : 10, "order" : 1, "hold" : "three_fingers.png", "task" : "5 pull ups" },
        { "min" : 10, "order" : 2, "hold" : "three_fingers.png", "task" : "Straight-arm hang to failure" }
    ],
    "hard" : [
        { "min" : 1,  "order" : 1, "hold" : "jug.png",           "task" : "4 pull ups" },
        { "min" : 2,  "order" : 1, "hold" : "three_fingers.png", "task" : "15 second bent-arm hang" },
        { "min" : 2,  "order" : 2, "hold" : "two_fingers.png",   "task" : "15 second straight-arm hang" },
        { "min" : 3,  "order" : 1, "hold" : "offset.png",        "task" : "3 pull ups" },
        { "min" : 3,  "order" : 2, "hold" : "offset2.png",       "task" : "3 pull ups" },
        { "min" : 4,  "order" : 1, "hold" : "four_fingers.png",  "task" : "20 second sit hang" },
        { "min" : 4,  "order" : 2, "hold" : "three_fingers.png", "task" : "10 second straight-arm hang" },
        { "min" : 5,  "order" : 1, "hold" : "four_fingers.png",  "task" : "6 pull ups" },
        { "min" : 6,  "order" : 1, "hold" : "three_fingers.png", "task" : "25 second bent-arm hang" },
        { "min" : 6,  "order" : 2, "hold" : "two_fingers.png",   "task" : "12 second straight-arm hang" },
        { "min" : 7,  "order" : 1, "hold" : "four_fingers.png",  "task" : "15 second sit hang" },
        { "min" : 7,  "order" : 2, "hold" : "four_fingers.png",  "task" : "20 second straight-arm hang" },
        { "min" : 8,  "order" : 1, "hold" : "offset.png",        "task" : "15 second offset hang" },
        { "min" : 8,  "order" : 2, "hold" : "offset2.png",       "task" : "15 second offset hang" },
        { "min" : 9,  "order" : 1, "hold" : "four_fingers.png",  "task" : "25 second sit hang" },
        { "min" : 10, "order" : 1, "hold" : "three_fingers.png", "task" : "6 pull ups" },
        { "min" : 10, "order" : 2, "hold" : "three_fingers.png", "task" : "Straight-arm hang to failure" }
    ]
};

let difficulty = "original";

/* The minute's exercises go up on the minute, and the next minute's at :45 in
   the red. The save panel comes up at 9:30. */
app.clock = secondsClock(seconds => {
    let minute = Math.floor(seconds / 60);
    let second = seconds % 60;
    if(second === 5){ background(""); }
    if(second === 0 && minute < 10){ displayTask(minute, false); }
    if(second === 45 && minute < 9){ displayTask(minute, true); }
    if(second === 30 && minute === 9){ showSavePanel(); }
    showElapsed(seconds);
});

app.onGo = () => displayTask(0, false);

app.onReset = () => {
    ["first", "second", "preview", "next"].forEach(id => { document.getElementById(id).hidden = true; });
};

app.logEntry = () => ({ "difficulty" : difficulty });

app.logView = {
    "key" : app.logKey,
    "describe" : entry => ({ "title" : (entry.difficulty || "original") + " workout" })
};

// The exercises for the minute after `minute` - or, as a preview, the one after that
function displayTask(minute, preview){
    let suffix = preview ? "_preview" : "";
    let tasks = plans[difficulty].filter(task => task.min === minute + (preview ? 2 : 1));
    let first = tasks.find(task => task.order === 1);
    let second = tasks.find(task => task.order === 2);
    document.getElementById("preview").hidden = !preview;
    document.getElementById("next").hidden = !preview;
    background(preview ? "red" : "green");
    [["first", first], ["second", second]].forEach(([place, task]) => {
        document.getElementById(place + suffix).hidden = !task;
        if(!task){ return; }
        document.getElementById(place + "_hold" + suffix).src = "/training/rings/img/" + task.hold;
        document.getElementById(place + "_task" + suffix).innerText = task.task;
    });
    if(!preview && first){ speak(first.task); }
    if(!preview && second){ speak(" followed by " + second.task); }
}

function loadDifficulty(){
    difficulty = plans[localStorage.getItem("difficulty")] ? localStorage.getItem("difficulty") : "original";
    document.getElementById(difficulty).checked = true;
}

function changeDifficulty(input){
    localStorage.setItem("difficulty", input.value);
    loadDifficulty();
}

/* Sessions used to be saved with no id, rated in a field called score, and with
   a null difficulty on the default plan - brought up to shape once, on load. */
function migrateLog(){
    let log = getLog(app.logKey);
    let changed = false;
    log.forEach((entry, index) => {
        if(entry.id === undefined){
            entry.id = Date.parse(entry.date) + index;   // unique, and still in date order
            changed = true;
        }
        if(entry.rating === undefined){
            entry.rating = entry.score === undefined ? 0 : entry.score;
            delete entry.score;
            changed = true;
        }
        if(!entry.difficulty){
            entry.difficulty = "original";
            changed = true;
        }
    });
    if(changed){ setLog(app.logKey, log); }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDifficulty();
    migrateLog();
    drawSessionLog(app.logView);
});
