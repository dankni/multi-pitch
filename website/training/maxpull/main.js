/* Max pull: the most pulled with the left arm, the right, and on a max hang, one
   reading of each a day and edge - the day's best. Manual is the max hang, typed
   in; load cell is the arms, read off a Tindeq Progressor (gaps/progressor.js),
   where the pull fills the picked arm's box whenever it beats what is there.
   Saved days are charted side by side, the arms against the left axis and the
   hang against the right, one edge at a time; a day with nothing logged has no
   place on it. */

const app = { "logKey" : "maxPullLog" };
const modeKey = "maxPullMode";
const armKey = "maxPullArm";
const edgeKey = "maxPullEdge";
const draftKey = "maxPullCurrent";   // the session in progress, so a reload picks it back up
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
let shown = "";        // the boxes as last loaded or saved, to tell what is unsaved
let chartEdge;         // the edge charted, once more than one is logged
let editing = null;    // { id, date, edge } of the log entry reopened, which a new day or edge moves

function pullMode(){
    return localStorage.getItem(modeKey) === "manual" ? "manual" : "loadcell";
}

function setPullMode(input){
    localStorage.setItem(modeKey, input.value);
    showMode();
}

function showMode(){
    document.body.dataset.mode = pullMode();
    document.getElementById("pullMode-" + pullMode()).checked = true;
}

function pullArm(){
    return localStorage.getItem(armKey) === "right" ? "right" : "left";
}

// From here on the Progressor fills this arm's box
function setPullArm(input){
    localStorage.setItem(armKey, input.value);
    showArm();
}

function showArm(){
    let arm = pullArm();
    document.getElementById("pullArm-" + arm).checked = true;
    drawGauge();
}

// Into the other arm's field picks that arm
function focusArm(event){
    let radio = event.target.closest(".pull-arm")?.previousElementSibling;
    if(radio && !radio.checked){
        radio.checked = true;
        setPullArm(radio);
    }
}

function pullEdge(){
    let value = parseInt(document.getElementById("pullEdge").value, 10);
    return isFinite(value) && value > 0 ? value : null;
}

function edgeOf(entry){
    return typeof entry.edge === "number" ? entry.edge : null;
}

// Another edge shows its own saved readings, unless there are unsaved ones to keep
function setPullEdge(){
    if(editing === null){
        let edge = pullEdge();
        edge === null ? localStorage.removeItem(edgeKey) : localStorage.setItem(edgeKey, edge);
        if(!unsaved()){ showDay(); }
    }
    keepDraft();
}

/* The day's readings */

function readKg(id){
    let value = parseFloat(document.getElementById(id).value);
    return isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
}

function writeKg(id, value){
    document.getElementById(id).value = value === null || value === undefined ? "" : value;
}

function pullDate(){
    return document.getElementById("pullDate").value || today();
}

function dayEntry(date, edge){
    return getLog(app.logKey).find(entry => entry && entry.date === date && edgeOf(entry) === edge) || null;
}

function boxes(){
    return ["pullLeft", "pullRight", "pullHang"].map(readKg).join();
}

function unsaved(){
    return boxes() !== shown || (editing !== null && (pullDate() !== editing.date || pullEdge() !== editing.edge));
}

function writeBoxes(entry){
    writeKg("pullLeft", entry.left);
    writeKg("pullRight", entry.right);
    writeKg("pullHang", entry.hang);
}

// The boxes show the day's saved readings on the edge, to add to or put right
function showDay(){
    writeBoxes(dayEntry(pullDate(), pullEdge()) || {});
    shown = boxes();
}

function setPullDate(){
    if(editing === null){ showDay(); }
    keepDraft();
}

/* The session */

function running(){
    return document.body.dataset.state === "running";
}

function keepDraft(){
    if(!running()){ return; }
    localStorage.setItem(draftKey, JSON.stringify({ "date" : pullDate(), "edge" : pullEdge(), "editing" : editing,
        "left" : readKg("pullLeft"), "right" : readKg("pullRight"), "hang" : readKg("pullHang") }));
}

function showEditing(){
    document.body.toggleAttribute("data-editing", editing !== null);
    document.getElementById("discardPull").innerHTML = `<i class="demo-icon icon-cancel"></i>${editing === null ? "DISCARD" : "CANCEL EDIT"}`;
}

function readDraft(){
    try { return JSON.parse(localStorage.getItem(draftKey)); }
    catch(err){ return null; }
}

function startPull(){
    showDay();
    showState("running");
    keepDraft();
    window.scrollTo(0, 0);
}

// Picks up a session left running, the boxes as they were
function restorePull(draft){
    let reopened = draft.editing ? getLog(app.logKey).find(item => item.id === draft.editing.id) : null;
    editing = reopened ? draft.editing : null;
    if(editing !== null){
        writeBoxes(reopened);
        shown = boxes();
    }
    document.getElementById("pullDate").value = draft.date || today();
    document.getElementById("pullEdge").value = draft.edge || "";
    if(editing === null){ showDay(); }
    writeBoxes(draft);
    showEditing();
    showState("running");
}

// A day from the activity log, open to put right: its day and edge move it
function editPull(id){
    let entry = getLog(app.logKey).find(item => item.id === id);
    if(!entry){ return; }
    editing = { "id" : entry.id, "date" : entry.date, "edge" : edgeOf(entry) };
    document.getElementById("pullDate").value = entry.date;
    document.getElementById("pullEdge").value = edgeOf(entry) === null ? "" : entry.edge;
    writeBoxes(entry);
    shown = boxes();
    if(entry.left === undefined && entry.right === undefined && entry.hang !== undefined){ localStorage.setItem(modeKey, "manual"); }
    else if(entry.hang === undefined){ localStorage.setItem(modeKey, "loadcell"); }
    showMode();
    showEditing();
    showState("running");
    keepDraft();
    hideAbout();
    window.scrollTo(0, 0);
}

function endPull(){
    editing = null;
    showEditing();
    localStorage.removeItem(draftKey);
    peaks = { "left" : 0, "right" : 0, "hang" : 0 };
    trace = [];
    showState("idle");
    drawHistory();
}

function savePull(){
    let values = { "left" : readKg("pullLeft"), "right" : readKg("pullRight"), "hang" : readKg("pullHang") };
    if(Object.values(values).every(value => value === null)){ return; }
    let edge = pullEdge();
    let entry = dayEntry(pullDate(), edge);
    let saved = { "id" : entry === null ? Date.now() : entry.id, "date" : pullDate() };
    // moved onto a day and edge that has its own entry: one entry, its readings filling any gaps
    if(editing !== null){
        saved.id = editing.id;
        if(entry !== null && entry.id !== editing.id){
            Object.keys(values).forEach(key => { if(values[key] === null && entry[key] !== undefined){ values[key] = entry[key]; } });
            removeLog(entry.id);
        }
    }
    if(edge !== null){ saved.edge = edge; }
    Object.keys(values).forEach(key => { if(values[key] !== null){ saved[key] = values[key]; } });
    saveToLog(app.logKey, saved);
    chartEdge = edge;
    keepNoteToast();
    drawSessionLog();
    endPull();
}

function discardPull(){
    confirmReset("discardPull", unsaved(), endPull);
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
    if(!running() || pullMode() !== "loadcell"){ return; }
    let now = Date.now();
    trace.push({ "at" : now, "kg" : kg });
    while(trace.length > 0 && trace[0].at < now - traceSeconds * 1000){ trace.shift(); }
    let arm = pullArm();
    if(kg > peaks[arm]){
        peaks[arm] = kg;
        let best = Math.round(kg * 10) / 10;
        let id = arm === "left" ? "pullLeft" : "pullRight";
        if(best > (readKg(id) || 0)){
            writeKg(id, best);
            keepDraft();
        }
    }
    if(traceFrame === null){
        traceFrame = requestAnimationFrame(() => {
            traceFrame = null;
            drawGauge();
        });
    }
}

function drawGauge(){
    let holder = document.getElementById("gaugeTrace");
    if(holder === null || !progressor.connected){ return; }
    let kind = pullArm();
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

function edgeName(edge){
    return edge === null ? "No edge" : edge + "mm";
}

function setChartEdge(input){
    chartEdge = input.value === "" ? null : Number(input.value);
    drawHistory();
}

// A picker of the edges logged, when there is more than one
function drawChartEdges(log){
    let picker = document.getElementById("chartEdges");
    let edges = [...new Set(log.map(edgeOf))].sort((a, b) => (a === null ? -1 : a) - (b === null ? -1 : b));
    if(!edges.includes(chartEdge)){
        chartEdge = edges.includes(pullEdge()) ? pullEdge() : log.length > 0 ? edgeOf(log[log.length - 1]) : null;
    }
    picker.hidden = edges.length < 2;
    picker.innerHTML = edges.length < 2 ? "" : edges.map(edge => {
        let id = "chartEdge-" + (edge === null ? "none" : edge);
        return `<input type="radio" name="chartEdge" class="nice-radios" id="${id}" value="${edge === null ? "" : edge}" data-change="setChartEdge"${edge === chartEdge ? " checked" : ""} />`
            + `<label for="${id}">${edgeName(edge)}</label>`;
    }).join("");
}

function drawHistory(){
    let holder = document.getElementById("pullHistory");
    let log = getLog(app.logKey).filter(entry => entry && typeof entry.date === "string")
        .sort((a, b) => a.date.localeCompare(b.date));
    drawChartEdges(log);
    let days = log.filter(entry => edgeOf(entry) === chartEdge).slice(-chartDays);
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
    let hang = entry.hang ? `max hang ${entry.hang} kg` : "";
    let edge = edgeOf(entry) === null ? "" : entry.edge + "mm edge";
    return { "title" : joinDetail(arms) || hang, "detail" : joinDetail([joinDetail(arms) ? hang : "", edge]) };
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
    document.getElementById("pullEdge").value = localStorage.getItem(edgeKey) || "";
    showMode();
    showArm();
    document.querySelector(".pull-tiles").addEventListener("focusin", focusArm);
    let draft = readDraft();
    if(draft !== null && typeof draft === "object"){ restorePull(draft); }
    else {
        showDay();
        showState("idle");
    }
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
