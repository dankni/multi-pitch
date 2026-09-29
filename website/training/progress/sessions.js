/* Every app's sessions, newest first, under the charts on the progress page -
   read from each app's log in localStorage, and never written: a session is
   edited in the app that recorded it. Each app is described in a line below,
   short, since its own log has the whole of it. */
(function(){
    const showAtMost = 25;

    // V grades by their number: V9 is below V10, which it isn't as text
    function hardestV(climbs){
        let hardest = climbs.reduce((max, name) => {
            let rung = Number(String(name).replace("V", ""));
            return isNaN(rung) ? max : Math.max(max, rung);
        }, -1);
        return hardest === -1 ? "" : "V" + hardest;
    }

    const styleNames = { "endurance" : "Endurance", "power" : "Power Endurance" };

    // a missing field counts as nothing rather than as "undefined"
    function count(value){
        return typeof value === "number" && isFinite(value) ? value : 0;
    }
    function list(value){
        return Array.isArray(value) ? value : [];
    }

    // The gym session's sport ladder, as in boulder/main.js - 4+ and 6a don't sort as text
    const sportOrder = ["4", "4+", "5", "5+", "6a", "6b", "6c", "7a", "7b", "7c",
        "8a", "8b", "8c", "9a", "9b", "9c"];

    function tradSession(entry){
        let climbs = list(entry.climbs);
        let hardest = climbs.reduce((max, grade) => Math.max(max, ukc.tradLadder.indexOf(grade)), -1);
        return { "title" : plural(climbs.length, "trad climb"),
                 "detail" : [hardest === -1 ? "" : "hardest " + ukc.tradLadder[hardest],
                             entry.ukc === true ? "UKC data ignored" : ""].filter(part => part !== "").join(" · ") };
    }

    // Boulders, and sport climbs once a session has any
    function gymSession(entry){
        let boulders = list(entry.climbs), sport = list(entry.sport);
        let hardestSport = sport.reduce((max, grade) => Math.max(max, sportOrder.indexOf(grade)), -1);
        let title = [boulders.length > 0 || sport.length === 0 ? plural(boulders.length, "boulder") : "",
                     sport.length > 0 ? plural(sport.length, "sport climb") : ""];
        let hardest = [hardestV(boulders), hardestSport === -1 ? "" : sportOrder[hardestSport]].filter(grade => grade !== "");
        return { "title" : title.filter(part => part !== "").join(", "),
                 "detail" : hardest.length > 0 ? "hardest " + hardest.join(" · ") : "" };
    }

    const apps = [
        { "key" : "boulderLog", "name" : "Gym Session", "href" : "/training/boulder/",
          "line" : gymSession },
        { "key" : "gilfordLog", "name" : "Tick List", "href" : "/training/gilford/",
          "line" : entry => ({ "title" : plural(list(entry.climbs).length, "climb"), "detail" : "" }) },
        { "key" : "enduranceLog", "name" : "Endurance", "href" : "/training/endurance/",
          "line" : entry => ({ "title" : (styleNames[entry.style] || entry.style || "Endurance")
                                   + (entry.maxGrade ? " off " + entry.maxGrade : ""),
                               "detail" : plural(count(entry.sets), "set") + " · " + count(entry.climbs) + " climbs" }) },
        { "key" : "lapTimerLog", "name" : "Lap Timer", "href" : "/training/timer/",
          "line" : entry => ({ "title" : plural(count(entry.laps), "lap") + (typeof entry.grade === "string" && entry.grade ? " of " + entry.grade : ""),
                               "detail" : formatClock(count(entry.total) / 1000) + " on the clock" }) },
        { "key" : "loftLog", "name" : "Twister", "href" : "/training/loft/",
          "line" : entry => ({ "title" : plural(count(entry.moves), "move"),
                               "detail" : formatClock(count(entry.seconds)) + " on the clock" }) },
        { "key" : "rockRingsLog", "name" : "Rock Rings", "href" : "/training/rings/",
          "line" : entry => ({ "title" : (entry.difficulty || "original") + " workout", "detail" : "" }) },
        { "key" : "tradLog", "name" : "Outside", "href" : "/training/trad/",
          "line" : tradSession }
    ];

    function readLog(app){
        let saved;
        try {
            saved = JSON.parse(localStorage.getItem(app.key));
        } catch(err){
            return [];   // a hand-edited key is not worth a broken page
        }
        if(!Array.isArray(saved)){ return []; }
        return saved.filter(entry => entry && entry.date).map(entry => {
            let described;
            try {
                described = app.line(entry);
            } catch(err){
                described = { "title" : "session", "detail" : "" };
            }
            return {
                "date" : entry.date,
                "id" : entry.id || 0,
                "app" : app,
                "comment" : typeof entry.comment === "string" ? entry.comment : "",
                "rating" : count(entry.rating) || count(entry.score),
                "title" : described.title,
                "detail" : described.detail
            };
        });
    }

    /* An imported UKC logbook as a session a day, less any day the trad app has
       logged as on UKC too. It is edited in UKC, so its link goes there, and it
       has no rating. */
    const ukcApp = { "name" : "UKC", "href" : "https://www.ukclimbing.com/logbook/" };

    function ukcSessions(){
        let days = {};
        ukc.climbs().forEach(climb => {
            (days[climb.date] = days[climb.date] || []).push(climb);
        });
        return Object.keys(days).map(date => {
            let climbs = days[date];
            let hardest = ukc.hardest(climbs);
            let named = hardest !== null && typeof hardest.name === "string" && hardest.name !== "";
            return {
                "date" : date,
                "id" : 0,
                "app" : ukcApp,
                "readOnly" : true,
                "comment" : named && hardest.notes ? hardest.name + ": " + hardest.notes : "",
                "rating" : 0,
                "title" : ukc.summary(climbs),
                "detail" : [named ? "hardest " + hardest.name + " (" + hardest.grade + ")" : "",
                            [...new Set(climbs.map(climb => climb.crag).filter(crag => crag))].join(", ")]
                    .filter(part => part !== "").join(" · ")
            };
        });
    }

    function row(session, place){
        let when = logDateParts(session.date);
        return '<tr><td class="log-date">' + escapeHtml(when.day)
            + (when.year === "" ? "" : '<br /><span class="log-year">' + escapeHtml(when.year) + '</span>')
            + '</td><td class="log-app"><a href="' + session.app.href + '">' + escapeHtml(session.app.name) + '</a></td>'
            + '<td>' + escapeHtml(session.title)
            + (session.detail ? '<br /><span class="log-detail">' + escapeHtml(session.detail) + '</span>' : "")
            + '</td><td class="log-rating">' + sessionStars(session) + '</td>'
            + '<td class="log-actions">' + (session.comment
                ? '<button type="button" class="icon-button demo-icon icon-note" data-note="' + place
                    + '" aria-label="Read the note from ' + escapeHtml(when.day) + '"></button>'
                : "") + '</td></tr>';
    }

    let sessions = [];
    apps.forEach(app => { sessions = sessions.concat(readLog(app)); });
    sessions = sessions.concat(ukcSessions());
    if(sessions.length === 0){ return; }

    // by the day climbed, and by when it was saved where two share a date
    sessions.sort((a, b) => a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date));
    let shown = sessions.slice(0, showAtMost);

    let table = document.getElementById("allLogs");
    table.innerHTML = '<table class="log-table">'
        + '<thead><tr><th>Date</th><th>App</th><th>Session</th><th class="log-rating">Rating</th>'
        + '<th><span class="sr-only">Note</span></th></tr></thead>'
        + '<tbody>' + shown.map(row).join("") + '</tbody></table>';
    table.addEventListener("click", event => {
        let button = event.target.closest("[data-note]");
        if(button === null){ return; }
        event.stopPropagation();   // or the page's own listener closes the note again
        let session = shown[Number(button.dataset.note)];
        showNote(button, session.comment, sessionStars(session), "Note from " + session.date);
    });

    let month = new Date().toISOString().slice(0, 7);
    let thisMonth = sessions.filter(session => session.date.slice(0, 7) === month).length;
    let used = new Set(sessions.map(session => session.app.name)).size;
    document.getElementById("sessionsStats").innerText =
        plural(sessions.length, "session") + " · " + thisMonth + " this month · across " + plural(used, "app");

    if(sessions.length > shown.length){
        document.getElementById("sessionsFoot").innerHTML = "The last " + shown.length + " of " + sessions.length
            + ". The rest are in each app, under the i. " + document.getElementById("sessionsFoot").innerHTML;
    }
    document.getElementById("sessions").hidden = false;
})();
