/* Heart rate through a session, in the apps that log what was climbed, read by
   the watch (common/watch.js) while it is connected. Each reading and when each
   climb was ticked are kept beside the session under app.currentKey + "Heart",
   so a reload keeps them, but never saved to the log. Once there is a reading,
   a link beside Show recent logs draws them, with the heart rate zones for the age
   picked under the chart. log.js opens and forgets them with the session;
   ladder.js and the apps call heartTick() and heartUntick(). */

const heartAgeKey = "heartRateAge";
const heartAges = [20, 30, 40, 50, 60, 70];
// each zone's top, as a share of the age-predicted maximum of 220 less the age
const heartZones = [["Max", 1, "max"], ["Hard", 0.85, "hard"], ["Moderate", 0.7, "moderate"], ["Light", 0.5, "light"]];
const heartGap = 60000;   // ms without a reading that breaks the line

let heart = null;   // { id, beats : [[at, bpm]], ticks : [[at, key, label]] }, for the session open

overlays.push("heartRate");

function heartKey(){
    return app.currentKey + "Heart";
}

// as it happens only: a session reopened from the log was climbed some other time
function heartWanted(){
    return session !== null && !session.editing;
}

function openHeart(){
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(heartKey())); } catch(err){}
    heart = saved && saved.id === session.id ? saved : { "id" : session.id, "beats" : [], "ticks" : [] };
    drawHeartLink();
}

function forgetHeart(){
    heart = null;
    localStorage.removeItem(heartKey());
    drawHeartLink();
    closeOverlay("heartRate");
}

function keepHeart(){
    localStorage.setItem(heartKey(), JSON.stringify(heart));
    drawHeartLink();
    if(isOpen("heartRate")){ drawHeartChart(); }
}

// a climb, by what takes it back, and the label it has on the chart
function heartTick(key, label){
    if(!heartWanted() || heart === null){ return; }
    heart.ticks.push([Date.now(), key, label]);
    keepHeart();
}

function heartUntick(key){
    if(heart === null){ return; }
    let last = heart.ticks.map(tick => tick[1]).lastIndexOf(key);
    if(last === -1){ return; }
    heart.ticks.splice(last, 1);
    keepHeart();
}

/* {t:"hr", b, a} from the watch: the bpm, and how many seconds ago it was read,
   for one that waited there while the phone was away */
function heartBeat(message){
    let bpm = Number(message.b);
    let at = Date.now() - (Number(message.a) || 0) * 1000;
    if(!heartWanted() || heart === null || !(bpm > 0) || at < (session.start || session.id)){ return; }
    heart.beats.push([at, bpm]);
    if(heart.beats.length > 1 && heart.beats[heart.beats.length - 2][0] > at){ heart.beats.sort((a, b) => a[0] - b[0]); }
    keepHeart();
}

app.heart = { "wanted" : heartWanted, "receive" : heartBeat };

function drawHeartLink(){
    let link = document.getElementById("showHeartRate");
    if(link !== null){ link.hidden = !hasHeartRate(); }
}

function showHeartRate(){
    openOverlay("heartRate");
    drawHeartChart();
    if(typeof gtag === "function"){ gtag("event", "heart_rate_viewed", { "app" : document.title }); }
}

function hideHeartRate(){
    closeOverlay("heartRate");
}

function hasHeartRate(){
    return heart !== null && heart.beats.length > 0;
}

// The chart as a PNG on the overlay's black - see svgImage() in common/charts.js
async function shareHeartRate(){
    let svg = document.querySelector("#heartChart svg");
    let image = svg === null ? null : await svgImage(svg);
    if(image === null){ return; }
    const pad = 16, scale = 2;
    let canvas = document.createElement("canvas");
    canvas.width = (image.width + pad * 2) * scale;
    canvas.height = (image.height + pad * 2) * scale;
    let pen = canvas.getContext("2d");
    pen.scale(scale, scale);
    pen.fillStyle = "#000";
    pen.fillRect(0, 0, image.width + pad * 2, image.height + pad * 2);
    pen.drawImage(image, pad, pad, image.width, image.height);
    shareImage(canvas, `heart-rate-${session === null ? today() : session.date}.png`, "heart_rate_shared");
}

function heartAge(){
    let age = Number(localStorage.getItem(heartAgeKey));
    return heartAges.includes(age) ? age : null;
}

function setHeartAge(input){
    localStorage.setItem(heartAgeKey, input.value);
    drawHeartChart();
    if(typeof drawSummary === "function"){ drawSummary(); }   // common/summary.js draws it too
}

// minutes in as 5m, 1h or 1h30
function heartElapsed(minutes){
    if(minutes < 60){ return minutes + "m"; }
    let rest = minutes % 60;
    return Math.floor(minutes / 60) + "h" + (rest === 0 ? "" : String(rest).padStart(2, "0"));
}

function drawHeartChart(){
    let holder = document.getElementById("heartChart");
    if(holder === null || !hasHeartRate()){ return; }
    holder.innerHTML = heartChartSvg(Math.round(holder.clientWidth) || 320);
}

/* The chart, here and in the summary (common/summary.js), drawn at the width it
   is shown at, as the progress charts are, so its labels stay 11px. "" with no
   readings. A session's start is its id where it keeps no start of its own. */
function heartChartSvg(width){
    if(!hasHeartRate()){ return ""; }
    const height = 240;
    const left = 30, right = 78, top = 10, bottom = 22;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;

    let age = heartAge();
    let zones = age === null ? [] : heartZones.map(([name, share, cls]) => [name, Math.round((220 - age) * share), cls]);
    let bpms = heart.beats.map(beat => beat[1]).concat(zones.map(zone => zone[1]));
    let step = Math.max(...bpms) - Math.min(...bpms) > 80 ? 20 : 10;
    let low = Math.max(0, Math.floor((Math.min(...bpms) - 5) / step) * step);
    let high = Math.ceil((Math.max(...bpms) + 5) / step) * step;
    let yOf = bpm => top + plotHeight - (bpm - low) / (high - low) * plotHeight;

    let start = Math.min(session.start || session.id, heart.beats[0][0]);
    let end = Math.max(heart.beats[heart.beats.length - 1][0], session.finish || Date.now(), start + 60000);
    let xOf = at => left + (at - start) / (end - start) * plotWidth;

    let svg = `<svg class="heart-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Heart rate through the session">`;
    for(let bpm = low; bpm <= high; bpm += step){
        let y = yOf(bpm);
        svg += `<line class="${bpm === low ? "axis" : "grid"}" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}" />`
            + `<text x="${left - 5}" y="${y + 4}" text-anchor="end">${bpm}</text>`;
    }

    // a label about every 60px, on a round number of minutes
    let minutes = (end - start) / 60000;
    let every = [1, 2, 5, 10, 15, 30, 60, 120].find(each => minutes / each <= plotWidth / 60) || 240;
    for(let minute = 0; minute <= minutes; minute += every){
        svg += `<text x="${xOf(start + minute * 60000)}" y="${height - 6}" text-anchor="middle">${heartElapsed(minute)}</text>`;
    }

    zones.forEach(([name, bpm, cls]) => {
        let y = yOf(bpm);
        svg += `<line class="zone zone-${cls}" x1="${left}" x2="${left + plotWidth}" y1="${y}" y2="${y}" />`
            + `<text class="zone-label zone-${cls}" x="${left + plotWidth + 4}" y="${y + 4}">${name} ${bpm}</text>`;
    });

    heart.ticks.forEach(([at, key, label]) => {
        let x = xOf(at);
        let y = top + plotHeight - 4;
        svg += `<line class="climb" x1="${x}" x2="${x}" y1="${top}" y2="${top + plotHeight}" />`
            + `<text class="climb-label" x="${x - 3}" y="${y}" transform="rotate(-90 ${x - 3} ${y})">${escapeHtml(String(label))}</text>`;
    });

    // a line a stretch the watch was connected
    let runs = [[]];
    heart.beats.forEach((beat, index) => {
        if(index > 0 && beat[0] - heart.beats[index - 1][0] > heartGap){ runs.push([]); }
        runs[runs.length - 1].push(`${xOf(beat[0]).toFixed(1)},${yOf(beat[1]).toFixed(1)}`);
    });
    svg += runs.map(run => `<polyline class="beats" points="${run.join(" ")}" />`).join("");

    return svg + `</svg>`;
}

function drawHeartMarkup(){
    // to the right of Show recent logs, whose list moves out under the pair
    let recent = document.getElementById("recentDetails");
    if(recent === null){ return; }
    let links = document.createElement("div");
    links.className = "session-links";
    recent.before(links);
    links.append(recent);
    links.insertAdjacentHTML("beforeend",
        `<button type="button" class="link-button heart-link" id="showHeartRate" data-action="showHeartRate" hidden>Show heart rate</button>`);
    links.append(document.getElementById("recentLogs"));
    let age = heartAge();
    document.body.insertAdjacentHTML("beforeend", `
        <aside id="heartRate" class="overlay">
            <h2>Heart rate</h2>
            <div class="heart-chart-holder" id="heartChart"></div>
            <p class="heart-note">Heart rate data not saved to log. Take a screenshot, or <button type="button" class="link-button heart-share" id="shareHeartRate" data-action="shareHeartRate"><i class="demo-icon icon-share"></i>share it (even with yourself).</button></p>
            <fieldset class="setting-group">
                <legend>Age:</legend>
                <div class="picker heart-ages" role="radiogroup" aria-label="Age">
                    ${heartAges.map(each => `<input type="radio" name="heartAge" class="nice-radios" id="heartAge-${each}" value="${each}" data-change="setHeartAge"${each === age ? " checked" : ""} />
                    <label for="heartAge-${each}">${each}</label>`).join("")}
                </div>
            </fieldset>
            <button type="button" class="icon-button close" data-action="hideHeartRate" aria-label="Close heart rate"></button>
        </aside>`);
    new ResizeObserver(() => { if(isOpen("heartRate")){ drawHeartChart(); } }).observe(document.getElementById("heartChart"));
    // log.js, loaded first, has already picked a session back up
    drawHeartLink();
}

document.addEventListener("DOMContentLoaded", drawHeartMarkup);
