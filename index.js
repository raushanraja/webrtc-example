class Peers {
  constructor(id, address) {
    this.id = id;
    this.address = address;
    this.isSend = false;
    this.inviteSent = false;
  }

  setIsSend(isSend) {
    this.isSend = isSend;
  }

  handleInviteSent(isInviteSent) {
    this.inviteSent = isInviteSent;
  }
}


const addTracks = async (peerConnection) => {
  try {
    const mediaDevices = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    const tracks = mediaDevices.getTracks();
    tracks.forEach(track => peerConnection.addTrack(track, mediaDevices))
    
  } catch (e) {
    console.log("Failed to get media devices");
  }
};

// PEER CONNECTION HANDLERS
function addPeerConnectionHandler(peerConnection) {
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ontrack = handleTrackEvent;
  peerConnection.onnegotiationneeded = handleNegotiationNeeded;
  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;
  peerConnection.onicegatheringstatechange = handleIceGatheringStateChange;
  peerConnection.onsignalingstatechange = handleSignalSteteChange;
}
// Sending ICE Candidates
function handleIceCandidate(event) {
  console.log("handleIceCandidate");
  // TODO: Check for the condition if error arises
  // if (event.candidate)
  //   sendData(
  //     "newIceCandidate",
  //     {
  //       candidate: event.candidate,
  //       clientId: this.pid,
  //       remoteId: this.remoteId,
  //     },
  //     this.client
  //   );
}

// Set Remote Media Track
function handleTrackEvent(event) {
  const newVideoElement = document.getElementById("video1");
  newVideoElement.srcObject = event.streams[0];
}

// Handle Negotiation
function handleNegotiationNeeded() {
  console.log("handleNegotiationNeeded");
  // (async () => {
  //   const offer = await this.peerConnection.createOffer();
  //   await this.peerConnection.setLocalDescription(offer);
  //   sendData(
  //     "offer",
  //     {
  //       sdp: this.peerConnection.localDescription,
  //       clientId: this.pid,
  //       remoteId: this.remoteId,
  //     },
  //     this.client
  //   );
  // })();
}

// Hanlde Ice Connection State Change
function handleIceConnectionStateChange(event) {
  console.log(" handleIceConnectionStateChange");
  // console.log(event);
}

// Hanlde Ice Gathering State Change
function handleIceGatheringStateChange(event) {
  console.log(" handleIceGatheringStateChange");
  // console.log(event);
}

// Handle Signal State Change
function handleSignalSteteChange(event) {
  console.log(" handleSignalStateChange");
  // console.log(event);
}

class PeerConnectionManager {
  constructor(toClient, localTracks, mediaDevices, peerConnectionId) {
    console.log(
      "PeerConnection Constructor called",
      toClient,
      localTracks,
      mediaDevices,
      peerConnectionId
    );
    this.peerConnection = new RTCPeerConnection();
    this.peerConnectionId = peerConnectionId;
    this.toClient = toClient;
    this.mediaDevices = mediaDevices;
    this.localTracks = localTracks;
  }
}

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const myUUID = uuidv4();
const options = {};
const url = "ws://localhost:3002";
const socket = io(url, options);
const myEnum = Object.freeze({
  CACK: "CONNECTION_ACK",
  CID: "CLIENT_ID",
  DID: "DISCONNECTED_ID",
  SALL: "SEND_MY_INITIAL_PRESENCE",
  RMSG: "WEB_RTC_MESSAGE",
  RDY: "READY",
  INV: "INVITE",
});

let users = {};
let selfInfo = null;
const rtcpeerConnection = {};
const rtcpeerConnectionList = [];
const newId = new Set();
const peer = {};

socket.on(myEnum.SALL, (updatedUsers) => {
  users = updatedUsers;
  Object.keys(users).map((key) => {
    if (key != myUUID) {
      peer[key] = new Peers(users[key], null);
      newId.add(key);
    }
  });
  if (!selfInfo.inviteSent) {
    selfInfo.handleInviteSent(true);
    socket.emit(myEnum.INV, {
      uudiv4: myUUID,
      from: socket.id,
      to: Array.from(newId),
    });
  }
});

socket.on("connect", () => {
  selfInfo = new Peers(socket.id, null);
  peer[myUUID] = selfInfo;
  socket.emit(myEnum.RDY, myUUID);
});

socket.on(myEnum.DID, (uuidv4) => {});

// handle the event sent with socket.send()

//################
//##   WEBRTC   ##
//################

const handleMessage = (message) => {
  const type = message.type;
  switch (type) {
    case "ready":
      invite(message);
      break;
    case "offer":
      break;
    case "answer":
      break;
    case "newIceCandidate":
      break;
    default:
      console.log("No type matched in switch", type);
      break;
  }
};

async function invite({ data }){
  console.log("Invite recieved", data);
  if (newId) {
    [...newId].map(async (uuid) => {
      const peerInfo = peer[uuid];
      const pc = new PeerConnectionManager(peerInfo.id, null, null, uuid);
      addPeerConnectionHandler(pc.peerConnection);
      rtcpeerConnection[uuid] = pc;
      rtcpeerConnectionList.push(uuid);
      await addTracks(pc.peerConnection);
    });
  
  }
};

socket.on(myEnum.RMSG, handleMessage);
