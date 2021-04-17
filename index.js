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
      video: true,
    });
    const tracks = mediaDevices.getTracks();
    tracks.forEach((track) => peerConnection.addTrack(track, mediaDevices));
  } catch (e) {
    console.log("Failed to get media devices",e);
  }
};

class PeerConnectionManager {
  constructor(toClient, localTracks, mediaDevices, peerConnectionId) {
    console.log(
      "PeerConnection Constructor called",
      toClient,
      localTracks,
      mediaDevices,
      peerConnectionId
    );
    const vidContainer = document.getElementById("vidContainer");
    const newVideoElement = document.createElement("video");
    vidContainer.appendChild(newVideoElement);
    this.peerConnection = new RTCPeerConnection();
    this.peerConnectionId = peerConnectionId;
    this.toClient = toClient;
    this.mediaDevices = mediaDevices;
    this.localTracks = localTracks;
    this.newVideoElement = newVideoElement;


    // bind methods
    this.addPeerConnectionHandler = this.addPeerConnectionHandler.bind(this);
    this.handleIceCandidate = this.handleIceCandidate.bind(this);
    this.handleTrackEvent = this.handleTrackEvent.bind(this);
    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
    this.handleIceConnectionStateChange = this.handleIceConnectionStateChange.bind(
      this
    );
    this.handleIceGatheringStateChange = this.handleIceGatheringStateChange.bind(
      this
    );
    this.handleSignalSteteChange = this.handleSignalSteteChange.bind(this);
  }

  // PEER CONNECTION HANDLERS
  addPeerConnectionHandler() {
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrackEvent;
    this.peerConnection.onnegotiationneeded = this.handleNegotiationNeeded;
    this.peerConnection.oniceconnectionstatechange = this.handleIceConnectionStateChange;
    this.peerConnection.onicegatheringstatechange = this.handleIceGatheringStateChange;
    this.peerConnection.onsignalingstatechange = this.handleSignalSteteChange;
  }

  handleIceCandidate(event) {
    console.log("handleIceCandidate");
    // TODO: Check for the condition if error arises
    if (event.candidate)
    socket.emit(
      myEnum.RMSGS,
      {
        type: "newIceCandidate",
        candidate: event.candidate,
        from: myUUID,
        to: this.peerConnectionId,
      }
      // ,
      // this.client
    );
  }

  // Set Remote Media Track
  handleTrackEvent(event) {
    this.newVideoElement.srcObject = event.streams[0];
  }

  // Handle Negotiation
  handleNegotiationNeeded() {
    console.log("handleNegotiationNeeded");
    (async () => {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socket.emit(
        myEnum.RMSGS,
        {
          type: "offer",
          sdp: this.peerConnection.localDescription,
          from: myUUID,
          to: this.peerConnectionId,
        }
        // ,
        // this.client
      );
    })();
  }

  // Hanlde Ice Connection State Change
  handleIceConnectionStateChange(event) {
    console.log(" handleIceConnectionStateChange");
    // console.log(event);
  }

  // Hanlde Ice Gathering State Change
  handleIceGatheringStateChange(event) {
    console.log(" handleIceGatheringStateChange");
    // console.log(event);
  }

  // Handle Signal State Change
  handleSignalSteteChange(event) {
    console.log(" handleSignalStateChange");
    // console.log(event);
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
const url = "ws://192.168.0.175:3002";
const socket = io(url, options);
const myEnum = Object.freeze({
  CACK: "CONNECTION_ACK",
  CID: "CLIENT_ID",
  DID: "DISCONNECTED_ID",
  SALL: "SEND_MY_INITIAL_PRESENCE",
  RMSG: "WEB_RTC_MESSAGE",
  RMSGS: "WEB_RTC_MESSAGE_SPE",
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
  console.log(message.type);
  switch (type) {
    case "ready":
      invite(message);
      break;
    case "offer":
      handleIncomingCall(message);
      break;
    case "answer":
      handleAnswer(message);
      break;
    case "newIceCandidate":
      handleNewIceCandidate(message);
      break;
    default:
      console.log("No type matched in switch", type);
      break;
  }
};

const invite = ({ data }) => {
  console.log("Invite recieved", data);
  if (newId) {
    [...newId].map(async (uuid) => {
      const peerInfo = peer[uuid];
      const pc = new PeerConnectionManager(peerInfo.id, null, null, uuid);
      pc.addPeerConnectionHandler();
      rtcpeerConnection[uuid] = pc;
      rtcpeerConnectionList.push(uuid);
      await addTracks(pc.peerConnection);
    });
  }
};

const handleIncomingCall = async (data) => {
  console.log("Offer Recieved", data);
  const uuid = data.from;
  const sdp = data.sdp;
  const peerInfo = peer[uuid];
  // console.log(uuid,sdp,peerInfo);
  const pc = new PeerConnectionManager(peerInfo.id, null, null, uuid);
  pc.addPeerConnectionHandler();
  rtcpeerConnection[uuid] = pc;
  rtcpeerConnectionList.push(uuid);
  const remoteSessionDescription = new RTCSessionDescription(sdp);
  await pc.peerConnection.setRemoteDescription(remoteSessionDescription);
  await addTracks(pc.peerConnection);
  const answer = await pc.peerConnection.createAnswer();
  await pc.peerConnection.setLocalDescription(answer);
  socket.emit(
    myEnum.RMSGS,
    {
      type: "answer",
      sdp: pc.peerConnection.localDescription,
      from: myUUID,
      to: uuid,
    }
    // ,
    // this.client
  );
};

const handleAnswer = async (data) => {
  const uuid = data.from;
  const answer = data.sdp;
  const remoteDescription = new RTCSessionDescription(answer);
  await rtcpeerConnection[uuid].peerConnection
    .setRemoteDescription(remoteDescription)
    .catch((error) => console.log("error in handling answer", error));
};


const handleNewIceCandidate = (data) => {
  const uuid = data.from;
  console.log(data)
  const candidate = new RTCIceCandidate(data.candidate);
  rtcpeerConnection[uuid].peerConnection
  .addIceCandidate(candidate)
  .catch("Error in adding ICE Candidate");
};


socket.on(myEnum.RMSG, handleMessage);
