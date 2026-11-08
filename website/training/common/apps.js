/* Every app that keeps a log: its key, name and page, which of its sessions count,
   how long one took and how many climbs it held - for the progress page
   (progress/sessions.js) and weekly targets (common/targets.js). */

// a missing field counts as nothing rather than as "undefined"
function logCount(value){
    return typeof value === "number" && isFinite(value) ? value : 0;
}
function logList(value){
    return Array.isArray(value) ? value : [];
}

/* Reps of work and rest, or in repeater mode sets of them with a rest between.
   Saved before reps were called reps, a session's reps were its "sets". */
function tabataReps(entry){
    return logCount(typeof entry.reps === "number" ? entry.reps : entry.sets);
}
// the whole session: no rest after a set's last rep, the rest between sets instead
function tabataSeconds(entry){
    let sets = typeof entry.setRest === "number" ? Math.max(1, logCount(entry.sets)) : 1;
    let reps = tabataReps(entry);
    return sets * (reps * (logCount(entry.work) + logCount(entry.rest)) - logCount(entry.rest)) + (sets - 1) * logCount(entry.setRest);
}

// A fixed length workout's seconds on the clock when it was saved, or, saved
// before it kept them, the whole workout
function ranFor(entry, fullSeconds){
    return (logCount(entry.seconds) || fullSeconds) / 60;
}

/* The timed apps save minutes; the lap timer, Twister, the arcade and the two
   workouts say how long in their own units. Neither Tindeq app counts towards a
   target, and only a run pulled on a Progressor is a session at all. */
const trainingLogs = [
    { "key" : "boulderLog", "name" : "Gym Session", "href" : "/training/boulder/",
      "climbs" : entry => logList(entry.climbs).length + logList(entry.sport).length },
    { "key" : "gilfordLog", "name" : "Tick List", "href" : "/training/gilford/", "climbs" : entry => logList(entry.climbs).length },
    { "key" : "dansLoftLog", "name" : "Dans Loft", "href" : "/training/dansloft/", "climbs" : entry => logList(entry.climbs).length, "hidden" : "dansloft" },
    { "key" : "enduranceLog", "name" : "Endurance", "href" : "/training/endurance/", "climbs" : entry => logCount(entry.climbs) },
    { "key" : "lapTimerLog", "name" : "Lap Timer", "href" : "/training/timer/",
      "minutes" : entry => logCount(entry.total) / 60000, "climbs" : entry => logCount(entry.laps) },
    { "key" : "loftLog", "name" : "Twister", "href" : "/training/loft/", "minutes" : entry => logCount(entry.seconds) / 60 },
    { "key" : "rockRingsLog", "name" : "Rock Rings", "href" : "/training/rings/", "minutes" : entry => ranFor(entry, 10 * 60) },
    { "key" : "tradLog", "name" : "Outside", "href" : "/training/trad/",
      "climbs" : entry => logList(typeof ukc === "undefined" ? entry.climbs : ukc.session(entry).climbs).length },
    // 20 reps of a 10 s hang and 20 s rest, none after the last
    { "key" : "noHangsLog", "name" : "No Hangs", "href" : "/training/nohangs/", "minutes" : entry => ranFor(entry, 20 * 30 - 20) },
    { "key" : "tabataLog", "name" : "Tabata", "href" : "/training/tabata/", "minutes" : entry => ranFor(entry, tabataSeconds(entry)) },
    { "key" : "gapsLog", "name" : "Tindeq Arcade", "href" : "/training/gaps/", "keep" : entry => entry.input === "tindeq",
      "minutes" : entry => logCount(entry.time) / 60, "noTargets" : true },
    { "key" : "maxPullLog", "name" : "Max Pull", "href" : "/training/maxpull/", "minutes" : () => 0, "noTargets" : true }
];

function trainingLog(key){
    return trainingLogs.find(log => log.key === key);
}

// An app's saved sessions that count, read defensively: a hand-edited key is not worth a broken page
function countedSessions(log){
    let saved;
    try { saved = JSON.parse(localStorage.getItem(log.key)); } catch(err){ return []; }
    return logList(saved).filter(entry => entry && typeof entry.date === "string" && (!log.keep || log.keep(entry)));
}

function sessionMinutes(log, entry){
    return log.minutes ? log.minutes(entry) : logCount(entry.minutes);
}

function sessionClimbs(log, entry){
    return log.climbs ? log.climbs(entry) : 0;
}
