// Lambda on the cloud!! https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/OAuthAPITest?tab=graph

const doc = require('dynamodb-doc');

const dynamo = new doc.DynamoDB();

const doneCallback = (err, res, callback) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err.message : JSON.stringify(res),
    headers: {
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin": "*"
    },
});
const done = callback => (err, res) => doneCallback(err, res, callback)

function getUserClimbs(params, username, callback) {

    params = {
        ExpressionAttributeNames: {
            "#username": "username"
        },
        ExpressionAttributeValues: {
            ":username": username
        },
        KeyConditionExpression: "#username = :username",
        TableName: "user-climbs"
    };

    dynamo.query(params, function (err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
            done(callback)(err);
        } else {
            console.log("Query succeeded.");
            data.Items.forEach(function (item) {
                console.log(" -", item.year + ": " + item.title);
            });
            done(callback)(err, data);
        }

    });
}

function handleUserClimbs(httpMethod, body, username, callback) {
    let params = {};
    params.TableName = "user-climbs";

    switch (httpMethod) {
        case "DELETE":
            const climbToDelete = JSON.parse(body);
            console.log("Parsed body:", climbToDelete)
            params.Key = {
                "climb-id": climbToDelete.climbId,
                "username": username
            }
            console.log("Going to delete: " + params);
            dynamo.deleteItem(params, function (err, res) {
                if (err) {
                    doneCallback(err, res, callback)
                } else {
                    getUserClimbs(params, username, callback)
                }
            });
            break;
        case 'POST':
            const climbs = JSON.parse(body);
            console.log("Parsed body:", climbs)
            params.Item = {
                "climb-id": climbs.climbId,
                "username": username,
                "savedTime": Date.now()
            }
            console.log("Going to add: " + params);
            dynamo.putItem(params, function (err, res) {
                if (err) {
                    doneCallback(err, res, callback)
                } else {
                    getUserClimbs(params, username, callback)
                }
            });
            break;
        case 'GET':
            getUserClimbs(params, username, callback)
            break;
        default:
            done(callback)(new Error(`Unsupported method "${httpMethod}"`));
    }
}

function handleUserPreference(httpMethod, body, username, callback) {
    let params = {};
    params.TableName = "user-preferences";

    switch (httpMethod) {
        case 'POST':
            const preferences = JSON.parse(body);
            console.log("Parsed body:", preferences, "for username:", username)

            params.Item = {
                grade_system: preferences.gradeSystem,
                climbing_grades: preferences.climbingGrades,
                id: username
            }
            dynamo.putItem(params, done(callback));
            break;
        case 'GET':
            params.Key = {id: username};
            dynamo.getItem(params, done(callback));
            break;
        default:
            done(callback)(new Error(`Unsupported method "${httpMethod}"`));
    }
}

exports.handler = (event, context, callback) => {
    console.log("recieved event", event)
    const username = event.requestContext.authorizer.claims["cognito:username"];
    const pathResource = event.resource;
    console.log("pathResource: " + pathResource)
    const httpMethod = event.httpMethod;
    const body = event.body;

    if (pathResource === "/user/climbs") {
        handleUserClimbs(httpMethod, body, username, callback)
    } else if (pathResource === "/user/preference") {
        handleUserPreference(httpMethod, body, username, callback)
    } else {
        done(callback)(new Error(`Unsupported pathResource: "${pathResource}"`));
    }

};
