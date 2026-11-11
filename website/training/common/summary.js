/* The summary a session opens on at FINISH: the app's name, the climbs by grade
   against the last session saved in the same app, drawn as the progress page
   draws them (common/charts.js), the heart rate (common/heartrate.js) where
   there is any, then the save panel (#endingDiv, and a log.js app's
   start and finish times) moved in under them, and a share of the lot as one
   picture. A full screen panel, as the overlays are.

   An app calls openSummary() as it finishes and closeSummary() as the session
   is closed or thrown away. Opening it saves the session to the log, through the
   app's storeSession(), and the stars, note and title save again as they change,
   so the save button only closes it. The app may give app.summaryEntry : () => the session as
   its log would save it, for entryClimbs() - app.toEntry(session) otherwise.
   The cross goes back to the session through the app's own resumeSession(). */

let summaryMoved = [];   // [element, the placeholder it came from]
let summaryWidth = 0;    // what the charts were drawn at
let summarySaveLabel = "";   // the save button's own, while it reads DONE

function summaryEntry(){
    return app.summaryEntry ? app.summaryEntry() : app.toEntry(session);
}

// The latest saved before this one, by date then id, leaving this one out if it is being reopened
function lastSession(){
    return getLog(app.logKey)
        .filter(entry => entry && entry.id !== session.id && typeof entry.date === "string"
            && (entry.date < session.date || (entry.date === session.date && entry.id < session.id)))
        .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
        .pop() || null;
}

function summaryName(){
    let heading = document.querySelector("nav h1");
    return heading === null ? document.title : heading.textContent.trim();
}

// A chart a kind of climb this session or the last has, the last as the line across each bar
function climbFigures(width){
    let now = entryClimbs(app.logKey, summaryEntry());
    let last = lastSession();
    let before = last === null ? [] : entryClimbs(app.logKey, last);
    return Object.keys(climbKinds).filter(kind => now.concat(before).some(climb => climb.kind === kind)).map(kind => {
        let { columns, shown, band, noun, title } = climbKinds[kind];
        let current = now.filter(climb => climb.kind === kind).map(climb => shown(climb.grade));
        let previous = before.filter(climb => climb.kind === kind).map(climb => shown(climb.grade));
        let count = (list, grade) => list.filter(each => each === grade).length;
        let groups = columns(current.concat(previous)).map(grade => ({
            "label" : grade,
            "title" : `${grade}: ${count(current, grade)}` + (last === null ? "" : `, ${count(previous, grade)} last session`),
            "value" : count(current, grade),
            "cls" : band(grade).cls,
            "before" : last === null ? null : count(previous, grade)
        }));
        let total = plural(current.length, noun) + (last === null ? "" : ` · ${previous.length} last session`);
        return `<figure class="summary-figure">
            <figcaption>${title}</figcaption>
            <p class="summary-total">${total}</p>
            ${columnChart(groups, total + ". By grade: " + groups.map(group => group.label + " " + group.value).join(", ") + ".", width)}
            ${last === null ? "" : chartLegend([{ "cls" : "before", "name" : "Last session" }])}
        </figure>`;
    }).join("");
}

function drawSummary(){
    let panel = document.getElementById("finishSummary");
    if(panel === null || !isOpen("finishSummary") || session === null){ return; }
    let width = Math.round(document.getElementById("summaryCharts").clientWidth) || 320;
    summaryWidth = width;
    let heartSvg = typeof heartChartSvg === "function" ? heartChartSvg(width) : "";
    document.getElementById("summaryHeart").innerHTML = heartSvg === "" ? "" : `<figure class="summary-figure"><figcaption>Heart rate</figcaption>${heartSvg}</figure>`;
    let heightSvg = typeof heightChartSvg === "function" ? heightChartSvg(width) : "";
    let totals = heightSvg === "" ? null : heightTotals();
    document.getElementById("summaryHeight").innerHTML = heightSvg === "" ? ""
        : `<figure class="summary-figure"><figcaption>Elevation (beta)</figcaption><p class="summary-total">${totals.up}m up</p>${heightSvg}</figure>`;
    document.getElementById("summaryClimbs").innerHTML = climbFigures(width);
}

function openSummary(){
    if(document.getElementById("finishSummary") === null){ drawSummaryMarkup(); }
    document.getElementById("summaryName").innerText = summaryName();
    // the times and the save panel, from wherever the app keeps them
    let save = document.getElementById("summarySave");
    [document.querySelector(".session-times"), document.getElementById("endingDiv")].forEach(element => {
        if(element === null || save.contains(element)){ return; }
        let placeholder = document.createComment("summary");
        element.before(placeholder);
        summaryMoved.push([element, placeholder]);
        save.appendChild(element);
    });
    storeSession();
    session.stored = true;
    keepSession();
    let button = document.getElementById("saveSession");
    if(button !== null && button.innerText !== "DONE"){
        summarySaveLabel = button.innerText;
        button.innerText = "DONE";
    }
    showKeepNote();
    openOverlay("finishSummary");
    drawSummary();
}

// once a session, and not one reopened from the log
function showKeepNote(){
    if(!keepNoteDue() || session.editing || session.keepNoted){ return; }
    session.keepNoted = true;
    keepSession();
    keepNoteToast();
}


// a change made on the summary, saved as it is made
function storeFinished(){
    if(session !== null && session.stored && isOpen("finishSummary")){ storeSession(); }
}

// Thrown away after the summary saved it: out of the log again, unless it was a saved one reopened
function unstoreSession(){
    if(session === null || !session.stored || session.editing){ return; }
    setLog(app.logKey, getLog(app.logKey).filter(entry => entry.id !== session.id));
    noteDeleted(app.logKey, session.id);
    drawSessionLog();
}

function closeSummary(){
    summaryMoved.forEach(([element, placeholder]) => placeholder.replaceWith(element));
    summaryMoved = [];
    let button = document.getElementById("saveSession");
    if(button !== null && summarySaveLabel !== ""){ button.innerText = summarySaveLabel; }
    summarySaveLabel = "";
    hideKeepNote();
    closeOverlay("finishSummary");
}

// the cross: back to the session, to climb on or put something right
function backToSession(){
    closeSummary();
    resumeSession();
}

/* The whole summary as one picture: the name and date, each chart as it is
   drawn (see svgImage() in common/charts.js), and the title, the note and the
   stars as typed */
function wrapText(pen, text, width){
    let lines = [];
    String(text).split("\n").forEach(paragraph => {
        let line = "";
        paragraph.split(" ").forEach(word => {
            let tried = line === "" ? word : line + " " + word;
            if(pen.measureText(tried).width > width && line !== ""){
                lines.push(line);
                line = word;
            } else {
                line = tried;
            }
        });
        lines.push(line);
    });
    return lines;
}

async function shareSummary(){
    let charts = [...document.querySelectorAll("#summaryCharts svg")];
    let images = await Promise.all(charts.map(svgImage));
    let captions = charts.map(svg => {
        let figure = svg.closest("figure");
        let total = figure.querySelector(".summary-total");
        return [figure.querySelector("figcaption").textContent, total === null ? "" : total.textContent];
    });
    const pad = 20, scale = 2, gap = 18;
    let width = Math.max(320, ...images.filter(image => image !== null).map(image => image.width)) + pad * 2;
    let inner = width - pad * 2;
    let probe = document.createElement("canvas").getContext("2d");
    let font = (size, weight) => `${weight || "normal"} ${size}px Hind, sans-serif`;
    // in the colours of the sheet on screen, whichever theme it is in
    let panel = document.getElementById("finishSummary");
    let sheet = getComputedStyle(panel);
    // a variable reads back as written - light-dark() and all - so through an element
    let resolve = colour => {
        let probe = document.createElement("span");
        probe.style.color = colour;
        panel.appendChild(probe);
        let value = getComputedStyle(probe).color;
        probe.remove();
        return value;
    };
    let ink = sheet.color, muted = resolve("var(--ink-2)"), amber = resolve("var(--warn-ink)");

    // laid out first, to know how tall to make the canvas
    let parts = [];
    parts.push({ "text" : summaryName(), "font" : font(24, 600), "colour" : ink, "height" : 30 });
    parts.push({ "text" : logDate(session.date), "font" : font(15), "colour" : muted, "height" : 22 });
    images.forEach((image, index) => {
        if(image === null){ return; }
        parts.push({ "gap" : gap });
        parts.push({ "text" : captions[index][0], "font" : font(16, 600), "colour" : ink, "height" : 22 });
        if(captions[index][1]){ parts.push({ "text" : captions[index][1], "font" : font(13), "colour" : muted, "height" : 18 }); }
        parts.push({ "image" : image, "height" : image.height + 6 });
    });
    let title = sessionTitle.trim();
    if(title || sessionComment.trim() || sessionRating > 0){ parts.push({ "gap" : gap }); }
    if(title){ parts.push({ "text" : title, "font" : font(18, 600), "colour" : ink, "height" : 26 }); }
    if(sessionRating > 0){ parts.push({ "text" : "★".repeat(sessionRating) + "☆".repeat(5 - sessionRating), "font" : font(22), "colour" : amber, "height" : 30 }); }
    if(sessionComment.trim()){
        probe.font = font(15);
        wrapText(probe, sessionComment.trim(), inner).forEach(line => parts.push({ "text" : line, "font" : font(15), "colour" : ink, "height" : 21 }));
    }
    let height = pad * 2 + parts.reduce((total, part) => total + (part.gap || part.height), 0);

    let canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    let pen = canvas.getContext("2d");
    pen.scale(scale, scale);
    pen.fillStyle = sheet.backgroundColor;
    pen.fillRect(0, 0, width, height);
    pen.textAlign = "center";
    pen.textBaseline = "top";
    let y = pad;
    parts.forEach(part => {
        if(part.gap){ y += part.gap; return; }
        if(part.image){ pen.drawImage(part.image, (width - part.image.width) / 2, y, part.image.width, part.image.height); }
        else {
            pen.font = part.font;
            pen.fillStyle = part.colour;
            pen.fillText(part.text, width / 2, y);
        }
        y += part.height;
    });
    shareImage(canvas, `${summaryName().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${session.date}.png`, "summary_shared");
}

function drawSummaryMarkup(){
    document.body.insertAdjacentHTML("beforeend", `
        <aside id="finishSummary" class="overlay summary">
            <h2><span id="summaryName"></span><button type="button" class="icon-button demo-icon icon-share summary-share-icon" data-action="shareSummary" aria-label="Share the summary"></button></h2>
            <div id="summaryCharts">
                <div id="summaryClimbs"></div>
                <div id="summaryHeart"></div>
                <div id="summaryHeight"></div>
            </div>
            <div id="summarySave"></div>
            <div class="button-stack">
                <button type="button" class="quiet" id="shareSummary" data-action="shareSummary"><i class="demo-icon icon-share"></i>SHARE</button>
            </div>
            <button type="button" class="icon-button close" data-action="backToSession" aria-label="Back to the session"></button>
        </aside>`);
    // on a change of width only, and in the next frame: drawing changes the height,
    // and can bring on the panel's scrollbar, which would set it off again in this one
    new ResizeObserver(() => requestAnimationFrame(() => {
        if(Math.round(document.getElementById("summaryCharts").clientWidth) !== summaryWidth){ drawSummary(); }
    })).observe(document.getElementById("summaryCharts"));
}
