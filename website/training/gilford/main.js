/* The tick list for the 24 routes on the Gilford wall. The session flow is
   common/log.js; the routes are common/gilford-routes.js. */

const app = {
    "logKey" : "gilfordLog",
    "currentKey" : "gilfordCurrent",
    "timed" : true,
    "watchKey" : "gilfordWatch",
    // On the watch (common/watch.js): a panel's three routes at a time, ticked there as here
    "watch" : {
        "state" : () => {
            let state = { "m" : "panel", "s" : session === null ? "idle" : document.body.dataset.state };
            if(session !== null){
                state.id = session.id;
                state.P = panelNumbers().map(number => routes.filter(route => route.section === number).map(route =>
                    [route.id, route.grade, session.climbs.includes(route.id) ? 1 : 0, ...watchColour("route hold-" + route.colour.toLowerCase())]));
                state.n = session.climbs.length;
                state.of = routes.length;
            }
            return state;
        },
        // which way it is to end up, so a tick that waited on the watch isn't undone by another
        "receive" : message => {
            if(message.t === "finish" && document.body.dataset.state === "running"){ openSavePanel(); }
            let button = document.getElementById("route" + message.r);
            if(session !== null && message.t === "tick" && button !== null && session.climbs.includes(message.r) !== Boolean(message.on)){
                toggleClimb(button);
            }
        },
        "active" : () => session !== null
    },
    "newSession" : () => ({ "climbs" : [] }),
    "fromEntry" : entry => ({ "climbs" : entry.climbs.slice() }),
    "toEntry" : from => ({ "climbs" : from.climbs.slice() }),
    "hasClimbs" : from => from.climbs.length > 0,
    "draw" : () => {
        drawRoutes();
        updateSummary();
        drawRecent();
    },
    "logView" : {
        "key" : "gilfordLog",
        "order" : byDate,
        "onEdit" : editSession,
        "describe" : entry => {
            let hardest = hardestGrade(entry.climbs);
            return { "title" : plural(entry.climbs.length, "climb"), "detail" : joinDetail([hardest ? `hardest ${hardest}` : "", sessionLength(entry)]) };
        },
        "stats" : log => {
            let total = log.reduce((count, entry) => count + entry.climbs.length, 0);
            return `${sessionCount(log)} · ${total} climbs logged`;
        }
    }
};

function hardestGrade(climbs){
    let hardest = climbs.reduce((max, id) => {
        let route = getRoute(id);
        return route ? Math.max(max, gradeOrder.indexOf(route.grade)) : max;
    }, -1);
    return hardest === -1 ? "" : gradeOrder[hardest];
}

/* Worth a word when a tick completes one: half the wall, the sevens, or all of
   it. Read off the routes, so a re-set wall still says the right thing. */
const sevens = routes.filter(route => route.grade.startsWith("7")).map(route => route.id);
const everything = routes.map(route => route.id);
const halfway = Math.ceil(routes.length / 2);

function allTicked(ids){
    return ids.length > 0 && ids.every(id => session.climbs.includes(id));
}

function toggleClimb(button){
    if(!session){ return; }
    let id = Number(button.dataset.route);
    // what was already done before this tap, so a set is only cheered as it completes
    let before = { "sevens" : allTicked(sevens), "wall" : allTicked(everything), "count" : session.climbs.length };
    let position = session.climbs.indexOf(id);
    let earlier = session.climbs.map(ticked => (getRoute(ticked) || {}).grade);   // a route since re-set has none
    position === -1 ? session.climbs.push(id) : session.climbs.splice(position, 1);
    button.classList.toggle("ticked", position === -1);
    button.setAttribute("aria-pressed", position === -1);
    if(position === -1){ haptic(); }   // a tick, not taking one back
    let route = getRoute(id);
    noteRecent(`${route.colour} ${route.grade} ${position === -1 ? "ticked" : "taken back"}`);
    position === -1 ? heartTick(id, route.grade) : heartUntick(id);
    keepSession();
    updateSummary();
    cheer(before);
    if(position === -1){ cheerGrade("sport", route.grade, earlier); }   // see common/records.js
}

// Everything this tap completed gets its say, the biggest last
function cheer(before){
    if(session.climbs.length === halfway && before.count < halfway){
        toast("Half the routes on the wall ticked, nice one!");
    }
    if(allTicked(sevens) && !before.sevens){
        toast("Nice work ticking the 7's");
    }
    if(allTicked(everything) && !before.wall){
        toast("Amazing! you ticked them all, that's the goal this app was made for");
    }
}

// A row of tiles per panel on the wall
function panelNumbers(){
    return [...new Set(routes.map(route => route.section))];
}

function drawRoutes(){
    document.getElementById("routes").innerHTML = panelNumbers().map(number =>
        `<section class="section-block">
            <span class="section-number" aria-hidden="true"><small>Panel</small>${number}</span>
            ${routes.filter(route => route.section === number).map(route => {
                let ticked = session.climbs.includes(route.id);
                return `<button type="button" id="route${route.id}" data-action="toggleClimb" data-route="${route.id}"
                    class="route hold-${route.colour.toLowerCase()}${ticked ? " ticked" : ""}"
                    aria-pressed="${ticked}" aria-label="${route.colour} ${route.grade}, panel ${number}">
                    <span class="route-colour">${route.colour}</span>
                    <span class="route-grade">${route.grade}</span>
                    <i class="demo-icon icon-ok tick" aria-hidden="true"></i>
                </button>`;
            }).join("")}
        </section>`).join("");
}

function updateSummary(){
    document.getElementById("tickCount").innerText = session.climbs.length;
    document.getElementById("summary").innerText = session.climbs.length === 0
        ? ""
        : `Hardest: ${hardestGrade(session.climbs)}`;
}
