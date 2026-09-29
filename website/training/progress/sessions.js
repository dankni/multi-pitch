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

    /* A square a day, GitHub style: weeks left to right, Monday at the top, in the
       colour of the hardest grade climbed that day - the charts' easy, medium,
       hard and very hard - or plain for a day with sessions but no grade in them.
       18 weeks at a time, about 120 days, with arrows back through three of them:
       a year. */
    const perDay = {};
    sessions.forEach(session => { perDay[session.date] = (perDay[session.date] || 0) + 1; });
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
                let count = perDay[date] || 0;
                let band = hardest[date];
                if(count > 0){ days++; }
                let kind = count === 0 ? "none" : band ? band.cls : "plain";
                let says = count === 0 ? "no sessions" : plural(count, "session") + (band ? ", hardest " + band.name.toLowerCase() : "");
                squares += `<rect class="day ${kind}" data-date="${date}" x="${(left + week * step).toFixed(1)}"`
                    + ` y="${(top + day * step).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="2">`
                    + `<title>${logDate(date)}: ${says}</title></rect>`;
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
