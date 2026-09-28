/* A day of trad climbing: tap a grade each time you top a route out. The gym
   session's ladder with British grades on it - the session flow is common/log.js
   and the ladder common/ladder.js.

   A session can say it is on UKC as well. The progress page then counts that day
   from here and leaves the same day out of an imported UKC logbook, so nothing is
   counted twice - see common/ukc.js, which also does the import on this app's
   info panel. */

/* British grades as a UK crag gives them - the half steps UK guides barely use
   are left off - and roughly the UIAA equivalent, which follows the table ukc.js
   reads UIAA grades back with. Only ever displayed: a session stores the British. */
const grades = [
    { "brit" : "M",   "uiaa" : "II" },
    { "brit" : "D",   "uiaa" : "III" },
    { "brit" : "VD",  "uiaa" : "III+" },
    { "brit" : "HVD", "uiaa" : "IV-" },
    { "brit" : "S",   "uiaa" : "IV" },
    { "brit" : "HS",  "uiaa" : "IV+" },
    { "brit" : "VS",  "uiaa" : "V" },
    { "brit" : "HVS", "uiaa" : "V+" },
    { "brit" : "E1",  "uiaa" : "VI" },
    { "brit" : "E2",  "uiaa" : "VI+" },
    { "brit" : "E3",  "uiaa" : "VII" },
    { "brit" : "E4",  "uiaa" : "VII+" },
    { "brit" : "E5",  "uiaa" : "VIII" },
    { "brit" : "E6",  "uiaa" : "VIII+" },
    { "brit" : "E7",  "uiaa" : "IX" },
    { "brit" : "E8",  "uiaa" : "IX+" },
    { "brit" : "E9",  "uiaa" : "X" },
    { "brit" : "E10", "uiaa" : "X+" },
    { "brit" : "E11", "uiaa" : "XI-" }
];

const app = {
    "logKey" : "tradLog",
    "currentKey" : "tradCurrent",
    "systemKey" : "tradGradeSystem",
    "defaultSystem" : "british",
    // M to E3 to start with, as far as E11 - the hardest trad route there is
    "ladders" : {
        "trad" : { "list" : "climbs", "shown" : "shown", "names" : grades.map(grade => grade.brit),
                   "starts" : 11, "noun" : "trad climb" }
    },
    "grades" : grades,
    "gradeKey" : "brit",
    "systems" : {
        "british" : { "main" : "brit", "also" : ["uiaa"] },
        "uiaa"    : { "main" : "uiaa", "also" : ["brit"] }
    },
    "newSession" : () => Object.assign(ladderSession(), { "ukc" : false }),
    "fromEntry" : entry => Object.assign(ladderFromEntry(entry), { "ukc" : entry.ukc === true }),
    "toEntry" : from => Object.assign(ladderEntry(from), { "ukc" : from.ukc === true }),
    "hasClimbs" : ladderHasClimbs,
    "draw" : drawLadder,
    "onLoad" : () => {
        loadGradeSystem();
        drawUkcSummary();
        openUkcFromLink();
    },
    "onOpen" : () => {
        document.getElementById("alsoOnUkc").checked = session.ukc === true;
    },
    "onSaved" : drawUkcSummary,   // a day just said to be on UKC drops out of the UKC count
    "logView" : {
        "key" : "tradLog",
        "order" : byDate,
        "onEdit" : editSession,
        "extra" : () => ukcDays(),
        "describe" : entry => {
            // a UKC day by its hardest climb's name and the crag, as typed into UKC
            if(entry.readOnly){
                return {
                    "title" : plural(entry.climbs.length, "trad climb"),
                    "detail" : escapeHtml([entry.hardest, entry.crags, "from UKC"].filter(part => part).join(" · "))
                };
            }
            let hardest = hardestGrade("trad", entry.climbs);
            return {
                "title" : plural(entry.climbs.length, "trad climb"),
                "detail" : [hardest ? "hardest " + hardest : "", entry.ukc === true ? "UKC data ignored" : ""]
                    .filter(part => part !== "").join(" · ")
            };
        },
        "stats" : log => {
            let total = log.reduce((count, entry) => count + entry.climbs.length, 0);
            return `${sessionCount(log)} · ${plural(total, "trad climb")} logged`;
        }
    }
};

function setAlsoOnUkc(input){
    if(session){
        session.ukc = input.checked;
        keepSession();
    }
}

/* The trad days in an imported UKC logbook, listed read only beside this app's
   own sessions (ukc.climbs() leaves out any this app says are on UKC too). Each
   is shaped like a session: its grades as climbs, and its hardest climb's notes
   as the note. The id is the date as a negative number, which no saved session's
   can be. */
function ukcDays(){
    let days = {};
    ukc.climbs().filter(climb => climb.type === "trad").forEach(climb => {
        (days[climb.date] = days[climb.date] || []).push(climb);
    });
    return Object.keys(days).map(date => {
        let climbs = days[date];
        let hardest = ukc.hardest(climbs);
        let named = hardest !== null && hardest.name;
        return {
            "id" : -Number(date.replace(/-/g, "")),
            "date" : date,
            "climbs" : climbs.map(climb => climb.grade),
            "rating" : 0,
            "comment" : named && hardest.notes ? `${hardest.name}: ${hardest.notes}` : "",
            "hardest" : named ? `hardest ${hardest.name} (${hardest.grade})` : "",
            "crags" : [...new Set(climbs.map(climb => climb.crag).filter(crag => crag))].join(", ")
        };
    });
}

// When the logbook came in and how much of it is here, under the import
function drawUkcSummary(){
    let logbook = ukc.load();
    document.getElementById("ukcStats").hidden = logbook === null;
    if(logbook === null){ return; }
    let days = ukcDays();
    let total = days.reduce((count, day) => count + day.climbs.length, 0);
    document.getElementById("ukcSummary").innerText = `Imported ${logDate(logbook.imported)} · `
        + `${plural(days.length, "day")}, ${plural(total, "trad climb")}, in the activity log below.`;
}

// The progress page links here as /training/trad/#ukc: straight to the import
function openUkcFromLink(){
    if(location.hash !== "#ukc"){ return; }
    history.replaceState(null, "", location.pathname + location.search);
    openInfoBox();
    document.getElementById("ukcHeading").scrollIntoView();
}
