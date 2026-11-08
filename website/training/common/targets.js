/* Weekly targets, a card in the account panel: so many sessions, hours or climbs
   a week, the week starting on the day picked. Sessions and hours can be of
   chosen apps; climbs of one kind, at a grade or harder. Each is read off the
   logs afresh as the panel is drawn. Neither Tindeq app counts (common/apps.js).
   Kept under trainingTargets and trainingWeekStart, which go with the backup.
   Needs common/apps.js, grades.js and charts.js, which loadAccount() brings in. */
const targetsKey = "trainingTargets";
const weekStartKey = "trainingWeekStart";
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const targetKinds = { "sport" : "Sport", "boulder" : "Bouldering" };

const targetIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.5">'
    + '<circle cx="8" cy="8" r="6.25"/><circle cx="8" cy="8" r="3.25"/></g><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>';

function savedTargets(){
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(targetsKey)); } catch(err){ saved = null; }
    return Array.isArray(saved) ? saved.filter(target => target && typeof target === "object") : [];
}

function keepTargets(targets){
    localStorage.setItem(targetsKey, JSON.stringify(targets));
    if(typeof syncSoon === "function"){ syncSoon(); }
}

// Monday unless another day is picked
function weekStart(){
    let saved = localStorage.getItem(weekStartKey);
    return saved !== null && weekDays[Number(saved)] ? Number(saved) : 1;
}

// the yyyy-mm-dd this week started, in the UTC days the logs are dated by
function weekFrom(){
    let now = Date.parse(today());
    let back = (new Date(now).getUTCDay() - weekStart() + 7) % 7;
    return new Date(now - back * 86400000).toISOString().slice(0, 10);
}

/* What counts */

// Dans Loft only once it has been added to the Apps page, or used
function targetApps(){
    let added = [];
    try { added = JSON.parse(localStorage.getItem("trainingHiddenApps")) || []; } catch(err){ added = []; }
    return trainingLogs.filter(log => !log.noTargets && (!log.hidden || added.includes(log.hidden) || countedSessions(log).length > 0));
}

function weekSessions(log){
    let from = weekFrom(), to = today();
    return countedSessions(log).filter(entry => entry.date >= from && entry.date <= to);
}

// Every app, or those picked
function countingLogs(target){
    let logs = trainingLogs.filter(log => !log.noTargets);
    return Array.isArray(target.apps) && target.apps.length > 0 ? logs.filter(log => target.apps.includes(log.key)) : logs;
}

// A grade's place on the ladder the target's grade is from: a boulder in Font or V, whichever it was logged in
function gradeRank(kind, grade, like){
    if(kind === "sport"){ return sportLadder.indexOf(grade); }
    return fontBoulderOrder.includes(like) ? fontBoulderOrder.indexOf(boulderFont(grade)) : vBoulderOrder.indexOf(boulderV(grade));
}

function targetGrades(kind){
    if(kind === "sport"){ return sportLadder; }
    return (boulderChartFont() ? fontBoulderOrder : vBoulderOrder).slice(1);
}

function targetDone(target){
    let logs = countingLogs(target);
    let total = 0;
    logs.forEach(log => weekSessions(log).forEach(entry => {
        if(target.type === "sessions"){ total += 1; }
        else if(target.type === "hours"){ total += sessionMinutes(log, entry) / 60; }
        else if(!target.kind){ total += sessionClimbs(log, entry); }
        else {
            let read = log.key === "tradLog" && typeof ukc !== "undefined" ? Object.assign({}, entry, { "climbs" : ukc.session(entry).climbs }) : entry;
            let least = target.grade ? gradeRank(target.kind, target.grade, target.grade) : -1;
            total += entryClimbs(log.key, read).filter(climb => climb.kind === target.kind
                && (least === -1 || gradeRank(target.kind, climb.grade, target.grade) >= least)).length;
        }
    }));
    return target.type === "hours" ? Math.floor(total * 10) / 10 : total;
}

function targetName(target){
    if(target.type === "hours"){ return target.amount + (target.amount === 1 ? " hour" : " hours"); }
    if(target.type === "sessions"){ return plural(target.amount, "session"); }
    let noun = target.kind === "boulder" ? "boulder" : target.kind === "sport" ? "sport climb" : "climb";
    return plural(target.amount, noun) + (target.grade ? " ≥ " + target.grade : "");
}

function targetDetail(target){
    if(!Array.isArray(target.apps) || target.apps.length === 0){ return ""; }
    return target.apps.map(key => (trainingLog(key) || {}).name).filter(name => name).join(", ");
}

/* The card */

function targetsCard(){
    let days = weekDays.map((day, index) => `<option value="${index}">${day}</option>`).join("");
    return `<section class="card-group folds" id="targets">
        <details class="card" open>
            <summary class="card-head">
                <span class="card-icon">${targetIcon}</span>
                <h3 class="card-label">Weekly Targets</h3>
                ${foldChevron}
            </summary>
            <div class="card-body">
                <label class="target-week">Week starts
                    <select class="field" id="targetWeekStart" data-change="setTargetWeekStart">${days}</select>
                </label>
                <ul class="target-list" id="targetList"></ul>
                <form class="target-form" id="targetForm" hidden>
                    <div class="field-row">
                        <select class="field" id="targetType" data-change="showTargetForm" aria-label="Target">
                            <option value="sessions">Sessions</option>
                            <option value="hours">Hours</option>
                            <option value="climbs">Climbs</option>
                        </select>
                        <input type="number" class="field target-amount" id="targetAmount" min="1" step="1" inputmode="decimal" aria-label="How many" data-input="clearInvalid" />
                    </div>
                    <fieldset class="target-apps" id="targetAppsField">
                        <legend>Apps that count</legend>
                        <div class="target-checks" id="targetChecks"></div>
                        <button type="button" class="link-button" data-action="selectAllTargetApps">Select all</button>
                    </fieldset>
                    <div class="field-row" id="targetClimbFields">
                        <select class="field" id="targetKind" data-change="showTargetForm" aria-label="Kind of climb">
                            <option value="">All climbs</option>
                            <option value="sport">${targetKinds.sport}</option>
                            <option value="boulder">${targetKinds.boulder}</option>
                        </select>
                        <select class="field" id="targetGrade" aria-label="Lowest grade that counts"></select>
                    </div>
                    <p class="backup-actions">
                        <button type="button" data-action="saveTarget">SET TARGET</button>
                        <button type="button" class="quiet" data-action="closeTargetForm">CANCEL</button>
                    </p>
                </form>
                <p class="backup-actions" id="addTargetLine">
                    <button type="button" data-action="openTargetForm">SET A TARGET</button>
                </p>
            </div>
        </details>
    </section>`;
}

function targetRow(target){
    let done = targetDone(target);
    let met = done >= target.amount;
    let share = Math.min(100, Math.round(done / target.amount * 100));
    let detail = targetDetail(target);
    return `<li class="target${met ? " met" : ""}">
        <div class="target-head">
            <span class="target-name">${escapeHtml(targetName(target))}${detail ? `<span class="target-detail">${escapeHtml(detail)}</span>` : ""}</span>
            <span class="target-done">${met ? "✓ Met" : `${done} / ${target.amount}`}</span>
            <button type="button" class="icon-button demo-icon icon-trash" data-action="removeTarget" data-id="${target.id}" aria-label="Remove the target of ${escapeHtml(targetName(target))}"></button>
        </div>
        <div class="target-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${target.amount}" aria-valuenow="${done}"><span style="width: ${share}%"></span></div>
    </li>`;
}

function drawTargets(){
    let list = document.getElementById("targetList");
    if(list === null){ return; }
    document.getElementById("targetWeekStart").value = String(weekStart());
    list.innerHTML = savedTargets().map(targetRow).join("");
}

function setTargetWeekStart(select){
    localStorage.setItem(weekStartKey, select.value);
    drawTargets();
}

function openTargetForm(){
    document.getElementById("targetType").value = "sessions";
    document.getElementById("targetAmount").value = "";
    document.getElementById("targetKind").value = "";
    document.getElementById("targetChecks").innerHTML = targetApps().map(log =>
        `<label class="target-check"><input type="checkbox" value="${log.key}" /> ${escapeHtml(log.name)}</label>`).join("");
    showTargetForm();
    document.getElementById("targetForm").hidden = false;
    document.getElementById("addTargetLine").hidden = true;
    document.getElementById("targetAmount").focus();
}

function closeTargetForm(){
    document.getElementById("targetForm").hidden = true;
    document.getElementById("addTargetLine").hidden = false;
}

// apps for sessions and hours, a kind and a grade for climbs
function showTargetForm(){
    let type = document.getElementById("targetType").value;
    let kind = document.getElementById("targetKind").value;
    let amount = document.getElementById("targetAmount");
    amount.step = type === "hours" ? "0.5" : "1";
    amount.min = type === "hours" ? "0.5" : "1";
    document.getElementById("targetAppsField").hidden = type === "climbs";
    document.getElementById("targetClimbFields").hidden = type !== "climbs";
    let grade = document.getElementById("targetGrade");
    grade.hidden = kind === "";
    if(kind !== "" && grade.dataset.kind !== kind){
        grade.dataset.kind = kind;
        grade.innerHTML = `<option value="">Any grade</option>` + targetGrades(kind).map(name => `<option value="${name}">${name}</option>`).join("");
    }
}

function selectAllTargetApps(){
    document.querySelectorAll("#targetChecks input").forEach(box => { box.checked = true; });
}

function saveTarget(){
    let type = document.getElementById("targetType").value;
    let amount = Number(document.getElementById("targetAmount").value);
    // hours to the half hour
    amount = type === "hours" ? Math.round(amount * 2) / 2 : Math.round(amount);
    if(!(amount > 0)){
        markInvalid("targetAmount");
        document.getElementById("targetAmount").focus();
        return;
    }
    // never one already used, however quickly two are set
    let id = savedTargets().reduce((last, each) => Math.max(last, Number(each.id) + 1 || 0), Date.now());
    let target = { "id" : id, "type" : type, "amount" : amount };
    if(type === "climbs"){
        let kind = document.getElementById("targetKind").value;
        let grade = document.getElementById("targetGrade").value;
        if(kind){ target.kind = kind; }
        if(kind && grade){ target.grade = grade; }
    } else {
        let apps = [...document.querySelectorAll("#targetChecks input:checked")].map(box => box.value);
        // every app ticked is the same as none
        if(apps.length > 0 && apps.length < targetApps().length){ target.apps = apps; }
    }
    keepTargets(savedTargets().concat(target));
    closeTargetForm();
    drawTargets();
}

function removeTarget(button){
    let id = Number(button.dataset.id);
    let target = savedTargets().find(each => each.id === id);
    if(!target){ return; }
    confirmToast("Remove the target of " + targetName(target) + "?", "REMOVE", () => {
        keepTargets(savedTargets().filter(each => each.id !== id));
        drawTargets();
    });
}
