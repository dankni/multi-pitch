var static = require('node-static');
var http = require('http');
//
// Create a node-static server instance to serve the './public' folder
//
var file = new static.Server('./website');

var server;


function start() {
    return new Promise((resolve, reject) => {
        server = http.createServer(function (request, response) {
            request.addListener('end', function () {
                file.serve(request, response);
            }).resume();
        });
        server.listen(9000);
        setTimeout(resolve);
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        server.close(resolve);
    });
}

var promiseStart = start();

module.exports = {
    promiseStart,
    stop
};


