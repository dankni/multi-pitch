const calculateCarDistance = require('./calculateCarDistance');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

const BUCKET = "multi-pitch.data";
const KEY_CLIMBING_CAR_GRAPH = "climbing-car-graph.json";
const KEY_CLIMBING_CAR_GRAPH_EXTENDED_DIRECTION = "climbing-car-graph-extended.json";

exports.handler = (event, context, callback) =>
    s3.getObject({
        Bucket: BUCKET,
        Key: KEY_CLIMBING_CAR_GRAPH
    }, (err, data) => {
        if (err) {
            callback(err, '');
            return;
        }
        const carGraph = data.Body.toString();

        calculateCarDistance(JSON.parse(carGraph))
            .then(resp => s3.putObject({
                    Bucket: BUCKET,
                    Key: KEY_CLIMBING_CAR_GRAPH_EXTENDED_DIRECTION,
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