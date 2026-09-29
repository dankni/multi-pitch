/* The tick list for the 24 routes on the Gilford wall. The session flow is
   common/log.js; the routes are common/gilford-routes.js. */

const app = {
    "logKey" : "gilfordLog",
    "currentKey" : "gilfordCurrent",
    "newSession" : () => ({ "climbs" : [] }),
    "fromEntry" : entry => ({ "climbs" : entry.climbs.slice() }),
    "toEntry" : from => ({ "climbs" : from.climbs.slice() }),
    "hasClimbs" : from => from.climbs.length > 0,
    "draw" : () => {
        drawRoutes();
        updateSummary();
    },
    "logView" : {
        "key" : "gilfordLog",
        "order" : byDate,
        "onEdit" : editSession,
        "describe" : entry => {
            let hardest = hardestGrade(entry.climbs);
            return { "title" : plural(entry.climbs.length, "climb"), "detail" : hardest ? `hardest ${hardest}` : "" };
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
    position === -1 ? session.climbs.push(id) : session.climbs.splice(position, 1);
    button.classList.toggle("ticked", position === -1);
    button.setAttribute("aria-pressed", position === -1);
    keepSession();
    updateSummary();
    cheer(before);
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
function drawRoutes(){
    let panels = [...new Set(routes.map(route => route.section))];
    document.getElementById("routes").innerHTML = panels.map(number =>
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
        ? "Nothing ticked yet"
        : `Hardest: ${hardestGrade(session.climbs)}`;
}
