const getWeather = require('./getWeather');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

const BUCKET = "multi-pitch.data";
const KEY_CLIMBING_DATA = "climbing-data.json";
const KEY_CLIMBING_DATA_EXTENDED_DIRECTION = "climbing-data-extended-weather.json";

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

        getWeather(JSON.parse(climbsData))
            .then(resp => s3.putObject({
                    Bucket: BUCKET,
                    Key: KEY_CLIMBING_DATA_EXTENDED_DIRECTION,
                    Body: JSON.stringify(resp),
                    ACL: 'public-read',
                    ContentType: "application/json"
                }, (err, data) => {

                    if (err) {
                        callback(err, '');
                    } else {
                        callback(null, 'done all good!');
                    }
                })
            )
            .catch(err => callback(err, ""));
    });