/* A word when a tap beats what came before: the hardest grade ever ticked of its
   kind, or failing that the hardest of the last 30 days, as it is ticked - and
   the same for the most climbed in a session, on FINISH. Only ever against something saved - a first
   session has nothing to beat, so says nothing. The session on screen counts
   from its own earlier ticks, and is left out of the logs if it is a saved one
   reopened.

   A kind's grades can come from more than one app: a sport grade beats the gym
   session's sport, the tick list's and the endurance app's. Their ladders are
   common/grades.js and common/gilford-routes.js, read only when a kind is. */
const recordDays = 30;
const dayMs = 86400000;

const recordKinds = {
    "boulder" : {
        "rank" : grade => /^V\d+$/.test(grade) ? Number(grade.slice(1)) : -1,
        "logs" : [["boulderLog", entry => entry.climbs]]
    },
    "sport" : {
        "rank" : grade => gymSportOrder.indexOf(grade),
        "logs" : [["boulderLog", entry => entry.sport],
                  ["gilfordLog", entry => (Array.isArray(entry.climbs) ? entry.climbs : []).map(id => (getRoute(id) || {}).grade)],
                  ["enduranceLog", entry => entry.grades]]
    },
    "trad" : {
        "rank" : grade => tradLadder.indexOf(grade),
        "logs" : [["tradLog", entry => entry.climbs]]
    }
};

// A log's saved sessions, less the one on screen, and only the last 30 days' if recent
function recordSessions(key, recent){
    let now = Date.parse(today());
    return getLog(key).filter(entry => !(session && entry.id === session.id)
        && (!recent || now - Date.parse(entry.date) < recordDays * dayMs));
}

// The hardest rank saved of a kind, and whether anything was saved at all
function bestTick(kind, recent){
    let rank = recordKinds[kind].rank;
    let best = -1, any = false;
    recordKinds[kind].logs.forEach(([key, ticks]) => recordSessions(key, recent).forEach(entry => {
        let grades = ticks(entry);
        (Array.isArray(grades) ? grades : []).forEach(grade => {
            any = true;
            best = Math.max(best, rank(grade));
        });
    }));
    return { "best" : best, "any" : any };
}

// A grade just ticked, against what is saved of its kind and the session's own earlier ticks
function cheerGrade(kind, grade, earlier){
    let rank = recordKinds[kind].rank;
    let mine = rank(grade);
    if(mine === -1){ return; }
    let before = earlier.reduce((best, other) => Math.max(best, rank(other)), -1);
    let ever = bestTick(kind, false);
    let month = bestTick(kind, true);
    if(ever.any && mine > Math.max(ever.best, before)){
        toast("Wow, that's the highest grade we have seen you tick! Congrats.");
    } else if(month.any && mine > Math.max(month.best, before)){
        toast("That's the highest grade we have seen you tick this month! Congrats.");
    }
}

// A session's count on FINISH, against the most saved in one
function cheerLongest(key, count, sizeOf){
    let most = recent => recordSessions(key, recent).reduce((best, entry) => Math.max(best, Number(sizeOf(entry)) || 0), -1);
    let ever = most(false);
    let month = most(true);
    if(ever !== -1 && count > ever){
        toast("Wow, that's your longest session ever. You're getting strong!");
    } else if(month !== -1 && count > month){
        toast("That's your longest session this month. You're getting strong!");
    }
}
