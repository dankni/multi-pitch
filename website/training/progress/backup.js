/* Backing up the apps' logs and settings to a file, and putting them back.

   A restore merges: a session in the file is added unless one with its id is
   already here, and a setting only fills in one that isn't set - so the same
   backup can be loaded twice, or onto a phone already in use, without losing or
   doubling anything. Only the keys named below are ever written. The UKC logbook
   is left out: it comes from UKC, and is imported from there again. So is a
   session still in progress. */

const backupFormat = "multi-pitch training apps";

const backupLogs = ["boulderLog", "gilfordLog", "enduranceLog", "lapTimerLog", "loftLog", "rockRingsLog", "tradLog"];

// stored as the apps wrote them, strings and all
const backupSettings = ["boulderGradeSystem", "boulderSplitLow", "tradGradeSystem", "enduranceWall", "enduranceRest",
    "enduranceGrade", "enduranceStyle", "lapTimerGrade", "colours", "tradMode", "difficulty",
    "preventSleep", "overviewRange", "seenSettings", "trainingLastApp"];

function backupData(){
    let data = { "backup" : backupFormat, "version" : 1, "saved" : today(), "logs" : {}, "settings" : {} };
    backupLogs.forEach(key => {
        let log = getLog(key);
        if(Array.isArray(log) && log.length > 0){ data.logs[key] = log; }
    });
    backupSettings.forEach(key => {
        let value = localStorage.getItem(key);
        if(value !== null){ data.settings[key] = value; }
    });
    return data;
}

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
    if(!data || data.backup !== backupFormat || typeof data.logs !== "object" || data.logs === null){
        throw new Error("that is not a training apps backup");
    }
    let added = 0;
    backupLogs.forEach(key => {
        if(!Array.isArray(data.logs[key])){ return; }
        let log = getLog(key);
        let ids = new Set(log.map(entry => entry.id));
        data.logs[key].forEach(entry => {
            if(entry && typeof entry.date === "string" && !ids.has(entry.id)){
                log.push(entry);
                ids.add(entry.id);
                added++;
            }
        });
        setLog(key, log);
    });
    backupSettings.forEach(key => {
        let value = data.settings ? data.settings[key] : undefined;
        if(typeof value === "string" && localStorage.getItem(key) === null){ localStorage.setItem(key, value); }
    });
    return added;
}

// The page starts again with what was added, and says so once it has
const restoredKey = "backupRestored";

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
        toast("Couldn't restore that file: " + err.message);
    }).finally(() => { input.value = ""; });
}

document.addEventListener("DOMContentLoaded", () => {
    let message = sessionStorage.getItem(restoredKey);
    if(message !== null){
        sessionStorage.removeItem(restoredKey);
        toast(message);
    }
});
