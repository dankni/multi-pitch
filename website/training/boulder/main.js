/* A session at the climbing wall: tap a grade each time you top something out,
   on the bouldering ladder or the sport one. The session flow is common/log.js
   and the ladders common/ladder.js; this is the grades and how a session reads.

   Boulders are in `climbs`, as they were before sport was added, so older
   sessions and the progress charts that read them are unchanged. */

// The bouldering ladder: V, Font and British, from common/grades.js
const grades = boulderGradeTable;

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
function sportGrades(){
    return (splitLowGrades() ? gymSportLowSplit : gymSportLow).concat(plusGrades() ? gymSportHigherPlus : gymSportHigher);
}
// up to 7c to start with
function sportStarts(){
    return sportGrades().indexOf("7c") + 1;
}

const app = {
    "logKey" : "boulderLog",
    "currentKey" : "boulderCurrent",
    "systemKey" : "boulderGradeSystem",
    "timed" : true,
    "defaultSystem" : "hueco",
    // V0 to V10 and 4 to 7c to start with, as far as V17 and 9c. The sport
    // ladder's order says which of 4+ and 4c is harder, whichever are on it.
    "ladders" : {
        "boulder" : { "list" : "climbs", "shown" : "shown",      "names" : grades.map(grade => grade.v),
                      "starts" : 11, "noun" : "boulder", "band" : gradeBands.boulder },
        "sport"   : { "list" : "sport",  "shown" : "sportShown", "names" : sportGrades(),
                      "order" : gymSportOrder, "starts" : sportStarts(), "noun" : "sport climb",
                      "band" : gradeBands.sport }
    },
    "grades" : grades,
    "gradeKey" : "v",
    "systems" : {
        "hueco"   : { "main" : "v",    "also" : ["font", "brit"] },
        "font"    : { "main" : "font", "also" : ["v", "brit"] },
        "british" : { "main" : "brit", "also" : ["v", "font"] }
    },
    "newSession" : ladderSession,
    "fromEntry" : ladderFromEntry,
    "toEntry" : ladderEntry,
    "hasClimbs" : ladderHasClimbs,
    "draw" : drawLadder,
    "onLoad" : () => {
        loadGradeSystem();
        document.getElementById("splitLow").checked = splitLowGrades();
        document.getElementById("plusGrades").checked = plusGrades();
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
                "detail" : joinDetail([hardest.length > 0 ? "hardest " + hardest.join(" · ") : "", sessionLength(entry)])
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
    localStorage.setItem(splitKey, input.checked);
    rebuildSportLadder();
}

function togglePlusGrades(input){
    localStorage.setItem(plusKey, input.checked);
    rebuildSportLadder();
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
