/* Monthly goals, the goals page (/training/goals/), in the bottom nav once switched
   on in the account panel: so many sessions, hours or climbs a month, from the 1st.
   Sessions and hours can be of chosen apps; climbs of one kind, at a grade or
   harder. Read off the logs afresh as the page is drawn; neither Tindeq app counts
   (common/apps.js). Kept under trainingGoals by month, { "yyyy-mm" : [goal] }: a
   month with no list of its own is empty, or with Copy goals forwards on
   (trainingGoalsCopy), carries the last one before it. Needs apps.js,
   grades.js and charts.js. */
const goalsKey = "trainingGoals";
const goalsCopyKey = "trainingGoalsCopy";
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsAhead = 3;
const paceNames = { "on" : "On Track", "behind" : "A Bit Behind", "far" : "Very Behind" };

/* Months */

function monthOf(date){
    return date.slice(0, 7);
}

function shiftMonth(month, by){
    let [year, number] = month.split("-").map(Number);
    return new Date(Date.UTC(year, number - 1 + by, 1)).toISOString().slice(0, 7);
}

function daysIn(month){
    let [year, number] = month.split("-").map(Number);
    return new Date(Date.UTC(year, number, 0)).getUTCDate();
}

// Nov 26
function monthLabel(month){
    let [year, number] = month.split("-");
    return monthNames[Number(number) - 1] + " " + year.slice(2);
}

/* Saved */

// The weekly targets these replaced, as this month's goals: scaled to its length
function fromWeeklyTargets(){
    let targets = null;
    try { targets = JSON.parse(localStorage.getItem("trainingTargets")); } catch(err){ targets = null; }
    localStorage.removeItem("trainingTargets");
    localStorage.removeItem("trainingWeekStart");
    if(!Array.isArray(targets)){ return {}; }
    let month = monthOf(today());
    let scale = daysIn(month) / 7;
    let goals = targets.filter(target => target && target.amount > 0).map(target => Object.assign({}, target, {
        "amount" : target.type === "hours" ? Math.round(target.amount * scale * 2) / 2 : Math.round(target.amount * scale) }));
    return goals.length > 0 ? { [month] : goals } : {};
}

function savedGoals(){
    if(localStorage.getItem(goalsKey) === null && localStorage.getItem("trainingTargets") !== null){
        let goals = fromWeeklyTargets();
        keepGoals(goals);
        return goals;
    }
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(goalsKey)); } catch(err){ saved = null; }
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}

function keepGoals(goals){
    localStorage.setItem(goalsKey, JSON.stringify(goals));
    if(typeof syncSoon === "function"){ syncSoon(); }
}

function copyForwards(){
    return localStorage.getItem(goalsCopyKey) === "on";
}

function setGoalsCopy(box){
    localStorage.setItem(goalsCopyKey, box.checked ? "on" : "off");
    drawGoals();
}

// Its own list, or with copying forwards on, the last one before it
function monthGoals(month){
    let goals = savedGoals();
    let from = copyForwards()
        ? Object.keys(goals).filter(key => key <= month && Array.isArray(goals[key])).sort().pop()
        : Array.isArray(goals[month]) ? month : null;
    return from ? goals[from].filter(goal => goal && typeof goal === "object" && goal.amount > 0) : [];
}

// A month carrying another's takes its own copy as it changes
function changeGoals(month, change){
    let goals = savedGoals();
    goals[month] = change(monthGoals(month));
    keepGoals(goals);
}

function firstGoalMonth(){
    return Object.keys(savedGoals()).filter(month => /^\d{4}-\d{2}$/.test(month)).sort()[0] || null;
}

/* What counts */

// Dans Loft only once it has been added to the Apps page, or used
function goalApps(){
    let added = [];
    try { added = JSON.parse(localStorage.getItem("trainingHiddenApps")) || []; } catch(err){ added = []; }
    return trainingLogs.filter(log => !log.noTargets && (!log.hidden || added.includes(log.hidden) || countedSessions(log).length > 0));
}

// Every app, or those picked
function countingLogs(goal){
    let logs = trainingLogs.filter(log => !log.noTargets);
    return Array.isArray(goal.apps) && goal.apps.length > 0 ? logs.filter(log => goal.apps.includes(log.key)) : logs;
}

// A grade's place on the ladder the goal's grade is from: a boulder in Font or V, whichever it was logged in
function gradeRank(kind, grade, like){
    if(kind === "sport"){ return sportLadder.indexOf(grade); }
    return fontBoulderOrder.includes(like) ? fontBoulderOrder.indexOf(boulderFont(grade)) : vBoulderOrder.indexOf(boulderV(grade));
}

function goalGrades(kind){
    if(kind === "sport"){ return sportLadder; }
    return (boulderChartFont() ? fontBoulderOrder : vBoulderOrder).slice(1);
}

function goalDone(goal, month){
    let from = month + "-01";
    let to = month + "-" + daysIn(month);
    let total = 0;
    countingLogs(goal).forEach(log => countedSessions(log).filter(entry => entry.date >= from && entry.date <= to).forEach(entry => {
        if(goal.type === "sessions"){ total += 1; }
        else if(goal.type === "hours"){ total += sessionMinutes(log, entry) / 60; }
        else if(!goal.kind){ total += sessionClimbs(log, entry); }
        else {
            let read = log.key === "tradLog" && typeof ukc !== "undefined" ? Object.assign({}, entry, { "climbs" : ukc.session(entry).climbs }) : entry;
            let least = goal.grade ? gradeRank(goal.kind, goal.grade, goal.grade) : -1;
            total += entryClimbs(log.key, read).filter(climb => climb.kind === goal.kind
                && (least === -1 || gradeRank(goal.kind, climb.grade, goal.grade) >= least)).length;
        }
    }));
    return goal.type === "hours" ? Math.floor(total * 10) / 10 : total;
}

// The share of the goal the days gone so far ask for, in whole days: this month only
function goalExpected(goal, month){
    if(month !== monthOf(today())){ return null; }
    return goal.amount * (Number(today().slice(8)) - 1) / daysIn(month);
}

function goalPace(done, expected){
    if(expected === null){ return null; }
    if(done >= expected){ return "on"; }
    return done >= expected * 0.75 ? "behind" : "far";
}

function goalName(goal){
    if(goal.type === "hours"){ return goal.amount + (goal.amount === 1 ? " hour" : " hours"); }
    if(goal.type === "sessions"){ return plural(goal.amount, "session"); }
    let noun = goal.kind === "boulder" ? "boulder" : goal.kind === "sport" ? "sport climb" : "climb";
    return plural(goal.amount, noun) + (goal.grade ? " ≥ " + goal.grade : "");
}

function goalDetail(goal){
    if(!Array.isArray(goal.apps) || goal.apps.length === 0){ return ""; }
    return goal.apps.map(key => (trainingLog(key) || {}).name).filter(name => name).join(", ");
}

/* The page */

let shownMonth = null;

// back a month, or to the first with goals; on to three ahead
function monthRange(){
    let now = monthOf(today());
    let back = shiftMonth(now, -1);
    let first = firstGoalMonth();
    return { "first" : first !== null && first < back ? first : back, "last" : shiftMonth(now, monthsAhead), "now" : now };
}

function goalRow(goal, month){
    let done = goalDone(goal, month);
    let met = done >= goal.amount;
    let share = Math.min(100, Math.round(done / goal.amount * 100));
    let expected = goalExpected(goal, month);
    let pace = goalPace(done, expected);
    let detail = goalDetail(goal);
    // nothing done in a month begun: a red stub
    let none = done === 0 && month <= monthOf(today());
    return `<li class="goal${met ? " met" : ""}${none ? " none" : ""}"${pace ? ` data-pace="${pace}"` : ""}>
        <div class="goal-head">
            <span class="goal-name">${escapeHtml(goalName(goal))}${detail ? `<span class="goal-detail">${escapeHtml(detail)}</span>` : ""}</span>
            <span class="goal-done">${met ? "✓ Met" : `${done} / ${goal.amount}`}</span>
            <button type="button" class="icon-button demo-icon icon-wrench" data-action="openGoalForm" data-id="${goal.id}" aria-label="Edit the goal of ${escapeHtml(goalName(goal))}"></button>
        </div>
        <div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${goal.amount}" aria-valuenow="${done}"${pace ? ` aria-valuetext="${done} / ${goal.amount}, ${paceNames[pace]}"` : ""}><span style="width: ${share}%"></span>${
            expected === null ? "" : `<i class="goal-mark" style="left: ${Math.min(100, expected / goal.amount * 100)}%"></i>`}</div>
    </li>`;
}

function drawGoals(slide){
    let range = monthRange();
    if(shownMonth === null){ shownMonth = range.now; }
    shownMonth = shownMonth < range.first ? range.first : shownMonth > range.last ? range.last : shownMonth;
    let before = shiftMonth(shownMonth, -1), after = shiftMonth(shownMonth, 1);
    document.getElementById("goalMonth").innerText = monthLabel(shownMonth);
    document.getElementById("goalMonthBefore").innerText = monthLabel(before);
    document.getElementById("goalMonthAfter").innerText = monthLabel(after);
    document.getElementById("goalBack").disabled = before < range.first;
    document.getElementById("goalOn").disabled = after > range.last;
    let list = document.getElementById("goalList");
    let goals = monthGoals(shownMonth);
    list.innerHTML = goals.map(goal => goalRow(goal, shownMonth)).join("");
    document.getElementById("copyGoalsLine").hidden = !(shownMonth > range.now && goals.length === 0 && monthGoals(before).length > 0);
    document.getElementById("addGoalLine").hidden = !document.getElementById("goalForm").hidden;
    let panel = document.getElementById("goalMonthPanel");
    if(slide){
        panel.dataset.slide = "";
        void panel.offsetWidth;   // restarts the animation
        panel.dataset.slide = slide;
    }
}

function copyLastMonth(){
    let last = monthGoals(shiftMonth(shownMonth, -1));
    changeGoals(shownMonth, () => last.map(goal => Object.assign({}, goal)));
    drawGoals();
}

function stepMonth(button){
    let by = Number(button.dataset.step);
    shownMonth = shiftMonth(shownMonth, by);
    closeGoalForm();
    drawGoals(by > 0 ? "on" : "back");
}

// a sideways swipe moves a month, as the arrows do
function swipeMonths(area){
    let start = null;
    area.addEventListener("touchstart", event => {
        start = event.touches.length === 1 ? { "x" : event.touches[0].clientX, "y" : event.touches[0].clientY } : null;
    }, { "passive" : true });
    area.addEventListener("touchend", event => {
        if(start === null || event.target.closest("form")){ return; }
        let dx = event.changedTouches[0].clientX - start.x;
        let dy = event.changedTouches[0].clientY - start.y;
        start = null;
        if(Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5){ return; }
        let button = document.getElementById(dx < 0 ? "goalOn" : "goalBack");
        if(!button.disabled){ stepMonth(button); }
    });
}

let editingGoal = null;   // the id of the goal the form is changing

// A new goal, or from its wrench, one to change
function openGoalForm(button){
    let goal = button && button.dataset.id ? monthGoals(shownMonth).find(each => each.id === Number(button.dataset.id)) : null;
    editingGoal = goal ? goal.id : null;
    document.getElementById("goalType").value = goal ? goal.type : "sessions";
    document.getElementById("goalAmount").value = goal ? goal.amount : "";
    document.getElementById("goalKind-" + (goal && goal.kind ? goal.kind : "any")).checked = true;
    let apps = goal && Array.isArray(goal.apps) ? goal.apps : [];
    document.getElementById("goalChecks").innerHTML = goalApps().map(log =>
        `<label class="goal-check"><input type="checkbox" value="${log.key}"${apps.includes(log.key) ? " checked" : ""} /> ${escapeHtml(log.name)}</label>`).join("");
    showGoalForm();
    document.getElementById("goalGrade").value = goal && goal.grade ? goal.grade : "";
    document.getElementById("removeGoalButton").hidden = editingGoal === null;
    document.getElementById("saveGoalButton").innerText = editingGoal === null ? "SET GOAL" : "SAVE CHANGES";
    document.getElementById("goalForm").hidden = false;
    document.getElementById("addGoalLine").hidden = true;
    document.getElementById("goalAmount").focus();
}

function closeGoalForm(){
    editingGoal = null;
    document.getElementById("goalForm").hidden = true;
    document.getElementById("addGoalLine").hidden = false;
}

function goalKindPicked(){
    return document.querySelector("input[name=goalKind]:checked").value;
}

// apps for sessions and hours, a kind and a grade for climbs
function showGoalForm(){
    let type = document.getElementById("goalType").value;
    let kind = goalKindPicked();
    let amount = document.getElementById("goalAmount");
    amount.step = type === "hours" ? "0.5" : "1";
    amount.min = type === "hours" ? "0.5" : "1";
    document.getElementById("goalAppsField").hidden = type === "climbs";
    document.getElementById("goalClimbFields").hidden = type !== "climbs";
    let grade = document.getElementById("goalGrade");
    grade.hidden = kind === "";
    if(kind !== "" && grade.dataset.kind !== kind){
        grade.dataset.kind = kind;
        grade.innerHTML = `<option value="">Any grade</option>` + goalGrades(kind).map(name => `<option value="${name}">${name}</option>`).join("");
    }
}

function selectAllGoalApps(){
    document.querySelectorAll("#goalChecks input").forEach(box => { box.checked = true; });
}

function markInvalidGoal(field){
    field.setAttribute("aria-invalid", "true");
}

function clearInvalidGoal(field){
    field.removeAttribute("aria-invalid");
}

function saveGoal(){
    let type = document.getElementById("goalType").value;
    let field = document.getElementById("goalAmount");
    let amount = Number(field.value);
    // hours to the half hour
    amount = type === "hours" ? Math.round(amount * 2) / 2 : Math.round(amount);
    if(!(amount > 0)){
        markInvalidGoal(field);
        field.focus();
        return;
    }
    // never one already used, however quickly two are set
    let id = Object.values(savedGoals()).flat().reduce((last, each) => Math.max(last, Number(each && each.id) + 1 || 0), Date.now());
    let goal = { "id" : editingGoal === null ? id : editingGoal, "type" : type, "amount" : amount };
    if(type === "climbs"){
        let kind = goalKindPicked();
        let grade = document.getElementById("goalGrade").value;
        if(kind){ goal.kind = kind; }
        if(kind && grade){ goal.grade = grade; }
    } else {
        let apps = [...document.querySelectorAll("#goalChecks input:checked")].map(box => box.value);
        // every app ticked is the same as none
        if(apps.length > 0 && apps.length < goalApps().length){ goal.apps = apps; }
    }
    changeGoals(shownMonth, goals => editingGoal === null ? goals.concat(goal) : goals.map(each => each.id === editingGoal ? goal : each));
    closeGoalForm();
    drawGoals();
}

// from the form, while editing
function removeGoal(){
    let id = editingGoal;
    let month = shownMonth;
    let goal = monthGoals(month).find(each => each.id === id);
    if(!goal){ return; }
    confirmToast("Remove the goal of " + goalName(goal) + "?", "REMOVE", () => {
        changeGoals(month, goals => goals.filter(each => each.id !== id));
        closeGoalForm();
        drawGoals();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById("goalList") === null){ return; }
    document.getElementById("goalsCopy").checked = copyForwards();
    drawGoals();
    swipeMonths(document.querySelector(".goals"));
    // a sync, or another tab, changed them
    window.addEventListener("storage", event => { if(event.key === goalsKey || event.key === goalsCopyKey || event.key === null){ drawGoals(); } });
});
