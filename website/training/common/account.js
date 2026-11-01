/* An optional account, and keeping this phone's sessions in step with its copy.

   The Cognito user pool signs in; the identity pool swaps that for an hour's AWS
   keys that can only reach this person's one item in DynamoDB, which holds their
   backup (common/backup.js) gzipped. No server of ours in between - see
   infra/accounts.yml. This phone is still the source of truth: signed out or
   offline, nothing changes, and a sync only ever merges.

   Only the refresh token, the email and the identity id are stored; the tokens
   and keys they get are kept in memory. Loaded when the person in the nav is
   first tapped, or on every page once signed in (loadAccount() in functions.js). */

// from the stack's outputs; none of them is a secret
const accountConfig = {
    "region" : "eu-west-1",
    "userPoolId" : "eu-west-1_d3cYoqyyB",
    "clientId" : "2tig0k06r5n2dfvij1lt5t4dek",
    "identityPoolId" : "eu-west-1:2e92eace-d57e-4363-9955-b016c0bd3ea7",
    "table" : "multi-pitch-training-users"
};

const accountEmailKey = "accountEmail";
const accountIdentityKey = "accountIdentity";
const accountLastSyncKey = "accountLastSync";
const accountUsedKey = "accountUsed";     // signed in here at least once: the account goes above the backup

const syncDelay = 5000;
const syncTries = 3;
const itemLimit = 390000;   // a DynamoDB item tops out at 400 KB

let accountTokens = null;   // { id, access, expires }
let accountKeys = null;     // { accessKeyId, secretAccessKey, sessionToken, expires }
let accountCode = null;     // { email, password, reset } while a code is awaited

function signedIn(){
    return localStorage.getItem(accountRefreshKey) !== null;
}

/* ================= Calls to AWS ================= */

// AWS's own message, named by its error type; a dead connection says so in a word
function awsError(data){
    let error = new Error(data.message || data.Message || "Something went wrong");
    error.name = String(data.__type || "Error").split("#").pop();
    return error;
}

// Cognito speaks JSON 1.1, DynamoDB 1.0; only DynamoDB is signed
async function awsCall(url, target, body, sign){
    let request = { "method" : "POST", "headers" : { "Content-Type" : sign ? "application/x-amz-json-1.0" : "application/x-amz-json-1.1", "X-Amz-Target" : target },
        "body" : JSON.stringify(body) };
    let response;
    try {
        response = await (sign ? sign.fetch(url, request) : fetch(url, request));
    } catch(err){
        let offline = new Error("Couldn't connect");
        offline.name = "Offline";
        throw offline;
    }
    let data = await response.json().catch(() => ({}));
    if(!response.ok){ throw awsError(data); }
    return data;
}

function userPool(target, body){
    return awsCall(`https://cognito-idp.${accountConfig.region}.amazonaws.com/`, "AWSCognitoIdentityProviderService." + target,
        Object.assign({ "ClientId" : accountConfig.clientId }, body));
}

function identityPool(target, body){
    return awsCall(`https://cognito-identity.${accountConfig.region}.amazonaws.com/`, "AWSCognitoIdentityService." + target, body);
}

async function dynamo(target, body){
    let keys = await awsKeys();
    let signer = new aws4fetch.AwsClient({ "accessKeyId" : keys.accessKeyId, "secretAccessKey" : keys.secretAccessKey,
        "sessionToken" : keys.sessionToken, "service" : "dynamodb", "region" : accountConfig.region });
    return awsCall(`https://dynamodb.${accountConfig.region}.amazonaws.com/`, "DynamoDB_20120810." + target,
        Object.assign({ "TableName" : accountConfig.table }, body), signer);
}

/* ================= Tokens and keys ================= */

function keepTokens(result){
    accountTokens = { "id" : result.IdToken, "access" : result.AccessToken, "expires" : Date.now() + (result.ExpiresIn - 60) * 1000 };
    if(result.RefreshToken){ localStorage.setItem(accountRefreshKey, result.RefreshToken); }
}

async function freshTokens(){
    if(accountTokens !== null && accountTokens.expires > Date.now()){ return accountTokens; }
    try {
        let data = await userPool("InitiateAuth", { "AuthFlow" : "REFRESH_TOKEN_AUTH",
            "AuthParameters" : { "REFRESH_TOKEN" : localStorage.getItem(accountRefreshKey) } });
        keepTokens(data.AuthenticationResult);
        return accountTokens;
    } catch(err){
        // revoked, expired, or the user deleted elsewhere
        if(err.name === "NotAuthorizedException"){
            forgetAccount();
            toast("Signed out - sign in again to sync", null, true, true);
        }
        throw err;
    }
}

async function awsKeys(){
    if(accountKeys !== null && accountKeys.expires > Date.now()){ return accountKeys; }
    let tokens = await freshTokens();
    let logins = { [`cognito-idp.${accountConfig.region}.amazonaws.com/${accountConfig.userPoolId}`] : tokens.id };
    let identity = localStorage.getItem(accountIdentityKey);
    if(identity === null){
        identity = (await identityPool("GetId", { "IdentityPoolId" : accountConfig.identityPoolId, "Logins" : logins })).IdentityId;
        localStorage.setItem(accountIdentityKey, identity);
    }
    let keys = (await identityPool("GetCredentialsForIdentity", { "IdentityId" : identity, "Logins" : logins })).Credentials;
    accountKeys = { "accessKeyId" : keys.AccessKeyId, "secretAccessKey" : keys.SecretKey, "sessionToken" : keys.SessionToken,
        "expires" : keys.Expiration * 1000 - 60000 };
    return accountKeys;
}

/* ================= Signing in and out ================= */

async function signIn(email, password){
    let data = await userPool("InitiateAuth", { "AuthFlow" : "USER_AUTH",
        "AuthParameters" : { "USERNAME" : email, "PREFERRED_CHALLENGE" : "PASSWORD", "PASSWORD" : password } });
    if(!data.AuthenticationResult && data.ChallengeName === "SELECT_CHALLENGE"){
        data = await userPool("RespondToAuthChallenge", { "ChallengeName" : "SELECT_CHALLENGE", "Session" : data.Session,
            "ChallengeResponses" : { "USERNAME" : email, "ANSWER" : "PASSWORD", "PASSWORD" : password } });
    }
    if(!data.AuthenticationResult){ throw new Error("Couldn't sign in"); }
    keepTokens(data.AuthenticationResult);
    localStorage.setItem(accountEmailKey, email);
    localStorage.setItem(accountUsedKey, "true");
    accountCode = null;
}

// Everything the account stored here goes; the sessions stay
function forgetAccount(){
    [accountRefreshKey, accountEmailKey, accountIdentityKey, accountLastSyncKey, settingsSavedKey, settingsSeenKey]
        .forEach(key => localStorage.removeItem(key));
    accountTokens = null;
    accountKeys = null;
    clearTimeout(syncTimer);
    showAccount();
}

/* ================= Sync ================= */

function toBase64(bytes){
    let text = "";
    for(let i = 0; i < bytes.length; i += 0x8000){ text += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); }
    return btoa(text);
}

async function gzip(text){
    let stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(base64){
    let bytes = Uint8Array.from(atob(base64), letter => letter.charCodeAt(0));
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

let syncing = null;
let syncAgain = false;
let syncTimer = null;

// One at a time; asked again while one runs, it runs once more after
function syncNow(){
    if(syncing !== null){
        syncAgain = true;
        return syncing;
    }
    syncing = runSync().catch(err => {
        if(err.name !== "Offline" && err.name !== "NotAuthorizedException"){ toast(err.message, null, false, true); }
    }).finally(() => {
        syncing = null;
        if(syncAgain){
            syncAgain = false;
            syncNow();
        }
    });
    return syncing;
}

// After a session is saved or deleted - several taps, one sync
function syncSoon(){
    if(!signedIn()){ return; }
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, syncDelay);
}

/* Read the account's copy, merge, write the merge here and back. The write only
   lands if nobody else wrote since the read (the version number); if another
   phone did, read and merge again. */
async function runSync(){
    if(!signedIn() || !navigator.onLine){ return; }
    await awsKeys();
    let key = { "id" : { "S" : localStorage.getItem(accountIdentityKey) } };
    for(let attempt = 0; attempt < syncTries; attempt++){
        let item = (await dynamo("GetItem", { "Key" : key, "ConsistentRead" : true })).Item;
        let remote = item ? JSON.parse(await gunzip(item.data.B)) : null;
        let version = item ? Number(item.version.N) : 0;
        if(remote !== null && !isBackup(remote)){ throw new Error("The synced copy can't be read"); }

        stampSettings();
        let merged = remote === null ? backupData() : mergeBackup(backupData(), remote);
        // merged again with this phone as it is now, in case a session was saved while waiting
        let added = applyBackup(mergeBackup(backupData(), merged));

        if(remote === null || !sameBackup(merged, remote)){
            let packed = await gzip(JSON.stringify(merged));
            if(packed.length > itemLimit){ throw new Error("Too much to sync"); }
            try {
                await dynamo("PutItem", {
                    "Item" : Object.assign({}, key, { "data" : { "B" : toBase64(packed) }, "version" : { "N" : String(version + 1) },
                        "saved" : { "S" : new Date().toISOString() } }),
                    "ConditionExpression" : item ? "version = :seen" : "attribute_not_exists(id)",
                    "ExpressionAttributeValues" : item ? { ":seen" : { "N" : String(version) } } : undefined
                });
            } catch(err){
                if(err.name === "ConditionalCheckFailedException"){ continue; }
                throw err;
            }
        }
        localStorage.setItem(accountLastSyncKey, String(Date.now()));
        showAccount();
        if(added > 0){ showSynced(); }
        return;
    }
    throw new Error("Couldn't sync - try again");
}

// What is on screen catches up: an app's log redraws, the progress page offers a reload
function showSynced(){
    if(typeof sessionLogView !== "undefined" && sessionLogView !== null){
        drawSessionLog();
    } else if(document.getElementById("allLogs") !== null){
        toast("Synced - tap to reload", () => location.reload());
    }
}

/* ================= The panel =================
   An overlay behind the person in the nav, built the first time it is opened:
   the backup file, and the account - signed out, waiting for an emailed code, or
   signed in, one at a time. Once this device has ever signed in, the account
   comes first. */

// an open eye, struck through while the password shows
const eyeIcon = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">'
    + '<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.25"/><path class="eye-slash" d="M2.5 13.5 13.5 2.5"/></g></svg>';

const showPassword = `<button type="button" class="show-password" data-action="togglePasswordShown" aria-label="Show password" aria-pressed="false">${eyeIcon}</button>`;

// what infra/accounts.yml asks of a new password, ticked off as it is typed
const passwordRulesList = `<ul class="password-rules" hidden>
                <li data-rule="length">10+ characters</li>
                <li data-rule="lower">Lowercase</li>
                <li data-rule="upper">Uppercase</li>
                <li data-rule="number">Number</li>
            </ul>`;

const accountPanel = `<aside id="account" class="overlay">
    <section class="backup">
        <h2>Old Fashioned Back up</h2>
        <p>
            By default, your sessions only live in this browser. Save a backup of everything (logs and settings)
            and restore it here to put it back, or to move it to a new device or browser. Restoring adds what's
            missing and keeps what's already here. Your UKC logbook isn't included: import it again from UKC.
        </p>
        <p class="backup-actions">
            <button type="button" data-action="downloadBackup">
                <svg class="arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v10M3.5 7.5 8 12l4.5-4.5M2 14.5h12"/></svg>SAVE
            </button>
            <button type="button" class="quiet" data-action="chooseBackupFile">
                <svg class="arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 14V4M3.5 8.5 8 4l4.5 4.5M2 1.5h12"/></svg>RESTORE
            </button>
        </p>
        <input type="file" id="backupFile" accept=".json,application/json" hidden data-change="importBackupFile" />
    </section>
    <section class="account" id="accountLogin">
        <h2>Account</h2>
        <p>Create an account or sign in.</p>
        <form class="account-form" data-account="out">
            <input type="email" class="field" id="accountEmail" autocomplete="username" placeholder="Email" aria-label="Email" data-input="checkEmail" />
            <div class="field-group password-field">
                <input type="password" class="field" id="accountPassword" autocomplete="current-password" placeholder="Password" aria-label="Password" data-input="checkPassword" />
                ${showPassword}
            </div>
            ${passwordRulesList}
            <p class="backup-actions">
                <button type="button" data-action="signInAccount">SIGN IN</button>
                <button type="button" class="quiet" data-action="signUpAccount">SIGN UP</button>
            </p>
            <p class="account-links">
                <button type="button" class="link-button" data-action="forgotPassword">Forgot password</button>
                <a class="link-button" href="/privacy/" target="_blank" rel="noopener">Privacy policy</a>
            </p>
        </form>
        <form class="account-form" data-account="code" hidden>
            <input type="text" class="field" id="accountCodeField" inputmode="numeric" autocomplete="one-time-code" placeholder="Code" aria-label="Code" data-input="clearInvalid" />
            <div class="field-group password-field" id="accountNewPasswordGroup" hidden>
                <input type="password" class="field" id="accountNewPassword" autocomplete="new-password" placeholder="New password" aria-label="New password" data-input="checkPassword" />
                ${showPassword}
            </div>
            ${passwordRulesList}
            <p class="backup-actions">
                <button type="button" data-action="confirmAccountCode">CONFIRM</button>
                <button type="button" class="quiet" data-action="cancelAccountCode">CANCEL</button>
            </p>
            <button type="button" class="link-button" data-action="resendAccountCode">Resend code</button>
        </form>
        <div class="account-form" data-account="in" hidden>
            <p id="accountEmailShown"></p>
            <p class="account-note" id="accountLastSynced"></p>
            <p class="backup-actions">
                <button type="button" data-action="syncAccount">SYNC NOW</button>
                <button type="button" class="quiet" data-action="signOutAccount">SIGN OUT</button>
            </p>
            <button type="button" class="link-button" data-action="deleteAccount">Delete account</button>
        </div>
    </section>
    <button type="button" class="icon-button close" data-action="hideAccount" aria-label="Close account panel"></button>
</aside>`;

function drawAccountPanel(){
    if(document.getElementById("account") === null){
        document.body.insertAdjacentHTML("beforeend", accountPanel);
    }
    showAccount();
}

function accountField(id){
    return document.getElementById(id).value.trim();
}

function showAccount(){
    let login = document.getElementById("accountLogin");
    if(login === null){ return; }
    let backup = login.parentNode.querySelector(".backup");
    if(signedIn() || localStorage.getItem(accountUsedKey) !== null){
        backup.before(login);
    } else {
        backup.after(login);
    }
    let part = signedIn() ? "in" : accountCode !== null ? "code" : "out";
    login.querySelectorAll("[data-account]").forEach(box => { box.hidden = box.dataset.account !== part; });
    document.getElementById("accountNewPasswordGroup").hidden = !(accountCode && accountCode.reset);
    checkPassword(document.getElementById("accountPassword"));
    checkPassword(document.getElementById("accountNewPassword"));
    document.getElementById("accountEmailShown").innerText = localStorage.getItem(accountEmailKey) || "";
    let last = Number(localStorage.getItem(accountLastSyncKey));
    document.getElementById("accountLastSynced").innerText = last
        ? "Last synced " + new Date(last).toLocaleString([], { "dateStyle" : "medium", "timeStyle" : "short" }) : "";
}

/* ================= Checking the fields =================
   A field that is wrong is edged in red until it is put right. */

function markInvalid(id){
    document.getElementById(id).setAttribute("aria-invalid", "true");
}

function clearInvalid(field){
    field.removeAttribute("aria-invalid");
}

function emailOk(text){
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text);
}

// Once marked, red until it is a real address
function checkEmail(field){
    if(emailOk(field.value.trim())){ clearInvalid(field); }
}

// The pool's password policy, as infra/accounts.yml sets it
const passwordRules = {
    "length" : text => text.length >= 10,
    "lower" : text => /[a-z]/.test(text),
    "upper" : text => /[A-Z]/.test(text),
    "number" : text => /[0-9]/.test(text)
};

function passwordOk(text){
    return Object.values(passwordRules).every(rule => rule(text));
}

// Each rule ticked as it is met, shown once something is typed. The sign in
// password is right once there is one; a new one, once it meets the rules.
function checkPassword(field){
    let rules = field.closest(".password-field").nextElementSibling;
    rules.hidden = field.value === "";
    rules.querySelectorAll("[data-rule]").forEach(item => {
        item.classList.toggle("met", passwordRules[item.dataset.rule](field.value));
    });
    if(field.value !== "" && (field.id === "accountPassword" || passwordOk(field.value))){ clearInvalid(field); }
}

function togglePasswordShown(button){
    let field = button.previousElementSibling;
    let show = field.type === "password";
    field.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Hide password" : "Show password");
}

// Each [id, ok] that isn't is marked, and the first focused; true if all are
function fieldsOk(checks){
    let wrong = checks.filter(([, ok]) => !ok).map(([id]) => id);
    wrong.forEach(markInvalid);
    if(wrong.length > 0){ document.getElementById(wrong[0]).focus(); }
    return wrong.length === 0;
}

// Which fields AWS's refusals are about
const errorFields = {
    "NotAuthorizedException" : ["accountEmail", "accountPassword"],
    "UsernameExistsException" : ["accountEmail"],
    "InvalidPasswordException" : ["accountPassword", "accountNewPassword"],
    "CodeMismatchException" : ["accountCodeField"],
    "ExpiredCodeException" : ["accountCodeField"]
};

// Buttons off while AWS is asked; a refusal marks its fields and says why
async function accountBusy(work){
    let buttons = [...document.getElementById("accountLogin").querySelectorAll("button")];
    buttons.forEach(button => { button.disabled = true; });
    try {
        await work();
    } catch(err){
        (errorFields[err.name] || []).forEach(markInvalid);
        toast(err.message, null, false, true);
    } finally {
        buttons.forEach(button => { button.disabled = false; });
        showAccount();
    }
}

function signInAccount(){
    let email = accountField("accountEmail"), password = document.getElementById("accountPassword").value;
    if(!fieldsOk([["accountEmail", emailOk(email)], ["accountPassword", password !== ""]])){ return; }
    accountBusy(async () => {
        try {
            await signIn(email, password);
        } catch(err){
            // signed up but never entered the code: a new one, and the code part
            if(err.name !== "UserNotConfirmedException"){ throw err; }
            await userPool("ResendConfirmationCode", { "Username" : email });
            accountCode = { "email" : email, "password" : password, "reset" : false };
            return;
        }
        document.getElementById("accountPassword").value = "";
        await syncNow();
    });
}

function signUpAccount(){
    let email = accountField("accountEmail"), password = document.getElementById("accountPassword").value;
    if(!fieldsOk([["accountEmail", emailOk(email)], ["accountPassword", passwordOk(password)]])){ return; }
    accountBusy(async () => {
        await userPool("SignUp", { "Username" : email, "Password" : password, "UserAttributes" : [{ "Name" : "email", "Value" : email }] });
        accountCode = { "email" : email, "password" : password, "reset" : false };
    });
}

function forgotPassword(){
    let email = accountField("accountEmail");
    if(!fieldsOk([["accountEmail", emailOk(email)]])){ return; }
    accountBusy(async () => {
        await userPool("ForgotPassword", { "Username" : email });
        accountCode = { "email" : email, "password" : null, "reset" : true };
    });
}

function confirmAccountCode(){
    let code = accountField("accountCodeField");
    let checks = [["accountCodeField", code !== ""]];
    if(accountCode.reset){ checks.push(["accountNewPassword", passwordOk(document.getElementById("accountNewPassword").value)]); }
    if(!fieldsOk(checks)){ return; }
    accountBusy(async () => {
        let { email, password, reset } = accountCode;
        if(reset){
            password = document.getElementById("accountNewPassword").value;
            await userPool("ConfirmForgotPassword", { "Username" : email, "ConfirmationCode" : code, "Password" : password });
        } else {
            await userPool("ConfirmSignUp", { "Username" : email, "ConfirmationCode" : code });
        }
        await signIn(email, password);
        ["accountCodeField", "accountPassword", "accountNewPassword"].forEach(id => { document.getElementById(id).value = ""; });
        await syncNow();
    });
}

function resendAccountCode(){
    accountBusy(() => accountCode.reset
        ? userPool("ForgotPassword", { "Username" : accountCode.email })
        : userPool("ResendConfirmationCode", { "Username" : accountCode.email }));
}

function cancelAccountCode(){
    accountCode = null;
    showAccount();
}

function syncAccount(){
    accountBusy(syncNow);
}

function signOutAccount(){
    let token = localStorage.getItem(accountRefreshKey);
    forgetAccount();
    // best effort: offline, the token is still gone from this phone
    userPool("RevokeToken", { "Token" : token }).catch(() => {});
}

function deleteAccount(){
    confirmToast("Delete your account?", "DELETE", () => accountBusy(async () => {
        await dynamo("DeleteItem", { "Key" : { "id" : { "S" : localStorage.getItem(accountIdentityKey) } } });
        await userPool("DeleteUser", { "AccessToken" : (await freshTokens()).access });
        forgetAccount();
    }));
}

if(signedIn()){ syncNow(); }
window.addEventListener("online", () => { if(signedIn()){ syncNow(); } });
