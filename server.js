import { createServer } from 'http';
import { Server as StaticServer } from 'node-static';

const port = 9000;
const file = new StaticServer('./website');

let server;

function start() {
    return new Promise((resolve, reject) => {
        server = createServer(function (request, response) {
            request.addListener('end', function () {
                file.serve(request, response, function(err) {
                    if (err) {
                        response.writeHead(err.status, err.headers);
                        response.end(err.message);
                    }
                });
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

const promiseStart = start();

export {
    promiseStart,
    stop
};