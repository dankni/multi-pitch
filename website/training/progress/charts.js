/* The progress page's charts: sport climbs, boulders and trad climbs by grade,
   from the apps' logs and an imported UKC logbook, drawn by common/charts.js. The
   year, 30 and 7 day views draw the period before as a line across each bar.
   Days are the UTC yyyy-mm-dd the apps store, compared as strings. A bar's colour
   says how hard its grade is; the grade is written under it. */
(function(){
    const day = 86400000;

    /* Charts are drawn at the pixel width they are shown at, not scaled from a
       fixed one - scaled down to a phone, 11px labels come out at 7. So they are
       redrawn when that width changes. */
    let chartWidth = 520;
    const rangeKey = "overviewRange";

    // A year is the default: long enough to show a season, short enough that
    // it is this climber now rather than everything they ever did
    const ranges = {
        "all" : { "days" : 0 },
        "365" : { "days" : 365, "current" : "the last year", "previous" : "the year before" },
        "30"  : { "days" : 30 },
        "7"   : { "days" : 7 }
    };
    const defaultRange = "365";

    const bands = gradeBands.bands;
    const sportBand = gradeBands.sport, boulderBand = gradeBands.boulder, tradBand = gradeBands.trad;

    /* Every climb of a kind: each app's saved sessions, read by entryClimbs() in
       common/charts.js, and an imported UKC logbook's. A trad session merged with
       UKC counts its day's trad climbs once, whichever has more, and ukc.climbs()
       leaves them out (see common/ukc.js) */
    const logKeys = ["boulderLog", "gilfordLog", "enduranceLog", "tradLog", "lapTimerLog", "dansLoftLog"];
    const onLadder = {
        "sport" : grade => sportLadder.includes(grade),
        "boulder" : grade => boulderRung(grade) !== -1,
        "trad" : grade => tradLadder.includes(grade)
    };

    function climbsOfKind(logs, kind){
        let climbs = [];
        logKeys.forEach(key => entriesOf(logs, key).forEach(entry => {
            let read = key === "tradLog" ? Object.assign({}, entry, { "climbs" : ukc.session(entry).climbs }) : entry;
            entryClimbs(key, read).forEach(climb => {
                if(climb.kind === kind){ climbs.push({ "date" : entry.date, "grade" : climb.grade }); }
            });
        }));
        ukc.climbs().forEach(climb => {
            if(climb.type === kind && onLadder[kind](climb.grade)){ climbs.push({ "date" : climb.date, "grade" : climb.grade }); }
        });
        return climbs;
    }

    const sportClimbs = logs => climbsOfKind(logs, "sport");
    const boulderClimbs = logs => climbsOfKind(logs, "boulder");
    const tradClimbs = logs => climbsOfKind(logs, "trad");

    /* Days and windows */

    function dayString(offset){
        return new Date(Date.now() - offset * day).toISOString().slice(0, 10);
    }

    function within(date, window){
        return date >= window.from && date <= window.to;
    }

    // The period on screen and the one before it, or everything for all time
    function windowsFor(range){
        let days = ranges[range].days;
        if(days === 0){
            return { "current" : { "from" : "", "to" : "9999" }, "previous" : null };
        }
        return {
            "current" : { "from" : dayString(days - 1), "to" : dayString(0) },
            "previous" : { "from" : dayString(days * 2 - 1), "to" : dayString(days) }
        };
    }

    function periodName(range, which){
        let named = ranges[range][which];
        if(named){ return named; }
        let days = ranges[range].days;
        return which === "current" ? "the last " + days + " days" : "the " + days + " days before";
    }

    /* Reading the logs - defensively, as the table below the charts does */

    function list(value){
        return Array.isArray(value) ? value : [];
    }

    function entriesOf(logs, key){
        return list(logs[key]).filter(entry => entry && typeof entry.date === "string");
    }

    /* Drawing */

    // the key to the line, where there is one
    function beforeLegend(range){
        if(ranges[range].days === 0){ return []; }
        let name = periodName(range, "previous");
        return [{ "cls" : "before", "name" : name.charAt(0).toUpperCase() + name.slice(1) }];
    }

    function empty(message){
        return `<p class="chart-empty">${escapeHtml(message)}</p>`;
    }

    /* The two grade charts: a column per grade, with a line for the period
       before when there is one */

    function drawGrades(climbs, range, columns, bandOf, noun, totalId){
        let windows = windowsFor(range);
        let current = climbs.filter(climb => within(climb.date, windows.current));
        let previous = windows.previous ? climbs.filter(climb => within(climb.date, windows.previous)) : [];
        let total = document.getElementById(totalId);

        if(current.length + previous.length === 0){
            total.innerText = "";
            return empty(windows.previous
                ? "No " + noun + "s in " + periodName(range, "current") + " or " + periodName(range, "previous") + "."
                : "No " + noun + "s logged yet.");
        }

        let grades = columns(current.concat(previous).map(climb => climb.grade));
        let countOf = (list, grade) => list.filter(climb => climb.grade === grade).length;

        let groups = grades.map(grade => {
            let now = countOf(current, grade);
            let before = windows.previous ? countOf(previous, grade) : null;
            let title = grade + ": " + now;
            if(before !== null){
                title += " in " + periodName(range, "current") + ", " + before + " in " + periodName(range, "previous");
            }
            return { "label" : grade, "title" : title, "value" : now, "cls" : bandOf(grade).cls, "before" : before };
        });

        let summary = windows.previous
            ? plural(current.length, noun) + " in " + periodName(range, "current") + ", " + previous.length + " in " + periodName(range, "previous")
            : plural(current.length, noun) + " in all";
        total.innerText = summary;

        let described = groups.map(group => group.label + " " + group.value).join(", ");
        return columnChart(groups, summary + ". By grade: " + described + ".", chartWidth)
            + chartLegend(beforeLegend(range));
    }

    // Whether there is any trad to chart: a trad app session, or a UKC logbook
    function hasTrad(logs){
        return entriesOf(logs, "tradLog").length > 0 || ukc.load() !== null;
    }

    // Under the trad chart: when the logbook came in, what was left off it, and
    // the way to take it off this device again - once there is a logbook
    function describeImport(logs){
        let logbook = ukc.load();
        document.getElementById("tradFigure").hidden = !hasTrad(logs);
        document.getElementById("ukcNote").hidden = logbook === null;
        document.getElementById("ukcSettingsNote").hidden = logbook === null;
        if(logbook === null){ return; }

        let parts = String(logbook.imported).split("-");
        let month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(parts[1]) - 1];
        let text = "Imported from UKC on " + (month ? Number(parts[2]) + " " + month + " " + parts[0] : logbook.imported) + ".";
        let leftOut = Number(logbook.leftOut) || 0;
        if(leftOut > 0){
            text += " " + plural(leftOut, "climb") + " left out, with no full date or a grade that could not be read.";
        }
        document.getElementById("ukcImported").textContent = text + " ";
        document.getElementById("ukcSettingsImported").textContent = text + " ";
    }

    /* The page */

    function selectedRange(){
        let checked = document.querySelector('input[name="overviewRange"]:checked');
        return checked && ranges[checked.value] ? checked.value : defaultRange;
    }

    // the first chart on show; any of them can be switched off
    function chartColumn(){
        return ["sportChart", "boulderChart", "tradChart"].map(id => document.getElementById(id))
            .find(chart => chart.clientWidth > 0) || document.getElementById("sportChart");
    }

    function draw(logs){
        let range = selectedRange();
        chartWidth = Math.round(chartColumn().clientWidth) || 520;
        document.getElementById("sportChart").innerHTML =
            drawGrades(sportClimbs(logs), range, sportColumns, sportBand, "climb", "sportTotal");
        document.getElementById("boulderChart").innerHTML =
            drawGrades(boulderClimbs(logs), range, boulderColumns, boulderBand, "boulder", "boulderTotal");
        if(hasTrad(logs)){
            document.getElementById("tradChart").innerHTML =
                drawGrades(tradClimbs(logs), range, tradColumns, tradBand, "trad climb", "tradTotal");
        }
    }

    /* The logs the charts are drawn from, as the apps saved them. A key someone
       has hand-edited into something that is not a list counts as empty rather
       than breaking the page. */
    function readLogs(){
        let logs = {};
        logKeys.forEach(key => {
            let saved = null;
            try { saved = JSON.parse(localStorage.getItem(key)); } catch(err){ saved = null; }
            logs[key] = list(saved);
        });
        return logs;
    }

    // Bars grow in the first time each chart is seen, once per page load
    function growOnFirstSight(){
        if(typeof IntersectionObserver !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches){ return; }
        let seen = new IntersectionObserver(entries => entries.forEach(entry => {
            if(!entry.isIntersecting){ return; }
            seen.unobserve(entry.target);
            entry.target.dataset.grow = "go";
            setTimeout(() => delete entry.target.dataset.grow, 3000);
        }), { "threshold" : 0.4 });
        ["sportChart", "boulderChart", "tradChart"].forEach(id => {
            let chart = document.getElementById(id);
            chart.dataset.grow = "wait";
            seen.observe(chart);
        });
    }

    function drawProgress(){
        let logs = readLogs();
        // the way to import a UKC logbook, until there is one - even with nothing else to show
        document.getElementById("ukcPrompt").hidden = ukc.load() !== null;
        // only the timer apps used, say - empty charts would say nothing, so the
        // page says so instead
        if(sportClimbs(logs).length + boulderClimbs(logs).length === 0 && !hasTrad(logs)){
            document.getElementById("progressEmpty").hidden = false;
            return;
        }
        describeImport(logs);

        let saved = null;
        try { saved = localStorage.getItem(rangeKey); } catch(err){ saved = null; }
        let radio = document.getElementById("range-" + (ranges[saved] ? saved : defaultRange));
        if(radio){ radio.checked = true; }

        document.querySelectorAll('input[name="overviewRange"]').forEach(input => {
            input.addEventListener("change", () => {
                try { localStorage.setItem(rangeKey, selectedRange()); } catch(err){ /* only a preference */ }
                draw(logs);
            });
        });

        // shown first, so there is a width to draw to
        document.getElementById("performance").hidden = false;
        growOnFirstSight();
        draw(logs);

        // Redrawn whenever the chart's own column changes width - the window
        // resizing, or a phone turned on its side
        let resizing = null;
        let redraw = () => {
            clearTimeout(resizing);
            resizing = setTimeout(() => {
                if(Math.round(chartColumn().clientWidth) !== chartWidth){
                    draw(logs);
                }
            }, 100);
        };
        if(typeof ResizeObserver === "function"){
            let observer = new ResizeObserver(redraw);
            ["sportChart", "boulderChart", "tradChart"].forEach(id => observer.observe(document.getElementById(id)));
        } else {
            window.addEventListener("resize", redraw);
        }
    }

    // The hardest band climbed each day, by date - for the calendar in sessions.js
    window.hardestBands = function(){
        let logs = readLogs();
        let hardest = {};
        [[sportClimbs, sportBand], [boulderClimbs, boulderBand], [tradClimbs, tradBand]].forEach(([climbsOf, bandOf]) => {
            climbsOf(logs).forEach(climb => {
                let band = bandOf(climb.grade);
                if(hardest[climb.date] === undefined || bands.indexOf(band) > bands.indexOf(hardest[climb.date])){
                    hardest[climb.date] = band;
                }
            });
        });
        return hardest;
    };

    // the last script on the page, so everything it draws into is already there
    drawProgress();
})();
