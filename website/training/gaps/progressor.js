/* A Tindeq Progressor or a PullForce meter over Web Bluetooth - Chrome and Edge,
   not iOS. Each takes one byte commands to its control point and notifies on its
   data point. The Progressor's protocol is Tindeq's sample client,
   github.com/blims/Tindeq-Progressor-API: a response code, a length, then the
   payload, all little endian. PullForce (gaps/pull_force_ble.ino) sends kg as
   text, all the time it's connected, and has no start, stop or battery. */

const progressor = (function(){
    const response = { "reply" : 0, "weight" : 1, "lowPower" : 4 };

    const tindeq = {
        "service" : "7e4e1701-1ea6-40c9-9dcc-13d34ffead57",
        "dataPoint" : "7e4e1702-1ea6-40c9-9dcc-13d34ffead57",
        "controlPoint" : "7e4e1703-1ea6-40c9-9dcc-13d34ffead57",
        "command" : { "tare" : 100, "start" : 101, "stop" : 102, "battery" : 111 },
        "received" : tindeqReceived
    };
    const pullForce = {
        "service" : "6e400001-8a3c-4b7e-9f2d-1c5a7b3e9d01",
        "dataPoint" : "6e400002-8a3c-4b7e-9f2d-1c5a7b3e9d01",
        "controlPoint" : "6e400004-8a3c-4b7e-9f2d-1c5a7b3e9d01",
        "command" : { "tare" : 116 },   // "t"
        "received" : pullForceReceived
    };

    let meter = tindeq;
    let device = null;
    let control = null;
    let measuring = false;
    let batteryAsked = false;   // a reply of four bytes is then the battery
    let leaving = false;     // disconnected on purpose, so no warning

    const self = {
        "supported" : Boolean(navigator.bluetooth),
        "status" : "off",    // off, connecting or connected
        "connected" : false,
        "name" : "",
        "batteryMv" : null,
        "error" : "",
        "kg" : 0,
        "onWeight" : () => {},
        "onChange" : () => {},
        connect,
        disconnect,
        tare,
        start,
        stop
    };

    function setStatus(status){
        self.status = status;
        self.connected = status === "connected";
        self.onChange();
    }

    function send(code){
        if(control === null || code === undefined){ return Promise.resolve(); }
        return control.writeValue(new Uint8Array([code])).catch(err => console.log("Progressor:", err.message));
    }

    function received(event){
        meter.received(event.target.value);
    }

    // PullForce streams even while stopped
    function weighed(kg){
        if(!measuring){ return; }
        self.kg = kg;
        self.onWeight(self.kg);
    }

    function pullForceReceived(data){
        let kg = parseFloat(new TextDecoder().decode(data));
        if(!Number.isNaN(kg)){ weighed(kg); }
    }

    // Weight comes as 8 byte samples: a float32 of kg, then a uint32 of microseconds
    function tindeqReceived(data){
        if(data.byteLength < 2){ return; }
        let code = data.getUint8(0);
        if(code === response.weight){
            let kg = self.kg;
            for(let at = 2; at + 8 <= data.byteLength; at += 8){
                kg = data.getFloat32(at, true);
            }
            weighed(kg);
        } else if(code === response.reply && batteryAsked && data.getUint8(1) === 4 && data.byteLength >= 6){
            self.batteryMv = data.getUint32(2, true);
            batteryAsked = false;
            self.onChange();
        } else if(code === response.lowPower){
            toast("The Progressor's battery is low", null, true, true);   // up until closed, so it isn't missed mid-pull
        }
    }

    function disconnected(){
        measuring = false;
        control = null;
        self.kg = 0;
        self.batteryMv = null;
        setStatus("off");
        if(!leaving){ toast("The Progressor disconnected"); }
        leaving = false;
    }

    // From a tap: the browser won't show its device picker otherwise
    async function connect(){
        if(!self.supported || self.status !== "off"){ return; }
        self.error = "";
        setStatus("connecting");
        try {
            device = await navigator.bluetooth.requestDevice({
                "filters" : [{ "namePrefix" : "Progressor" }, { "services" : [pullForce.service] }],
                "optionalServices" : [tindeq.service]
            });
            meter = (device.name || "").startsWith("Progressor") ? tindeq : pullForce;
            self.name = device.name || "PullForce";
            device.addEventListener("gattserverdisconnected", disconnected);
            let server = await device.gatt.connect();
            let meterService = await server.getPrimaryService(meter.service);
            let data = await meterService.getCharacteristic(meter.dataPoint);
            control = await meterService.getCharacteristic(meter.controlPoint);
            data.addEventListener("characteristicvaluechanged", received);
            await data.startNotifications();
            await tare();
            batteryAsked = meter.command.battery !== undefined;
            await send(meter.command.battery);
            setStatus("connected");
            await start();
        } catch(err){
            // closing the picker with nothing chosen is an error too, and needs no telling
            self.error = err.name === "NotFoundError" && /cancel/i.test(err.message) ? "" : err.message;
            control = null;
            setStatus("off");
            console.log("Progressor:", err.message);
        }
    }

    function disconnect(){
        if(device === null || !device.gatt || !device.gatt.connected){ return; }
        leaving = true;
        stop().then(() => device.gatt.disconnect());
    }

    function tare(){
        return send(meter.command.tare);
    }

    function start(){
        if(!self.connected || measuring){ return Promise.resolve(); }
        measuring = true;
        return send(meter.command.start);
    }

    function stop(){
        if(!measuring){ return Promise.resolve(); }
        measuring = false;
        self.kg = 0;
        return send(meter.command.stop);
    }

    return self;
})();
