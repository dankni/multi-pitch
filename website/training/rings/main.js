const plan = [
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

let started = false;
let wakeLock = null;
let sound = true;

// Function that attempts to request a screen stay awake.
const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Screen Wake Lock released:', wakeLock.released);
            });
            console.log('Screen Wake Lock released:', wakeLock.released);
        } catch (err) {
            console.log(`${err.name}, ${err.message}`);
        }
    } else {
        console.log(`Wakelock unsupported by browser`);
    }
};

function background(color){

    let colors =  { 
            "red" : "rgba(255,65,54,0.5)",
            "orange" : "rgba(255,133,27,0.5)",
            "yellow" : "rgba(255,220,0,0.5)",
            "green" : "rgba(46,204,64,0.5)",
            "white" : "#FFF"
    }
    document.body.style.backgroundColor = colors[color];
}

function setStarted(){
    if(started === false) {
        requestWakeLock();
        started = true;
        startTimer();
        document.querySelector('button').innerHTML = 'Stop';
        document.getElementById('reset').style.display = 'none';
    } else {
        started = false;
        stopTimer();
        document.querySelector('button').innerHTML = 'Resume';
        document.getElementById('reset').style.display = 'inline-block'
    }
    
}

function speak(inputTxt){
    if (started === true && sound === true){			  // Chrome needs user activation
    var utterThis = new SpeechSynthesisUtterance(inputTxt);
    window.speechSynthesis.speak(utterThis);
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
      setTimeout(function(){
          speak("Three");
          background("red");
        }, 1000);
      setTimeout(function(){
          speak("Two");
          background("orange");
      }, 2000);
      setTimeout(function(){
            speak("One");
            background("yellow");
        }, 3000);
      setTimeout(function(){
          displayTask(min);
          background("green");
          stoptime = false;
          timerCycle();
          introRun = true
      }, 4000);
      
    }
    if (introRun === true && stoptime == true) {
        stoptime = false;
        timerCycle();
    }

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
        background("white");
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

    if (sec < 10 || sec == 0) {
        sec = '0' + sec;
    }
    if (min < 10 || min == 0) {
        min = '0' + min;
    }
    if (min === 11 && wakeLock != null){
        //don't force the screen to stay awake anymore 
        wakeLock.release()
        .then(() => {
            wakeLock = null;
        });
    }

    document.getElementById('elapsed').innerHTML = min + ':' + sec;
        setTimeout("timerCycle()", 1000); // to test the app fast, set between 40 to 100 ^__^
    }
}

function reset() {
    document.getElementById('elapsed').innerHTML = '00:00';
    min = 0;
    sec = 0;
    stoptime = true;
    document.getElementById("first").style.display = "none";
    document.getElementById("second").style.display = "none";
    document.getElementById("reset").style.display = "none";
    document.querySelector('button').innerHTML = 'Start';
    introRun = false;
}


document.addEventListener('DOMContentLoaded', (event) => {
    if (document.documentElement.requestFullscreen) {
        document.getElementById("fullscreen").style.display = "inline-block";
    }
});

function fullscreen(){
    let icon = document.getElementById('fullscreen');
    let fsClass = "icon-resize-full-alt";
    let resizeClass = "icon-resize-small-alt";

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

function toggleSound(){
    if(sound === true){
        sound = false;
        document.getElementById('sound').classList.replace("icon-volume-high", "icon-volume-off");
    } else {
        sound = true;
        document.getElementById('sound').classList.replace("icon-volume-off", "icon-volume-high");
    }
}

function openInfoBox(){
    document.getElementById("about").style.display = "block";
}
function hideAbout(){
    document.getElementById("about").style.display = "none";
}