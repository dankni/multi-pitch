/* An app on a Bangle.js 2 (common/bangle.js). Connecting puts Climb Log
   (/training/watch/) on the watch, or its newer version, and opens it. Then
   the app's state is sent over whenever it changes, and what the watch sends
   back is the app's to act on. A watch that drops out is tried again while the
   app is active; what was done on it meanwhile waits there till then.

   The app gives `app.watchKey`, for the setting under the cog, and `app.watch`:
     state   : () => what Climb Log shows, its mode in m - see mplog.app.js
     receive : message => act on what the watch sent
     active  : () => whether a session is under way, to try a dropped watch again
   and optionally `app.heart` (common/heartrate.js), for the heart rate:
     wanted  : () => whether the watch is to read it now, sent as h
     receive : message => a reading, {t:"hr", b, a}
   The page gives an empty #watchBar and #watchSetting, filled here, and
   optionally a <template id="watchHelpText">, shown under the setting with the
   watch's battery. It is sent from
   app.onKept (common/functions.js) and app.onState, which an app calls itself. */

const watchApp = "/training/watch/mplog.app.js";
const watchRetryWait = 10000;

let watchReady = false;     // Climb Log is open on the watch and has said hello
let watchStage = "";        // what setting it up is up to
let watchRetrying = false;
let watchPush = null;
let watchWasConnected = false;
let watchVersion = "";      // the app version Climb Log was put there with, as its menu shows it

function watchWanted(){
    return localStorage.getItem(app.watchKey) === "true";
}

function toggleWatch(input){
    localStorage.setItem(app.watchKey, input.checked);
    if(input.checked && !bangle.supported){ toast("This browser can't connect to a watch.", null, false, true); }
    // the tap on the switch is what lets the browser show its picker
    if(input.checked){ connectWatch(); }
    else { disconnectWatch(); }
    drawWatch();
}

function connectWatch(){
    bangle.connect();
}

// the switch beside the status
function switchWatch(input){
    input.checked ? connectWatch() : disconnectWatch();
}

/* A tile's colour as this page draws it - a Boulderworld circuit, a hold, a
   loft route's holds, a grade band - and black or white to write on it, for the watch to draw the same */
function watchColour(classes){
    let probe = document.createElement("span");
    probe.className = classes;
    probe.hidden = true;
    probe.style.color = "var(--circuit, var(--hold, var(--holds-first, var(--holds, var(--c, currentColor)))))";
    document.body.appendChild(probe);
    let [red, green, blue] = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    probe.remove();
    let hex = "#" + [red, green, blue].map(part => Math.round(part).toString(16).padStart(2, "0")).join("");
    return [hex, 0.299 * red + 0.587 * green + 0.114 * blue > 128 ? "#000" : "#fff"];
}

function disconnectWatch(){
    watchRetrying = false;
    // a connected one is redrawn once it has gone, or its switch would flick back on
    if(bangle.connected){ bangle.disconnect(); }
    else { drawWatch(); }
}

// The battery in the help, asked for as the watch connects and each time the settings open
async function drawWatchBattery(){
    let battery = document.getElementById("watchBattery");
    if(battery === null){ return; }
    battery.hidden = !watchReady;
    if(!watchReady){ return; }
    try { battery.innerText = `Battery ${await bangle.ask("E.getBattery()")}%`; }
    catch(err){ battery.hidden = true; }
}

function setWatchStage(text){
    watchStage = text;
    drawWatch();
}

// Changes with the source, so a changed app is put on the watch again
function sourceHash(text){
    let hash = 0;
    for(let i = 0; i < text.length; i++){ hash = (hash * 31 + text.charCodeAt(i)) | 0; }
    return (hash >>> 0).toString(36);
}

/* true once it has put it there. The source is only sent when it has changed;
   a new app version with the same source just relabels it, which the watch
   shows as it opens. Without a version - no service worker - the hash stands in. */
async function installWatchApp(){
    let source = await (await fetch(watchApp)).text();
    let hash = sourceHash(source);
    watchVersion = (await appVersion()) || hash;
    let info = (await bangle.ask(`require("Storage").readJSON("mplog.info",1)||{}`)) || {};
    if(info.hash === hash && info.version === watchVersion){ return false; }
    if(info.hash !== hash){
        await bangle.writeFile("mplog.app.js", source, done => setWatchStage(`Putting Climb Log on the watch ${Math.round(done * 100)}%`));
        // a tick, for the launcher
        await bangle.ask(`(function(){var b=Graphics.createArrayBuffer(48,48,1,{msb:true});b.fillPoly([4,26,11,19,19,27,37,7,44,14,19,40]);require("Storage").write("mplog.img",b.asImage("string"));return 1})()`);
    }
    await bangle.writeFile("mplog.info", JSON.stringify({ "id" : "mplog", "name" : "Climb Log", "type" : "app", "src" : "mplog.app.js", "icon" : "mplog.img",
        "version" : watchVersion, "hash" : hash, "files" : "mplog.info,mplog.app.js,mplog.img", "data" : "mplog.json" }));
    return true;
}

async function setUpWatch(){
    watchReady = false;
    try {
        setWatchStage("Checking the watch");
        let installed = await installWatchApp();
        if(installed || !(await bangle.ask("global.mplog?1:0"))){
            setWatchStage("Opening Climb Log");
            bangle.run(`load("mplog.app.js")`);   // it says up once open
        } else {
            bangle.run(`mplog({t:"hi"})`);
        }
    } catch(err){
        watchStage = "";
        bangle.error = err.message;
        bangle.disconnect();
    }
}

// Once whatever is being written has gone, so a run of changes is sent as one
function pushWatch(){
    if(!watchReady || watchPush !== null){ return; }
    watchPush = bangle.idle().then(() => {
        watchPush = null;
        return bangle.run(`if(global.mplog)mplog(${JSON.stringify(Object.assign({ "t" : "state" }, app.watch.state(), app.heart && app.heart.wanted() ? { "h" : 1 } : {}))})`);
    });
}

function fromWatch(message){
    if(message.t === "up"){ return bangle.run(`mplog({t:"hi"})`); }
    if(message.t === "hello"){
        watchReady = true;
        setWatchStage("");
        drawWatchBattery();
        return pushWatch();
    }
    // a reading every few seconds changes nothing the watch shows
    if(message.t === "hr"){ return app.heart && app.heart.receive(message); }
    app.watch.receive(message);
    pushWatch();
}

function retryWatch(){
    setTimeout(() => {
        if(watchRetrying && app.watch.active() && bangle.status === "off"){ bangle.reconnect(); }
    }, watchRetryWait);
}

function watchChanged(){
    if(bangle.connected && !watchWasConnected){
        watchRetrying = false;
        setUpWatch();
    }
    watchWasConnected = bangle.connected;
    if(bangle.status === "off"){
        watchReady = false;
        watchStage = "";
        if(watchRetrying){ retryWatch(); }
    }
    drawWatch();
}

function watchDropped(){
    if(!app.watch.active()){ return; }
    watchRetrying = true;
    retryWatch();
    toast("The watch disconnected");
    drawWatch();
}

function drawWatchMarkup(){
    let help = document.getElementById("watchHelpText");
    document.getElementById("watchBar").innerHTML = `
        <div class="watch-line">
            <label class="switch-label">
                <input type="checkbox" id="watchSwitch" data-change="switchWatch" />
                <span class="label-content" id="watchStatusText" role="status">Watch not connected</span>
            </label>
        </div>`;
    document.getElementById("watchSetting").innerHTML = `
        <label class="switch-label">
            <input type="checkbox" data-change="toggleWatch" id="useWatch"/>
            <span class="label-content">
                Connect watch <span class="switch-state"></span>
            </span>
        </label>
        <p class="device-tips" id="watchSupported" hidden>Supported watches: <a href="https://thepihut.com/products/bangle-js-2" target="_blank" rel="noopener">Bangle.js 2</a></p>
        <p class="device-tips" id="watchVersion" hidden></p>
        ${help === null ? "" : `<div class="watch-help" id="watchHelp" hidden>
            <p id="watchBattery" hidden></p>
            ${help.innerHTML}
        </div>`}
        <p class="device-tips" id="noBluetoothWatch" hidden>This browser can't connect to a watch.</p>`;
}

const watchWords = { "off" : "Watch not connected", "connecting" : "Connecting to the watch…", "connected" : "Watch connected" };

function drawWatch(){
    let status = bangle.connected && !watchReady ? "connecting" : bangle.status;
    let text = watchStage || watchWords[status];
    if(status === "off" && watchRetrying){ text = "Watch dropped out, trying again"; }
    else if(status === "off" && bangle.error !== ""){ text = "Couldn't connect: " + bangle.error; }
    document.getElementById("watchBar").hidden = !watchWanted() || !bangle.supported;
    document.getElementById("watchStatusText").innerText = text;
    // on while connected or on the way to it
    document.getElementById("watchSwitch").checked = bangle.status !== "off" || watchRetrying;
    let help = document.getElementById("watchHelp");
    if(help !== null){
        help.hidden = !watchWanted();
        if(!watchReady){ document.getElementById("watchBattery").hidden = true; }
    }
    document.getElementById("watchSupported").hidden = !watchWanted();
    let version = document.getElementById("watchVersion");
    version.hidden = !watchWanted() || !watchReady;
    version.innerText = "Climb Log " + watchVersion;
    document.getElementById("noBluetoothWatch").hidden = bangle.supported || !watchWanted();
}

app.onKept = pushWatch;
app.onState = pushWatch;
bangle.onMessage = fromWatch;
bangle.onChange = watchChanged;
bangle.onDrop = watchDropped;

document.addEventListener("DOMContentLoaded", () => {
    drawWatchMarkup();
    document.getElementById("useWatch").checked = watchWanted();
    drawWatch();
    document.querySelector('[data-action="openSettings"]').addEventListener("click", drawWatchBattery);
});
