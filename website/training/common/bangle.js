/* A Bangle.js watch over Web Bluetooth - Chrome and Edge, not iOS. It talks the
   Nordic UART service, which is the watch's JavaScript console: a line sent is
   run there, and the watch app's replies come back a line of JSON each. A line
   starting \x10 isn't echoed back.

   Lines are written 20 bytes at a time, each waiting for the last, which is as
   much as the watch takes before it has negotiated more. */

const bangle = (function(){
    const service = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    const rxPoint = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";   // to the watch
    const txPoint = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";   // from it
    const askWait = 5000;

    let device = null;
    let rx = null;
    let writing = Promise.resolve();
    let heard = "";
    let asked = 0;
    let answers = {};
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
        run,
        ask,
        writeFile,
        "idle" : () => writing
    };

    function setStatus(status){
        self.status = status;
        self.connected = status === "connected";
        self.onChange();
    }

    // Anything past ASCII as \u escapes, which the watch reads back the same
    function ascii(text){
        return text.replace(/[\u0080-￿]/g, char => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
    }

    function write(text){
        let bytes = new TextEncoder().encode(ascii(text));
        writing = writing.then(async () => {
            for(let at = 0; at < bytes.length && rx !== null; at += 20){
                await rx.writeValue(bytes.slice(at, at + 20));
            }
        }).catch(err => console.log("Bangle:", err.message));
        return writing;
    }

    // Runs a line of code on the watch, with nothing back
    function run(code){
        return write("\x10" + code + "\n");
    }

    // What an expression comes to on the watch
    function ask(expression){
        let id = ++asked;
        return new Promise((resolve, reject) => {
            answers[id] = resolve;
            setTimeout(() => {
                if(answers[id]){
                    delete answers[id];
                    reject(new Error("The watch didn't answer"));
                }
            }, askWait);
            run(`Bluetooth.println(JSON.stringify({t:"r",i:${id},v:(${expression})}))`);
        });
    }

    // In pieces that each wait for the watch to say it has written them
    async function writeFile(name, text, onProgress){
        const piece = 256;
        for(let at = 0; at < text.length; at += piece){
            let size = at === 0 ? "," + text.length : "";
            await ask(`require("Storage").write(${JSON.stringify(name)},${JSON.stringify(text.slice(at, at + piece))},${at}${size})`);
            if(onProgress){ onProgress(Math.min(at + piece, text.length) / text.length); }
        }
    }

    // The console's prompt and anything else that isn't a line of JSON is passed over
    function received(event){
        heard += new TextDecoder().decode(event.target.value);
        let lines = heard.split("\n");
        heard = lines.pop();
        lines.forEach(line => {
            let start = line.indexOf("{");
            if(start === -1){ return; }
            let message;
            try { message = JSON.parse(line.slice(start)); } catch(err){ return; }
            if(message.t === "r" && answers[message.i]){
                answers[message.i](message.v);
                delete answers[message.i];
            } else {
                self.onMessage(message);
            }
        });
    }

    function disconnected(){
        rx = null;
        heard = "";
        answers = {};
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
        await write("\x03");   // clears anything half typed into the console
        setStatus("connected");
    }

    function failed(err){
        // closing the picker with nothing chosen is an error too, and needs no telling
        self.error = err.name === "NotFoundError" && /cancel/i.test(err.message) ? "" : err.message;
        rx = null;
        setStatus("off");
        console.log("Bangle:", err.message);
    }

    // From a tap: the browser won't show its device picker otherwise
    async function connect(){
        if(!self.supported || self.status !== "off"){ return; }
        self.error = "";
        setStatus("connecting");
        try {
            device = await navigator.bluetooth.requestDevice({ "filters" : [{ "namePrefix" : "Bangle.js" }], "optionalServices" : [service] });
            self.name = device.name || "Bangle.js";
            device.addEventListener("gattserverdisconnected", disconnected);
            await open();
        } catch(err){
            failed(err);
        }
    }

    // The watch picked before, with no tap needed
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

    return self;
})();
