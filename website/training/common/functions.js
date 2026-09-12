// Global Variables 
let wakeLock = null;
let sound = true;
let darkMode = false;
let debug = false;

// Function that attempts to request a screen stay awake.
const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            if(debug === true) {
                wakeLock.addEventListener('release', () => {
                    console.log('Screen Wake Lock released:', wakeLock.released);
                });
                console.log('Screen Wake Lock released:', wakeLock.released);
            }
        } catch (err) {
            console.log(`${err.name}, ${err.message}`);
        }
    } else {
        console.log(`Wakelock unsupported by browser`);
    }
};

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
function openInfoBox(){
    document.getElementById("about").style.display = "block";
}
function hideAbout(){
    document.getElementById("about").style.display = "none";
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
// Events to show or hide icons based on browser support
document.addEventListener('DOMContentLoaded', (event) => {
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