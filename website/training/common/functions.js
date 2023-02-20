// Global Variables 
let wakeLock = null;
let sound = true;
let darkMode = false;

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

// Function that uses uses speech synthesis to say text. 
function speak(inputTxt){
    if (sound === true){		  
        var utterThis = new SpeechSynthesisUtterance(inputTxt); // Note: Chrome needs user interaction to work
        window.speechSynthesis.speak(utterThis);
    }
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

function loadNonEssential(type, url){
        const tag =  document.createElement(type);
        tag.src = url
        tag.async = true;
        tag.defer = true;
        document.getElementsByTagName("body")[0].appendChild(tag);
}
function loadAnalytics(){
    window.performance.mark('gta-start');
    loadNonEssential("script", "https://www.googletagmanager.com/gtag/js?id=UA-123782847-1");
    setTimeout(function(){
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'UA-123782847-1');
        window.performance.mark('gta-end');
    }, 1000);

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