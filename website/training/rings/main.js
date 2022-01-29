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
            "task" : "10 second straight arm hang"
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
            "task" : "Striagt-arm hang to failure"
        },
        {
            "min" : 11,
            "order" : 1,
            "hold" : "three_fingers.png",
            "task" : "Striagt-arm hang to failure"
        }
    ];

let started = false;
let wakeLock = null;

// Function that attempts to request a screen stay awake.
const requestWakeLock = async () => {
    try {
        wakeLock = await navigator.wakeLock.request();
        wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock released:', wakeLock.released);
        });
        console.log('Screen Wake Lock released:', wakeLock.released);
    } catch (err) {
        console.log(`${err.name}, ${err.message} - this probubly means the broswer doesn't support it`);
    }
};

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

function fullscreen(elem){
if (elem.requestFullscreen) {
    elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}

function speak(inputTxt){
    if (started === true){										// Chrome needs user activation
    var utterThis = new SpeechSynthesisUtterance(inputTxt);
    window.speechSynthesis.speak(utterThis);
    }
}

function displayTask(min){
    min = min + 1;
    let hasSecond = false;
    for(let i = 0; i < plan.length; i++){
        // ToDo: use something more elegant here like a map? 
        if((plan[i].min == min) && (plan[i].order == 1)) {
            document.getElementById("first").style.display = "flex";
            document.getElementById("first_hold").src = "img/" + plan[i].hold;
            document.getElementById("first_task").innerHTML = plan[i].task;
            speak(plan[i].task);
        } 
        if((plan[i].min == min) && (plan[i].order == 2)) {
            hasSecond = true;
            document.getElementById("second_hold").src = "img/" + plan[i].hold;
            document.getElementById("second_task").innerHTML = plan[i].task;
            speak(" followed by " + plan[i].task);
        }
        if(hasSecond) {
            document.getElementById("second").style.display = "flex";
        } else {
            document.getElementById("second").style.display = "none";
        }
    }
}

// To Count Elapsed time
let min = 0;
let sec = 0;
let stoptime = true;
let introRun = false;

function startTimer() {

    if(introRun === false && stoptime === true) { 
      setTimeout(speak("Three"), 1000);
      setTimeout(speak("Two"), 2000);
      setTimeout(speak("One"), 3000);
      setTimeout(function(){
          displayTask(min);
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

    if (sec == 60) {
        min = min + 1;
        sec = 0;
        displayTask(min);
    }

    if (sec < 10 || sec == 0) {
        sec = '0' + sec;
    }
    if (min < 10 || min == 0) {
        min = '0' + min;
    }

    document.getElementById('elapsed').innerHTML = min + ':' + sec;
    setTimeout("timerCycle()", 1000); // to test the app take set between 40 to 100 ^__^
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