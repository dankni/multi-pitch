const fs = require('fs');
const util = require('util');
const path = require('path');
const readXlsxFile = require('read-excel-file/node');

//This file can come from where ever.
const EXCEL_PATH = './working-files/multi-pitch-data.xlsx';
const OUTPUT_FOLDER = './data';

const CLIMBS = 1;
const IMAGES = 2;
const GUIDEBOOKS = 3;
const REFERANCES = 4;
const GEOLOGY = 5;
const WEATHER = 6;
const TO_DO_SCORE_CARD = 7;


const translationsKeys = [{
    fileName: "climbs.js",
    constName: "climbsData",
    objEntryPoint: "climbs",
    sheetNuber: CLIMBS
}, {
    fileName: "imgs.js",
    constName: "climbImgs",
    objEntryPoint: "imgs",
    sheetNuber: IMAGES
}, {
    fileName: "guidebooks.js",
    constName: "guideBooks",
    objEntryPoint: "books",
    sheetNuber: GUIDEBOOKS
}, {
    fileName: "weather.js",
    constName: "weatherData",
    objEntryPoint: "weatherLines",
    sheetNuber: WEATHER
}];


async function readExcelAndTranformInJavascript(excelFile, sheet) {
    var allRows = await readXlsxFile(fs.createReadStream(excelFile), sheet);
    var headers = allRows.shift();

    return allRows.map(row => {
        var n = 0;
        var translation = {};
        while (n < headers.length) {
            translation[headers[n]] = row[n];
            n++;
        }
        return translation;
    });
}

async function createFileFromTranslation(translation, result, outputFolder) {
    let objectResult = {};
    objectResult[translation.objEntryPoint] = result;
    const stringifyResult = util.inspect(objectResult);

    const fileContent = `const ${translation.constName} = ${stringifyResult}`;
    const fileLocation = path.resolve(__dirname, outputFolder, translation.fileName);
    return new Promise((resolve, reject) => {
        fs.writeFile(fileLocation, fileContent, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        })
    })

}

Promise.all(translationsKeys.map(translation =>
    readExcelAndTranformInJavascript(EXCEL_PATH, translation.sheetNuber)
        .then(excelResult => createFileFromTranslation(translation, excelResult, OUTPUT_FOLDER))))
    .then(_ => console.log("All good man :)) file saved in here: " + OUTPUT_FOLDER))
    .catch(err => console.error(`Some shit happen.... ${err}`));






