/* Climb Log for Bangle.js 2. The phone's training app connects, installs this
   and opens it, then sends what to show with mplog({t:"state", m, ...}), m the
   mode:
     ladder   - the gym, outside and the loft: one grade at a time, in its colour on the
                phone. Tap the right or left half, or swipe left or right, to
                go harder or easier; press the button or hold the screen to tick
                it; swipe up or down for undo, the other ladder and finish.
     panel    - the Gilford wall: a panel's three routes. Hold one to tick it or
                take it back, swipe left or right for the next panel, and up or
                down, or the button, for finish.
     lap      - circuits: the clock and the laps. Press the button, or hold the
                screen while LAP fills, to lap.
     interval - tabata: work or rest and the time left, with a buzz as each starts,
                and the screen woken and red for the last seconds of a rest.
   The time of day is in the widget bar, on every screen.
   What it sends the phone is numbered from 0 each session (q) and kept in
   mplog.json till the phone says, as ev in hi or a state, the first it has
   yet to have: sent again from there on hi, so none is lost to a phone asleep
   or away.
   With h in the state, a running session's heart rate is read and sent every
   few seconds, and the barometer's altitude, averaged, every two. The last
   hour of each is kept, numbered from 0 each session (n), and in mplog.rec as
   the app closes, so the phone can ask again for any it missed - asleep, or
   away - with mplog({t:"hi", id, hr, alt, ev}): the session, and the first number
   of each it lacks. They come with how many seconds ago they were read.

   To the phone, a line of JSON each: add, undo, tab, harder, tick, finish, lap, hr, alt, then
   up when the app opens and hello once what waited has gone. Kept to ES5 and
   ASCII: the phone uploads it as it is. */
var storage = require("Storage");
var file = "mplog.json";
var saved = storage.readJSON(file, 1) || {};
var version = (storage.readJSON("mplog.info", 1) || {}).version || "";
var title = "Climb Log " + (/^\d/.test(version) ? "v" : "") + version;   // the app version, as the phone's settings show it
var state = saved.state || null;   // the phone's last word
var stateAt = saved.stateAt || 0;  // when it came, for a clock counted on from it
var sent = saved.sent || [];       // sent this session, till the phone has them
var sentId = saved.sentId;         // the session
var sentN = saved.sentN || 0;      // the next one's number
var mine = saved.mine || [];       // [ladder, grade] ticked here, latest last, for undo
var pick = saved.pick || {};       // the grade on show, by ladder
var linked = false;                // the phone app, not just anything, is connected
var onMain = false;                // the mode's own screen is up, not the menu or a message
var ticker = null;                 // redraws a running clock
var wokeFor = null;                // the rest the screen was last woken for, near its end
var warning = 3;                   // seconds left of a rest that go red, as the phone
var press = null;                  // a finger on the screen: where, how far it has moved, held long
var touch = null;                  // what the mode does with one: {tap, hold, fill}
var heldAt = 0;                    // when a hold last went off, so lifting from it isn't a tap too
var tappedAt = 0;                  // the last tap, so one reported twice only counts once
var longPress = 600;               // ms held still that does what the button does
var still = 12;                    // px a finger can wander and still be a tap or a hold
var heartOn = false;               // the heart rate monitor is powered for the session
var beatAt = 0;                    // when the last reading was taken
var beatEvery = 5;                 // s between readings
var beatSure = 50;                 // the confidence, out of 100, a reading needs
var beatsKept = 720;               // an hour of readings, the latest
var heightSum = 0;                 // altitudes read since the last one sent, to average
var heightCount = 0;
var heightAt = 0;                  // when the last was sent
var heightEvery = 2;               // s between them
var heightsKept = 1800;            // an hour of them, the latest
// the readings, reading n at n % kept: when (s), then bpm or m. One buffer, so it saves as one file
var rec = new ArrayBuffer(beatsKept * 5 + heightsKept * 8);
var beatT = new Uint32Array(rec, 0, beatsKept);
var heightT = new Uint32Array(rec, beatsKept * 4, heightsKept);
var heightM = new Float32Array(rec, beatsKept * 4 + heightsKept * 4, heightsKept);
var beatB = new Uint8Array(rec, beatsKept * 4 + heightsKept * 8, beatsKept);
var recId = null;                  // the session they are from
var beatN = 0;                     // the next reading's number
var heightN = 0;
var recFile = "mplog.rec";
var recMeta = storage.readJSON("mplog.recm.json", 1);
if(recMeta){
  var kept = storage.readArrayBuffer(recFile);
  if(kept && kept.byteLength === rec.byteLength){
    new Uint8Array(rec).set(new Uint8Array(kept));
    recId = recMeta.id;
    beatN = recMeta.hr;
    heightN = recMeta.alt;
  }
}
// once read, gone: a crash would leave them older than the numbers
storage.erase(recFile);
storage.erase("mplog.recm.json");

E.on("kill", function(){
  if(recId === null){ return; }
  storage.write(recFile, new Uint8Array(rec));
  storage.writeJSON("mplog.recm.json", { id : recId, hr : beatN, alt : heightN });
});

// the readings so far are this session's, or start again for a new one
function recFor(){
  if(recId === state.id){ return; }
  recId = state.id;
  beatN = 0;
  heightN = 0;
}

function keep(){
  storage.writeJSON(file, { state : state, stateAt : stateAt, sent : sent, sentId : sentId, sentN : sentN, mine : mine, pick : pick });
}

function tell(msg){
  Bluetooth.println(JSON.stringify(msg));
}

function send(msg){
  if(sentId !== state.id){
    sentId = state.id;
    sent = [];
    sentN = 0;
  }
  msg.q = sentN++;
  sent.push(msg);
  keep();
  if(linked){ tell(msg); }
}

// the phone has all before ev
function had(ask){
  if(ask.id !== sentId || typeof ask.ev !== "number"){ return false; }
  sent = sent.filter(function(msg){ return msg.q >= ask.ev; });
  return true;
}

function mode(){
  return state.m || "ladder";
}

// mm:ss as the phone shows it, minutes running on past 59
function clock(seconds){
  var whole = Math.max(0, Math.floor(seconds));
  var minutes = Math.floor(whole / 60);
  return (minutes < 10 ? "0" : "") + minutes + ":" + ("0" + whole % 60).substr(-2);
}

function since(){
  return state.s === "running" ? getTime() - stateAt : 0;
}

/* A hold is timed here from drag, which has the finger down and up - filling as
   it goes, if the mode shows that - and moving cancels it, as a swipe. A tap is
   the watch's own touch event: a quick tap may never reach drag. */
function drag(e){
  if(e.b && !press){
    press = { x : e.x, moved : 0, held : false, start : getTime() };
    if(touch.hold){
      press.timer = setTimeout(function(){
        press.held = true;
        heldAt = getTime();
        if(press.fill){ clearInterval(press.fill); }
        touch.hold(press.x);
      }, longPress);
    }
    if(touch.fill){
      press.fill = setInterval(function(){ touch.fill(Math.min(1, (getTime() - press.start) * 1000 / longPress)); }, 50);
    }
    return;
  }
  if(!press){ return; }
  if(e.b){
    press.moved += Math.abs(e.dx) + Math.abs(e.dy);
    if(press.moved > still){ stopPress(); }
    return;
  }
  letGo();
}

// e.type is 2 for the touchscreen's own long press, which a hold has seen to
function tapped(n, e){
  if(!touch || !touch.tap || e.type === 2 || getTime() - heldAt < 1 || getTime() - tappedAt < 0.35 || (press && (press.held || press.moved > still))){ return; }
  tappedAt = getTime();
  touch.tap(e.x);
}

function stopPress(){
  clearTimeout(press.timer);
  if(press.fill){
    clearInterval(press.fill);
    press.fill = null;
    touch.fill(0);
  }
}

// also for a finger still down when the screen changed, which never lifts here
function letGo(){
  if(press){ stopPress(); }
  press = null;
}

function stopClock(){
  if(ticker){ clearInterval(ticker); }
  ticker = null;
}

function message(text){
  E.showMessage(text, title);
  Bangle.setUI({ mode : "custom", btn : function(){ load(); } });
}

/* ================= ladder ================= */

function ladder(){
  var found = state.L.filter(function(l){ return l.k === state.l; })[0];
  return found || state.L[0];
}

function total(l){
  return l.r.reduce(function(sum, row){ return sum + row[2]; }, 0);
}

function rowOf(k, grade){
  var l = state.L.filter(function(l){ return l.k === k; })[0];
  return l ? l.r.filter(function(row){ return row[0] === grade; })[0] : undefined;
}

// past the top while HARDER is on its way from the phone
function at(l){
  return Math.max(0, Math.min(pick[l.k] || 0, l.r.length - 1));
}

function drawLadder(){
  var R = Bangle.appRect;
  var l = ladder();
  var i = at(l);
  var row = l.r[i];
  var x = R.x + R.w / 2;
  var y = R.y + R.h / 2;
  g.reset().clearRect(R.x, R.y, R.x2, R.y2);
  g.setFont("Vector", 16).setFontAlign(0, -1).drawString(l.n + " " + total(l), x, R.y + 2);
  g.fillPoly([R.x2 - 2, y, R.x2 - 20, y - 18, R.x2 - 20, y + 18]);
  if(i > 0){ g.fillPoly([R.x + 2, y, R.x + 20, y - 18, R.x + 20, y + 18]); }
  circle(x, y, 44, row[3]);
  g.setColor(row[4] || g.theme.fg).setFontAlign(0, 0);
  g.setFont("Vector", row[1].length > 3 ? 26 : 34).drawString(row[1], x, row[2] > 0 ? y - 8 : y);
  if(row[2] > 0){ g.setFont("Vector", 18).drawString("x" + row[2], x, y + 22); }
}

// in the colour its tile has on the phone, edged so a white one shows on white
function circle(x, y, r, colour){
  if(colour){ g.setColor(colour).fillCircle(x, y, r); }
  g.setColor(g.theme.fg).drawCircle(x, y, r);
}

// up past the top asks the phone for a harder grade
function move(by){
  var l = ladder();
  var i = at(l) + by;
  if(i < 0){ return; }
  if(i >= l.r.length){ send({ t : "harder", l : l.k }); }
  pick[l.k] = i;
  Bangle.buzz(20);
  keep();
  drawLadder();
}

function tick(){
  var l = ladder();
  var row = l.r[at(l)];
  row[2]++;
  mine.push([l.k, row[0]]);
  Bangle.buzz(80);
  send({ t : "add", g : row[0] });
  keep();
  drawLadder();
}

function otherLadder(){
  return state.L[(state.L.indexOf(ladder()) + 1) % state.L.length];
}

function switchLadder(){
  state.l = otherLadder().k;
  send({ t : "tab", l : state.l });
  keep();
  show();
}

function undo(){
  var last = mine.pop();
  var row = last && rowOf(last[0], last[1]);
  if(row && row[2] > 0){
    row[2]--;
    send({ t : "undo", g : last[1] });
  }
  keep();
  show();
}

function finish(){
  E.showPrompt("Finish the session?", { title : title, buttons : { "Yes" : true, "No" : false } }).then(function(yes){
    if(!yes){ return show(); }
    send({ t : "finish" });
    state.s = "saving";
    mine = [];
    keep();
    show();
  });
}

function showMenu(){
  onMain = false;
  letGo();
  var menu = { "" : { title : title, back : show } };
  var last = mine[mine.length - 1];
  if(mode() === "ladder" && last){
    var row = rowOf(last[0], last[1]);
    menu["Undo " + (row ? row[1] : last[1])] = undo;
  }
  if(mode() === "ladder" && state.L.length > 1){ menu[otherLadder().n] = switchLadder; }
  menu["Finish session"] = finish;
  menu["Close menu"] = show;
  menu["Exit"] = function(){ load(); };
  E.showMenu(menu);
}

function showLadder(){
  touch = { tap : function(x){ move(x > Bangle.appRect.x + Bangle.appRect.w / 2 ? 1 : -1); }, hold : tick };
  Bangle.setUI({
    mode : "custom",
    btn : tick,
    drag : drag,
    touch : tapped,
    // lr is -1 for a swipe left, which goes harder
    swipe : function(lr, ud){
      if(lr){ move(-lr); }
      else if(ud){ showMenu(); }
    }
  });
  drawLadder();
}

/* ================= panel ================= */

function panelAt(){
  return Math.max(0, Math.min(pick.panel || 0, state.P.length - 1));
}

// the panel's routes side by side, a tick under each one ticked, a dot a panel along the foot
function drawPanel(){
  var R = Bangle.appRect;
  var i = panelAt();
  var y = R.y + R.h / 2;
  g.reset().clearRect(R.x, R.y, R.x2, R.y2);
  g.setFont("Vector", 16).setFontAlign(0, -1).drawString("Panel " + (i + 1) + "  " + state.n + "/" + state.of, R.x + R.w / 2, R.y + 2);
  state.P[i].forEach(function(route, n){
    var x = R.x + R.w * (2 * n + 1) / 6;
    circle(x, y, 26, route[3]);
    g.setColor(route[4] || g.theme.fg).setFont("Vector", route[1].length > 2 ? 18 : 22).setFontAlign(0, 0).drawString(route[1], x, y);
    if(route[2]){
      g.setColor(g.theme.fg).fillPoly([x - 11, y + 40, x - 7, y + 36, x - 3, y + 40, x + 7, y + 30, x + 11, y + 34, x - 3, y + 48]);
    }
  });
  state.P.forEach(function(panel, n){
    var x = R.x + R.w / 2 + (n - (state.P.length - 1) / 2) * 12;
    g.setColor(g.theme.fg)[n === i ? "fillCircle" : "drawCircle"](x, R.y2 - 8, 3);
  });
}

// a hold ticks the route under it, or takes the tick back, as the gym ticks a grade
function tickRoute(x){
  var R = Bangle.appRect;
  var route = state.P[panelAt()][Math.max(0, Math.min(2, Math.floor((x - R.x) * 3 / R.w)))];
  route[2] = route[2] ? 0 : 1;
  state.n += route[2] ? 1 : -1;
  Bangle.buzz(route[2] ? 80 : 30);
  send({ t : "tick", r : route[0], on : route[2] });
  keep();
  drawPanel();
}

function movePanel(by){
  var i = panelAt() + by;
  if(i < 0 || i >= state.P.length){ return; }
  pick.panel = i;
  Bangle.buzz(20);
  keep();
  drawPanel();
}

function showPanel(){
  touch = { hold : tickRoute };
  Bangle.setUI({
    mode : "custom",
    btn : showMenu,
    drag : drag,
    touch : tapped,
    // a swipe left brings the next panel along, as the wall runs on to the right
    swipe : function(lr, ud){
      if(lr){ movePanel(-lr); }
      else if(ud){ showMenu(); }
    }
  });
  drawPanel();
}

/* ================= lap ================= */

function drawLap(fill){
  var R = Bangle.appRect;
  var x = R.x + R.w / 2;
  var b = { x : R.x + 8, y : R.y + 84, x2 : R.x2 - 8, y2 : R.y2 - 6, r : 10 };
  g.reset().clearRect(R.x, R.y, R.x2, R.y2);
  g.setFont("Vector", 40).setFontAlign(0, 0).drawString(clock((state.e / 1000) + since()), x, R.y + 30);
  g.setFont("Vector", 20).drawString((state.g ? state.g + " laps " : "Laps ") + state.n, x, R.y + 64);
  if(fill > 0){
    g.setColor("#0f0").fillRect({ x : b.x, y : b.y, x2 : b.x + Math.max(2 * b.r, (b.x2 - b.x) * fill), y2 : b.y2, r : b.r });
  }
  g.setColor(g.theme.fg).drawRect(b);
  g.setFont("Vector", 30).drawString(state.s === "running" ? "LAP" : "PAUSED", x, (b.y + b.y2) / 2);
}

function lap(){
  if(state.s !== "running"){ return; }
  state.n++;
  Bangle.buzz(80);
  send({ t : "lap" });
  keep();
  drawLap(0);
}

function showLap(){
  touch = { hold : lap, fill : function(fill){ drawLap(state.s === "running" ? fill : 0); } };
  Bangle.setUI({ mode : "custom", btn : lap, drag : drag });
  drawLap(0);
  if(state.s === "running"){ ticker = setInterval(function(){ if(!press){ drawLap(0); } }, 1000); }
}

/* ================= interval ================= */

function drawInterval(){
  var R = Bangle.appRect;
  var x = R.x + R.w / 2;
  var work = state.k === "work";
  var left = Math.max(0, state.left - Math.floor(since()));
  var red = !work && left <= warning;
  // the screen on and lit, once a rest, to see the work coming
  if(red && state.s === "running" && wokeFor !== state.p){
    wokeFor = state.p;
    Bangle.setLCDPower(1);
    Bangle.setBacklight(1);
  }
  g.reset().setColor(work ? "#0f0" : red ? "#f00" : g.theme.bg).fillRect(R.x, R.y, R.x2, R.y2);
  g.setColor(work ? "#000" : red ? "#fff" : g.theme.fg).setFontAlign(0, 0);
  g.setFont("Vector", 36).drawString(work ? "Work" : "Rest", x, R.y + 34);
  g.setFont("Vector", 60).drawString(left < 60 ? left : clock(left), x, R.y + R.h * 0.62);
  if(state.s === "paused"){ g.setFont("Vector", 18).drawString("PAUSED", x, R.y2 - 12); }
}

// one long for work, two short for rest, as the phone
function phaseBuzz(){
  if(state.k === "work"){ return Bangle.buzz(500); }
  Bangle.buzz(120).then(function(){ setTimeout(function(){ Bangle.buzz(120); }, 120); });
}

function showInterval(){
  touch = null;
  Bangle.setUI({ mode : "custom", btn : function(){ load(); } });
  drawInterval();
  if(state.s === "running"){ ticker = setInterval(drawInterval, 1000); }
}

/* ================= heart rate ================= */

function setHeart(){
  var on = !!(state && state.h && state.s === "running" && mode() !== "interval");
  if(on === heartOn){ return; }
  heartOn = on;
  Bangle.setHRMPower(on ? 1 : 0, "mplog");
  Bangle.setBarometerPower(on ? 1 : 0, "mplog");
  heightSum = 0;
  heightCount = 0;
}

Bangle.on("HRM", function(hrm){
  if(!heartOn || hrm.confidence < beatSure || getTime() - beatAt < beatEvery){ return; }
  beatAt = getTime();
  recFor();
  var i = beatN % beatsKept;
  beatT[i] = Math.round(beatAt);
  beatB[i] = hrm.bpm;
  if(linked){ tell({ t : "hr", b : hrm.bpm, a : 0, n : beatN }); }
  beatN++;
});

// the altitude to a tenth of a metre, for the climbing up and down the phone adds up
Bangle.on("pressure", function(e){
  if(!heartOn || !isFinite(e.altitude)){ return; }
  heightSum += e.altitude;
  heightCount++;
  if(getTime() - heightAt < heightEvery){ return; }
  heightAt = getTime();
  var m = Math.round(heightSum / heightCount * 10) / 10;
  heightSum = 0;
  heightCount = 0;
  recFor();
  var i = heightN % heightsKept;
  heightT[i] = Math.round(heightAt);
  heightM[i] = m;
  if(linked){ tell({ t : "alt", m : m, a : 0, n : heightN }); }
  heightN++;
});

// what the phone lacks of this session's readings, from the first it asked for
function resend(ask){
  if(!ask || recId === null || ask.id !== recId){ return; }
  var now = getTime();
  var n, i;
  for(n = typeof ask.hr === "number" ? Math.max(ask.hr, beatN - beatsKept) : beatN; n < beatN; n++){
    i = n % beatsKept;
    tell({ t : "hr", b : beatB[i], a : Math.round(now - beatT[i]), n : n });
  }
  for(n = typeof ask.alt === "number" ? Math.max(ask.alt, heightN - heightsKept) : heightN; n < heightN; n++){
    i = n % heightsKept;
    tell({ t : "alt", m : Math.round(heightM[i] * 10) / 10, a : Math.round(now - heightT[i]), n : n });
  }
}

/* ================= all ================= */

function show(){
  onMain = false;
  letGo();
  stopClock();
  var m = state ? mode() : null;
  var on = state && (state.s === "running" || (state.s === "paused" && m !== "ladder"));
  if(!on){
    message(state && (state.s === "saving" || state.s === "finished") ? "Finished.\nSave it on\nyour phone"
      : state && state.s === "counting" ? "Ready" : "Start a session\non your phone");
    return;
  }
  onMain = true;
  if(m === "lap"){ showLap(); }
  else if(m === "interval"){ showInterval(); }
  else if(m === "panel"){ showPanel(); }
  else { showLadder(); }
}

// The phone has connected, or woken: what it lacks of this session, then hello
function sync(ask){
  linked = true;
  if(had(ask)){
    keep();
    sent.forEach(tell);
  }
  resend(ask);
  tell({ t : "hello" });
}

global.mplog = function(msg){
  if(msg.t === "hi"){ return sync(msg); }
  if(msg.t !== "state"){ return; }
  var was = state;
  // a new session, or none, starts the watch clean: nothing to undo, from the first grade and panel
  if(!was || was.id !== msg.id || msg.s === "idle"){
    mine = [];
    pick = {};
  }
  state = msg;
  stateAt = getTime();
  had(msg);
  keep();
  setHeart();
  var same = was && (was.m || "ladder") === mode() && was.s === state.s;
  if(mode() === "interval" && state.s === "running" && (!same || was.p !== state.p)){ phaseBuzz(); }
  var menus = mode() === "ladder" || mode() === "panel";
  if(menus && same && !onMain){ return; }   // over the menu or a prompt, which come back to it
  if(same && onMain && !press){
    if(mode() === "ladder"){ drawLadder(); }
    else if(mode() === "panel"){ drawPanel(); }
    else if(mode() === "lap"){ drawLap(0); }
    else { drawInterval(); }
    return;
  }
  show();
};

NRF.on("disconnect", function(){ linked = false; });

g.clear();
Bangle.loadWidgets();
// the time of day, redrawn on the minute; after loadWidgets, which starts WIDGETS afresh
WIDGETS.mplogtime = {
  area : "tr",
  width : 48,
  draw : function(){
    var d = new Date();
    g.reset().clearRect(this.x, this.y, this.x + this.width - 1, this.y + 23);
    g.setFont("Vector", 18).setFontAlign(0, 0).drawString(("0" + d.getHours()).substr(-2) + ":" + ("0" + d.getMinutes()).substr(-2), this.x + this.width / 2, this.y + 12);
    if(this.next){ clearTimeout(this.next); }
    this.next = setTimeout(function(){ WIDGETS.mplogtime.draw(); }, 60000 - Date.now() % 60000);
  }
};

Bangle.drawWidgets();
setHeart();
show();
if(NRF.getSecurityStatus().connected){ tell({ t : "up" }); }
