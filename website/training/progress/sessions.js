/* Every app's sessions, newest first, under the charts on the progress page.

   The apps are pages on one origin, each keeping its log in localStorage under
   a key of its own, so this is a read of their keys rather than anything the
   apps have to publish. Nothing here writes: a session is edited
   or deleted in the app that recorded it, which is the only place that knows
   what its fields mean.

   Each app is described in one line below. That is a second copy of wording
   the app already has, kept deliberately short - the app's own log says the
   whole of it, and this one only has to say which night was which. */
(function(){
    const showAtMost = 25;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function plural(count, word){
        return count + " " + word + (count === 1 ? "" : "s");
    }

    function clock(seconds){
        let whole = Math.max(0, Math.floor(seconds));
        return Math.floor(whole / 3600) + ":"
            + String(Math.floor(whole % 3600 / 60)).padStart(2, "0") + ":"
            + String(whole % 60).padStart(2, "0");
    }

    // V grades sort by their number, not as text: V9 is above V10 as a string
    function hardestV(climbs){
        let hardest = -1;
        climbs.forEach(name => {
            let rung = Number(String(name).replace("V", ""));
            if(!isNaN(rung) && rung > hardest){ hardest = rung; }
        });
        return hardest === -1 ? "" : "hardest V" + hardest;
    }

    const styleNames = { "endurance" : "Endurance", "power" : "Power Endurance" };

    // a field that is not there counts as nothing rather than as "undefined"
    function count(value){
        return typeof value === "number" && isFinite(value) ? value : 0;
    }
    function list(value){
        return Array.isArray(value) ? value : [];
    }

    // The gym session's sport ladder, easiest first - its own order, as in
    // boulder/main.js, since 4+ and 6a do not sort as text
    const sportOrder = ["4", "4+", "5", "5+", "6a", "6b", "6c", "7a", "7b", "7c",
        "8a", "8b", "8c", "9a", "9b", "9c"];

    // A day in the trad app: its climbs, the hardest, and whether it is on UKC
    // too - in which case the UKC day is not listed beside it
    function tradSession(entry){
        let climbs = list(entry.climbs);
        let hardest = climbs.reduce((max, grade) => Math.max(max, ukc.tradLadder.indexOf(grade)), -1);
        return { "title" : plural(climbs.length, "trad climb"),
                 "detail" : [hardest === -1 ? "" : "hardest " + ukc.tradLadder[hardest],
                             entry.ukc === true ? "UKC data ignored" : ""].filter(part => part !== "").join(" · ") };
    }

    // Boulders, and sport climbs once a session has any - older ones never do
    function gymSession(entry){
        let boulders = list(entry.climbs), sport = list(entry.sport);
        let hardestSport = sport.reduce((max, grade) => Math.max(max, sportOrder.indexOf(grade)), -1);
        let title = [boulders.length > 0 || sport.length === 0 ? plural(boulders.length, "boulder") : "",
                     sport.length > 0 ? plural(sport.length, "sport climb") : ""];
        let hardest = [hardestV(boulders).replace("hardest ", ""),
                       hardestSport === -1 ? "" : sportOrder[hardestSport]].filter(grade => grade !== "");
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
                               "detail" : plural(count(entry.sets), "set") + " · "
                                   + count(entry.climbs) + " climbs" }) },
        { "key" : "lapTimerLog", "name" : "Lap Timer", "href" : "/training/timer/",
          "line" : entry => ({ "title" : plural(count(entry.laps), "lap"),
                               "detail" : clock(count(entry.total) / 1000) + " on the clock" }) },
        { "key" : "loftLog", "name" : "Twister", "href" : "/training/loft/",
          "line" : entry => ({ "title" : plural(count(entry.moves), "move"),
                               "detail" : clock(count(entry.seconds)) + " on the clock" }) },
        { "key" : "rockRingsLog", "name" : "Rock Rings", "href" : "/training/rings/",
          "line" : entry => ({ "title" : (entry.difficulty || "original") + " workout", "detail" : "" }) },
        { "key" : "tradLog", "name" : "Trad", "href" : "/training/trad/",
          "line" : tradSession }
    ];

    function readLog(app){
        let saved;
        try {
            saved = JSON.parse(localStorage.getItem(app.key));
        } catch(err){
            return [];   // a key someone has hand-edited is not worth a broken page
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

    /* An imported UKC logbook, as one session for each day climbed - read by
       common/ukc.js, which leaves out a day the trad app has logged and says
       is on UKC as well. It is edited in UKC, so its link goes there. */
    const ukcApp = { "name" : "UKC", "href" : "https://www.ukclimbing.com/logbook/" };

    function ukcSessions(){
        let days = {};
        ukc.climbs().forEach(climb => {
            (days[climb.date] = days[climb.date] || []).push(climb);
        });
        return Object.keys(days).map(date => {
            let climbs = days[date];
            let trad = climbs.filter(climb => climb.type === "trad").length;
            let sport = climbs.length - trad;
            // the day's hardest climb by name, and its notes as the session's note
            let hardest = ukc.hardest(climbs);
            let named = hardest !== null && typeof hardest.name === "string" && hardest.name !== "";
            return {
                "date" : date,
                "id" : 0,
                "app" : ukcApp,
                "comment" : named && hardest.notes ? hardest.name + ": " + hardest.notes : "",
                "rating" : 0,
                "title" : [trad ? plural(trad, "trad climb") : "", sport ? plural(sport, "sport climb") : ""]
                    .filter(part => part !== "").join(", "),
                "detail" : [named ? "hardest " + hardest.name + " (" + hardest.grade + ")" : "",
                            [...new Set(climbs.map(climb => climb.crag).filter(crag => crag))].join(", ")]
                    .filter(part => part !== "").join(" · ")
            };
        });
    }

    function escape(text){
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Five stars for a session - none at all for a UKC day, which UKC
    // exports no rating for: empty stars would read as rated nought
    function starsFor(session){
        if(session.app === ukcApp){ return ""; }
        let stars = "";
        for(let i = 0; i < 5; i++){
            stars += '<i class="demo-icon icon-star ' + (i < session.rating ? "active" : "") + '"></i>';
        }
        return stars;
    }

    function row(session, place){
        let parts = String(session.date).split("-");
        let month = months[Number(parts[1]) - 1];
        let day = parts.length === 3 && month ? Number(parts[2]) + " " + month : session.date;
        let year = parts.length === 3 && month ? parts[0] : "";

        let stars = starsFor(session);

        return '<tr><td class="log-date">' + escape(day)
            + (year === "" ? "" : '<br /><span class="log-year">' + escape(year) + '</span>')
            + '</td><td class="log-app"><a href="' + session.app.href + '">' + escape(session.app.name) + '</a></td>'
            + '<td>' + escape(session.title)
            + (session.detail ? '<br /><span class="log-detail">' + escape(session.detail) + '</span>' : "")
            + '</td><td class="log-rating">' + stars + '</td>'
            + '<td class="log-actions">' + (session.comment
                ? '<i class="demo-icon icon-note" role="button" tabindex="0" data-note="' + place
                    + '" aria-label="Read the note from ' + escape(day) + '"></i>'
                : "") + '</td></tr>';
    }

    let sessions = [];
    apps.forEach(app => { sessions = sessions.concat(readLog(app)); });
    sessions = sessions.concat(ukcSessions());
    if(sessions.length === 0){ return; }

    // by the night climbed, and by when it was saved where two share a date
    sessions.sort((a, b) => a.date === b.date ? b.id - a.id : b.date.localeCompare(a.date));
    let shown = sessions.slice(0, showAtMost);

    document.getElementById("allLogs").innerHTML = '<table class="log-table">'
        + '<thead><tr><th>Date</th><th>App</th><th>Session</th><th class="log-rating">Rating</th>'
        + '<th><span class="sr-only">Note</span></th></tr></thead>'
        + '<tbody>' + shown.map(row).join("") + '</tbody></table>';

    /* The note behind the speech icon, as showSessionNote() does it in
       common/functions.js - the same card, the same placing, closing on a tap
       outside it or on Escape. The handler is on the table rather than on each
       icon, since the rows are written as a string. */
    function hideNote(){
        let open = document.getElementById("sessionNote");
        if(open !== null){ open.remove(); }
    }

    function showNote(icon, session){
        let open = document.getElementById("sessionNote");
        let sameOne = open !== null && open.dataset.place === icon.dataset.note;
        hideNote();
        if(sameOne || !session || !session.comment){ return; }

        let stars = starsFor(session);

        let note = document.createElement("div");
        note.id = "sessionNote";
        note.className = "comment-pop";
        note.dataset.place = icon.dataset.note;
        note.setAttribute("role", "dialog");
        note.setAttribute("aria-label", "Note from " + session.date);
        note.innerHTML = (stars ? '<p class="comment-pop-stars">' + stars + '</p>' : "")
            + '<p class="comment-pop-text"></p>';
        // as text, not markup: a note is whatever was typed into it
        note.querySelector(".comment-pop-text").innerText = session.comment;
        document.body.appendChild(note);

        // by the icon that opened it, and never off the side of the screen
        let box = icon.getBoundingClientRect();
        let width = note.offsetWidth;
        note.style.left = Math.min(Math.max(8, box.left + (box.width / 2) - (width / 2)),
            window.innerWidth - width - 8) + "px";
        note.style.top = (box.bottom + 8) + "px";
        if(box.bottom + 8 + note.offsetHeight > window.innerHeight){
            note.style.top = Math.max(8, box.top - 8 - note.offsetHeight) + "px";
        }
        note.classList.add("shown");
    }

    document.getElementById("allLogs").addEventListener("click", event => {
        let icon = event.target.closest("[data-note]");
        if(icon === null){ return; }
        event.stopPropagation();   // the document listener would close it again
        showNote(icon, shown[Number(icon.dataset.note)]);
    });
    document.getElementById("allLogs").addEventListener("keydown", event => {
        let icon = event.target.closest("[data-note]");
        if(icon === null || (event.code !== "Enter" && event.code !== "Space")){ return; }
        event.preventDefault();
        icon.click();
    });
    document.addEventListener("click", event => {
        if(event.target.closest && event.target.closest(".comment-pop")){ return; }
        hideNote();
    });
    document.addEventListener("keydown", event => {
        if(event.code === "Escape"){ hideNote(); }
    });

    let month = new Date().toISOString().slice(0, 7);
    let thisMonth = sessions.filter(session => session.date.slice(0, 7) === month).length;
    let used = new Set(sessions.map(session => session.app.name)).size;
    document.getElementById("sessionsStats").innerText =
        plural(sessions.length, "session") + " · " + thisMonth + " this month · across "
        + plural(used, "app");

    if(sessions.length > shown.length){
        document.getElementById("sessionsFoot").innerHTML =
            "The last " + shown.length + " of " + sessions.length
            + ". The rest are in each app, under the i. "
            + document.getElementById("sessionsFoot").innerHTML;
    }

    document.getElementById("sessions").hidden = false;
})();
