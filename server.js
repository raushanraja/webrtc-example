const app = require("express")();
const server = require("http").createServer(app);
const options = {
  cors: true,
  origins: ["*"],
};
const io = require("socket.io")(server, options);
const room = "room";
const myEnum = Object.freeze({
  CACK: "CONNECTION_ACK",
  CID: "CLIENT_ID",
  DID: "DISCONNECTED_ID",
  SALL: "SEND_MY_INITIAL_PRESENCE",
  RMSG: "WEB_RTC_MESSAGE",
  RDY: "READY",
  INV:"INVITE",
});

// Save UserList
const users = {};
const sendUsers = {};

const sendUpdatedUserList = () => {
  io.emit(myEnum.SALL, sendUsers);
};

io.on("connection", (socket) => {
  console.log("connected id:", socket.id);
  // socket.broadcast.emit('ready',{room:room});
  //   socket.join(room);

  // Received READY
  socket.on(myEnum.RDY, (uuidv4) => {
    const clientId = socket.id;
    users[clientId] = { socket: socket, uuidv4: uuidv4 };
    sendUsers[uuidv4] = clientId;
    socket.emit(myEnum.SALL, sendUsers);
  });

  // Receive UUID
  socket.on(myEnum.INV, (message) => {
    io.emit(myEnum.SALL, sendUsers);
    socket.broadcast.emit(myEnum.RMSG, { type: "ready", data: message });
  });

  socket.on("disconnect", async (reason) => {
    const socketid = socket.id;
    const uuidv4 = users[socketid].uuidv4;
    delete sendUsers[uuidv4];
    delete users[socketid];
    sendUpdatedUserList();
  });

  socket.on("message", (data) => {
    console.log("Data from", socket.id, "\ndata is:", data);
    // socket.to(room).emit("data", data);
  });
});

server.listen(3002);
