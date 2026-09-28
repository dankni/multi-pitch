/* The progress page's charts: sport climbs, boulders and trad climbs by grade,
   from the apps' logs and an imported UKC logbook, as plain SVG strings. The
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

    const bands = [
        { "cls" : "band-easy",   "name" : "Easy" },
        { "cls" : "band-medium", "name" : "Medium" },
        { "cls" : "band-hard",   "name" : "Hard" },
        { "cls" : "band-vhard",  "name" : "Very hard" }
    ];

    // French sport grades, easiest first - the ladder common/ukc.js reads UKC's
    // sport grades onto. The chart always shows 5 to 7b as the Gilford wall grades
    // them, and adds anything else only once it is climbed.
    const sportLadder = ukc.sportLadder;
    const sportAlways = ["5", "5+", "6a", "6a+", "6b", "6c", "7a", "7a+", "7b"];

    function sportBand(grade){
        let rung = sportLadder.indexOf(grade);
        if(rung === -1 || rung >= sportLadder.indexOf("7b")){ return bands[3]; }
        if(rung >= sportLadder.indexOf("6c")){ return bands[2]; }
        if(rung >= sportLadder.indexOf("6a")){ return bands[1]; }
        return bands[0];
    }

    function boulderRung(grade){
        let rung = Number(String(grade).replace("V", ""));
        return /^V\d+$/.test(grade) && isFinite(rung) ? rung : -1;
    }

    function boulderBand(grade){
        let rung = boulderRung(grade);
        if(rung >= 8){ return bands[3]; }
        if(rung >= 5){ return bands[2]; }
        if(rung >= 3){ return bands[1]; }
        return bands[0];
    }

    // British adjectival grades, easiest first. VD to E2 always, the rest once
    // climbed. Banded for trad on its own terms rather than lined up with sport:
    // VS is medium, E1 hard and E4 very hard.
    const tradLadder = ukc.tradLadder;
    const tradAlways = ["VD", "S", "HS", "VS", "HVS", "E1", "E2"];

    function tradBand(grade){
        let rung = tradLadder.indexOf(grade);
        if(rung >= tradLadder.indexOf("E4")){ return bands[3]; }
        if(rung >= tradLadder.indexOf("E1")){ return bands[2]; }
        if(rung >= tradLadder.indexOf("MVS")){ return bands[1]; }
        return bands[0];
    }

    /* Every trad climb: the trad app's sessions, and an imported UKC logbook's
       trad climbs - less the days the app says are on UKC as well, which
       ukc.climbs() leaves out (see common/ukc.js) */
    function tradClimbs(logs){
        let climbs = [];
        entriesOf(logs, "tradLog").forEach(entry => {
            list(entry.climbs).forEach(grade => {
                if(tradLadder.includes(grade)){ climbs.push({ "date" : entry.date, "grade" : grade }); }
            });
        });
        ukc.climbs().forEach(climb => {
            if(climb.type === "trad" && tradLadder.includes(climb.grade)){
                climbs.push({ "date" : climb.date, "grade" : climb.grade });
            }
        });
        return climbs;
    }

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

    // Every sport climb with a known grade: tick list routes looked up on the
    // wall, endurance sessions saved since they started keeping their grades, and
    // the sport climbs in a UKC logbook
    function sportClimbs(logs){
        let climbs = [];
        entriesOf(logs, "gilfordLog").forEach(entry => {
            list(entry.climbs).forEach(id => {
                let route = typeof getRoute === "function" ? getRoute(id) : undefined;
                if(route){ climbs.push({ "date" : entry.date, "grade" : route.grade }); }
            });
        });
        entriesOf(logs, "enduranceLog").forEach(entry => {
            list(entry.grades).forEach(grade => {
                if(typeof grade === "string"){ climbs.push({ "date" : entry.date, "grade" : grade }); }
            });
        });
        // sport climbs from a gym session
        entriesOf(logs, "boulderLog").forEach(entry => {
            list(entry.sport).forEach(grade => {
                if(sportLadder.includes(grade)){ climbs.push({ "date" : entry.date, "grade" : grade }); }
            });
        });
        // and sport climbs from an imported UKC logbook
        ukc.climbs().forEach(climb => {
            if(climb.type === "sport" && sportLadder.includes(climb.grade)){
                climbs.push({ "date" : climb.date, "grade" : climb.grade });
            }
        });
        return climbs;
    }

    function boulderClimbs(logs){
        let climbs = [];
        entriesOf(logs, "boulderLog").forEach(entry => {
            list(entry.climbs).forEach(grade => {
                if(boulderRung(grade) !== -1){ climbs.push({ "date" : entry.date, "grade" : grade }); }
            });
        });
        return climbs;
    }

    /* Drawing */

    // 1, 2 or 5 times a power of ten - whole numbers only, a count is never 2.5
    function niceStep(rough){
        if(rough <= 1){ return 1; }
        let power = Math.pow(10, Math.floor(Math.log10(rough)));
        let scaled = rough / power;
        return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * power;
    }

    // A column with its top corners rounded and its foot square on the baseline
    function columnPath(x, y, width, height){
        let r = Math.min(4, width / 2, height);
        return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}`
            + `Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
    }

    /* One column chart.

       columns : [{ label, title, value, cls, before }]

       Where there is a period to compare with, `before` is its count, drawn as a thin line across the bar at that
       height - enough to see up or down at a glance without a second bar
       competing with the first. */
    function columnChart(groups, ariaLabel){
        const width = chartWidth, height = 200;
        const left = 26, right = 4, top = 16, bottom = 22;
        const plotWidth = width - left - right, plotHeight = height - top - bottom;

        let most = 0;
        groups.forEach(group => { most = Math.max(most, group.value, group.before || 0); });
        let step = niceStep(most / 4);
        let ceiling = Math.max(step, Math.ceil(most / step) * step);
        let yOf = value => top + plotHeight - (value / ceiling) * plotHeight;

        let svg = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(ariaLabel)}">`;

        // grid and y labels, behind everything
        for(let tick = 0; tick <= ceiling; tick += step){
            let y = yOf(tick);
            svg += `<line class="${tick === 0 ? "axis" : "grid"}" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}" />`
                + `<text class="tick" x="${left - 6}" y="${y + 4}" text-anchor="end">${tick}</text>`;
        }

        let slot = plotWidth / groups.length;
        // a grade label needs about 20px; short of that - a lot of grades on a
        // phone - every other one is shown, or every third...
        let labelEvery = Math.max(1, Math.ceil(groups.length / Math.floor(plotWidth / 20)));
        let barWidth = Math.min(40, slot * 0.66);

        groups.forEach((group, index) => {
            let x = left + slot * index + (slot - barWidth) / 2;
            let centre = x + barWidth / 2;
            let total = group.value;

            svg += `<g class="column"><title>${escapeHtml(group.title)}</title>`
                + `<rect class="hit" x="${left + slot * index}" y="${top}" width="${slot}" height="${plotHeight}" />`;

            if(total > 0){
                svg += `<path class="bar ${group.cls}" d="${columnPath(x, yOf(total), barWidth, yOf(0) - yOf(total))}" />`;
            }

            // the period before, a little wider than the bar so it shows over it
            if(group.before){
                let y = yOf(group.before);
                svg += `<line class="before" x1="${x - 3}" x2="${x + barWidth + 3}" y1="${y}" y2="${y}" />`;
            }

            // the count sits on its bar, unless the line would run through it -
            // then above the line, so it never reads as the line's number
            if(total > 0 && barWidth >= 8){
                let y = yOf(total) - 5;
                let line = group.before > total ? yOf(group.before) : null;
                if(line !== null && y - line < 14){ y = line - 5; }
                svg += `<text class="count" x="${centre}" y="${y}" text-anchor="middle">${total}</text>`;
            }

            if(index % labelEvery === 0){
                svg += `<text class="label" x="${centre}" y="${height - bottom + 15}" text-anchor="middle">${escapeHtml(group.label)}</text>`;
            }
            svg += `</g>`;
        });

        return svg + `</svg>`;
    }

    function legend(items){
        if(items.length === 0){ return ""; }
        return `<p class="legend">` + items.map(item =>
            `<span class="legend-item"><span class="swatch ${item.cls}" aria-hidden="true"></span>${escapeHtml(item.name)}</span>`
        ).join("") + `</p>`;
    }

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
        return columnChart(groups, summary + ". By grade: " + described + ".")
            + legend(beforeLegend(range));
    }

    // 5 to 7b always, anything else on the ladder only once it has been climbed
    function sportColumns(present){
        let columns = sportLadder.filter(grade => sportAlways.includes(grade) || present.includes(grade));
        let offLadder = [...new Set(present.filter(grade => !sportLadder.includes(grade)))];
        return columns.concat(offLadder);
    }

    // V0 to V8 always, and on up to the hardest one climbed
    function boulderColumns(present){
        let hardest = present.reduce((max, grade) => Math.max(max, boulderRung(grade)), 8);
        let columns = [];
        for(let rung = 0; rung <= hardest; rung++){ columns.push("V" + rung); }
        return columns;
    }

    // VD to E2 always, anything else on the ladder only once it has been climbed
    function tradColumns(present){
        return tradLadder.filter(grade => tradAlways.includes(grade) || present.includes(grade));
    }

    // Whether there is any trad to chart: a trad app session, or a UKC logbook
    function hasTrad(logs){
        return entriesOf(logs, "tradLog").length > 0 || ukc.load() !== null;
    }

    // Under the trad chart: when the logbook came in, what was left off it, and
    // the way to take it off this device again - once there is a logbook. With no
    // trad at all, the chart gives way to a link to the import in the trad app.
    function describeImport(logs){
        let logbook = ukc.load();
        document.getElementById("tradFigure").hidden = !hasTrad(logs);
        document.getElementById("tradPrompt").hidden = hasTrad(logs);
        document.getElementById("ukcNote").hidden = logbook === null;
        if(logbook === null){ return; }

        let parts = String(logbook.imported).split("-");
        let month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(parts[1]) - 1];
        let text = "Imported from UKC on " + (month ? Number(parts[2]) + " " + month + " " + parts[0] : logbook.imported) + ".";
        let leftOut = Number(logbook.leftOut) || 0;
        if(leftOut > 0){
            text += " " + plural(leftOut, "climb") + " left out, with no full date or a grade that could not be read.";
        }
        document.getElementById("ukcImported").textContent = text + " ";
    }

    /* The page */

    function selectedRange(){
        let checked = document.querySelector('input[name="overviewRange"]:checked');
        return checked && ranges[checked.value] ? checked.value : defaultRange;
    }

    function draw(logs){
        let range = selectedRange();
        chartWidth = Math.round(document.getElementById("sportChart").clientWidth) || 520;
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
    const logKeys = ["boulderLog", "gilfordLog", "enduranceLog", "tradLog"];

    function readLogs(){
        let logs = {};
        logKeys.forEach(key => {
            let saved = null;
            try { saved = JSON.parse(localStorage.getItem(key)); } catch(err){ saved = null; }
            logs[key] = list(saved);
        });
        return logs;
    }

    function drawProgress(){
        let logs = readLogs();
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
        draw(logs);

        // Redrawn whenever the chart's own column changes width - the window
        // resizing, or a phone turned on its side
        let resizing = null;
        let redraw = () => {
            clearTimeout(resizing);
            resizing = setTimeout(() => {
                if(Math.round(document.getElementById("sportChart").clientWidth) !== chartWidth){
                    draw(logs);
                }
            }, 100);
        };
        if(typeof ResizeObserver === "function"){
            new ResizeObserver(redraw).observe(document.getElementById("sportChart"));
        } else {
            window.addEventListener("resize", redraw);
        }
    }

    // the last script on the page, so everything it draws into is already there
    drawProgress();
})();
