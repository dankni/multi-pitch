const CLIMBS = "CLIMBS";
const IMAGES = "IMAGES";
const GUIDEBOOKS = "GUIDEBOOKS";
const WEATHER = "WEATHER";
const SHEET_ID = "1uWQR5-77i5gL4tp52xcjH4_5qJMh6S2LHEXQJUqpzsc";
const KEY = "AIzaSyAE0qX9qmMTTJS7kRkDHyF4L-Ke0I6FghE";


const translationsKeys = [{
    constName: "climbsData",
    objEntryPoint: "climbs",
    sheetName: CLIMBS
}, {
    constName: "climbImgs",
    objEntryPoint: "imgs",
    sheetName: IMAGES
}, {
    constName: "guideBooks",
    objEntryPoint: "books",
    sheetName: GUIDEBOOKS
}, {
    constName: "weatherData",
    objEntryPoint: "weatherLines",
    sheetName: WEATHER
}];

async function fetchGoogleSheet(sheetName) {
    const googleSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${sheetName}?&key=${KEY}`;
    const response = await fetch(googleSheetUrl);
    return response.json();

}


function parseGoogleSheetAndTranformInJavascript(googleSheet) {
    const allRows = googleSheet.values;
    let headers = allRows.shift();

    return allRows
        .filter(row => row.length !== 0)
        .map(row => {
            var n = 0;
            var translation = {};
            while (n < headers.length) {
                translation[headers[n]] = row[n];
                n++;
            }
            return translation;
        });
}

function attachToWindow(translation, result) {
    let objectResult = {};
    objectResult[translation.objEntryPoint] = result;
    window[translation.constName] = objectResult;

}

function loadData() {
    return Promise.all(translationsKeys.map(translation =>
        fetchGoogleSheet(translation.sheetName)
            .then(googleSheet => parseGoogleSheetAndTranformInJavascript(googleSheet))
            .then(result => attachToWindow(translation, result))))
        .then(_ => console.log("All good man :))"))
        .catch(err => console.error(`Some shit happen.... ${err}`));

}






