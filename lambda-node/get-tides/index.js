const getTides = require('./getTides.js');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

const BUCKET = "www.multi-pitch.com";
const BUCKET_OUT = "multi-pitch.data";
const KEY_CLIMBING_DATA = "data/data.json";
const KEY_CLIMBING_DATA_EXTENDED_TIDES = "climbing-data-extended-tides.json";

exports.handler = (event, context, callback) =>
    s3.getObject({
        Bucket: BUCKET,
        Key: KEY_CLIMBING_DATA
    }, (err, data) => {
        if (err) {
            callback(err, '');
            return;
        }
        const climbsData = data.Body.toString();

        getTides(JSON.parse(climbsData))
            .then(resp => s3.putObject({
                    Bucket: BUCKET_OUT,
                    Key: KEY_CLIMBING_DATA_EXTENDED_TIDES,
                    Body: JSON.stringify(resp),
                    ACL: 'public-read',
                    ContentType: "application/json"
                }, (err, data) => {
                    if (err) {
                        callback(err, '');
                    } else {
                        callback(null, 'All tides saved!');
                    }
                })
            )
            .catch(err => callback(err, ""));
    });
