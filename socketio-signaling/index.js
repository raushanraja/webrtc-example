const { join } = require("path");

const app = require("express")();
const server = require("http").createServer(app);
const options = {
  cors: true,
  origins: ["*"],
};

const io = require("socket.io")(server, options);
const room = "room";

io.on("connection", (socket) => {
  console.log("connected id:", socket.id);
  // socket.broadcast.emit('ready',{room:room});
  socket.join(room);


  socket.on("disconnect", (reason) =>
    console.log("disconnected reason:", reason)
  );
  socket.on("data", (data) => {
    console.log("Data from", socket.id, "\ndata is:", data);
    socket.to(room).emit("data", data);
  });
});

server.listen(3002);
