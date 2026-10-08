/* A Tindeq Progressor over Web Bluetooth - Chrome and Edge, not iOS. The protocol
   is Tindeq's sample client, github.com/blims/Tindeq-Progressor-API: one byte
   commands to the control point, and notifications on the data point of a
   response code, a length, then the payload, all little endian. */

const progressor = (function(){
    const service = "7e4e1701-1ea6-40c9-9dcc-13d34ffead57";
    const dataPoint = "7e4e1702-1ea6-40c9-9dcc-13d34ffead57";
    const controlPoint = "7e4e1703-1ea6-40c9-9dcc-13d34ffead57";

    const command = { "tare" : 100, "start" : 101, "stop" : 102, "battery" : 111 };
    const response = { "reply" : 0, "weight" : 1, "lowPower" : 4 };

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
        if(control === null){ return Promise.resolve(); }
        return control.writeValue(new Uint8Array([code])).catch(err => console.log("Progressor:", err.message));
    }

    // Weight comes as 8 byte samples: a float32 of kg, then a uint32 of microseconds
    function received(event){
        let data = event.target.value;
        if(data.byteLength < 2){ return; }
        let code = data.getUint8(0);
        if(code === response.weight){
            for(let at = 2; at + 8 <= data.byteLength; at += 8){
                self.kg = data.getFloat32(at, true);
            }
            self.onWeight(self.kg);
        } else if(code === response.reply && batteryAsked && data.getUint8(1) === 4 && data.byteLength >= 6){
            self.batteryMv = data.getUint32(2, true);
            batteryAsked = false;
            self.onChange();
        } else if(code === response.lowPower){
            toast("The Progressor's battery is low");
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
            device = await navigator.bluetooth.requestDevice({ "filters" : [{ "namePrefix" : "Progressor" }], "optionalServices" : [service] });
            self.name = device.name || "Progressor";
            device.addEventListener("gattserverdisconnected", disconnected);
            let server = await device.gatt.connect();
            let progressorService = await server.getPrimaryService(service);
            let data = await progressorService.getCharacteristic(dataPoint);
            control = await progressorService.getCharacteristic(controlPoint);
            data.addEventListener("characteristicvaluechanged", received);
            await data.startNotifications();
            await tare();
            batteryAsked = true;
            await send(command.battery);
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
        return send(command.tare);
    }

    function start(){
        if(!self.connected || measuring){ return Promise.resolve(); }
        measuring = true;
        return send(command.start);
    }

    function stop(){
        if(!measuring){ return Promise.resolve(); }
        measuring = false;
        self.kg = 0;
        return send(command.stop);
    }

    return self;
})();
