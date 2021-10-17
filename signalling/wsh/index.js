const express = require('express');
const app = express();

const wsWebsocket = require('./wshWS');

const initWSAp = (onConnection) => {
    const server = app.listen(3005, ()=>{
        console.log("server started on port 3005");
    });

    const wsSocket = wsWebsocket.initWebSocket(onConnection);

    server.on('upgrade', (req, socket, head) => {
        wsSocket.handleUpgrade(req, socket, head, ws => wsSocket.emit('connection', ws, req));
    });
}

module.exports.initWSAp = initWSAp;