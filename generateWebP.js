const fs = require('fs');
const path = require('path');
const webp = require('webp-converter');
const exec = require('child_process').exec;


function traverseDirFindImagesByExtension(dir, imagesExtension) {
    var images = [];

    function traverseDirFindImagesByExtensionAcc(dir, imagesExtension) {

        fs.readdirSync(dir).forEach(file => {
            let fullPath = path.join(dir, file);
            if (fs.lstatSync(fullPath).isDirectory()) {
                traverseDirFindImagesByExtensionAcc(fullPath, imagesExtension);
            } else {
                if (imagesExtension.includes(path.extname(fullPath))) {
                    images.push(fullPath);
                }
            }
        });
    }

    traverseDirFindImagesByExtensionAcc(dir, imagesExtension);

    return images;
}

function webPconversion(imagePath) {
    return new Promise((resolve, reject) => {
        if (imagePath === "") {
            resolve("100")
        }

        const inputPath = imagePath;
        const outputPath = imagePath.substring(0, imagePath.lastIndexOf(".")) + ".webp";
        webp.cwebp(inputPath, outputPath, "-q 80",
            (status, error) =>
                status === '101' ? reject(error) : resolve(status))
    })
}

function generate() {


    const imgPath = path.resolve(__dirname, "website", "img");
    const imagesExtension = [".jpeg", ".jpg", ".png"];

    const images = traverseDirFindImagesByExtension(imgPath, imagesExtension);


    return Promise.all(images.map(webPconversion))
}

generate()
    .then(_ => console.log("All good man :)))"))
    .catch(err => console.error(`Some shit happen.... ${err}`));



