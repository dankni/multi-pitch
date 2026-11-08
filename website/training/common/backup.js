/* What a backup holds, and merging two of them - for a backup file on the
   progress page, and for the account's copy (common/account.js).

   A merge keeps every session from both sides; where both have one, the later
   edit wins, and a tie keeps this phone's. A session deleted on either side is
   dropped from both. Settings go as one block: the side changed last wins, and
   the other fills in what it hasn't set - so a backup with no date on its
   settings, or a phone never synced, only fills in. Only the keys named below
   are ever written. The UKC logbook is left out: it comes from UKC, and is
   imported from there again. So is a session still in progress. */

const backupFormat = "multi-pitch training apps";

const backupLogs = ["boulderLog", "gilfordLog", "enduranceLog", "lapTimerLog", "loftLog", "rockRingsLog", "tradLog", "noHangsLog", "tabataLog", "gapsLog", "dansLoftLog", "maxPullLog"];

// stored as the apps wrote them, strings and all
const backupSettings = ["boulderGradeSystem", "boulderSplitLow", "boulderPlusGrades", "boulderBoulderworld", "tradGradeSystem", "boulderTrackFalls", "tradTrackFalls", "gilfordTrackFalls", "dansLoftTrackFalls", "enduranceWall", "enduranceRest",
    "enduranceGrade", "enduranceStyle", "lapTimerGrade", "colours", "tradMode", "difficulty", "gapsMaxPull", "gapsClimber", "tabataSettings", "tabataOneSecond", "tabataRepeaterMode", "tabataRepeaters", "tabataRoutines",
    "preventSleep", "overviewRange", "progressHidden", "progressBoulderGrades", "seenSettings", "trainingLastApp", "trainingHiddenApps", "trainingRemovedApps", "trainingTheme", "dansLoftDraft", "maxPullSplitHang", "trainingTargets", "trainingWeekStart"];

// when this phone's settings last changed, and what they were then
const settingsSavedKey = "syncSettingsSaved";
const settingsSeenKey = "syncSettingsSeen";

function currentSettings(){
    let settings = {};
    backupSettings.forEach(key => {
        let value = localStorage.getItem(key);
        if(value !== null){ settings[key] = value; }
    });
    return settings;
}

// Settings changed since the last look are dated now. Never looked at: left undated, so they only fill in.
function stampSettings(){
    let now = JSON.stringify(currentSettings());
    let seen = localStorage.getItem(settingsSeenKey);
    if(seen !== null && seen !== now){ localStorage.setItem(settingsSavedKey, String(Date.now())); }
    localStorage.setItem(settingsSeenKey, now);
}

function backupData(){
    let data = { "backup" : backupFormat, "version" : 2, "saved" : today(), "logs" : {}, "settings" : currentSettings(),
        "settingsSaved" : Number(localStorage.getItem(settingsSavedKey)) || 0, "deleted" : getLog(deletedKey) };
    backupLogs.forEach(key => {
        let log = getLog(key);
        if(Array.isArray(log) && log.length > 0){ data.logs[key] = log; }
    });
    return data;
}

function isBackup(data){
    return Boolean(data) && data.backup === backupFormat && typeof data.logs === "object" && data.logs !== null;
}

// local is this phone's backupData(); remote a file or the account's copy, checked as it comes
function mergeBackup(local, remote){
    let cutoff = Date.now() - deletedDays * 86400000;
    let deleted = new Map();
    [local.deleted, remote.deleted].forEach(marks => (Array.isArray(marks) ? marks : []).forEach(mark => {
        if(!mark || !backupLogs.includes(mark.key) || !(mark.at > cutoff)){ return; }
        let name = mark.key + " " + mark.id;
        if(!deleted.has(name) || deleted.get(name).at < mark.at){ deleted.set(name, mark); }
    }));

    let merged = { "backup" : backupFormat, "version" : 2, "saved" : today(), "logs" : {}, "settings" : {},
        "settingsSaved" : 0, "deleted" : [...deleted.values()] };
    backupLogs.forEach(key => {
        let log = [];
        let at = new Map();
        [local, remote].forEach((side, s) => {
            let entries = side.logs && Array.isArray(side.logs[key]) ? side.logs[key] : [];
            entries.forEach(entry => {
                // this phone's own sessions are trusted as they are
                if(s === 1 && (!entry || typeof entry.date !== "string" || entry.id === undefined || entry.id === null)){ return; }
                if(deleted.has(key + " " + entry.id)){ return; }
                if(entry.id === undefined || entry.id === null){ log.push(entry); return; }
                if(!at.has(entry.id)){
                    at.set(entry.id, log.length);
                    log.push(entry);
                } else if((entry.updated || 0) > (log[at.get(entry.id)].updated || 0)){
                    log[at.get(entry.id)] = entry;
                }
            });
        });
        if(log.length > 0){ merged.logs[key] = log; }
    });

    let localSaved = Number(local.settingsSaved) || 0;
    let remoteSaved = Number(remote.settingsSaved) || 0;
    let [first, second] = remoteSaved > localSaved ? [remote.settings, local.settings] : [local.settings, remote.settings];
    backupSettings.forEach(key => {
        let value = first && typeof first[key] === "string" ? first[key] : second ? second[key] : undefined;
        if(typeof value === "string"){ merged.settings[key] = value; }
    });
    merged.settingsSaved = Math.max(localSaved, remoteSaved);
    return merged;
}

// Writes a merge to this phone, and says how many sessions it added
function applyBackup(merged){
    let added = 0;
    backupLogs.forEach(key => {
        let had = getLog(key);
        let log = merged.logs[key] || [];
        if(JSON.stringify(log) === JSON.stringify(had)){ return; }
        let ids = new Set(had.map(entry => entry.id));
        added += log.filter(entry => !ids.has(entry.id)).length;
        setLog(key, log);
    });
    Object.keys(merged.settings).forEach(key => {
        if(localStorage.getItem(key) !== merged.settings[key]){ localStorage.setItem(key, merged.settings[key]); }
    });
    applyTheme();   // a sync doesn't reload the page
    setLog(deletedKey, merged.deleted);
    localStorage.setItem(settingsSavedKey, String(merged.settingsSaved));
    if(localStorage.getItem(settingsSeenKey) !== null){ localStorage.setItem(settingsSeenKey, JSON.stringify(currentSettings())); }
    return added;
}

// The same backup whatever order its keys and sessions are in, bar the day it was saved
function sameBackup(a, b){
    let sorted = value => {
        if(Array.isArray(value)){ return value.map(sorted); }
        if(value === null || typeof value !== "object"){ return value; }
        let out = {};
        Object.keys(value).sort().forEach(key => { out[key] = sorted(value[key]); });
        return out;
    };
    let body = data => {
        let logs = {};
        Object.keys(data.logs || {}).forEach(key => {
            logs[key] = [...data.logs[key]].sort((x, y) => String(x.id).localeCompare(String(y.id)));
        });
        let deleted = [...(data.deleted || [])].sort((x, y) => (x.key + x.id).localeCompare(y.key + y.id));
        return JSON.stringify(sorted({ "logs" : logs, "settings" : data.settings || {}, "settingsSaved" : data.settingsSaved || 0, "deleted" : deleted }));
    };
    return body(a) === body(b);
}

/* ================= The backup file =================
   Saved and restored from the account panel. A restore only adds and updates, so
   the same file can be loaded twice, or onto a phone already in use, without
   losing or doubling anything. The page then starts again with what was added,
   and says so (showRestored() in functions.js). */
function downloadBackup(){
    let file = new Blob([JSON.stringify(backupData(), null, 2)], { "type" : "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = `training-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function chooseBackupFile(){
    document.getElementById("backupFile").click();
}

// Adds what is not already here, and says how much that was
function restoreBackup(data){
    if(!isBackup(data)){
        throw new Error("that is not a training apps backup");
    }
    return applyBackup(mergeBackup(backupData(), data));
}

function importBackupFile(input){
    let file = input.files && input.files[0];
    if(!file){ return; }
    file.text().then(text => {
        let added = restoreBackup(JSON.parse(text));
        sessionStorage.setItem(restoredKey, added === 0
            ? "Nothing new in that backup - it's all here already"
            : `Backup restored: ${plural(added, "session")} added`);
        location.reload();
    }).catch(err => {
        toast("Couldn't restore that file: " + err.message, null, false, true);
    }).finally(() => { input.value = ""; });
}
