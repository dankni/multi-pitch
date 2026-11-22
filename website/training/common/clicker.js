/* A Bluetooth clicker: a dial and an OLED (an ESP32-C3, hardware/clicker),
   over the Nordic UART service, a line of JSON each way. Beside the watch
   (common/watch.js), not in place of it: it shows what the app gives the watch,
   app.watch.state(), as text, and what it sends back goes to app.watch.receive()
   the same way - add, undo, tab, harder, tick and finish, numbered q from 0 each
   session and kept on the clicker till the page says, as ev in hi and each state,
   the first it has yet to have. No heart rate or altitude.

   The app gives `app.clickerKey`, for the setting under the cog, and optionally
   `app.clickerName(key, shown)`, the text for a tile the watch shows in colour.
   The page gives an empty #clickerBar and #clickerSetting, filled here.
   Chrome and Edge, not iOS. */

var clickerLink = (function(){
    const service = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    const rxPoint = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";   // to the clicker
    const txPoint = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";   // from it
    const piece = 128;   // longer writes the browser splits up itself

    let device = null;
    let rx = null;
    let writing = Promise.resolve();
    let heard = "";
    let leaving = false;

    const self = {
        "supported" : Boolean(navigator.bluetooth),
        "status" : "off",    // off, connecting or connected
        "connected" : false,
        "name" : "",
        "error" : "",
        "onMessage" : () => {},
        "onChange" : () => {},
        "onDrop" : () => {},
        connect,
        reconnect,
        disconnect,
        send,
        "idle" : () => writing
    };

    function setStatus(status){
        self.status = status;
        self.connected = status === "connected";
        self.onChange();
    }

    function send(message){
        let bytes = new TextEncoder().encode(JSON.stringify(message) + "\n");
        writing = writing.then(async () => {
            for(let at = 0; at < bytes.length && rx !== null; at += piece){
                await rx.writeValue(bytes.slice(at, at + piece));
            }
        }).catch(err => console.log("Clicker:", err.message));
        return writing;
    }

    function received(event){
        heard += new TextDecoder().decode(event.target.value);
        let lines = heard.split("\n");
        heard = lines.pop();
        lines.forEach(line => {
            let message;
            try { message = JSON.parse(line); } catch(err){ return; }
            self.onMessage(message);
        });
    }

    function disconnected(){
        rx = null;
        heard = "";
        setStatus("off");
        if(!leaving){ self.onDrop(); }
        leaving = false;
    }

    async function open(){
        let server = await device.gatt.connect();
        let uart = await server.getPrimaryService(service);
        let tx = await uart.getCharacteristic(txPoint);
        rx = await uart.getCharacteristic(rxPoint);
        tx.addEventListener("characteristicvaluechanged", received);
        await tx.startNotifications();
        writing = Promise.resolve();
        setStatus("connected");
    }

    function failed(err){
        self.error = bluetoothError(err);
        rx = null;
        setStatus("off");
        console.log("Clicker:", err.message);
    }

    // From a tap: the browser won't show its device picker otherwise
    async function connect(){
        if(!self.supported || self.status !== "off"){ return; }
        self.error = "";
        setStatus("connecting");
        try {
            device = await navigator.bluetooth.requestDevice({ "filters" : [{ "namePrefix" : "Clicker" }], "optionalServices" : [service] });
            self.name = device.name || "Clicker";
            device.addEventListener("gattserverdisconnected", disconnected);
            await open();
        } catch(err){
            failed(err);
        }
    }

    // The clicker picked before, with no tap needed
    async function reconnect(){
        if(device === null || self.status !== "off"){ return; }
        setStatus("connecting");
        try { await open(); } catch(err){ failed(err); }
    }

    function disconnect(){
        if(device === null || !device.gatt || !device.gatt.connected){ return; }
        leaving = true;
        device.gatt.disconnect();
    }

    window.addEventListener("trainingleave", disconnect);

    return self;
})();

var clickerRetryWait = 10000;
var clickerReady = false;     // it has said hello
var clickerRetrying = false;
var clickerPush = null;
var clickerWasConnected = false;
var clickerNextKey = "clickerNext";

function clickerWanted(){
    return localStorage.getItem(app.clickerKey) === "true";
}

function toggleClicker(input){
    if(input.checked && !clickerLink.supported){
        input.checked = false;
        unsupportedToast("This browser can't connect to a clicker.");
    }
    localStorage.setItem(app.clickerKey, input.checked);
    // the tap on the switch is what lets the browser show its picker
    if(input.checked){ clickerLink.connect(); }
    else { disconnectClicker(); }
    drawClicker();
}

// the switch beside the status
function switchClicker(input){
    input.checked ? clickerLink.connect() : disconnectClicker();
}

function disconnectClicker(){
    clickerRetrying = false;
    // a connected one is redrawn once it has gone, or its switch would flick back on
    if(clickerLink.connected){ clickerLink.disconnect(); }
    else { drawClicker(); }
}

// the OLED's font is ASCII
function clickerText(key, shown){
    let text = app.clickerName ? app.clickerName(key, shown) : shown;
    return String(text).replace(/[^\x20-\x7e]/g, "");
}

// The watch's state, each tile as [key, text, count or ticked] in place of its colours
function clickerState(){
    let state = Object.assign({ "t" : "state" }, app.watch.state(), clickerHas());
    delete state.h;   // the heart rate is the watch's
    if(state.L){
        state.L = state.L.map(ladder => ({ "k" : ladder.k, "n" : clickerText(null, ladder.n),
            "r" : ladder.r.map(row => [row[0], clickerText(row[0], row[1]), row[2]]) }));
    }
    if(state.P){
        state.P = state.P.map(panel => panel.map(route => [route[0], clickerText(route[0], route[1]), route[2]]));
    }
    return state;
}

// Once whatever is being written has gone, so a run of changes is sent as one
function pushClicker(){
    if(!clickerReady || clickerPush !== null){ return; }
    clickerPush = clickerLink.idle().then(() => {
        clickerPush = null;
        return clickerLink.send(clickerState());
    });
}

function clickerNext(){
    let id = app.watch.state().id;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(clickerNextKey)); } catch(err){}
    return saved && saved.id === id ? saved.next : 0;
}

function setClickerNext(next){
    localStorage.setItem(clickerNextKey, JSON.stringify({ "id" : app.watch.state().id, "next" : next }));
}

function clickerHas(){
    let id = app.watch.state().id;
    return id === undefined ? {} : { "id" : id, "ev" : clickerNext() };
}

function sayHiToClicker(){
    return clickerLink.send(Object.assign({ "t" : "hi" }, clickerHas()));
}

function fromClicker(message){
    if(message.t === "hello"){
        clickerReady = true;
        drawClicker();
        return pushClicker();
    }
    // each acted on once and in order, a gap asked for again
    if(typeof message.q === "number"){
        let next = clickerNext();
        if(message.q < next){ return; }
        if(message.q > next){ return sayHiToClicker(); }
        setClickerNext(next + 1);
    }
    app.watch.receive(message);
    pushClicker();
}

document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible" && clickerReady && clickerLink.connected){ sayHiToClicker(); }
});

function retryClicker(){
    setTimeout(() => {
        if(clickerRetrying && app.watch.active() && clickerLink.status === "off"){ clickerLink.reconnect(); }
    }, clickerRetryWait);
}

function clickerChanged(){
    if(clickerLink.connected && !clickerWasConnected){
        clickerRetrying = false;
        sayHiToClicker();
    }
    clickerWasConnected = clickerLink.connected;
    if(clickerLink.status === "off"){
        clickerReady = false;
        if(clickerRetrying){ retryClicker(); }
    }
    drawClicker();
}

function clickerDropped(){
    if(!app.watch.active()){ return; }
    clickerRetrying = true;
    retryClicker();
    toast("The clicker disconnected");
    drawClicker();
}

function drawClickerMarkup(){
    document.getElementById("clickerBar").innerHTML = `
        <div class="watch-line">
            <label class="switch-label">
                <input type="checkbox" id="clickerSwitch" data-change="switchClicker" />
                <span class="label-content" id="clickerStatusText" role="status">Clicker not connected</span>
            </label>
        </div>`;
    document.getElementById("clickerSetting").innerHTML = `
        <label class="switch-label">
            <input type="checkbox" data-change="toggleClicker" id="useClicker"/>
            <span class="label-content">
                Bluetooth clicker <span class="switch-state"></span>
            </span>
        </label>
        <p class="device-tips" id="noBluetoothClicker" hidden>This browser can't connect to a clicker.</p>`;
}

var clickerWords = { "off" : "Clicker not connected", "connecting" : "Connecting to the clicker…", "connected" : "Clicker connected" };

function drawClicker(){
    let status = clickerLink.connected && !clickerReady ? "connecting" : clickerLink.status;
    let text = clickerWords[status];
    if(status === "off" && clickerRetrying){ text = "Clicker dropped out, trying again"; }
    else if(status === "off" && clickerLink.error !== ""){ text = "Couldn't connect: " + clickerLink.error; }
    document.getElementById("clickerBar").hidden = !clickerWanted() || !clickerLink.supported;
    document.getElementById("clickerStatusText").innerText = text;
    // on while connected or on the way to it
    document.getElementById("clickerSwitch").checked = clickerLink.status !== "off" || clickerRetrying;
    document.getElementById("noBluetoothClicker").hidden = clickerLink.supported || !clickerWanted();
}

// after the watch's, which common/watch.js has set by now
var clickerKeptBefore = app.onKept;
app.onKept = () => { if(clickerKeptBefore){ clickerKeptBefore(); } pushClicker(); };
clickerLink.onMessage = fromClicker;
clickerLink.onChange = clickerChanged;
clickerLink.onDrop = clickerDropped;

document.addEventListener("DOMContentLoaded", () => {
    drawClickerMarkup();
    document.getElementById("useClicker").checked = clickerWanted();
    drawClicker();
});
