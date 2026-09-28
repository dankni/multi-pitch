/* A session at the climbing wall: tap a grade each time you top something out,
   on the bouldering ladder or the sport one. The session flow is common/log.js
   and the ladders common/ladder.js; this is the grades and how a session reads.

   Boulders are in `climbs`, as they were before sport was added, so older
   sessions and the progress charts that read them are unchanged. */

/* The bouldering ladder in the three systems a UK wall labels in. Conversions
   are approximate and argued over; these follow the usual UK gym tables, and are
   only ever displayed - a session stores the V grade. Font grades carry their f
   so a tile can't be read as the French sport grade. */
const grades = [
    { "v" : "V0",  "font" : "f4",   "brit" : "4a" },
    { "v" : "V1",  "font" : "f5",   "brit" : "4b" },
    { "v" : "V2",  "font" : "f5+",  "brit" : "4c" },
    { "v" : "V3",  "font" : "f6A",  "brit" : "5a" },
    { "v" : "V4",  "font" : "f6B",  "brit" : "5b" },
    { "v" : "V5",  "font" : "f6C",  "brit" : "5c" },
    { "v" : "V6",  "font" : "f7A",  "brit" : "6a" },
    { "v" : "V7",  "font" : "f7A+", "brit" : "6b" },
    { "v" : "V8",  "font" : "f7B",  "brit" : "6b" },
    { "v" : "V9",  "font" : "f7C",  "brit" : "6c" },
    { "v" : "V10", "font" : "f7C+", "brit" : "7a" },
    { "v" : "V11", "font" : "f8A",  "brit" : "7a" },
    { "v" : "V12", "font" : "f8A+", "brit" : "7b" },
    { "v" : "V13", "font" : "f8B",  "brit" : "7b" },
    { "v" : "V14", "font" : "f8B+", "brit" : "7b" },
    { "v" : "V15", "font" : "f8C",  "brit" : "7c" },
    { "v" : "V16", "font" : "f8C+", "brit" : "7c" },
    { "v" : "V17", "font" : "f9A",  "brit" : "7c" }
];

// French, as a UK wall labels its routes, and all on the progress page's sport ladder
const sportGrades = ["4", "4+", "5", "5+", "6a", "6b", "6c", "7a", "7b", "7c",
    "8a", "8b", "8c", "9a", "9b", "9c"];

const app = {
    "logKey" : "boulderLog",
    "currentKey" : "boulderCurrent",
    "systemKey" : "boulderGradeSystem",
    "defaultSystem" : "hueco",
    // V0 to V10 and 4 to 7c to start with, as far as V17 and 9c
    "ladders" : {
        "boulder" : { "list" : "climbs", "shown" : "shown",      "names" : grades.map(grade => grade.v),
                      "starts" : 11, "noun" : "boulder" },
        "sport"   : { "list" : "sport",  "shown" : "sportShown", "names" : sportGrades,
                      "starts" : 10, "noun" : "sport climb" }
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
    "onLoad" : loadGradeSystem,
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
                "detail" : hardest.length > 0 ? "hardest " + hardest.join(" · ") : ""
            };
        },
        "stats" : log => {
            let boulders = log.reduce((count, entry) => count + entry.climbs.length, 0);
            let sport = log.reduce((count, entry) => count + climbsOn("sport", entry).length, 0);
            return `${sessionCount(log)} · ${boulders} boulders` + (sport > 0 ? ` · ${plural(sport, "sport climb")}` : "") + " logged";
        }
    }
};
