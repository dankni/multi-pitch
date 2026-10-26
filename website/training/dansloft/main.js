/* The routes on Dan's loft wall: tap one each time it is climbed, and its i for
   where it starts and ends on the floor plan. The session flow is common/log.js;
   the routes are common/dansloft-routes.js.

   With ?edit on the url the route panel places a start, the points the route
   passes through, or the end where the plan is tapped, and takes notes, kept on this device under draftKey until COPY ROUTES
   hands them over to go in dansloft-routes.js. */

const draftKey = "dansLoftDraft";
const editing = new URLSearchParams(location.search).has("edit");
let infoRoute = null;   // the route the info panel is showing

overlays.push("routeInfo");

const app = {
    "logKey" : "dansLoftLog",
    "currentKey" : "dansLoftCurrent",
    "timed" : true,
    "newSession" : () => ({ "climbs" : [] }),
    "fromEntry" : entry => ({ "climbs" : entry.climbs.slice() }),
    "toEntry" : from => ({ "climbs" : from.climbs.slice() }),
    "hasClimbs" : from => from.climbs.length > 0,
    "sessionSize" : from => from.climbs.length,
    "draw" : () => {
        drawRoutes();
        updateSummary();
        drawRecent();
    },
    "onLoad" : () => {
        document.getElementById("planEditor").hidden = !editing;
        document.getElementById("plan").classList.toggle("editing", editing);
    },
    "logView" : {
        "key" : "dansLoftLog",
        "order" : byDate,
        "onEdit" : editSession,
        "describe" : entry => {
            let hardest = hardestGrade(entry.climbs);
            return { "title" : plural(entry.climbs.length, "climb"),
                     "detail" : joinDetail([hardest ? `hardest ${hardest}` : "", routesDone(entry.climbs), sessionLength(entry)]) };
        },
        "stats" : log => {
            let total = log.reduce((count, entry) => count + entry.climbs.length, 0);
            return `${sessionCount(log)} · ${total} climbs logged`;
        }
    }
};

/* The draft: placed points and notes, over the routes as written */
function readDraft(){
    try { return JSON.parse(localStorage.getItem(draftKey)) || {}; } catch(err){ return {}; }
}

readDraftIntoRoutes();
function readDraftIntoRoutes(){
    let draft = readDraft();
    loftRoutes.forEach(route => Object.assign(route, draft[route.id]));
}

function saveDraft(route){
    let draft = readDraft();
    draft[route.id] = { "start" : route.start, "end" : route.end, "path" : route.path, "notes" : route.notes };
    localStorage.setItem(draftKey, JSON.stringify(draft));
}

/* Counting */

function countOf(id){
    return session === null ? 0 : session.climbs.filter(climbed => climbed === id).length;
}

function hardestGrade(climbs){
    let hardest = climbs.reduce((max, id) => {
        let route = getLoftRoute(id);
        return route ? Math.max(max, loftGradeOrder.indexOf(route.grade)) : max;
    }, -1);
    return hardest === -1 ? "" : loftGradeOrder[hardest];
}

function routesDone(climbs){
    return `${new Set(climbs).size} of ${loftRoutes.length} routes`;
}

function allClimbed(){
    return loftRoutes.every(route => session.climbs.includes(route.id));
}

function addLoftClimb(button){
    let route = getLoftRoute(Number(button.dataset.route));
    if(session === null || route === undefined){ return; }
    let earlier = session.climbs.map(loftBoulderGrade);
    let wasAll = allClimbed();
    session.climbs.push(route.id);
    noteRecent(`${route.colour} ${route.grade} tapped`);
    keepSession();
    drawRow(route);
    flash(document.getElementById("row-" + route.id).querySelector(".grade-add"));
    updateSummary();
    if(!wasAll && allClimbed()){ toast("Every route on the wall climbed, nice one!"); }
    cheerGrade("boulder", loftBoulderGrade(route.id), earlier);   // see common/records.js
}

// one tap too many
function removeLoftClimb(button){
    let route = getLoftRoute(Number(button.dataset.route));
    if(session === null || route === undefined){ return; }
    let position = session.climbs.lastIndexOf(route.id);
    if(position === -1){ return; }
    session.climbs.splice(position, 1);
    noteRecent(`${route.colour} ${route.grade} taken back`);
    keepSession();
    drawRow(route);
    updateSummary();
}

/* Drawing */

// A tile to add a climb, a minus to take one back, and the i for the route
function routeRow(route){
    let done = countOf(route.id);
    let name = `${route.colour} ${route.grade}`;
    return `<div class="grade-row loft-row holds-${route.holds}${done > 0 ? " done" : ""}" id="row-${route.id}">
        <button type="button" class="route grade-add" data-action="addLoftClimb" data-route="${route.id}"
            aria-label="Add a ${name}, ${done} so far">
            <span class="route-colour">${route.colour}</span>
            <span class="route-grade">${route.grade}</span>
            <span class="grade-count" aria-hidden="true">${done > 0 ? done : ""}</span>
        </button>
        <button type="button" class="quiet grade-minus" data-action="removeLoftClimb" data-route="${route.id}"
            aria-label="Take back a ${name}"${done === 0 ? " disabled" : ""}>&minus;</button>
        <button type="button" class="quiet route-info demo-icon icon-info" data-action="showRouteInfo" data-route="${route.id}"
            aria-label="Where the ${name} goes"></button>
    </div>`;
}

function drawRoutes(){
    document.getElementById("loftRoutes").innerHTML = loftRoutes.map(routeRow).join("");
}

// just the row that was tapped, so the scroll position stays put
function drawRow(route){
    document.getElementById("row-" + route.id).outerHTML = routeRow(route);
}

function updateSummary(){
    let climbs = session.climbs;
    document.getElementById("climbCount").innerText = climbs.length;
    document.getElementById("countNoun").innerText = climbs.length === 1 ? "climb" : "climbs";
    document.getElementById("summary").innerText = climbs.length === 0
        ? "Nothing logged yet"
        : `Hardest: ${hardestGrade(climbs)} · ${routesDone(climbs)}`;
}

/* The route panel */

function showRouteInfo(button){
    infoRoute = getLoftRoute(Number(button.dataset.route));
    if(infoRoute === undefined){ return; }
    document.getElementById("routeInfoTitle").innerText = `${infoRoute.colour} ${infoRoute.grade}`;
    document.getElementById("place-start").checked = true;
    document.getElementById("notesField").value = infoRoute.notes;
    drawRouteInfo();
    openOverlay("routeInfo");
}

function hideRouteInfo(){
    closeOverlay("routeInfo");
}

function planMark(point, letter, kind){
    if(!point){ return ""; }
    return `<g class="plan-mark ${kind}">
        <circle cx="${point[0]}" cy="${point[1]}" r="30" />
        <text x="${point[0]}" y="${point[1]}" dy="0.35em">${letter}</text>
    </g>`;
}

function drawRouteInfo(){
    let route = infoRoute;
    document.getElementById("planMarks").innerHTML = planMark(route.start, "S", "plan-start") + planMark(route.end, "E", "plan-end");
    // once both ends are placed, through whatever path there is
    let flow = route.start && route.end ? [route.start, ...route.path, route.end] : [];
    document.getElementById("planFlow").setAttribute("points", flow.map(point => point.join(",")).join(" "));
    document.getElementById("undoPathPoint").disabled = route.path.length === 0;
    let key = [route.start ? "S start" : "", route.end ? "E end" : ""].filter(part => part).join(" · ");
    document.getElementById("planKey").innerText = key || "Start and end not marked yet";
    let notes = document.getElementById("routeNotes");
    notes.innerText = route.notes;
    notes.hidden = route.notes === "";
}

// In edit mode, a tap on the plan places the start, then each point of the path, then the end
function placeOnPlan(svg, event){
    if(!editing || infoRoute === null){ return; }
    let tapped = svg.createSVGPoint();
    tapped.x = event.clientX;
    tapped.y = event.clientY;
    let onPlan = tapped.matrixTransform(svg.getScreenCTM().inverse());
    let placing = document.querySelector('input[name="placing"]:checked').value;
    let point = [Math.round(onPlan.x), Math.round(onPlan.y)];
    if(placing === "path"){
        infoRoute.path = infoRoute.path.concat([point]);
    } else {
        infoRoute[placing] = point;
    }
    saveDraft(infoRoute);
    drawRouteInfo();
    if(placing === "start"){ document.getElementById("place-path").checked = true; }
}

function undoPathPoint(){
    if(!editing || infoRoute === null){ return; }
    infoRoute.path = infoRoute.path.slice(0, -1);
    saveDraft(infoRoute);
    drawRouteInfo();
}

function setRouteNotes(field){
    if(!editing || infoRoute === null){ return; }
    infoRoute.notes = field.value.trim();
    saveDraft(infoRoute);
    drawRouteInfo();
}

// Every route as it now stands, to paste into common/dansloft-routes.js
function copyLoftRoutes(){
    let text = JSON.stringify(loftRoutes.map(route => ({ "id" : route.id, "colour" : route.colour, "grade" : route.grade,
        "start" : route.start, "end" : route.end, "path" : route.path, "notes" : route.notes })), null, 1);
    navigator.clipboard.writeText(text)
        .then(() => toast("Copied, ready to paste"))
        .catch(() => toast("Couldn't copy it", null, false, true));
}

// Once the copy is in dansloft-routes.js, the draft would only hide later changes to it
function forgetLoftEdits(){
    confirmReset("forgetEdits", true, () => {
        localStorage.removeItem(draftKey);
        location.reload();
    });
}
