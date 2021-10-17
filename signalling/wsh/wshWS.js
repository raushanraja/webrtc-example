const wss = require('ws');
const socket = new wss.Server({ noServer: true, clientTracking: true });

function initWebSocket(onConnection) {
    socket.addListener('connection', (client, request) => onConnection(client, request, socket));
    return socket;
}


module.exports.initWebSocket = initWebSocket;