/* A heart rate monitor over Web Bluetooth - the standard Heart Rate service,
   which chest straps and the Fitbit Air send - offered in beta as Heart Rate
   Monitor. Chrome and Edge, not iOS. Each reading goes to onBeat as a bpm;
   common/watch.js connects it in
   place of the Bangle. Shaped like common/bangle.js, so it can stand in for it. */

const hrm = (function(){
    let device = null;
    let leaving = false;

    const self = {
        "supported" : Boolean(navigator.bluetooth),
        "status" : "off",    // off, connecting or connected
        "connected" : false,
        "name" : "",
        "error" : "",
        "onBeat" : () => {},
        "onChange" : () => {},
        "onDrop" : () => {},
        connect,
        reconnect,
        disconnect
    };

    function setStatus(status){
        self.status = status;
        self.connected = status === "connected";
        self.onChange();
    }

    // bit 0 of the flags says whether the bpm is 16 bits or 8
    function measured(event){
        let value = event.target.value;
        let bpm = value.getUint8(0) & 1 ? value.getUint16(1, true) : value.getUint8(1);
        if(bpm > 0){ self.onBeat(bpm); }
    }

    function disconnected(){
        setStatus("off");
        if(!leaving){ self.onDrop(); }
        leaving = false;
    }

    async function open(){
        let server = await device.gatt.connect();
        let service = await server.getPrimaryService("heart_rate");
        let measurement = await service.getCharacteristic("heart_rate_measurement");
        measurement.addEventListener("characteristicvaluechanged", measured);
        await measurement.startNotifications();
        setStatus("connected");
    }

    function failed(err){
        // closing the picker with nothing chosen is an error too, and needs no telling
        self.error = err.name === "NotFoundError" && /cancel/i.test(err.message) ? "" : err.message;
        setStatus("off");
        console.log("Heart rate monitor:", err.message);
    }

    // From a tap: the browser won't show its device picker otherwise.
    // By name as well, in case a Fitbit doesn't advertise the service.
    async function connect(){
        if(!self.supported || self.status !== "off"){ return; }
        self.error = "";
        setStatus("connecting");
        try {
            device = await navigator.bluetooth.requestDevice({ "filters" : [{ "services" : ["heart_rate"] }, { "namePrefix" : "Fitbit" }], "optionalServices" : ["heart_rate"] });
            self.name = device.name || "Heart rate monitor";
            device.addEventListener("gattserverdisconnected", disconnected);
            await open();
        } catch(err){
            failed(err);
        }
    }

    // The monitor picked before, with no tap needed
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
