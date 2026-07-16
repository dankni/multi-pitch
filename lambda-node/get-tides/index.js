const getTides = require('./getTides.js');
// AWS SDK v3 is bundled in the nodejs18.x+ Lambda runtimes - not packaged in the zip
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

const BUCKET = "www.multi-pitch.com";
const BUCKET_OUT = "multi-pitch.data";
const KEY_CLIMBING_DATA = "data/data.json";
const KEY_CLIMBING_DATA_EXTENDED_TIDES = "climbing-data-extended-tides.json";

exports.handler = async () => {
    const object = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: KEY_CLIMBING_DATA
    }));
    const climbsData = await object.Body.transformToString();

    const tides = await getTides(JSON.parse(climbsData));

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET_OUT,
        Key: KEY_CLIMBING_DATA_EXTENDED_TIDES,
        Body: JSON.stringify(tides),
        ACL: 'public-read',
        ContentType: "application/json"
    }));
    return 'All tides saved!';
};
