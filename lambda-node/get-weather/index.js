const { getWeather } = require('./getWeatherOM.js');
// AWS SDK v3 is bundled in the nodejs18.x+ Lambda runtimes - not packaged in the zip
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

const BUCKET = "www.multi-pitch.com";
const BUCKET_OUT = "multi-pitch.data";
const KEY_CLIMBING_DATA = "data/data.json";
const KEY_CLIMBING_DATA_EXTENDED_WEATHER = "climbing-data-extended-weather.json";

exports.handler = async () => {
    const object = await s3.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: KEY_CLIMBING_DATA
    }));
    const climbsData = await object.Body.transformToString();

    const weather = await getWeather(JSON.parse(climbsData));

    // hourly detail is large (480 hours x 9 fields per climb), so it is
    // stored as one object per climb and stripped from the shared daily
    // feed that every homepage visitor downloads
    const uploads = weather.map(entry => {
        if (!entry.climbId || !entry.hourly) return null;
        const hourlyBody = JSON.stringify({
            climbId: entry.climbId,
            timezone: entry.timezone,
            hourly: entry.hourly
        });
        delete entry.hourly;
        return s3.send(new PutObjectCommand({
            Bucket: BUCKET_OUT,
            Key: `climbing-weather-hourly/${entry.climbId}.json`,
            Body: hourlyBody,
            ACL: 'public-read',
            ContentType: "application/json"
        }));
    }).filter(Boolean);

    uploads.push(s3.send(new PutObjectCommand({
        Bucket: BUCKET_OUT,
        Key: KEY_CLIMBING_DATA_EXTENDED_WEATHER,
        Body: JSON.stringify(weather),
        ACL: 'public-read',
        ContentType: "application/json"
    })));
    await Promise.all(uploads);
    return 'done all good!';
};
