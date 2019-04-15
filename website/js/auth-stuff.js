const getUserPreferencesUrl = 'https://kvxlqacxz7.execute-api.us-east-1.amazonaws.com/dev/user/preference';
const userClimbsUrl = 'https://kvxlqacxz7.execute-api.us-east-1.amazonaws.com/dev/user/climbs';
const tokenUrl = 'https://kvxlqacxz7.execute-api.us-east-1.amazonaws.com/dev/token/valid';

const allPreferences = {
    grade: {
        ysemiteDecimalSystem: ["Up to 5.5", "5.6 to 5.8", "5.9 or harder"],
        britishAdjectival: ["Up to VDiff", "Severe to VS", "HVS or harder"],
        UIAA: ["Up to UIAA IV", "UIAA IV to V", "UIAA V+ harder"],
        norwegian: ["Up to 3", "4 to 5", "5+ or harder"]
    }
};

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPreference() {
    const randomIntForGradingSystem = getRandomInt(0, 3);
    const randomIntForClimbingGrades = getRandomInt(1, 3);

    const gradeSystem = Object.keys(allPreferences.grade)[randomIntForGradingSystem];
    const gradeSystemAndClimbingGrade = allPreferences.grade[gradeSystem].slice(0, randomIntForClimbingGrades);
    return {
        climbingGrades: gradeSystemAndClimbingGrade,
        gradeSystem: gradeSystem
    }
}


function getData(url, headers) {
    return fetch(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: Object.assign({}, headers),
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
    })
}

function postData(url, body, headers) {
    return fetch(url, {
        method: "POST",
        mode: "cors",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: Object.assign({"Content-Type": "application/json"}, headers),
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(body), // body data type must match "Content-Type" header
    })
}

function deleteData(url, body, headers) {
    return fetch(url, {
        method: "DELETE",
        mode: "cors",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: Object.assign({"Content-Type": "application/json"}, headers),
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(body), // body data type must match "Content-Type" header
    })
}


function signin() {
    window.location = "https://auth.multi-pitch.com/login?response_type=token&redirect_uri=https://www.multi-pitch.com&client_id=2ovgs6dl71ucnkr2f1n2bp829i"
}

function saveClimb(climbId) {
    let headers = {
        "Authorization": localStorage.getItem('token')
    };

    postData(userClimbsUrl, {climbId}, headers)
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log("Climbs:", JSON.stringify(jsonData));
        })
        .catch(err => console.error("errr", err))
}

function deleteClimb(climbId) {
    let headers = {
        "Authorization": localStorage.getItem('token')
    };

    deleteData(userClimbsUrl, {climbId}, headers)
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log("Climbs:", JSON.stringify(jsonData));
        })
        .catch(err => console.error("errr", err))
}

function getSavedClimb() {
    let headers = {
        "Authorization": localStorage.getItem('token')
    };

    getData(userClimbsUrl, headers)
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log("Climbs:", JSON.stringify(jsonData));
        })
        .catch(err => console.error("errr", err))
}

function getPreferences() {
    let headers = {
        "Authorization": localStorage.getItem('token')
    };

    getData(getUserPreferencesUrl, headers)
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log("Preferences", JSON.stringify(jsonData));
        })
        .catch(err => console.error("errr", err))
}

function savePreferences(preference) {
    let headers = {
        "Authorization": localStorage.getItem('token')
    };

    postData(getUserPreferencesUrl, preference, headers)
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log("Preferences", JSON.stringify(jsonData));
        })
        .catch(err => console.error("errr", err))
}

function isTokenValid(token) {
    let headers = {
        "Authorization": token
    };

    return getData(tokenUrl, headers)
        .then(checkStatusIs200)
        .then(function (jsonData) {
            console.log(JSON.stringify(jsonData));
        })
        .catch(response => response.json()
            .then(responseErr => Promise.reject(`Error with status: ${response.status}, and response: ${JSON.stringify(responseErr)}`)))
}

window.auth = {
    signin,
    isTokenValid,
    saveClimb,
    deleteClimb,
    getSavedClimb,
    getPreferences,
    savePreferences
};


function checkStatusIs200(response) {
    if (response.status === 200) {
        return response.json();
    } else {
        return Promise.reject(response);
    }
}

function removeHash() {
    history.pushState("", document.title, window.location.pathname
        + window.location.search);
}

function checkIfUserIsRegistered() {
    const accessTokenFromUrl = document.location.hash.split('&')
        .filter(token => token.includes("id_token="))[0];
    const accessTokenFromUrlClean = accessTokenFromUrl ? accessTokenFromUrl.split("=")[1] : undefined;
    const accessTokenFromLocalStorage = localStorage.getItem('token');

    const token = accessTokenFromUrlClean || accessTokenFromLocalStorage;

    if (token) {
        isTokenValid(token)
            .then(_ => {
                console.log("You are a registered user! Welcome:", window.auth);
                localStorage.setItem('token', token);
                getPreferences()

            })
            .catch(err => {
                localStorage.removeItem("token");
                console.error(err);
                console.log("You are a registered user but you need to authenticate again :) call the function signin() or go here: https://auth.multi-pitch.com/login?response_type=token&redirect_uri=https://www.multi-pitch.com&client_id=2ovgs6dl71ucnkr2f1n2bp829i")
            })
            .finally(_ => removeHash())

    } else {
        console.log("You are not a registered user! to register go here: https://auth.multi-pitch.com/login?response_type=token&redirect_uri=https://www.multi-pitch.com&client_id=2ovgs6dl71ucnkr2f1n2bp829i")
    }

}
