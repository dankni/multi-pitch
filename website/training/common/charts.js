/* Charts of climbs by grade, as plain SVG strings: the progress page's and the
   session summary's (common/summary.js). And the climbs a saved session holds,
   by kind, whichever app's log it is from. Needs common/grades.js; a gym
   session's sport grades also want common/ukc.js, the tick list's routes
   gilford-routes.js and the loft's dansloft-routes.js. */

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

/* One column chart, drawn at the width it is shown at so its 11px labels stay 11px.

   groups : [{ label, title, value, cls, before }]

   Where there is something to compare with, `before` is its count, drawn as a
   thin line across the bar at that height - enough to see up or down at a
   glance without a second bar competing with the first. */
function columnChart(groups, ariaLabel, width){
    const height = 200;
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

        svg += `<g class="column" style="--i:${index}"><title>${escapeHtml(group.title)}</title>`
            + `<rect class="hit" x="${left + slot * index}" y="${top}" width="${slot}" height="${plotHeight}" />`;

        if(total > 0){
            svg += `<path class="bar ${group.cls}" d="${columnPath(x, yOf(total), barWidth, yOf(0) - yOf(total))}" />`;
        }

        // the one before, a little wider than the bar so it shows over it
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

function chartLegend(items){
    if(items.length === 0){ return ""; }
    return `<p class="legend">` + items.map(item =>
        `<span class="legend-item"><span class="swatch ${item.cls}" aria-hidden="true"></span>${escapeHtml(item.name)}</span>`
    ).join("") + `</p>`;
}

/* The grades a chart has a column for */

function boulderRung(grade){
    let rung = Number(String(grade).replace("V", ""));
    return /^V\d+$/.test(grade) && isFinite(rung) ? rung : -1;
}

// 5 to 7b always, as the Gilford wall grades them; anything else on the ladder once climbed
const sportAlways = ["5", "5+", "6a", "6a+", "6b", "6c", "7a", "7a+", "7b"];

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

// British adjectival grades: VD to E2 always, the rest once climbed
const tradAlways = ["VD", "S", "HS", "VS", "HVS", "E1", "E2"];

function tradColumns(present){
    return tradLadder.filter(grade => tradAlways.includes(grade) || present.includes(grade));
}

// Each kind of climb a chart is drawn for: its columns, its grade colours and what one is called
const climbKinds = {
    "sport"   : { "columns" : sportColumns,   "band" : gradeBands.sport,   "noun" : "climb",      "title" : "Sport" },
    "boulder" : { "columns" : boulderColumns, "band" : gradeBands.boulder, "noun" : "boulder",    "title" : "Bouldering" },
    "trad"    : { "columns" : tradColumns,    "band" : gradeBands.trad,    "noun" : "trad climb", "title" : "Trad" }
};

/* The climbs in one saved session, as [{ kind, grade }], read defensively as a
   hand-edited log could hold anything: tick list routes looked up on the wall,
   endurance grades, a gym session's boulders and its sport climbs (4c as 4+ and
   so on), the loft's routes as the boulder grade a plus is a shade of, a
   circuit logged at a grade as a boulder a lap, and trad grades */
function entryClimbs(logKey, entry){
    let list = value => Array.isArray(value) ? value : [];
    let climbs = [];
    let add = (kind, grade) => { if(grade){ climbs.push({ "kind" : kind, "grade" : grade }); } };
    if(logKey === "gilfordLog"){
        list(entry.climbs).forEach(id => {
            let route = typeof getRoute === "function" ? getRoute(id) : undefined;
            if(route){ add("sport", route.grade); }
        });
    } else if(logKey === "enduranceLog"){
        list(entry.grades).forEach(grade => { if(typeof grade === "string"){ add("sport", grade); } });
    } else if(logKey === "boulderLog"){
        list(entry.climbs).forEach(grade => { if(boulderRung(grade) !== -1){ add("boulder", grade); } });
        list(entry.sport).forEach(tapped => {
            if(typeof tapped === "string" && typeof ukc !== "undefined"){ add("sport", ukc.sportGrade(tapped)); }
        });
    } else if(logKey === "dansLoftLog"){
        list(entry.climbs).forEach(id => add("boulder", typeof loftBoulderGrade === "function" ? loftBoulderGrade(id) : undefined));
    } else if(logKey === "lapTimerLog"){
        if(boulderRung(entry.grade) !== -1){
            for(let lap = 0; lap < Math.floor(Number(entry.laps) || 0); lap++){ add("boulder", entry.grade); }
        }
    } else if(logKey === "tradLog"){
        list(entry.climbs).forEach(grade => { if(tradLadder.includes(grade)){ add("trad", grade); } });
    }
    return climbs;
}

/* An SVG on the page as an image, for a canvas to draw: an SVG drawn as an
   image has no stylesheet, so each part's colours and sizes are written onto a
   copy of it. Resolves null if it won't draw. */
const svgImageStyles = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
    "font-size", "font-family", "font-weight", "opacity"];

function svgImage(svg){
    let copy = svg.cloneNode(true);
    let shown = svg.querySelectorAll("*");
    copy.querySelectorAll("*").forEach((part, index) => {
        let style = getComputedStyle(shown[index]);
        svgImageStyles.forEach(name => part.setAttribute(name, style.getPropertyValue(name)));
    });
    let box = svg.viewBox.baseVal;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", box.width);
    copy.setAttribute("height", box.height);
    let url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { "type" : "image/svg+xml" }));
    return new Promise(resolve => {
        let image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
        image.src = url;
    });
}

// To the share sheet where it takes images, a download where it doesn't
function shareImage(canvas, name, event){
    return new Promise(resolve => canvas.toBlob(resolve, "image/png")).then(blob => {
        if(blob === null){ return; }
        let file = new File([blob], name, { "type" : "image/png" });
        if(typeof gtag === "function"){ gtag("event", event, { "app" : document.title }); }
        if(navigator.canShare && navigator.canShare({ "files" : [file] })){
            navigator.share({ "files" : [file], "title" : document.title }).catch(() => {});   // closing the sheet is a rejection too
            return;
        }
        let link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
}
