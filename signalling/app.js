const wsh = require('./wsh/index');
const { OPEN } = require('ws')
const { decode, encode, generateClientId } = require('./helpers');

const Message = function (type, message, success, error) {
    this.type = type,
        this.message = message,
        this.success = success,
        this.error = error
    this.decoded = () => {
        const { decoded, ...data } = this;
        return JSON.stringify(data);
    }
};


class ClientManager {
    static clientMap = new Map();

    constructor(clientSocket) {
        this.id = generateClientId();
        this.clientSocket = clientSocket;
    }

    addEventHandlers() {
        this.clientSocket.on('message', (message) => this.messageHandler(message, this));
        this.clientSocket.on('close', (code, data) => this.onClose(code, data, this.id));
    }

    messageHandler(message, client) {
        console.log("Received Message");
        message = message.toString();
        try {
            const encoded_message = encode(message);
            // client.clientSocket.send("Server: " + decode(data));
            handleIncomingMessage(message, encoded_message, client);
        }
        catch (error) {
            client.clientSocket.send("Error: JSON Only " + error);
        }
    }

    onClose(code, data, id) {
        if (code === 1001) console.log('Connection closed by Client: ', id);
        else console.log('Connection closed by Client: ', data.toString())
        ClientManager.clientMap.delete(id);
    }

    sendToAll(message) {
        console.log('SendAll', ClientManager.clientMap.keys());
        ClientManager.clientMap.forEach((clientSocket, id) => {
            if (clientSocket.readyState === OPEN) {
                clientSocket.send(message)
            }
        })
    }
    sendToOthers(message) {
        console.log('SendOthers', ClientManager.clientMap.keys());
        ClientManager.clientMap.forEach((clientSocket, id) => {
            if (id !== this.id && clientSocket.readyState === OPEN) {
                clientSocket.send(message)
            }
        })
    }

}



const handleIncomingMessage = (rec_message, rec_encoded_message, client) => {

    const type = rec_encoded_message.type;
    const send_message = { "sender": client.id }

    switch (type) {
        case 'ready':
            const data = new Message(type, send_message, true, false);
            client.sendToOthers(data.decoded());
            break;

        case 'offer':
            send_message['message'] = rec_encoded_message['message']['offer']
            const data = new Message(type, send_message, true, false);
            client.sendToOthers(data.decoded());
            break;

        case 'answer':
            send_message['message'] = rec_encoded_message['message']['answer']
            const data = new Message(type, send_message, true, false);
            client.sendToOthers(data.decoded());
            break;

        case 'newIceCandidate':
            send_message['message'] = rec_encoded_message['message']['newIceCandidate']
            const data = new Message(type, send_message, true, false);
            client.sendToOthers(data.decoded());
            break;
        default:
            break;
    }
}


const onConnection = (clientSocket, request, socket) => {
    console.log("NewConnection Received");
    const client = new ClientManager(clientSocket);
    client.addEventHandlers();
    ClientManager.clientMap.set(client.id, client.clientSocket);
}





wsh.initWSAp(onConnection);