/* Every app's sessions, newest first, on the progress page: a calendar over
   the charts and the activity log under them -
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

    // The gym session's sport grades, from common/grades.js - 4+ and 6a don't sort as text
    const sportOrder = gymSportOrder;

    // Merged with that day in UKC, its climbs and note are the merge's - see common/ukc.js
    function tradSession(entry){
        let merge = ukc.session(entry);
        let climbs = list(merge.climbs);
        let hardest = climbs.reduce((max, grade) => Math.max(max, ukc.tradLadder.indexOf(grade)), -1);
        return { "title" : plural(climbs.length, "trad climb"),
                 "detail" : joinDetail([hardest === -1 ? "" : "hardest " + ukc.tradLadder[hardest], sessionLength(entry),
                                        merge.merged ? "merged with UKC" : ""]),
                 "comment" : merge.comment };
    }

    /* The score, just a number. Runs from before the score was kept have
       seconds of pull (or "metres" at 1 m/s), at the game's 3 m/s climb. */
    function gapsSession(entry){
        let pulled = count(entry.seconds ?? entry.metres);
        let score = typeof entry.score === "number" ? entry.score : pulled * 3;
        return { "title" : Math.round(score).toLocaleString("en-GB"),
                 "detail" : "",
                 "unrated" : true,   // its score is points, not stars
                 "tindeq" : entry.input === "tindeq",
                 "comment" : [plural(count(entry.walls ?? entry.gaps), "wall"),
                              count(entry.coins) > 0 ? plural(entry.coins, "coin") : "",
                              Math.round(pulled) + " s pulled",
                              typeof entry.peakKg === "number" ? "max pull " + entry.peakKg + " kg" : ""].filter(part => part !== "").join(" · ") };
    }

    // Boulders, and sport climbs once a session has any
    function gymSession(entry){
        let boulders = list(entry.climbs), sport = list(entry.sport);
        let hardestSport = sport.reduce((max, grade) => Math.max(max, sportOrder.indexOf(grade)), -1);
        let title = [boulders.length > 0 || sport.length === 0 ? plural(boulders.length, "boulder") : "",
                     sport.length > 0 ? plural(sport.length, "sport climb") : ""];
        let hardest = [hardestV(boulders), hardestSport === -1 ? "" : sportOrder[hardestSport]].filter(grade => grade !== "");
        return { "title" : title.filter(part => part !== "").join(", "),
                 "detail" : joinDetail([hardest.length > 0 ? "hardest " + hardest.join(" · ") : "", sessionLength(entry)]) };
    }

    /* Reps of work and rest, or in repeater mode sets of them with a rest between.
       Saved before reps were called reps, a session's reps were its "sets". */
    function tabataReps(entry){
        return count(typeof entry.reps === "number" ? entry.reps : entry.sets);
    }
    function tabataSession(entry){
        let reps = tabataReps(entry);
        let onOff = `${count(entry.work)}s on, ${count(entry.rest)}s off`;
        return typeof entry.setRest === "number"
            ? { "title" : typeof entry.routine === "string" && entry.routine ? entry.routine : "Repeaters",
                "detail" : plural(count(entry.sets), "set") + " of " + reps + " · " + onOff }
            : { "title" : plural(reps, "rep"), "detail" : onOff };
    }
    // the whole session: no rest after a set's last rep, the rest between sets instead
    function tabataSeconds(entry){
        let sets = typeof entry.setRest === "number" ? Math.max(1, count(entry.sets)) : 1;
        let reps = tabataReps(entry);
        return sets * (reps * (count(entry.work) + count(entry.rest)) - count(entry.rest)) + (sets - 1) * count(entry.setRest);
    }

    // A fixed length workout's seconds on the clock when it was saved, or, saved
    // before it kept them, the whole workout
    function ranFor(entry, fullSeconds){
        return (count(entry.seconds) || fullSeconds) / 60;
    }

    const apps = [
        { "key" : "boulderLog", "name" : "Gym Session", "href" : "/training/boulder/",
          "line" : gymSession, "climbs" : entry => list(entry.climbs).length + list(entry.sport).length },
        { "key" : "gilfordLog", "name" : "Tick List", "href" : "/training/gilford/",
          "line" : entry => ({ "title" : plural(list(entry.climbs).length, "climb"), "detail" : sessionLength(entry) }),
          "climbs" : entry => list(entry.climbs).length },
        { "key" : "enduranceLog", "name" : "Endurance", "href" : "/training/endurance/",
          "line" : entry => ({ "title" : (styleNames[entry.style] || entry.style || "Endurance")
                                   + (entry.maxGrade ? " off " + entry.maxGrade : ""),
                               "detail" : joinDetail([plural(count(entry.sets), "set"), count(entry.climbs) + " climbs", sessionLength(entry)]) }),
          "climbs" : entry => count(entry.climbs) },
        { "key" : "lapTimerLog", "name" : "Lap Timer", "href" : "/training/timer/",
          "line" : entry => ({ "title" : plural(count(entry.laps), "lap") + (typeof entry.grade === "string" && entry.grade ? " of " + entry.grade : ""),
                               "detail" : formatClock(count(entry.total) / 1000) + " on the clock" }),
          "minutes" : entry => count(entry.total) / 60000, "climbs" : entry => count(entry.laps) },
        { "key" : "loftLog", "name" : "Twister", "href" : "/training/loft/",
          "line" : entry => ({ "title" : plural(count(entry.moves), "move"),
                               "detail" : formatClock(count(entry.seconds)) + " on the clock" }),
          "minutes" : entry => count(entry.seconds) / 60 },
        { "key" : "rockRingsLog", "name" : "Rock Rings", "href" : "/training/rings/",
          "line" : entry => ({ "title" : (entry.difficulty || "original") + " workout", "detail" : "" }),
          "minutes" : entry => ranFor(entry, 10 * 60) },
        { "key" : "tradLog", "name" : "Outside", "href" : "/training/trad/",
          "line" : tradSession, "climbs" : entry => list(ukc.session(entry).climbs).length },
        { "key" : "noHangsLog", "name" : "No Hangs", "href" : "/training/nohangs/",
          "line" : () => ({ "title" : "Sub-max daily", "detail" : "" }),
          "minutes" : entry => ranFor(entry, 20 * 30 - 20) },   // 20 reps of a 10 s hang and 20 s rest, none after the last
        { "key" : "tabataLog", "name" : "Tabata", "href" : "/training/tabata/",
          "line" : tabataSession, "minutes" : entry => ranFor(entry, tabataSeconds(entry)) },
        // a run on the screen is a game, not training
        { "key" : "gapsLog", "name" : "Tindeq Arcade", "href" : "/training/gaps/",
          "line" : gapsSession, "keep" : entry => entry.input === "tindeq", "minutes" : entry => count(entry.time) / 60 }
    ];

    /* How long a session took, in minutes. The timed apps save minutes; the lap
       timer, Twister, the arcade and the two workouts say how long in their own
       units, given as "minutes" above. An Outside session from before it was
       timed, or a UKC day, counts for none. */
    function minutesOf(app, entry){
        return app.minutes ? app.minutes(entry) : count(entry.minutes);
    }

    function readLog(app){
        let saved;
        try {
            saved = JSON.parse(localStorage.getItem(app.key));
        } catch(err){
            return [];   // a hand-edited key is not worth a broken page
        }
        if(!Array.isArray(saved)){ return []; }
        return saved.filter(entry => entry && entry.date && (!app.keep || app.keep(entry))).map(entry => {
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
                "comment" : described.comment ?? (typeof entry.comment === "string" ? entry.comment : ""),
                "rating" : count(entry.rating) || count(entry.score),
                "minutes" : minutesOf(app, entry),
                "climbs" : app.climbs ? app.climbs(entry) : 0,
                "unrated" : described.unrated === true,
                "tindeq" : described.tindeq === true,
                "title" : described.title,
                "detail" : described.detail,
                "name" : typeof entry.title === "string" ? entry.title.slice(0, titleLimit) : ""   // the title typed for it, if any
            };
        });
    }

    /* An imported UKC logbook as a session a day, less the trad climbs of a day
       merged into a trad app session - there are none left of a day all trad. It
       is edited in UKC, so its link goes there, and it has no rating. */
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
                "climbs" : climbs.length,
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
            + '</td><td class="log-app"><a href="' + session.app.href + '">' + escapeHtml(session.app.name) + '</a>'
            + (session.name ? '<br /><span class="log-title">' + escapeHtml(session.name) + '</span>' : "") + '</td>'
            + '<td>' + escapeHtml(session.title) + (session.tindeq ? tindeqMark : "")
            + (session.detail ? '<br /><span class="log-detail">' + escapeHtml(session.detail) + '</span>' : "")
            + '</td><td class="log-rating">' + (session.unrated ? "" : sessionStars(session)) + '</td>'
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
        showNote(button, session.comment, session.unrated ? "" : sessionStars(session), "Note from " + session.date);
    });

    let month = new Date().toISOString().slice(0, 7);
    let monthsSessions = sessions.filter(session => session.date.slice(0, 7) === month);
    // time trained this month, from the apps that keep it - nothing said with none
    let trained = sessionLength({ "minutes" : Math.round(monthsSessions.reduce((total, session) => total + (session.minutes || 0), 0)) });
    let climbed = monthsSessions.reduce((total, session) => total + (session.climbs || 0), 0);
    document.getElementById("sessionsStats").innerText = ["This month", plural(monthsSessions.length, "session"),
        trained ? trained + " trained" : "", plural(climbed, "climb") + " done"].filter(part => part !== "").join(" · ");

    if(sessions.length > shown.length){
        document.getElementById("sessionsFoot").innerHTML = "The last " + shown.length + " of " + sessions.length
            + ". The rest are in each app, under the i. " + document.getElementById("sessionsFoot").innerHTML;
    }
    document.getElementById("sessions").hidden = false;
    document.getElementById("activity").hidden = false;

    /* A square a day, GitHub style: weeks left to right, Monday at the top, in the
       colour of the hardest grade climbed that day - the charts' easy, medium,
       hard and very hard - or plain for a day with sessions but no grade in them.
       18 weeks at a time, about 120 days, with arrows back through three of them:
       a year. */
    const perDay = {};
    sessions.forEach(session => { (perDay[session.date] = perDay[session.date] || []).push(session); });

    // A day's sessions as the log names them, a line each - its hover text, and what a tap shows
    function daySays(date){
        return [logDate(date)].concat((perDay[date] || []).map(session =>
            session.app.name + ": " + session.title + (session.detail ? " · " + session.detail : ""))).join("\n");
    }
    const hardest = typeof hardestBands === "function" ? hardestBands() : {};
    const dayLength = 86400000;
    const calendarWeeks = 18;
    const calendarPages = 3;
    const calendar = document.getElementById("sessionCalendar");
    let calendarPage = 0;   // 0 is the latest
    let calendarWidth = 0;

    function chevron(path){
        return `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;
    }

    function drawCalendar(){
        const left = 26, top = 14;
        let step = Math.min(18, (calendarWidth - left) / calendarWeeks);   // squares no bigger than 16px
        let size = step - 2;
        let width = left + calendarWeeks * step;
        let now = Date.parse(today());   // a UTC day, as the apps store them
        let thisMonday = now - ((new Date(now).getUTCDay() + 6) % 7) * dayLength;
        let start = thisMonday - ((calendarPage + 1) * calendarWeeks - 1) * 7 * dayLength;
        let last = Math.min(now, start + (calendarWeeks * 7 - 1) * dayLength);
        let days = 0, squares = "", months = "", lastMonth = -1, lastLabel = -4;

        for(let week = 0; week < calendarWeeks; week++){
            let monday = start + week * 7 * dayLength;
            let month = new Date(monday).getUTCMonth();
            // a month's name where it starts, with room for it and clear of the last one
            if(month !== lastMonth && week - lastLabel >= 3 && left + week * step + 16 <= width){
                months += `<text x="${(left + week * step).toFixed(1)}" y="9">${logMonths[month]}</text>`;
                lastLabel = week;
            }
            lastMonth = month;
            for(let day = 0; day < 7 && monday + day * dayLength <= last; day++){
                let date = new Date(monday + day * dayLength).toISOString().slice(0, 10);
                let count = (perDay[date] || []).length;
                let band = hardest[date];
                if(count > 0){ days++; }
                let kind = count === 0 ? "none" : band ? band.cls : "plain";
                squares += `<rect class="day ${kind}" data-date="${date}" x="${(left + week * step).toFixed(1)}"`
                    + ` y="${(top + day * step).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="2">`
                    + `<title>${escapeHtml(count === 0 ? logDate(date) + ": no sessions" : daySays(date))}</title></rect>`;
            }
        }
        let weekdays = [["Mon", 0], ["Wed", 2], ["Fri", 4]]
            .map(([name, row]) => `<text x="0" y="${(top + row * step + size - 1).toFixed(1)}">${name}</text>`).join("");
        // "11 May - 13 Sep 2026", the first year only where it differs
        let from = logDateParts(new Date(start).toISOString().slice(0, 10));
        let to = logDateParts(new Date(last).toISOString().slice(0, 10));
        let span = `${from.day}${from.year === to.year ? "" : " " + from.year} – ${to.day} ${to.year}`;

        calendar.innerHTML = `<svg class="calendar" width="${width.toFixed(1)}" viewBox="0 0 ${width.toFixed(1)} ${Math.ceil(top + 7 * step)}" role="img"`
            + ` aria-label="${span}: ${plural(days, "day")} climbed">${months}${weekdays}${squares}</svg>`
            + `<div class="calendar-nav" style="max-width: ${width.toFixed(1)}px">`
            + `<button type="button" class="icon-button calendar-arrow" data-calendar="1" aria-label="Earlier weeks"${calendarPage === calendarPages - 1 ? " disabled" : ""}>${chevron("M10 3 5 8l5 5")}</button>`
            + `<p class="sessions-note calendar-key">${span} &middot; ${plural(days, "day")} climbed</p>`
            + `<button type="button" class="icon-button calendar-arrow" data-calendar="-1" aria-label="Later weeks"${calendarPage === 0 ? " disabled" : ""}>${chevron("M6 3l5 5-5 5")}</button>`
            + `</div>`;
    }

    calendar.addEventListener("click", event => {
        // a day with sessions: the hover text, which a phone has no hover to show
        let day = event.target.closest(".day:not(.none)");
        if(day !== null){
            event.stopPropagation();   // or the page's own listener closes the note again
            showNote(day, daySays(day.dataset.date), "", "Sessions on " + day.dataset.date);
            return;
        }
        let arrow = event.target.closest("[data-calendar]");
        if(arrow === null || arrow.disabled){ return; }
        calendarPage = Math.max(0, Math.min(calendarPages - 1, calendarPage + Number(arrow.dataset.calendar)));
        drawCalendar();
        calendar.querySelector(`[data-calendar="${arrow.dataset.calendar}"]`).focus();   // keep the keyboard where it was
    });

    // drawn to its column, and again when that changes width - a window resized, or a phone turned
    function fitCalendar(){
        let width = Math.round(calendar.clientWidth) || 520;
        if(width === calendarWidth){ return; }
        calendarWidth = width;
        drawCalendar();
    }
    fitCalendar();
    if(typeof ResizeObserver === "function"){ new ResizeObserver(fitCalendar).observe(calendar); }
})();
