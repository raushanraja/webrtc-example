const express = require('express');
const ws = require('ws');
const app = express();

const decode = data =>JSON.parse(data);
const encode = data => JSON.stringify(data);
const genetateClientId = ()=> {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};


const socketServer = new ws.Server({noServer:true,clientTracking:true});


const handleMessage = (message,socket) =>{
    console.log(message);
    console.log(socket.id);
    socketServer.clients.forEach((client=>{
            if(client !== socket && client.readyState === ws.OPEN){
                client.send(message);
    console.log(message);
            }
        }
    ));
}


socketServer.on('connection',socket=>{
    socket.id = genetateClientId();
    socket.on('message',message=>handleMessage(message,socket));
})


const server = app.listen(3005);
server.on('upgrade',(req,socket,head)=>{
    socketServer.handleUpgrade(req,socket,head,ws=> socketServer.emit('connection',ws,req));
})

