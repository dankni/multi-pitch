/* Tindeq Arcade: run, and hold a pull to climb the walls - on a Tindeq Progressor
   (progressor.js), or holding the screen or the space bar. A pull close to a
   wall leaps the runner onto it, and holding it climbs; further out, a pull
   just jumps - on a Progressor, one of coinKg or more. Reach a wall without a
   pull, or let go on it, and you fall. A wall is its seconds of climbing high,
   so it wants that long a pull - and, on a Progressor, its own kg, which leans
   it: a slab for the lightest, overhanging at the max pull. At the top the
   runner runs on, a wall higher. The score is the metres climbed, as they are
   climbed, and a point a coin jumped for. Distances are in metres and times in
   seconds; the course scrolls past a runner who stays put on screen. */

const app = { "logKey" : "gapsLog" };
const maxPullKey = "gapsMaxPull";
const climberKey = "gapsClimber";
const previewSize = [48, 64];   // px, as .climber-preview in style.css
const defaultMaxPull = 20;
const leastKg = 2;           // the lightest pull a wall asks for

const runSpeed = 3;          // m/s
const climbSpeed = runSpeed; // so a wall is as high as its seconds would run
const shortestPull = 3;
const longestPull = 10;
// The ground is set out in seconds of running, so the speed changes the metres, not the timing
const firstRunIn = 5 * runSpeed;     // before the first wall
const longestRest = 8 * runSpeed;    // between walls,
const shortestRest = 3 * runSpeed;   // shrinking by restStep a wall topped
const restStep = 0.5 * runSpeed;
const leapReach = 0.6;       // how near a wall a pull leaps onto it
const coinKg = 5;            // on a Progressor, the least pull that jumps - high enough for a coin
const coinHeight = 2.1;      // metres up from the ground, over the runner's head
const coinSize = 0.6;
const coinReach = 0.45;      // how near the runner's middle, along, a coin is taken
const jumpSpeed = 4.5;       // m/s up, off the ground
const jumpFall = 14;         // m/s², bringing a jump back down
const handRise = 1;          // how far above the feet the hands hold the wall
const mostSlant = 0.15 * 90; // degrees off vertical: a slab for the lightest pull, overhanging for the max
const dipGrace = 0.25;       // seconds under a wall's kg before it counts as letting go
const warnAhead = 2 * runSpeed;      // before a wall to say pull, if not yet
const fallAccel = 20;        // m/s², a quicker fall than gravity's
const fallSeconds = 1;       // at the least, from letting go to it being over
const lieSeconds = 0.4;      // on the ground after a long fall
const stepMs = 20;           // the most time one update covers

/* What's on screen, in metres: the course fills the space between the navs.
   18 across, or more on a wide screen so the runner never gets huge - but no
   more than 20 high, so on a tall phone it zooms in instead */
const leastView = 18;
const mostScale = 60;        // px a metre
const mostHigh = 20;
let viewWidth = leastView;
const runnerShare = 0.3;     // of the way across, the runner's hands
let runnerAt = runnerShare * viewWidth;
const feetLine = 0.72;       // the runner's feet, down the canvas
const runnerHeight = 1.6;
const handsAhead = 0.5;      // from the runner's middle, so on a wall it hangs off its hands
const wallHug = 0.32;        // from the runner's middle to the face climbing, so the feet touch it
const runStride = 1.2;       // metres a running cycle
const climbStride = 0.8;
const topOutRun = 0.3;       // stepping up onto the top, past its edge

let game = null;
let holding = false;         // the screen or the space bar
let maxPull = defaultMaxPull;
let lastFrame = Date.now();

app.logView = {
    "key" : app.logKey,
    "describe" : entry => ({ "title" : points(entryScore(entry)) + (entry.input === "tindeq" ? tindeqMark : ""), "detail" : "" }),
    "unrated" : true,
    // the rest of a run behind the note button
    "comment" : entry => joinDetail([plural(entry.walls ?? entry.gaps, "wall"), entry.coins ? plural(entry.coins, "coin") : "",
                                     Math.round(Number(entry.seconds ?? entry.metres) || 0) + " s of pull",
                                     entry.input !== "tindeq" ? "held the screen" : entry.peakKg !== undefined ? "max pull " + entry.peakKg + " kg" : "Progressor"]),
    "stats" : log => sessionCount(log) + " · Highscore " + points(bestScore())
};

// The score, just a number
function points(value){
    return String(Math.round(value));
}

const roundKg = kg => Math.round(kg * 10) / 10;

/* Runs from before the score was kept have their seconds of pull - or "metres"
   at 1 m/s, the same number - which climb at climbSpeed */
function entryScore(entry){
    return typeof entry.score === "number" ? entry.score : (Number(entry.seconds ?? entry.metres) || 0) * climbSpeed;
}

// Metres climbed so far, the highest the feet have been, and a point a coin
function currentScore(){
    return Math.round(game.high) + game.collected;
}

function bestScore(){
    return getLog(app.logKey).reduce((best, entry) => Math.max(best, entryScore(entry)), 0);
}

/* ================= The course ================= */

function newGame(){
    game = {
        "state" : "ready",   // ready, running, climbing, falling or over
        "x" : 0,             // how far the runner's hands have come
        "y" : 0,             // how high its feet are
        "walls" : [],
        "next" : 0,          // the wall ahead, or the one being climbed
        "cleared" : 0,
        "seconds" : 0,       // of pull, up the walls topped
        "fallen" : 0,        // seconds into a fall
        "speed" : 0,         // of the fall
        "landed" : null,     // seconds into the fall it hit the ground
        "cause" : "",        // of the fall: "wall" ran into one, "off" let go of one
        "onWall" : false,    // climbing with hands on it, not still leaping
        "high" : 0,          // the highest the feet have climbed
        "coins" : [],        // along the ground, to jump for
        "collected" : 0,
        "shown" : 0,         // the score on screen
        "wasJumping" : false,
        "air" : 0,           // how high a jump has the feet off the ground
        "airSpeed" : 0,
        "low" : 0,           // seconds the pull has been under the wall's kg
        "best" : bestScore(),
        "beaten" : false,
        "peakKg" : 0,        // the most the Progressor read in the run
        "input" : progressor.connected ? "tindeq" : "tap"
    };
    extendCourse();
}

function restBefore(wallNumber){
    return Math.max(shortestRest, longestRest - wallNumber * restStep);
}

/* Walls out to two screens ahead, each standing on the top of the one before.
   edge is where a wall's face meets the ground and topEdge where it meets its
   top: past edge on a slab, short of it overhanging. */
function extendCourse(){
    while(game.walls.length === 0 || game.walls[game.walls.length - 1].edge < game.x + viewWidth * 2){
        let count = game.walls.length;
        let last = game.walls[count - 1];
        let seconds = shortestPull + Math.floor(Math.random() * (longestPull - shortestPull + 1));
        let edge = (last ? last.topEdge : 0) + (count === 0 ? firstRunIn : restBefore(count));
        let base = last ? last.top : 0;
        let height = seconds * climbSpeed;
        let kg = wallKg();
        let slant = wallSlant(kg);
        let slope = Math.tan(slant * Math.PI / 180);
        game.walls.push({ "edge" : edge, "topEdge" : edge + height * slope, "base" : base, "top" : base + height,
                          "seconds" : seconds, "kg" : kg, "slant" : slant, "slope" : slope });
        placeCoins((last ? last.topEdge : 0) + 6, edge - 8, base);
    }
}

// On the way to a wall, clear of both ends: half the time a coin, a tenth two
// in a row and a tenth three, and the rest none
function placeCoins(from, to, ground){
    let chance = Math.random();
    let count = chance < 0.5 ? 1 : chance < 0.6 ? 2 : chance < 0.7 ? 3 : 0;
    if(to <= from || count === 0){ return; }
    let start = from + Math.random() * Math.max(0, to - from - (count - 1));
    for(let n = 0; n < count; n++){
        game.coins.push({ "x" : start + n, "y" : ground + coinHeight, "taken" : false });
    }
}

// Where a wall's face is at a height, kept to the wall
function faceAt(wall, up){
    let rise = Math.min(wall.top, Math.max(wall.base, up)) - wall.base;
    return wall.edge + rise * wall.slope + undulation(wall, rise);
}

// A face that comes and goes a little, flat into the ground and the top
function undulation(wall, rise){
    let fade = Math.sin(Math.PI * rise / (wall.top - wall.base)) ** 2;
    return fade * (0.09 * Math.sin(rise * 0.9 + wall.edge) + 0.04 * Math.sin(rise * 2.3 + wall.edge * 1.7));
}

const spanEnd = wall => Math.max(wall.edge, wall.topEdge);

// The ground's height at a distance along, clear of any wall's face
function groundAt(at){
    let level = 0;
    game.walls.forEach(wall => { if(spanEnd(wall) <= at){ level = wall.top; } });
    return level;
}

// The lightest pull leans back, the max pull leans out, in between in step
function wallSlant(kg){
    let share = maxPull > leastKg ? (kg - leastKg) / (maxPull - leastKg) : 0.5;
    return mostSlant * (1 - 2 * share);
}

/* Between leastKg and the max pull, mostly near half of it: three randoms
   averaged make a bell around the middle */
function wallKg(){
    let bell = (Math.random() + Math.random() + Math.random()) / 3;
    return Math.round(Math.min(maxPull, Math.max(leastKg, maxPull * bell)));
}

// The kg that counts as pulling: the wall ahead's, or the one being climbed
function needKg(){
    return game.walls[game.next].kg;
}

function pulling(){
    return holding || (progressor.connected && progressor.kg >= needKg());
}

// On the ground, away from a wall, the pull that jumps
function jumping(){
    return holding || (progressor.connected && progressor.kg >= coinKg);
}

/* ================= Each step ================= */

function update(seconds, pull){
    if(game.state === "falling"){
        fallStep(seconds);
        return;
    }
    if(!["running", "climbing"].includes(game.state)){ return; }

    let wall = game.walls[game.next];
    let jump = jumping();
    let started = jump && !game.wasJumping;
    game.wasJumping = jump;
    if(game.state === "climbing"){
        game.y += climbSpeed * seconds;
        game.high = Math.max(game.high, game.y);
    }
    if(game.airSpeed !== 0){
        game.air += game.airSpeed * seconds;
        game.airSpeed -= jumpFall * seconds;
        if(game.air <= 0){ land(); }
    }
    // a leap carries the hands on to the wall; on it, they follow its face
    let hold = faceAt(wall, game.y + game.air + handRise);
    game.x = game.onWall ? hold : Math.min(hold, game.x + runSpeed * seconds);
    if(game.state === "running"){
        if(pull && hold - game.x <= leapReach){
            game.state = "climbing";
            game.y += game.air;
            land();
            game.low = 0;
        } else if(game.x >= hold){
            fall("wall");
            return;
        } else if(started && game.air === 0){
            game.airSpeed = jumpSpeed;
        }
        takeCoins();
    }
    if(game.state === "climbing"){
        game.onWall = game.onWall || game.x >= hold;
        if(game.y >= wall.top){
            game.y = wall.top;
            game.x = wall.topEdge;
            game.state = "running";
            game.onWall = false;
            clear(wall);
            return;
        }
        // a moment under the kg on a Progressor is a wobble; any longer and it's letting go
        game.low = pull ? 0 : game.low + seconds;
        if(game.low > 0 && game.low >= (progressor.connected ? dipGrace : 0)){
            fall("off");
        }
    }
}

function clear(wall){
    game.cleared++;
    game.seconds += wall.seconds;
    game.next++;
    extendCourse();
    ping();
}

// Any coin the runner's body is up against
function takeCoins(){
    let middle = game.x - handsAhead;
    let feet = game.y + game.air;
    game.coins.forEach(coin => {
        if(coin.taken || Math.abs(coin.x - middle) > coinReach){ return; }
        if(feet + runnerHeight >= coin.y - coinSize / 2 && feet <= coin.y){
            coin.taken = true;
            game.collected++;
            ping();
        }
    });
}

// The score on screen as it changes, and a word the moment it beats the best
function checkScore(){
    let score = currentScore();
    if(score !== game.shown){
        game.shown = score;
        showScore();
    }
    if(!game.beaten && game.best > 0 && score > game.best){
        game.beaten = true;
        toast("New high score");
    }
}

function land(){
    game.air = 0;
    game.airSpeed = 0;
}

function fall(cause){
    game.y += game.air;
    land();
    game.state = "falling";
    game.cause = cause;
    game.onWall = false;
    game.fallen = 0;
    game.speed = 0;
    game.landed = null;
}

// Down to the foot of the wall - sliding down a slab - then a moment lying there
function fallStep(seconds){
    let wall = game.walls[game.next];
    let floor = wall.base;
    game.fallen += seconds;
    game.speed += fallAccel * seconds;
    game.y = Math.max(floor, game.y - game.speed * seconds);
    game.x = Math.min(game.x, faceAt(wall, game.y + handRise));
    if(game.y === floor && game.landed === null){ game.landed = game.fallen; }
    if(game.landed !== null && game.fallen >= Math.max(fallSeconds, game.landed + lieSeconds)){ endGame(); }
}

/* ================= Start and finish ================= */

function startGame(){
    unlockAudio();
    requestWakeLock();
    newGame();
    game.state = "running";
    lastFrame = Date.now();
    showScore();
    showState("running");
}

function endGame(){
    game.state = "over";
    releaseWakeLock();
    let best = bestScore();
    let score = currentScore();
    // a run that climbed nothing isn't worth a line in the log
    if(score > 0){
        saveToLog(app.logKey, { "id" : Date.now(), "date" : today(), "score" : score, "seconds" : game.seconds,
                                "walls" : game.cleared, "coins" : game.collected, "input" : game.input, "maxPull" : maxPull,
                                ...(game.input === "tindeq" ? { "peakKg" : roundKg(game.peakKg) } : {}) });
        drawSessionLog(app.logView);
    }
    document.getElementById("overTitle").innerText = game.cause === "wall" ? "You ran into the wall" : "You fell off";
    document.getElementById("overScore").innerText = "Score " + points(score) + (score > best ? " - a new high score" : "");
    let peak = document.getElementById("overPull");
    peak.hidden = game.input !== "tindeq";
    peak.innerText = "Max pull " + roundKg(game.peakKg) + " kg";
    document.getElementById("primaryButton").innerHTML = '<i class="demo-icon icon-ccw"></i>PLAY AGAIN';
    showScore();
    showState("over");
}

function showScore(){
    let score = currentScore();
    document.getElementById("score").innerText = points(score);
    let best = Math.max(game.best, score);
    document.getElementById("best").innerText = best > 0 ? "High score " + points(best) : "";
}

/* ================= Drawing ================= */

const canvas = () => document.getElementById("course");

// Resizing wipes a canvas, so it's drawn again straight away. CSS sizes it.
function sizeCanvas(){
    let board = canvas();
    let ratio = window.devicePixelRatio || 1;
    let scale = Math.max(Math.min(board.clientWidth / leastView, mostScale), board.clientHeight / mostHigh);
    viewWidth = board.clientWidth / scale;
    runnerAt = runnerShare * viewWidth;
    extendCourse();
    board.width = Math.round(board.clientWidth * ratio);
    board.height = Math.round(board.clientHeight * ratio);
    draw();
}

/* The scenery, from Kenney's Platformer Pack Remastered (CC0, kenney.nl): the
   earth and grass the ground is made of, rocks, tufts and mushrooms along it, the coins and the flag */
const art = {};
["earth", "rock", "grass", "mushroom-brown", "mushroom-red", "flag-down", "flag-1", "flag-2", "coin"].forEach(name => {
    art[name] = new Image();
    art[name].src = "/training/gaps/img/" + name + ".png";
});
const drawn = image => image.complete && image.naturalWidth > 0;
const earthTile = 1.5;       // metres across the earth's pattern
const grassDepth = 0.22;     // metres of grass on the ground
const sceneryStep = 3;       // metres between places a rock or a tuft might be
const skyDrift = 0.2;        // how fast the sky moves past, to the ground

// The same for a place every time it comes into view
const scatter = n => {
    let wobble = Math.sin(n * 127.1) * 43758.5453;
    return wobble - Math.floor(wobble);
};

function draw(){
    let board = canvas();
    let danger = "#e34948";   // --band-hard's light red
    let ratio = window.devicePixelRatio || 1;
    let width = board.width / ratio;
    let height = board.height / ratio;
    let scale = width / viewWidth;   // px a metre
    let left = game.x - runnerAt;
    let right = left + viewWidth;
    // the view follows the runner up and down
    let screenX = at => (at - left) * scale;
    let screenY = up => height * feetLine - (up - game.y) * scale;

    // the sky behind, the hills in it sinking a little as the runner climbs
    board.parentElement.style.backgroundPosition = Math.round(-left * scale * skyDrift) + "px calc(100% + "
        + Math.round(Math.min(height * 0.4, game.y * scale * 0.05)) + "px)";

    let pen = board.getContext("2d");
    pen.setTransform(ratio, 0, 0, ratio, 0, 0);
    pen.clearRect(0, 0, width, height);

    // the ground, stepping up a wall at a time
    let inView = game.walls.filter(wall => spanEnd(wall) > left - 1 && Math.min(wall.edge, wall.topEdge) < right + 1);
    let from = Math.min(left - 1, ...inView.map(wall => Math.min(wall.edge, wall.topEdge) - 1));
    let to = Math.max(right + 1, ...inView.map(wall => spanEnd(wall) + 1));
    let faces = inView.map(wall => {
        let points = [];
        for(let rise = 0; rise < wall.top - wall.base; rise += 0.25){ points.push([faceAt(wall, wall.base + rise), wall.base + rise]); }
        points.push([wall.topEdge, wall.top]);
        return points;
    });
    let outline = [[from, groundAt(from)], ...faces.flat(), [to, groundAt(to)]];
    let flats = [];
    let flatFrom = from;
    inView.forEach(wall => {
        flats.push([flatFrom, wall.edge, wall.base]);
        flatFrom = wall.topEdge;
    });
    flats.push([flatFrom, to, groundAt(to)]);

    pen.beginPath();
    outline.forEach(([at, up]) => pen.lineTo(screenX(at), screenY(up)));
    pen.lineTo(screenX(to), Math.max(height, screenY(0)) + 1);
    pen.lineTo(screenX(from), Math.max(height, screenY(0)) + 1);
    pen.fillStyle = "#c49262";
    if(drawn(art.earth)){
        let earth = pen.createPattern(art.earth, "repeat");
        let size = earthTile * scale / art.earth.naturalWidth;
        earth.setTransform(new DOMMatrix([size, 0, 0, size, screenX(0), screenY(0)]));
        pen.fillStyle = earth;
    }
    pen.fill();
    pen.strokeStyle = "#a0703f";
    pen.lineWidth = 2;
    faces.forEach(points => {
        pen.beginPath();
        points.forEach(([at, up]) => pen.lineTo(screenX(at), screenY(up)));
        pen.stroke();
    });
    flats.forEach(([fromAt, toAt, up]) => {
        pen.fillStyle = "#80be1f";
        pen.fillRect(screenX(fromAt), screenY(up), (toAt - fromAt) * scale, grassDepth * scale);
        pen.fillStyle = "#93db24";
        pen.fillRect(screenX(fromAt), screenY(up), (toAt - fromAt) * scale, Math.max(2, 0.04 * scale));
    });

    // now and then on the flat, a tuft of grass or a rock - and very now and then a mushroom
    for(let n = Math.floor((left - 1) / sceneryStep); n * sceneryStep < right + 1; n++){
        let chance = scatter(n);
        if(chance > 0.35){ continue; }
        let at = (n + chance) * sceneryStep;
        // clear of the walls; the first and last flats run on past the screen's edges, so scroll off them
        let flat = flats.find(([fromAt, toAt], i) => at > (i === 0 ? -Infinity : fromAt + 1.2) && at < (i === flats.length - 1 ? Infinity : toAt - 1.2));
        let image = chance < 0.02 ? art[n % 2 ? "mushroom-red" : "mushroom-brown"] : chance < 0.22 ? art.grass : art.rock;
        if(!flat || !drawn(image)){ continue; }
        let size = (image === art.rock || image === art.grass ? (image === art.rock ? 1.2 : 1) : 1.3) * scale;
        pen.drawImage(image, screenX(at) - size / 2, screenY(flat[2]) - size + 0.06 * scale, size, size);
    }

    // on each wall low down, a plaque with its height and the kg it wants, at its lean
    let plaque = Math.max(plaqueSize * scale, plaqueLeast);
    inView.forEach(wall => {
        let middle = wall.base + plaqueUp + plaque / scale / 2;
        let x = screenX(faceAt(wall, middle) + plaqueIn) + plaque / 2;
        drawPlaque(pen, x, screenY(middle), plaque, wall.slant, Math.round(wall.top - wall.base) + " m", wall.kg + " kg");
    });

    // the coins still to take, bobbing - each the middle 64px of its image
    if(drawn(art.coin)){
        let size = coinSize * scale;
        game.coins.forEach(coin => {
            if(coin.taken || coin.x < left - 1 || coin.x > right + 1){ return; }
            let bob = Math.sin(Date.now() / 300 + coin.x) * 0.05 * scale;
            pen.drawImage(art.coin, 32, 32, 64, 64, screenX(coin.x) - size / 2, screenY(coin.y) - size / 2 + bob, size, size);
        });
    }

    // limp until the runner goes past it, then flying
    let flag = bestFlagAt();
    if(flag && flag.topEdge > left - 2 && flag.topEdge < right + 1){
        let pole = flag.topEdge + flagBack;
        let flying = game.x >= pole && game.next > game.walls.indexOf(flag);
        drawFlag(pen, screenX(pole), screenY(flag.top), scale, flying);
    }

    // on a wall the feet are on its face, the body leaning with it
    let wall = game.walls[game.next];
    let feet = screenY(game.y + game.air);
    let runnerX = game.onWall ? faceAt(wall, game.y) - wallHug : game.x - handsAhead;
    drawFigure(pen, screenX(runnerX), feet, runnerHeight * scale, runnerPose());

    // near a wall on the ground, a nudge
    if(game.state === "running" && wall.edge - game.x <= warnAhead && !pulling()){
        arcadeText(pen, "Pull!", screenX(runnerX), feet - runnerHeight * scale - 12, danger);
    }
}

const plaqueSize = 1.3;       // metres square
const plaqueLeast = 66;       // px, room for its words on a phone
const plaqueUp = 0.6;         // metres off the ground
const plaqueIn = 0.4;         // metres in from the face
const plaqueWood = "#ae7640"; // the colours of the pack's own signs
const plaqueEdge = "#7d522b";

// A square of wood fixed on at the corners, tilted with the wall
function drawPlaque(pen, x, y, size, slant, line, second){
    let half = size / 2;
    let nail = Math.max(2, size * 0.05);
    pen.save();
    pen.translate(x, y);
    pen.rotate(slant * Math.PI / 180);
    pen.fillStyle = plaqueWood;
    pen.strokeStyle = plaqueEdge;
    pen.lineWidth = 3;
    pen.beginPath();
    pen.roundRect(-half, -half, size, size, size * 0.08);
    pen.fill();
    pen.stroke();
    pen.fillStyle = plaqueEdge;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([across, down]) => {
        pen.beginPath();
        pen.arc(across * (half - nail * 2.2), down * (half - nail * 2.2), nail, 0, Math.PI * 2);
        pen.fill();
    });
    arcadeText(pen, line, 0, -10, "#fff");
    arcadeText(pen, second, 0, 10, "#fff");
    pen.restore();
}

// Upper case, blocky and outlined, like the score over the course
function arcadeText(pen, text, x, y, colour){
    pen.save();
    pen.font = "bold 16px ui-monospace, Menlo, Consolas, 'Roboto Mono', 'DejaVu Sans Mono', monospace";
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.lineJoin = "round";   // a sharp join spikes off the point of an M
    pen.lineWidth = 4;
    pen.strokeStyle = "#1d2b53";
    pen.strokeText(text.toUpperCase(), x, y);
    pen.fillStyle = colour;
    pen.fillText(text.toUpperCase(), x, y);
    pen.restore();
}

// Where this device's best would be beaten, coins aside: the top of the wall that climbs past it
function bestFlagAt(){
    if(game.best <= 0){ return null; }
    return game.walls.find(wall => wall.top > game.best) ?? null;
}

const flagBack = 0.6;        // metres back from the top's edge
const flagTall = 1.4;
const flagFlap = 300;        // ms each way of the flag flying

// The pole is down the left of each flag image
function drawFlag(pen, x, ground, scale, flying){
    let image = !flying ? art["flag-down"] : Math.floor(Date.now() / flagFlap) % 2 ? art["flag-2"] : art["flag-1"];
    if(!drawn(image)){ return; }
    let size = flagTall * scale;
    pen.drawImage(image, x - size * 0.07, ground - size, size, size);
}

/* ================= The runner's poses =================
   For figure.js: running and climbing go round in cycles, by the distance
   covered so the legs keep pace with the ground. */

const wave = phase => Math.sin(phase * 2 * Math.PI);

function runnerPose(){
    let wall = game.walls[game.next];
    let last = game.walls[game.next - 1];
    if(game.state === "climbing"){
        return game.onWall ? { ...climbPose(game.y / climbStride), "lean" : wall.slant } : leapPose();
    }
    if(game.state === "falling" || (game.state === "over" && game.cause)){
        return fallPose(game.fallen);
    }
    if(game.state === "running" && game.air > 0){
        return jumpPose();
    }
    if(game.state === "running"){
        return last && game.x < last.topEdge + topOutRun ? topOutPose() : runPose(game.x / runStride);
    }
    return standPose;
}

const standPose = { "armNear" : 8, "armFar" : -8, "legNear" : 0, "legFar" : 0 };

function runPose(phase){
    let swing = wave(phase);
    return { "tilt" : 8, "spread" : 0.8, "bob" : 3 * (1 - Math.abs(swing)), "armNear" : 35 * swing, "armFar" : -35 * swing,
             "legNear" : -40 * swing, "legFar" : 40 * swing };
}

function leapPose(){
    return { "tilt" : 10, "spread" : 0.5, "armsBack" : true, "armNear" : -125, "armFar" : -105, "legNear" : -50, "legFar" : 30, "face" : "talk" };
}

// Hand over hand, the feet stepping up under them
function climbPose(phase){
    let reach = wave(phase);
    return { "spread" : 0.35, "head" : -8, "face" : "talk", "armsBack" : true, "armNear" : -128 - 18 * reach, "armFar" : -128 + 18 * reach,
             "legNear" : -65 + 20 * reach, "legFar" : -65 - 20 * reach };
}

function jumpPose(){
    return { "tilt" : 5, "armsBack" : true, "armNear" : -150, "armFar" : -130, "legNear" : -60, "legFar" : 25, "face" : "talk" };
}

// A knee up over the edge
function topOutPose(){
    return { "tilt" : 15, "spread" : 0.5, "armNear" : -60, "armFar" : -40, "legNear" : -80, "legFar" : 20, "face" : "talk" };
}

// Tipping over backwards, onto the ground
function fallPose(seconds){
    return { "lean" : -Math.min(90, seconds * 200), "face" : "worried", "armsBack" : true, "armNear" : -170, "armFar" : -150, "legNear" : -30, "legFar" : 20 };
}

// The Progressor's reading out of the max pull, with a mark at what this wall wants
function showForce(){
    if(!progressor.connected){ return; }
    let kg = Math.max(0, progressor.kg);
    if(["running", "climbing"].includes(game.state)){ game.peakKg = Math.max(game.peakKg, kg); }
    let need = needKg();
    document.getElementById("forceFill").style.width = Math.min(100, kg / maxPull * 100) + "%";
    document.getElementById("forceFill").classList.toggle("over", kg >= need);
    document.getElementById("forceMark").style.left = Math.min(100, need / maxPull * 100) + "%";
    document.getElementById("forceText").innerText = kg.toFixed(1) + " / " + need + " kg";
    showDetail();
}

// Under the cog: which Progressor, its battery, and what it reads now
function showDetail(){
    let line = document.getElementById("progressorDetail");
    line.hidden = !progressor.connected;
    if(line.hidden){ return; }
    line.innerText = joinDetail([progressor.name,
        progressor.batteryMv === null ? "" : "battery " + (progressor.batteryMv / 1000).toFixed(2) + " V",
        "reading " + Math.max(0, progressor.kg).toFixed(1) + " kg"]);
}

/* ================= The loop =================
   Time comes from Date.now() and is cut into steps of at most stepMs, so the
   game runs the same at any frame rate - and a test's cy.tick() can drive it. */
function frame(){
    let now = Date.now();
    let elapsed = now - lastFrame;
    lastFrame = now;
    while(elapsed > 0){
        let slice = Math.min(stepMs, elapsed);
        update(slice / 1000, pulling());
        elapsed -= slice;
    }
    if(game.state !== "ready"){ checkScore(); }
    draw();
    requestAnimationFrame(frame);
}

/* ================= Input ================= */

function hold(down){
    holding = down;
}

function bindHolding(){
    let board = canvas();
    board.addEventListener("pointerdown", event => {
        event.preventDefault();
        hold(true);
    });
    ["pointerup", "pointercancel"].forEach(name => window.addEventListener(name, () => hold(false)));
    board.addEventListener("contextmenu", event => event.preventDefault());   // a long press
    document.addEventListener("keydown", event => {
        if(event.code !== "Space" || (event.target.closest && event.target.closest("input, button, textarea"))){ return; }
        event.preventDefault();   // no scrolling
        if(!event.repeat){ hold(true); }
    });
    document.addEventListener("keyup", event => {
        if(event.code === "Space"){ hold(false); }
    });
}

// The phone's own share sheet, or the words copied where there isn't one
function shareScore(){
    let text = "I scored " + points(currentScore()) + " on Tindeq Arcade";
    let url = location.origin + "/training/gaps/";
    if(navigator.share){
        navigator.share({ "title" : "Tindeq Arcade", "text" : text, "url" : url }).catch(() => {});
    } else if(navigator.clipboard){
        navigator.clipboard.writeText(text + " " + url).then(() => toast("Copied, ready to paste"), () => toast("Couldn't copy it"));
    }
}

/* ================= Maximised =================
   No navs, the game the whole page - and the whole screen too where the browser
   allows it, so a phone loses its address bar. Leaving full screen some other
   way (Esc, the back gesture) keeps the navs hidden until the button is tapped. */
function toggleMaximise(button){
    let maximised = document.documentElement.classList.toggle("maximised");
    button.classList.toggle("icon-resize-full", !maximised);
    button.classList.toggle("icon-resize-normal", maximised);
    button.setAttribute("aria-label", maximised ? "Show the navigation again" : "Fill the screen with the game");
    try {
        if(maximised && !document.fullscreenElement && document.documentElement.requestFullscreen){
            document.documentElement.requestFullscreen().catch(() => {});
        } else if(!maximised && document.fullscreenElement){
            document.exitFullscreen().catch(() => {});
        }
    } catch(error){}
}

/* ================= The Progressor ================= */

function connectProgressor(){
    progressor.connect();
}

function disconnectProgressor(){
    progressor.disconnect();
}

function tareProgressor(){
    progressor.tare();
    toast("Zeroed");
}

const statusWords = { "off" : "Not connected", "connecting" : "Connecting…", "connected" : "Connected" };

function showConnection(){
    let connected = progressor.connected;
    let status = progressor.supported ? progressor.status : "off";
    document.getElementById("connect").hidden = !progressor.supported || status !== "off";
    document.getElementById("noBluetooth").hidden = progressor.supported;
    document.getElementById("force").hidden = !connected;

    // the setup under the cog
    document.getElementById("progressorStatus").dataset.status = status;
    document.getElementById("progressorStatusText").innerText = progressor.supported ? statusWords[status] : "Can't connect in this browser";
    let settingsConnect = document.getElementById("settingsConnect");
    settingsConnect.hidden = !progressor.supported || connected;
    settingsConnect.disabled = status === "connecting";
    document.getElementById("disconnect").hidden = !connected;
    document.getElementById("tare").hidden = !connected;
    document.getElementById("progressorSteps").hidden = !progressor.supported || connected;
    document.getElementById("progressorTips").hidden = !progressor.supported || connected;
    document.getElementById("noBluetoothSettings").hidden = progressor.supported;
    let error = document.getElementById("progressorError");
    error.hidden = progressor.error === "" || connected;
    error.innerText = "Couldn't connect: " + progressor.error;
    showDetail();

    document.getElementById("pullHint").innerText = connected
        ? "Pull each wall's kg on the Progressor to climb it"
        : "Hold the screen or the space bar to pull";
}

// Chrome can say whether the phone's Bluetooth is on at all
function showBluetoothOff(){
    if(!progressor.supported || typeof navigator.bluetooth.getAvailability !== "function"){ return; }
    navigator.bluetooth.getAvailability().then(available => {
        document.getElementById("bluetoothOff").hidden = available;
    }).catch(() => {});
}

// Off while the page is hidden, to spare its battery
document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "hidden"){
        progressor.stop();
    } else {
        lastFrame = Date.now();   // no catching up on time spent away
        progressor.start();
    }
});

/* ================= Settings ================= */

// The girl or the boy, in figure.js; each drawn standing on its chip under the cog
function loadClimber(){
    figureKind = localStorage.getItem(climberKey) === "boy" ? "boy" : "girl";
    document.getElementById("climber-" + figureKind).checked = true;
    // drawn while the settings are hidden, so at style.css's size rather than a measured one
    document.querySelectorAll(".climber-preview").forEach(preview => {
        let ratio = window.devicePixelRatio || 1;
        preview.width = Math.round(previewSize[0] * ratio);
        preview.height = Math.round(previewSize[1] * ratio);
        let pen = preview.getContext("2d");
        pen.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawFigure(pen, previewSize[0] / 2, previewSize[1] - 2, previewSize[1] - 6, standPose, preview.dataset.figure);
    });
}

function setClimber(input){
    figureKind = input.value;
    localStorage.setItem(climberKey, figureKind);
    draw();
}

// No lower than the lightest wall, so a wall can always be pulled
function loadMaxPull(){
    let saved = Number(localStorage.getItem(maxPullKey));
    maxPull = saved >= leastKg ? saved : defaultMaxPull;
    document.getElementById("maxPull").value = maxPull;
}

function setMaxPull(input){
    let value = Math.round(Number(input.value));
    maxPull = value >= leastKg ? Math.min(value, 200) : defaultMaxPull;
    input.value = maxPull;
    localStorage.setItem(maxPullKey, maxPull);
    // the course waiting to start is redrawn to the new max
    if(game.state === "ready"){
        newGame();
        draw();
    }
    showForce();
}

document.addEventListener("DOMContentLoaded", () => {
    loadMaxPull();
    loadClimber();
    progressor.onChange = showConnection;
    progressor.onWeight = showForce;
    showConnection();
    showBluetoothOff();
    if(!progressor.supported){
        toast(document.getElementById("noBluetoothToast"), null, true, true);
    }
    bindHolding();
    newGame();
    showScore();
    sizeCanvas();
    // its own size, not the window's: a scrollbar coming or going changes it too
    let sizedTo = "";
    new ResizeObserver(() => {
        let size = canvas().clientWidth + "x" + canvas().clientHeight;
        if(size !== sizedTo){
            sizedTo = size;
            sizeCanvas();
        }
    }).observe(canvas());
    drawSessionLog(app.logView);
    requestAnimationFrame(frame);
});
