const port = 9000;
const static = require('node-static');
const http = require('http');
const file = new static.Server('./website');

let server;


function start() {
    return new Promise((resolve, reject) => {
        server = http.createServer(function (request, response) {
            request.addListener('end', function () {
                file.serve(request, response);
            }).resume();
        });
        server.listen(port);
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