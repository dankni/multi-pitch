/* What every training page needs to be part of the one installed app: the full
   screen button, and the service worker that lets it open with no signal.

   The apps load this beside functions.js; the overview and progress pages,
   which do not load functions.js, load it on its own. The app itself - one
   manifest for everything under /training/ - is /training/manifest.json. */

/* Full screen, from the icon at the right of the top bar. The icon shows what a
   tap will do: expand, or come back out. Leaving full screen with Escape or the
   phone's back gesture changes it too, since the browser says so either way. */
function fullscreen(){
    if(document.fullscreenElement){
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

function showFullscreenState(){
    let icon = document.getElementById("fullscreen");
    if(icon === null){ return; }
    let full = Boolean(document.fullscreenElement);
    icon.classList.toggle("icon-resize-full", !full);
    icon.classList.toggle("icon-resize-normal", full);
}

document.addEventListener("fullscreenchange", showFullscreenState);

/* The service worker. It lives at /training/ rather than in each app, so one
   cache holds the whole suite and one install covers every page. Every page
   registers it, so a phone that first opens the overview works offline too.

   It needs https (or localhost) - over file:// or plain http the browser refuses
   and the pages carry on exactly as they did before. */
function registerServiceWorker(){
    // the truthiness check as well as the 'in' one: a test that stubs the
    // navigator leaves the property there with nothing behind it
    if(!('serviceWorker' in navigator) || !navigator.serviceWorker){ return; }
    navigator.serviceWorker.register('/training/sw.js', {
        "scope" : '/training/',
        // never satisfy the update check from the http cache - an app that cannot
        // be updated is worse than one that cannot be installed
        "updateViaCache" : 'none'
    }).catch(err => console.log('Service worker not registered:', err.message));
}

document.addEventListener("DOMContentLoaded", () => {
    // the icon is hidden until the browser shows it can go full screen - an
    // iPhone cannot
    let icon = document.getElementById("fullscreen");
    if(icon !== null && document.documentElement.requestFullscreen){
        icon.style.display = "inline-block";
    }
    registerServiceWorker();
});
