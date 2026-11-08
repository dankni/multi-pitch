/* A session at the climbing wall: tap a grade each time you top something out,
   on the bouldering ladder or the sport one. The session flow is common/log.js
   and the ladders common/ladder.js; this is the grades and how a session reads.

   Boulders are in `climbs`, as they were before sport was added, so older
   sessions and the progress charts that read them are unchanged. */

/* The bouldering ladder: V, Font and British, from common/grades.js, with VB
   below V0 while low grades are split out. With Font picked it is Font's own
   ladder, plus grades and all, and a session keeps the one it was logged on
   (session.boulderScale, "v" or "font") - so it reopens as it was tapped. */
const vRows = [{ "v" : "VB", "font" : "f3", "brit" : "3c" }].concat(boulderGradeTable).map(row => Object.assign({ "key" : row.v }, row));
const fontRows = fontBoulderTable.map(row => ({ "key" : row.font, "font" : row.font, "v" : row.v,
    "brit" : vRows.find(each => each.v === row.v).brit, "system" : "font" }));
const grades = vRows.concat(fontRows);
// both ladders, each Font grade after the V grade it counts as, to find the hardest by
const boulderOrder = vBoulderOrder.flatMap(v => [v, ...fontRows.filter(row => row.v === v).map(row => row.key)]);

let scaleFrom = null;   // an entry being reopened, before it is the session

function systemScale(){
    return gradeSystem === "font" ? "font" : "v";
}
function boulderScale(){
    let from = scaleFrom || session;
    return from && from.boulderScale ? from.boulderScale : from ? entryScale(from) : systemScale();
}
// a saved session by its boulders, or the system picked now if it has none
function entryScale(entry){
    let climbs = Array.isArray(entry.climbs) ? entry.climbs : [];
    return climbs.length === 0 ? systemScale() : fontBoulderOrder.includes(climbs[0]) ? "font" : "v";
}

// The sport ladder, from common/grades.js: 4 to 5+, or 4a to 5c once split out,
// and 6a up with or without the plus grades
const splitKey = "boulderSplitLow";
const plusKey = "boulderPlusGrades";

function splitLowGrades(){
    return localStorage.getItem(splitKey) !== "false";   // on unless switched off
}
function plusGrades(){
    return localStorage.getItem(plusKey) === "true";
}
function boulderGrades(){
    let ladder = boulderScale() === "font" ? fontBoulderOrder : vBoulderOrder;
    return splitLowGrades() ? ladder : ladder.slice(1);
}
// V0 to V10, or f4 to f7C+, to start with
function boulderStarts(){
    return boulderGrades().indexOf(boulderScale() === "font" ? "f7C+" : "V10") + 1;
}
function sportGrades(){
    return (splitLowGrades() ? gymSportLowSplit : gymSportLow).concat(plusGrades() ? gymSportHigherPlus : gymSportHigher);
}
// up to 7c to start with
function sportStarts(){
    return sportGrades().indexOf("7c") + 1;
}

/* Boulderworld Belfast sets its circuits a colour a grade: with it on under the
   cog, each V grade's tile wears its circuit's colour - V0 both of its two, and
   V7 up pink - in place of the easy to very hard bands */
const boulderworldKey = "boulderBoulderworld";
const boulderworldHolds = { "VB" : "orange-blue", "V0" : "orange-blue", "V1" : "white", "V2" : "green", "V3" : "yellow", "V4" : "purple", "V5" : "red", "V6" : "black" };

function boulderworld(){
    return localStorage.getItem(boulderworldKey) === "true";
}
function boulderworldBand(grade){
    return { "cls" : "hold hold-" + (boulderworldHolds[grade] || "pink") };
}
function boulderBand(){
    return boulderworld() ? grade => boulderworldBand(boulderV(grade)) : gradeBands.boulder;
}

const app = {
    "logKey" : "boulderLog",
    "currentKey" : "boulderCurrent",
    "systemKey" : "boulderGradeSystem",
    "timed" : true,
    "fallsKey" : "boulderTrackFalls",
    "watchKey" : "boulderWatch",
    "watch" : ladderWatch,
    "defaultSystem" : "hueco",
    // V0 to V10 and 4 to 7c to start with, as far as V17 and 9c. The sport
    // ladder's order says which of 4+ and 4c is harder, whichever are on it.
    "ladders" : {
        "boulder" : { "list" : "climbs", "shown" : "shown", get names(){ return boulderGrades(); },
                      "order" : boulderOrder, get starts(){ return boulderStarts(); }, "noun" : "boulder", "title" : "Bouldering",
                      "band" : boulderBand() },
        "sport"   : { "list" : "sport",  "shown" : "sportShown", "names" : sportGrades(),
                      "order" : gymSportOrder, "starts" : sportStarts(), "noun" : "sport climb", "title" : "Sport",
                      "band" : gradeBands.sport }
    },
    "grades" : grades,
    "gradeKey" : "key",
    "systems" : {
        "hueco"   : { "main" : "v",    "also" : ["font", "brit"] },
        "font"    : { "main" : "font", "also" : ["v", "brit"] },
        "british" : { "main" : "brit", "also" : ["v", "font"] }
    },
    "newSession" : () => Object.assign(ladderSession(), { "boulderScale" : systemScale() }),
    // boulders and sport climbs together, for the longest session in common/records.js
    "sessionSize" : from => climbsOn("boulder", from).length + climbsOn("sport", from).length,
    "fromEntry" : entry => {
        scaleFrom = { "boulderScale" : entryScale(entry) };
        try { return Object.assign(ladderFromEntry(entry), scaleFrom); }
        finally { scaleFrom = null; }
    },
    // a session with no boulders yet goes over to the new system's ladder
    "onSystem" : () => {
        if(session === null || climbsOn("boulder").length > 0){ return; }
        session.boulderScale = systemScale();
        session.shown = boulderStarts();
    },
    "toEntry" : ladderEntry,
    "hasClimbs" : ladderHasClimbs,
    "draw" : drawLadder,
    "onLoad" : () => {
        loadGradeSystem();
        document.getElementById("splitLow").checked = splitLowGrades();
        document.getElementById("plusGrades").checked = plusGrades();
        document.getElementById("boulderworld").checked = boulderworld();
    },
    "logView" : {
        "key" : "boulderLog",
        "order" : byDate,
        "onEdit" : editSession,
        "describe" : entry => {
            let sport = climbsOn("sport", entry);
            // boulders are named even at none, unless the session was all sport
            let title = [entry.climbs.length > 0 || sport.length === 0 ? plural(entry.climbs.length, "boulder") : "",
                         sport.length > 0 ? plural(sport.length, "sport climb") : ""];
            let hardest = [hardestGrade("boulder", entry.climbs), hardestGrade("sport", sport)].filter(grade => grade !== "");
            return {
                "title" : title.filter(part => part !== "").join(", "),
                "detail" : joinDetail([hardest.length > 0 ? "hardest " + hardest.join(" · ") : "", fallsDetail(entry), sessionLength(entry)])
            };
        },
        "stats" : log => {
            let boulders = log.reduce((count, entry) => count + entry.climbs.length, 0);
            let sport = log.reduce((count, entry) => count + climbsOn("sport", entry).length, 0);
            return `${sessionCount(log)} · ${boulders} boulders` + (sport > 0 ? ` · ${plural(sport, "sport climb")}` : "") + " logged";
        }
    }
};

/* Split out low grades and show plus grades, under the cog. A session keeps its
   grades as tapped, and the ladder on show still reaches the grade it did. */
function toggleSplitLow(input){
    let reach = session === null ? null : boulderGrades()[shownGrades("boulder") - 1];
    localStorage.setItem(splitKey, input.checked);
    rebuildBoulderLadder(reach);
    rebuildSportLadder();
}

function togglePlusGrades(input){
    localStorage.setItem(plusKey, input.checked);
    rebuildSportLadder();
}

function toggleBoulderworld(input){
    localStorage.setItem(boulderworldKey, input.checked);
    app.ladders.boulder.band = boulderBand();
    if(session !== null){
        keepSession();   // for the watch, which wears the same colours
        drawGrades();
    }
}

// the ladder on show still reaches the grade it did
function rebuildBoulderLadder(reachName){
    if(session === null){ return; }
    let reach = boulderOrder.indexOf(reachName);
    session.shown = boulderGrades().filter(grade => boulderOrder.indexOf(grade) <= reach).length;
}

function rebuildSportLadder(){
    let sport = app.ladders.sport;
    let reach = gymSportOrder.indexOf(sport.names[shownGrades("sport") - 1]);
    sport.names = sportGrades();
    sport.starts = sportStarts();
    if(session !== null){
        session.sportShown = sport.names.filter(grade => gymSportOrder.indexOf(grade) <= reach).length;
        keepSession();
        drawGrades();
        updateSummary();
    }
}
