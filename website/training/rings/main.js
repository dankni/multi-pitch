// Where this app keeps its sessions - drawn by the shared log in functions.js
const logKey = "rockRingsLog";

/* Which plan is on: "original", "hard" or "easy". setDifficulty() keeps this in
   step with the radio, and it is what a saved session records. Reading it back
   out of local storage instead used to log a null, because nothing is written
   there until the difficulty is actually changed - the default never was. */
let difficulty = "original";

const planEasy = [
    {
        "min" : 1,
        "order" : 1,
        "hold" : "jug.png",
        "task" : "2 pull ups"
    }, 
    {
        "min" : 2,
        "order" : 1,
        "hold" : "three_fingers.png",
        "task" : "10 second bent-arm hang"
    }, 
    {
        "min" : 2,
        "order" : 2,
        "hold" : "two_fingers.png",
        "task" : "10 second straight-arm hang"
    }, 
    {
        "min" : 3,
        "order" : 1,
        "hold" : "offset.png",
        "task" : "2 pull ups"
    }, 
    {
        "min" : 3,
        "order" : 2,
        "hold" : "offset2.png",
        "task" : "2 pull ups"
    }, 
    {
        "min" : 4,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "10 second sit hang"
    }, 
    {
        "min" : 4,
        "order" : 2,
        "hold" : "three_fingers.png",
        "task" : "10 second straight-arm hang"
    },
    {
        "min" : 5,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "4 pull ups"
    }, 
    {
        "min" : 6,
        "order" : 1,
        "hold" : "three_fingers.png",
        "task" : "12 second bent-arm hang"
    }, 
    {
        "min" : 6,
        "order" : 2,
        "hold" : "two_fingers.png",
        "task" : "10 second straight-arm hang"
    }, 
    {
        "min" : 7,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "10 second sit hang"
    }, 
    {
        "min" : 7,
        "order" : 2,
        "hold" : "four_fingers.png",
        "task" : "10 second straight-arm hang"
    },
    {
        "min" : 8,
        "order" : 1,
        "hold" : "offset.png",
        "task" : "10 second offset hang"
    }, 
    {
        "min" : 8,
        "order" : 2,
        "hold" : "offset2.png",
        "task" : "10 second offset hang"
    },
    {
        "min" : 9,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "15 second sit hang"
    }, 
    {
        "min" : 10,
        "order" : 1,
        "hold" : "three_fingers.png",
        "task" : "4 pull ups"
    },
    {
        "min" : 10,
        "order" : 2,
        "hold" : "three_fingers.png",
        "task" : "Straight-arm hang to failure"
    }
];
const planOriginal = [
        {
            "min" : 1,
            "order" : 1,
            "hold" : "jug.png",
            "task" : "3 pull ups"
        }, 
        {
            "min" : 2,
            "order" : 1,
            "hold" : "three_fingers.png",
            "task" : "10 second bent-arm hang"
        }, 
        {
            "min" : 2,
            "order" : 2,
            "hold" : "two_fingers.png",
            "task" : "15 second straight-arm hang"
        }, 
        {
            "min" : 3,
            "order" : 1,
            "hold" : "offset.png",
            "task" : "2 pull ups"
        }, 
        {
            "min" : 3,
            "order" : 2,
            "hold" : "offset2.png",
            "task" : "2 pull ups"
        }, 
        {
            "min" : 4,
            "order" : 1,
            "hold" : "four_fingers.png",
            "task" : "20 second sit hang"
        }, 
        {
            "min" : 4,
            "order" : 2,
            "hold" : "three_fingers.png",
            "task" : "10 second straight-arm hang"
        },
        {
            "min" : 5,
            "order" : 1,
            "hold" : "four_fingers.png",
            "task" : "5 pull ups"
        }, 
        {
            "min" : 6,
            "order" : 1,
            "hold" : "three_fingers.png",
            "task" : "20 second bent-arm hang"
        }, 
        {
            "min" : 6,
            "order" : 2,
            "hold" : "two_fingers.png",
            "task" : "10 second straight-arm hang"
        }, 
        {
            "min" : 7,
            "order" : 1,
            "hold" : "four_fingers.png",
            "task" : "15 second sit hang"
        }, 
        {
            "min" : 7,
            "order" : 2,
            "hold" : "four_fingers.png",
            "task" : "15 second straight-arm hang"
        },
        {
            "min" : 8,
            "order" : 1,
            "hold" : "offset.png",
            "task" : "10 second offset hang"
        }, 
        {
            "min" : 8,
            "order" : 2,
            "hold" : "offset2.png",
            "task" : "10 second offset hang"
        },
        {
            "min" : 9,
            "order" : 1,
            "hold" : "four_fingers.png",
            "task" : "20 second sit hang"
        }, 
        {
            "min" : 10,
            "order" : 1,
            "hold" : "three_fingers.png",
            "task" : "5 pull ups"
        },
        {
            "min" : 10,
            "order" : 2,
            "hold" : "three_fingers.png",
            "task" : "Straight-arm hang to failure"
        }
    ];
const planHard = [
    {
        "min" : 1,
        "order" : 1,
        "hold" : "jug.png",
        "task" : "4 pull ups"
    }, 
    {
        "min" : 2,
        "order" : 1,
        "hold" : "three_fingers.png",
        "task" : "15 second bent-arm hang"
    }, 
    {
        "min" : 2,
        "order" : 2,
        "hold" : "two_fingers.png",
        "task" : "15 second straight-arm hang"
    }, 
    {
        "min" : 3,
        "order" : 1,
        "hold" : "offset.png",
        "task" : "3 pull ups"
    }, 
    {
        "min" : 3,
        "order" : 2,
        "hold" : "offset2.png",
        "task" : "3 pull ups"
    }, 
    {
        "min" : 4,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "20 second sit hang"
    }, 
    {
        "min" : 4,
        "order" : 2,
        "hold" : "three_fingers.png",
        "task" : "10 second straight-arm hang"
    },
    {
        "min" : 5,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "6 pull ups"
    }, 
    {
        "min" : 6,
        "order" : 1,
        "hold" : "three_fingers.png",
        "task" : "25 second bent-arm hang"
    }, 
    {
        "min" : 6,
        "order" : 2,
        "hold" : "two_fingers.png",
        "task" : "12 second straight-arm hang"
    }, 
    {
        "min" : 7,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "15 second sit hang"
    }, 
    {
        "min" : 7,
        "order" : 2,
        "hold" : "four_fingers.png",
        "task" : "20 second straight-arm hang"
    },
    {
        "min" : 8,
        "order" : 1,
        "hold" : "offset.png",
        "task" : "15 second offset hang"
    }, 
    {
        "min" : 8,
        "order" : 2,
        "hold" : "offset2.png",
        "task" : "15 second offset hang"
    },
    {
        "min" : 9,
        "order" : 1,
        "hold" : "four_fingers.png",
        "task" : "25 second sit hang"
    }, 
    {
        "min" : 10,
        "order" : 1,
        "hold" : "three_fingers.png",
        "task" : "6 pull ups"
    },
    {
        "min" : 10,
        "order" : 2,
        "hold" : "three_fingers.png",
        "task" : "Straight-arm hang to failure"
    }
];
let plan;
let started = false;

/* Sessions used to be saved with no id, deleted by their place in the array and
   rated in a field called score. The shared log works on ids and ratings like
   every other app, so anything the old app wrote is brought up to shape once, on
   load. Nothing is lost - an old session keeps its date and its difficulty. */
function migrateLog(){
    let log = getLog(logKey);
    let changed = false;
    log.forEach((entry, index) => {
        if(entry.id === undefined){
            entry.id = Date.parse(entry.date) + index; // unique, and still in date order
            changed = true;
        }
        if(entry.rating === undefined){
            entry.rating = entry.score === undefined ? 0 : entry.score;
            delete entry.score;
            changed = true;
        }
        /* Sessions on the default plan recorded a null difficulty: the app read
           it back out of local storage, where nothing was written until the
           difficulty was changed. A null one can only have been the original
           plan - anything else would have been stored to get there. */
        if(!entry.difficulty){
            entry.difficulty = "original";
            changed = true;
        }
    });
    if(changed){ setLog(logKey, log); }
}

function setStarted(){
    if(started === false) {
        requestWakeLock();
        started = true;
        startTimer();
        document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-pause"></i>PAUSE';
        document.getElementById('reset').style.display = 'none';
    } else {
        started = false;
        stopTimer();
        document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-play"></i>RESUME';
        document.getElementById('reset').style.display = 'inline-block'
    }
    
}

function displayTask(min, preview){
    let idAppend = ""
    if(preview){
        document.getElementById("preview").style.display = "flex";
        document.getElementById("next").style.display = "block";
        idAppend = "_preview";
        min = min + 1;
        background("red");
    } else {
        document.getElementById("preview").style.display = "none";
        document.getElementById("next").style.display = "none";
        background("green")
    }
    min = min + 1;
    let hasSecond = false;
    for(let i = 0; i < plan.length; i++){
        // ToDo: use something more elegant here like a map? 
        if((plan[i].min == min) && (plan[i].order == 1)) {
            document.getElementById("first" + idAppend).style.display = "flex";
            document.getElementById("first_hold" + idAppend).src = "img/" + plan[i].hold;
            document.getElementById("first_task" + idAppend).innerHTML = plan[i].task;
            if(!preview) { speak(plan[i].task); }
        } 
        if((plan[i].min == min) && (plan[i].order == 2)) {
            hasSecond = true;
            document.getElementById("second_hold" + idAppend).src = "img/" + plan[i].hold;
            document.getElementById("second_task" + idAppend).innerHTML = plan[i].task;
            if(!preview) { speak(" followed by " + plan[i].task); }
        }
        if(hasSecond) {
            document.getElementById("second" + idAppend).style.display = "flex";
        } else {
            document.getElementById("second" + idAppend).style.display = "none";
        }
    }
}
function showPreview(min){
    min = min + 2;
    document.getElementById("first").classList.add("shrink");
    document.getElementById("second").classList.add("shrink");
}
function hidePreview(){
    document.getElementById("first").classList.remove("shrink");
    document.getElementById("second").classList.remove("shrink");
}

// To Count Elapsed time
let min = 0;
let sec = 0;
let stoptime = true;
let introRun = false;

function startTimer() {

    if(introRun === false && stoptime === true) {
        // Nothing to pause until the session is actually running, and the
        // countdown can't be stopped once the voice is underway, so take the
        // button out of play until the first task is shown.
        let button = document.getElementById('primaryButton');
        button.disabled = true;
        countdown(function(){ // in common/functions.js, paced by the voice
            document.querySelector(".holder").style = "display:block";
            displayTask(min);
            background("green");
            introRun = true;
            startCycle();
            button.disabled = false;
        });
        return;
    }
    if (introRun === true && stoptime == true) {
        startCycle();
    }

}

// Starts the clock ticking a full second from now, so the display reads 00:00
// for its first second instead of jumping straight to 00:01 and staying a
// second ahead of the session for good.
function startCycle(){
    stoptime = false;
    setTimeout(timerCycle, debug ? 100 : 1000);
}
function stopTimer() {
    if (stoptime == false) {
    stoptime = true;
    }
}

function timerCycle() {
    if (stoptime == false) {
    sec = parseInt(sec);
    min = parseInt(min);

    sec = sec + 1;
    if (sec === 5){
        background("");// default
    }
    if (sec == 60) {
        min = min + 1;
        sec = 0;
        if (min < 10){
            displayTask(min, false);
        }
    }
    if (sec === 45 && min < 9) {
        displayTask(min, true);
    }
    if (sec === 30 && min === 9) {
        showEndingDiv();
    }

    if (sec < 10 || sec == 0) {
        sec = '0' + sec;
    }
    if (min < 10 || min == 0) {
        min = '0' + min;
    }

    document.getElementById('elapsed').innerHTML = min + ':' + sec;
    setTimeout(timerCycle, debug ? 100 : 1000);
    }
}

function reset() {
    releaseWakeLock(); // the workout is over, the screen can sleep
    document.getElementById('elapsed').innerHTML = '00:00';
    min = 0;
    sec = 0;
    stoptime = true;
    document.getElementById("first").style.display = "none";
    document.getElementById("second").style.display = "none";
    document.getElementById("reset").style.display = "none";
    document.getElementById('primaryButton').innerHTML = '<i class="demo-icon icon-play"></i>START SESSION';
    introRun = false;
    if(document.getElementById("endingDiv").style.display === "block"){
        document.getElementById("endingDiv").style.display = "none";
    }
}

function showEndingDiv() {
    document.getElementById("endingDiv").style.display = "block"
}
/* What a rock rings session is called in the log. The table, the stars, the two
   tap delete and the ordering are drawSessionLog() in common/functions.js - the
   same list every other app draws. */
const logView = {
    "key" : logKey,
    "describe" : entry => ({ "title" : (entry.difficulty || "original") + " workout" })
};

function saveSession() {
    let log = getLog(logKey);
    log.push({
        "id" : Date.now(),
        "date" : today(),
        "difficulty" : difficulty,
        "rating" : sessionRating,   // set by setStar() in common/functions.js
        "comment" : sessionComment
    });
    setLog(logKey, log);
    document.getElementById("endingDiv").style.display = "none";
    resetSavePanel();   // stars and note, ready for the next session
    drawSessionLog(logView);
}

function setDifficulty(){

    difficulty = localStorage.getItem("difficulty") || "original";
    document.getElementById(difficulty).checked = true;
    // ToDo: Refactor
    if(difficulty === "original"){
        plan = planOriginal;
    }
    if(difficulty === "hard"){
        plan = planHard;
    }
    if(difficulty === "easy"){
        plan = planEasy;
    }
}
function changeDifficulty(){
    localStorage.setItem("difficulty", document.querySelector('input[name="mode"]:checked').value);
    setDifficulty();
}

window.addEventListener('DOMContentLoaded', (event) => {
    setDifficulty();
    migrateLog();
    drawSessionLog(logView);
});

