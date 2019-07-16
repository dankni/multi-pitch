const fs = require('fs');
const path = require('path');
const readXlsxFile = require('read-excel-file/node');

//This file can come from where ever.
const EXCEL_PATH = './working-files/multi-pitch-data.xlsx';
const OUTPUT_FOLDER = './website/data';
const OUTPUT_FILE = 'data.js';

const CLIMBS = 1;
const IMAGES = 2;
const GUIDEBOOKS = 3;
const REFERANCES = 4;
const GEOLOGY = 5;
const WEATHER = 6;
const TO_DO_SCORE_CARD = 7;


const translationsKeys = [{
    fileName: OUTPUT_FILE,
    constName: "climbsData",
    objEntryPoint: "climbs",
    sheetNuber: CLIMBS
}, {
    fileName: OUTPUT_FILE,
    constName: "climbImgs",
    objEntryPoint: "imgs",
    sheetNuber: IMAGES
}, {
    fileName: OUTPUT_FILE,
    constName: "guideBooks",
    objEntryPoint: "books",
    sheetNuber: GUIDEBOOKS
}, {
    fileName: OUTPUT_FILE,
    constName: "referances",
    objEntryPoint: "referanceLines",
        sheetNuber: REFERANCES
}, {
    fileName: OUTPUT_FILE,
    constName: "weatherData",
    objEntryPoint: "weatherLines",
    sheetNuber: WEATHER
}];


async function readExcelAndTranformInJavascript(excelFile, sheetNo) {
    var sheetOb = { sheet : sheetNo }
    var allRows = await readXlsxFile(fs.createReadStream(excelFile), sheetOb);
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
    const stringifyResult = JSON.stringify(objectResult);

    const fileContent = `const ${translation.constName} = ${stringifyResult}; \n`;

    const folderLocation = path.resolve(__dirname, outputFolder);
    const fileLocation = path.resolve(folderLocation, translation.fileName);

    if (!fs.existsSync(folderLocation)) {
        fs.mkdirSync(folderLocation);
    }

    return new Promise((resolve, reject) => {
        fs.appendFile(fileLocation, fileContent, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        })
    })

}
function appendTestAndBuildString() {
    const stringForMochaTests = `
    //So then I can use this in my mocha tests: 
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = {
            weatherData, climbImgs, climbsData, guideBooks, referances
        };
    }`;
    try {
        fs.appendFileSync(OUTPUT_FOLDER + '/' + OUTPUT_FILE, stringForMochaTests);
        console.log('Test and build data appended to file!');
    } catch (err) {
        console.error(`Some shit happen.... ${err}`);
    }
}

// removed the old data file - local only, check prevents CI error
var dataFileExists = fs.existsSync(OUTPUT_FOLDER + '/' + OUTPUT_FILE);
if (dataFileExists === true) {
    fs.unlink(OUTPUT_FOLDER + '/' + OUTPUT_FILE, (err) => {
        if (err) throw err;
        console.log('old' + OUTPUT_FILE + ' removed. ');
    });
}


// creates or appends json to data file for each sheet
Promise.all(translationsKeys.map(translation =>
    readExcelAndTranformInJavascript(EXCEL_PATH, translation.sheetNuber)
        .then(excelResult => createFileFromTranslation(translation, excelResult, OUTPUT_FOLDER))))
        .then(_ => console.log("All good man :-) file saved in here: " + OUTPUT_FOLDER))
    .catch(err => console.error(`Some shit happen.... ${err}`));

// sorry I cant work out how to append this after the promise is compleated.
setTimeout(appendTestAndBuildString, 3500);
