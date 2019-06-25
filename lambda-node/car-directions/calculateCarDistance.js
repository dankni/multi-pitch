const axios = require('axios');

const googleDirectionKeyApi = process.env.GOOGLE_DIRECTION_KEY_API;

function parseGraph(graph) {
    const edge = graph.car.edge[0];
    const nodes = graph.car.nodes;
    const source = edge.source;
    const target = edge.target;
    return {
        source: {
            id: source,
            latLong: nodes.find(n => n.id === source).metadata.latLong
        },
        target: {
            id: target,
            latLong: nodes.find(n => n.id === target).metadata.latLong
        }
    }
}

function parseGoogleResponse(data) {

    let leg = {
        distance: {text: ""},
        duration: {text: ""}
    };
    try {
        leg = data.routes[0].legs[0];
    } catch (e) {

    }
    return {
        distance: leg.distance.text,
        duration: leg.duration.text
    }
}


function calculateCarDistance(climbingCarGraph) {
    let promised = climbingCarGraph.map(d => {
        let parsed = parseGraph(d);
        let originLatLong = parsed.source.latLong;
        let destinationLatLong = parsed.target.latLong;
        let gUrlDirectionApi = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLatLong}&destination=${destinationLatLong}&key=${googleDirectionKeyApi}`;
        return axios.get(gUrlDirectionApi)
    });

    return axios.all(promised)
        .then(axiosResponse => axiosResponse.map(resp => resp.data))
        .then(googleResponses => {
            return climbingCarGraph.reduce((acc, current, i) => {
                const googleResponse = googleResponses[i];
                if (googleResponse.status === "OK") {
                    // TODO mutate the edge with the extra metadata
                    Object.assign(current.car.edge[0], {
                        metadata: parseGoogleResponse(googleResponse)
                    });
                    acc.goodResults.push(current)
                } else {
                    acc.badResults.push({
                        status: googleResponse.status,
                        climbId: current.climbId
                    })
                }
                return acc;
            }, {
                goodResults: [],
                badResults: [],
                lastUpdated: new Date()
            })

        })
        .catch(err => {
            console.log("err" + err);
            return {
                "error_message": err.message,
                "routes": [],
                "status": "REQUEST_DENIED"
            }
        });

}

module.exports = calculateCarDistance;
