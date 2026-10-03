/* The UKC logbook, from the CSV export UKC gives a logged-in climber - UKC has no
   API, so the file is downloaded there and chosen here, and each replaces the
   last. The progress page charts it and lists its days; the trad app imports it.

   Trad, sport and bouldering with a full date are kept, on this device only. UIAA
   grades are turned roughly into British for trad and French for sport, and Font
   boulder grades into V, so each lands on its chart's ladder; other trad grades
   are too loose a fit to guess.

   A day the trad app has logged with "Ignore UKC data for this date" is in both
   places, and the app's record wins: ukc.climbs() leaves that date out. */
const ukc = (function(){
    const key = "ukcLogbook";
    const tradLogKey = "tradLog";

    const monthNumbers = { "jan" : "01", "feb" : "02", "mar" : "03", "apr" : "04", "may" : "05", "jun" : "06",
                           "jul" : "07", "aug" : "08", "sep" : "09", "oct" : "10", "nov" : "11", "dec" : "12" };

    // UIAA to British, roughly, for a trad route in the Alps or the Dolomites
    const uiaaToBritish = {
        "III" : "D", "III+" : "VD", "IV-" : "VD", "IV" : "S", "IV+" : "HS",
        "V-" : "HS", "V" : "VS", "V+" : "HVS", "VI-" : "HVS", "VI" : "E1", "VI+" : "E2",
        "VII-" : "E2", "VII" : "E3", "VII+" : "E4", "VIII-" : "E5", "VIII" : "E5",
        "VIII+" : "E6", "IX-" : "E7", "IX" : "E7", "IX+" : "E8", "X-" : "E9", "X" : "E9"
    };
    // and to French, for a sport route graded UIAA
    const uiaaToFrench = {
        "III" : "3", "III+" : "3+", "IV-" : "4a", "IV" : "4b", "IV+" : "4c",
        "V-" : "5a", "V" : "5b", "V+" : "5c", "VI-" : "6a", "VI" : "6a+", "VI+" : "6b",
        "VII-" : "6b+", "VII" : "6c", "VII+" : "7a", "VIII-" : "7a+", "VIII" : "7b",
        "VIII+" : "7b+", "IX-" : "7c", "IX" : "7c+", "IX+" : "8a", "X-" : "8a+", "X" : "8b"
    };

    // Font to V: the gym session's table, and the half grades it has no row for
    const fontToV = {
        "3" : "V0", "4" : "V0", "4+" : "V0", "5" : "V1", "5+" : "V2",
        "6A" : "V3", "6A+" : "V3", "6B" : "V4", "6B+" : "V4", "6C" : "V5", "6C+" : "V5",
        "7A" : "V6", "7A+" : "V7", "7B" : "V8", "7B+" : "V8", "7C" : "V9", "7C+" : "V10",
        "8A" : "V11", "8A+" : "V12", "8B" : "V13", "8B+" : "V14", "8C" : "V15", "8C+" : "V16", "9A" : "V17"
    };

    // Quoted fields, "" inside them and line breaks in the notes - the export has all three
    function parseCsv(text){
        let rows = [], row = [], field = "", quoted = false;
        for(let i = 0; i < text.length; i++){
            let c = text[i];
            if(quoted){
                if(c === '"' && text[i + 1] === '"'){ field += '"'; i++; }
                else if(c === '"'){ quoted = false; }
                else { field += c; }
            } else if(c === '"'){ quoted = true; }
            else if(c === ","){ row.push(field); field = ""; }
            else if(c === "\n" || c === "\r"){
                if(c === "\r" && text[i + 1] === "\n"){ i++; }
                row.push(field); rows.push(row); row = []; field = "";
            }
            else { field += c; }
        }
        if(field !== "" || row.length > 0){ row.push(field); rows.push(row); }
        return rows;
    }

    // 31/Aug/26 as 2026-08-31, or null for a date UKC only knows in part (???/2024)
    function ukcDate(text){
        let parts = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{2}|\d{4})$/.exec(String(text).trim());
        if(!parts || !monthNumbers[parts[2].toLowerCase()]){ return null; }
        let year = parts[3].length === 2 ? "20" + parts[3] : parts[3];
        return year + "-" + monthNumbers[parts[2].toLowerCase()] + "-" + parts[1].padStart(2, "0");
    }

    // The first word of a sport grade as French - 6b+, 4c - or null if it is not one
    function frenchGrade(word){
        let french = word.toLowerCase();
        if(uiaaToFrench[word.toUpperCase()]){ french = uiaaToFrench[word.toUpperCase()]; }
        return /^[3-9][abc]?\+?$/.test(french) ? french : null;
    }

    // "HVS 5a" as HVS, "IV+" as HS; null for anything else
    function tradGrade(text){
        let word = String(text).trim().split(/\s+/)[0].toUpperCase();
        let british = word === "MOD" ? "M" : word;
        if(tradLadder.includes(british)){ return british; }
        return uiaaToBritish[word] || null;
    }

    // "5c" as 5+, "6a+" as it is - the sport ladder counts 4, 4+, 5 and 5+ below 6a
    function sportGrade(text){
        let french = frenchGrade(String(text).trim().split(/\s+/)[0]);
        if(french === null){ return null; }
        let low = /^([3-5])([abc]?)(\+?)$/.exec(french);
        if(low){
            let number = Math.max(4, Number(low[1]));
            let plus = low[3] === "+" || low[2] === "c" ? "+" : "";
            return number + plus;
        }
        return sportLadder.includes(french) ? french : null;
    }

    // "f6A" or "6A" as V3, "V3" as it is; null for anything else
    function boulderGrade(text){
        let word = String(text).trim().split(/\s+/)[0].toUpperCase();
        if(/^V\d{1,2}$/.test(word) && Number(word.slice(1)) <= 17){ return word; }
        return fontToV[word.replace(/^F/, "")] || null;
    }

    const gradeOf = { "trad" : tradGrade, "sport" : sportGrade, "bouldering" : boulderGrade };

    // Read a whole export and save it in place of any earlier one
    function importText(text){
        let rows = parseCsv(String(text).replace(/^﻿/, ""));
        let header = (rows.shift() || []).map(name => name.trim().toLowerCase());
        let at = name => header.indexOf(name);
        if(at("grade") === -1 || at("date") === -1 || at("type") === -1){
            throw new Error("that is not a UKC logbook export");
        }
        let climbs = [], leftOut = 0;
        rows.forEach(row => {
            let type = String(row[at("type")] || "").trim().toLowerCase();
            if(!gradeOf[type]){ return; }
            let date = ukcDate(row[at("date")]);
            let grade = gradeOf[type](row[at("grade")]);
            if(date === null || grade === null){ leftOut++; return; }
            let field = name => at(name) === -1 ? "" : String(row[at(name)] || "").trim();
            climbs.push({ "date" : date, "grade" : grade, "type" : type === "bouldering" ? "boulder" : type,
                          "name" : field("name"), "crag" : field("crag"), "notes" : field("notes") });
        });
        // a UTC day, as the apps date their sessions
        let saved = { "imported" : new Date().toISOString().slice(0, 10), "climbs" : climbs, "leftOut" : leftOut };
        localStorage.setItem(key, JSON.stringify(saved));
        return saved;
    }

    function load(){
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(key)); } catch(err){ saved = null; }
        return saved && Array.isArray(saved.climbs) ? saved : null;
    }

    // The days a trad app session says are on UKC as well
    function coveredDays(){
        let log = null;
        try { log = JSON.parse(localStorage.getItem(tradLogKey)); } catch(err){ log = null; }
        return new Set(Array.isArray(log)
            ? log.filter(entry => entry && entry.ukc === true && typeof entry.date === "string").map(entry => entry.date)
            : []);
    }

    // Every imported climb, less the days the trad app has already logged
    function climbs(){
        let logbook = load();
        if(logbook === null){ return []; }
        let covered = coveredDays();
        return logbook.climbs.filter(climb => climb && typeof climb.date === "string" && !covered.has(climb.date));
    }

    /* The hardest of a day's climbs. Trad outranks sport and sport a boulder - the
       ladders do not line up, and a day with more than one is a route day with a
       warm up. Between two at the same grade, the one with notes wins, so the day
       has something to say. */
    function hardest(dayClimbs){
        const boulders = 18;   // V0 to V17
        let rank = climb => climb.type === "trad" ? boulders + sportLadder.length + tradLadder.indexOf(climb.grade)
            : climb.type === "sport" ? boulders + sportLadder.indexOf(climb.grade)
            : Number(String(climb.grade).slice(1));
        return dayClimbs.reduce((best, climb) => {
            if(best === null || rank(climb) > rank(best)){ return climb; }
            return rank(climb) === rank(best) && !best.notes && climb.notes ? climb : best;
        }, null);
    }

    // A day's climbs in a line: "2 trad climbs, 3 boulders"
    function summary(dayClimbs){
        let count = type => dayClimbs.filter(climb => climb.type === type).length;
        return [["trad", "trad climb"], ["sport", "sport climb"], ["boulder", "boulder"]]
            .filter(([type]) => count(type) > 0)
            .map(([type, noun]) => plural(count(type), noun)).join(", ");
    }

    return { "key" : key, "tradLadder" : tradLadder, "sportLadder" : sportLadder,
             "importText" : importText, "load" : load, "climbs" : climbs, "hardest" : hardest, "summary" : summary,
             "sportGrade" : sportGrade };
})();

function chooseUkcFile(){
    document.getElementById("ukcFile").click();
}

// Straight to the progress page, to see what the logbook adds up to
function importUkcFile(input){
    let file = input.files && input.files[0];
    if(!file){ return; }
    file.text().then(text => {
        ukc.importText(text);
        location.href = "/training/progress/";
    }).catch(err => {
        alert("Couldn't import the UKC logbook: " + err.message);
    }).finally(() => { input.value = ""; });
}

function removeUkcLogbook(){
    if(!confirm("Remove the imported UKC logbook from this device?")){ return; }
    localStorage.removeItem(ukc.key);
    location.reload();
}
