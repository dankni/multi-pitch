/* The UKC logbook, from the CSV export UKC gives a logged-in climber. Shared by
   the overview, which charts it and lists its days, and the trad app, which can
   import it too.

   UKC has no API and will not let another site read its pages, so the file is
   downloaded there and chosen here. Each one chosen replaces the last. Trad and
   sport climbs with a full date are kept - their name, date, grade, type, crag and
   notes, on this device only. A UIAA trad grade is turned roughly into a British
   one, and a sport grade into a French one, so each lands on its chart's ladder.
   Other trad grades - French, or Southern Sandstone's "6b+ 5c" - are too loose a
   fit to guess at, and are left out.

   A day logged in the trad app with "Ignore UKC data for this date" switched on
   is a day in both places. The app's record of it wins: ukc.climbs() leaves out
   every UKC climb on that date, so nothing is counted twice. */
const ukc = (function(){
    const key = "ukcLogbook";
    const tradLogKey = "tradLog";

    // British adjectival grades, easiest first
    const tradLadder = ["M", "D", "HD", "VD", "HVD", "MS", "S", "HS", "MVS", "VS", "HVS",
        "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10", "E11"];
    // French sport grades, easiest first, as the overview's sport chart counts them
    const sportLadder = ["4", "4+", "5", "5+", "6a", "6a+", "6b", "6b+", "6c", "6c+",
        "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a", "8a+", "8b", "8b+", "8c", "8c+",
        "9a", "9a+", "9b", "9b+", "9c"];

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
            if(type !== "trad" && type !== "sport"){ return; }
            let date = ukcDate(row[at("date")]);
            let grade = type === "trad" ? tradGrade(row[at("grade")]) : sportGrade(row[at("grade")]);
            if(date === null || grade === null){ leftOut++; return; }
            let field = name => at(name) === -1 ? "" : String(row[at(name)] || "").trim();
            climbs.push({ "date" : date, "grade" : grade, "type" : type,
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

    /* The hardest of a day's climbs. Trad outranks sport - the two ladders do not
       line up, and a day with both is a trad day with a warm up. Between two at
       the same grade, the one with notes wins, so the day has something to say. */
    function hardest(dayClimbs){
        let rank = climb => climb.type === "trad"
            ? sportLadder.length + tradLadder.indexOf(climb.grade)
            : sportLadder.indexOf(climb.grade);
        return dayClimbs.reduce((best, climb) => {
            if(best === null || rank(climb) > rank(best)){ return climb; }
            return rank(climb) === rank(best) && !best.notes && climb.notes ? climb : best;
        }, null);
    }

    return { "key" : key, "tradLadder" : tradLadder, "sportLadder" : sportLadder,
             "importText" : importText, "load" : load, "climbs" : climbs, "hardest" : hardest };
})();

// The file input on either page. A new logbook changes everything drawn from it,
// so the page starts again rather than patching itself.
function importUkcFile(input){
    let file = input.files && input.files[0];
    if(!file){ return; }
    file.text().then(text => {
        ukc.importText(text);
        location.reload();
    }).catch(err => {
        alert("Couldn't import the UKC logbook: " + err.message);
    }).finally(() => { input.value = ""; });
}

function removeUkcLogbook(){
    if(!confirm("Remove the imported UKC logbook from this device?")){ return; }
    localStorage.removeItem(ukc.key);
    location.reload();
}
