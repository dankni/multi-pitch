/* Max pull: the most pulled with the left arm, the right, and on a max hang, one
   reading of each a day - the day's best. Typed in, or read off a Tindeq
   Progressor (gaps/progressor.js), where the pull on the arm picked fills its box
   whenever it beats what is there. A max hang is one figure, or body weight and
   the extra on top, as picked under the cog. Saved days are charted side by side,
   the arms against the left axis and the hang against the right; a day with
   nothing logged has no place on it. */

const app = { "logKey" : "maxPullLog" };
const splitKey = "maxPullSplitHang";
const chartDays = 14;
const traceSeconds = 10;

const kinds = {
    "left"  : { "name" : "Left arm",  "cls" : "pull-left",  "axis" : "left" },
    "right" : { "name" : "Right arm", "cls" : "pull-right", "axis" : "left" },
    "hang"  : { "name" : "Max hang",  "cls" : "pull-hang",  "axis" : "right" }
};

let trace = [];        // [{ at, kg }] for the last few seconds off the Progressor
let peaks = { "left" : 0, "right" : 0, "hang" : 0 };   // the most pulled on each since connecting
let traceFrame = null;

function splitHang(){
    return localStorage.getItem(splitKey) === "true";
}

function toggleSplitHang(input){
    localStorage.setItem(splitKey, input.checked);
    showSplit();
}

function showSplit(){
    document.body.toggleAttribute("data-split", splitHang());
}

/* The day's readings */

function readKg(id){
    let value = parseFloat(document.getElementById(id).value);
    return isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
}

function writeKg(id, value){
    document.getElementById(id).value = value === null || value === undefined ? "" : value;
}

// The hang as one figure: the total, or body and extra added up
function hangKg(){
    if(!splitHang()){ return readKg("pullHang"); }
    let body = readKg("pullBody"), extra = readKg("pullExtra");
    return body === null && extra === null ? null : Math.round(((body || 0) + (extra || 0)) * 10) / 10;
}

function showHangTotal(){
    let total = hangKg();
    document.getElementById("pullHangTotal").innerText = total === null ? "" : total + " kg";
}

function pullDate(){
    return document.getElementById("pullDate").value || today();
}

function dayEntry(date){
    return getLog(app.logKey).find(entry => entry.date === date) || null;
}

// The boxes show the day's saved readings, to add to or put right
function showDay(){
    let entry = dayEntry(pullDate()) || {};
    writeKg("pullLeft", entry.left);
    writeKg("pullRight", entry.right);
    writeKg("pullHang", entry.hang);
    writeKg("pullBody", entry.body);
    writeKg("pullExtra", entry.hang !== undefined && entry.body !== undefined ? Math.round((entry.hang - entry.body) * 10) / 10 : entry.hang);
    showHangTotal();
}

function setPullDate(){
    showDay();
}

function typedPull(field){
    if(field.id === "pullHang"){
        let total = readKg("pullHang");
        let body = readKg("pullBody");
        writeKg("pullExtra", total !== null && body !== null ? Math.max(0, Math.round((total - body) * 10) / 10) : total);
    } else if(field.id === "pullBody" || field.id === "pullExtra"){
        writeKg("pullHang", hangKg());
    }
    showHangTotal();
}

function savePull(){
    let values = { "left" : readKg("pullLeft"), "right" : readKg("pullRight"), "hang" : hangKg() };
    if(Object.values(values).every(value => value === null)){ return; }
    let entry = dayEntry(pullDate());
    let saved = { "id" : entry === null ? Date.now() : entry.id, "date" : pullDate() };
    Object.keys(values).forEach(key => { if(values[key] !== null){ saved[key] = values[key]; } });
    let body = readKg("pullBody");
    if(splitHang() && saved.hang !== undefined && body !== null){ saved.body = body; }
    saveToLog(app.logKey, saved);
    flash(document.getElementById("savePull"));
    keepNoteToast();
    drawSessionLog();
    drawHistory();
}

/* The Progressor */

const gaugeWords = { "off" : "Tindeq not connected", "connecting" : "Connecting to the Tindeq…", "connected" : "Tindeq connected" };

function switchGauge(input){
    if(input.checked && !progressor.supported){
        input.checked = false;
        unsupportedToast("This browser can't connect to a Tindeq Progressor.");
        return;
    }
    input.checked ? progressor.connect() : progressor.disconnect();
}

function tareGauge(){
    progressor.tare();
    toast("Zeroed");
}

function gaugeKind(){
    let picked = document.querySelector('input[name="gaugeKind"]:checked');
    return picked ? picked.value : "left";
}

function setGaugeKind(){
    drawGauge();
}

function showGauge(){
    let status = progressor.status;
    let text = gaugeWords[status];
    if(status === "off" && progressor.error !== ""){ text = "Couldn't connect: " + progressor.error; }
    document.getElementById("gaugeStatusText").innerText = text;
    document.getElementById("gaugeSwitch").checked = status !== "off";
    document.getElementById("gauge").hidden = !progressor.connected;
    if(!progressor.connected){
        trace = [];
        peaks = { "left" : 0, "right" : 0, "hang" : 0 };
    }
    drawGauge();
}

// The pull on the arm picked, and its box filled whenever it beats what is there
function weighed(kg){
    let now = Date.now();
    trace.push({ "at" : now, "kg" : kg });
    while(trace.length > 0 && trace[0].at < now - traceSeconds * 1000){ trace.shift(); }
    let kind = gaugeKind();
    if(kg > peaks[kind]){
        peaks[kind] = kg;
        let best = Math.round(kg * 10) / 10;
        if(kind === "hang"){ fillHang(best); }
        else {
            let id = kind === "left" ? "pullLeft" : "pullRight";
            if(best > (readKg(id) || 0)){ writeKg(id, best); }
        }
    }
    if(traceFrame === null){
        traceFrame = requestAnimationFrame(() => {
            traceFrame = null;
            drawGauge();
        });
    }
}

// A hang read off the Progressor is the whole load; split, the extra is what is on top of the body
function fillHang(kg){
    if(kg <= (hangKg() || 0)){ return; }
    writeKg("pullHang", kg);
    let body = readKg("pullBody");
    writeKg("pullExtra", body === null ? kg : Math.max(0, Math.round((kg - body) * 10) / 10));
    showHangTotal();
}

function drawGauge(){
    let holder = document.getElementById("gaugeTrace");
    if(holder === null || !progressor.connected){ return; }
    let kind = gaugeKind();
    let now = trace.length > 0 ? trace[trace.length - 1].kg : 0;
    document.getElementById("gaugeNow").innerText = now.toFixed(1);
    document.getElementById("gaugePeak").innerText = peaks[kind].toFixed(1);
    holder.innerHTML = traceSvg(Math.round(holder.clientWidth) || 320, kinds[kind].cls, peaks[kind]);
}

// The last few seconds' pull as a line, and the most pulled across it
function traceSvg(width, cls, peak){
    const height = 140, left = 30, right = 4, top = 8, bottom = 8;
    let most = Math.max(peak, ...trace.map(point => point.kg), 1);
    let step = niceStep(most / 4);
    let ceiling = Math.max(step, Math.ceil(most / step) * step);
    let end = trace.length > 0 ? trace[trace.length - 1].at : Date.now();
    let xOf = at => left + (1 - (end - at) / (traceSeconds * 1000)) * (width - left - right);
    let yOf = kg => top + (height - top - bottom) * (1 - Math.max(0, kg) / ceiling);
    let svg = `<svg class="chart gauge-trace" viewBox="0 0 ${width} ${height}" role="img" aria-label="Pull over the last ${traceSeconds} seconds">`;
    for(let tick = 0; tick <= ceiling; tick += step){
        svg += `<line class="${tick === 0 ? "axis" : "grid"}" x1="${left}" x2="${width - right}" y1="${yOf(tick)}" y2="${yOf(tick)}" />`
            + `<text class="tick" x="${left - 6}" y="${yOf(tick) + 4}" text-anchor="end">${tick}</text>`;
    }
    if(peak > 0){
        svg += `<line class="gauge-peak ${cls}" x1="${left}" x2="${width - right}" y1="${yOf(peak)}" y2="${yOf(peak)}" />`;
    }
    if(trace.length > 1){
        svg += `<polyline class="gauge-line ${cls}" points="${trace.map(point => xOf(point.at).toFixed(1) + "," + yOf(point.kg).toFixed(1)).join(" ")}" />`;
    }
    return svg + `</svg>`;
}

/* The days saved, side by side */

function drawHistory(){
    let holder = document.getElementById("pullHistory");
    let days = getLog(app.logKey).filter(entry => entry && typeof entry.date === "string")
        .sort((a, b) => a.date.localeCompare(b.date)).slice(-chartDays);
    document.getElementById("historyFigure").hidden = days.length === 0;
    if(days.length === 0){ return; }
    let series = Object.keys(kinds).map(key => Object.assign({ "key" : key }, kinds[key]));
    let groups = days.map(entry => ({
        "label" : logDateParts(entry.date).day,
        "title" : logDate(entry.date) + ": " + series.filter(each => entry[each.key]).map(each => `${each.name} ${entry[each.key]} kg`).join(", "),
        "values" : { "left" : entry.left, "right" : entry.right, "hang" : entry.hang }
    }));
    let width = Math.round(holder.clientWidth) || 320;
    holder.innerHTML = groupedBarChart(groups, series, "Max pull by day: " + groups.map(group => group.title).join("; "), width)
        + chartLegend(series);
}

/* The activity log */

function describePull(entry){
    let arms = [entry.left ? `L ${entry.left} kg` : "", entry.right ? `R ${entry.right} kg` : ""];
    let hang = entry.hang ? `max hang ${entry.hang} kg` + (entry.body !== undefined ? ` (${entry.body} + ${Math.round((entry.hang - entry.body) * 10) / 10})` : "") : "";
    return { "title" : joinDetail(arms) || hang, "detail" : joinDetail(arms) ? hang : "" };
}

function editPull(id){
    let entry = getLog(app.logKey).find(item => item.id === id);
    if(!entry){ return; }
    document.getElementById("pullDate").value = entry.date;
    showDay();
    hideAbout();
}

const logView = {
    "key" : app.logKey,
    "unrated" : true,
    "order" : (a, b) => b.date.localeCompare(a.date),
    "onEdit" : editPull,
    "describe" : describePull,
    "stats" : log => plural(log.length, "day")
};

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("pullDate").value = today();
    document.getElementById("splitHang").checked = splitHang();
    showSplit();
    showDay();
    progressor.onChange = showGauge;
    progressor.onWeight = weighed;
    showGauge();
    drawSessionLog(logView);
    drawHistory();
    let width = 0;
    new ResizeObserver(() => {
        let now = Math.round(document.getElementById("pullHistory").clientWidth);
        if(now !== width){
            width = now;
            drawHistory();
        }
    }).observe(document.getElementById("pullHistory"));
});
