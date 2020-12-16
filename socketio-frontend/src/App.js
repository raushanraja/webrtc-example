import "./App.css";
import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";

const decode = (data) => JSON.parse(data);
const encode = (data) => JSON.stringify(data);

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

const sendData = (eventType, data, client) => {
  console.log("send data:", data);
  client.emit("data", encode({ type: eventType, data: { ...data } }));
};

class PeerConnectionManager {
  constructor(client, localTracks, mediaDevices) {
    this.peerConnection = new RTCPeerConnection();

    // PeerConnectionHandlers
    this.handleIceCandidate = this.handleIceCandidate.bind(this);
    this.handleTrackEvent = this.handleTrackEvent.bind(this);
    this.handleRemoveTrack = this.handleRemoveTrack.bind(this);
    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
    this.handleIceConnectionStateChange = this.handleIceConnectionStateChange.bind(
      this
    );
    this.handleIceGatheringStateChange = this.handleIceGatheringStateChange.bind(
      this
    );
    this.handleSignalSteteChange = this.handleSignalSteteChange.bind(this);

    // PeerConnectionAdder
    this.addPeerConnectionHandler = this.addPeerConnectionHandler.bind(this);

    // SocketIO Client
    this.client = client;

    // LocalTracks & mediaDevices
    this.localTracks = localTracks;
    this.mediaDevices = mediaDevices;

    // PeerConnectionID
    this.pid = s4() + s4() + "-" + s4();

    // AddLocalTracks
    this.addLocalTracks = this.addLocalTracks.bind(this);
  }

  addLocalTracks() {
    this.localTracks.forEach((track) => {
      this.peerConnection.addTrack(track, this.mediaDevices);
    });
  }

  addPeerConnectionHandler() {
    console.log(this.pid);
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrackEvent;
    this.peerConnection.onresmovetrack = this.handleRemoveTrack;
    this.peerConnection.onnegotiationneeded = this.handleNegotiationNeeded;
    this.peerConnection.oniceconnectionstatechange = this.handleIceConnectionStateChange;
    this.peerConnection.onicegatheringstatechange = this.handleIceGatheringStateChange;
    this.peerConnection.onsignalingstatechange = this.handleSignalSteteChange;
  }

  // Sending ICE Candidates
  handleIceCandidate(event) {
    // TODO: Check for the condition if error arises
    if (event.candidate)
      sendData("newIceCandidate", { candidate: event.candidate }, this.client);
  }

  // Set Remote Media Track
  handleTrackEvent(event) {
    const videoContainer = document.getElementById("videoContainer");
    const newVideoElement = document.createElement("video");
    newVideoElement.id = this.pid + "video";
    newVideoElement.srcObject = event.streams[0];
    videoContainer.appendChild(newVideoElement);
  }

  // Remove Track when call is done
  handleRemoveTrack(event) {
    const videoElement = document.getElementById(this.pid + "video");
    const stream = videoElement.srcObject;
    const tracks = stream.getTracks();
    // TODO: Imoplement
  }

  // Handle Negotiation
  handleNegotiationNeeded() {
    (async () => {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      sendData(
        "offer",
        { sdp: this.peerConnection.localDescription },
        this.client
      );
    })();
  }

  // Hanlde Ice Connection State Change
  handleIceConnectionStateChange(event) {
    console.log(event);
  }

  // Hanlde Ice Gathering State Change
  handleIceGatheringStateChange(event) {
    console.log(event);
  }

  // Handle Signal State Change
  handleSignalSteteChange(event) {
    console.log(event);
  }
}

function App() {
  const signlaURL = "wss://4cd17cc2bad9.ngrok.io";
  const peerConnectionArray = useRef([]);
  const latestPeerConnectionCount = useRef(0);
  const state = useRef({
    client: null,
    localTracks: null,
    mediaDevices: null,
    ownVideoElement: null,
  });

  const currentPC = useRef(null);

  const getMediaAccess = async () => {
    let mediaDevices;
    try {
      mediaDevices = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      return mediaDevices;
    } catch (e) {
      console.log("Failed to get media devices");
      return null;
    }
  };

  useEffect(() => {
    console.log("Starting");
    (async () => {
      const mediaDevices = await getMediaAccess();
      const tracks = mediaDevices.getTracks();
      const ownVideoElement = document.getElementById("ownVideoElement");

	  const client = io(signlaURL, { autoConnect: true, forceJSONP: true });
	  state.current = {
        client: client,
        localTracks: tracks,
        mediaDevices: mediaDevices,
        ownVideoElement: ownVideoElement,
      };
	  client.on("connect", () => {
        client.emit("data", encode({ type: "ready", data: {} }));
      });
      client.on("data", handleMessage);
      ownVideoElement.srcObject = mediaDevices;
      
    })();
  }, []);

  const invite = async () => {
    // Create PC &&   // Add handlers

    const pc = new PeerConnectionManager(
      state.current.client,
      state.current.localTracks,
      state.current.mediaDevices
    );

    pc.addPeerConnectionHandler();
    pc.addLocalTracks();
    peerConnectionArray.current.push(pc);
    latestPeerConnectionCount.current += 1;
    currentPC.current = pc.peerConnection;
    // Add tracks

    // Start Negotiation
    // Send Offer
  };

  const handleIncomingCall = async (data) => {
    console.log("state", state);

    const pc = new PeerConnectionManager(
      state.current.client,
      state.current.localTracks,
      state.current.mediaDevices
    );
    peerConnectionArray.current.push(pc);
    latestPeerConnectionCount.current += 1;
    console.log(pc);
    pc.addPeerConnectionHandler();
    currentPC.current = pc.peerConnection;

    const rsdp = new RTCSessionDescription(data.data.sdp);
    await pc.peerConnection.setRemoteDescription(rsdp);

    pc.addLocalTracks();

    const answer = await pc.peerConnection.createAnswer();
    await pc.peerConnection.setLocalDescription(answer);

    sendData(
      "answer",
      { sdp: pc.peerConnection.localDescription },
      state.current.client
    );
  };

  const handleAnswer = async (data) => {
    const answer = data.data.sdp;
    const rd = new RTCSessionDescription(answer);
    await currentPC.current
      .setRemoteDescription(rd)
      .catch((error) => console.log("error in handling answer", error));
  };

  const handleNewIceCandidate = async (data) => {
    const candidate = new RTCIceCandidate(data.data.candidate);
    await currentPC.current
      .addIceCandidate(candidate)
      .catch("Error in adding ICE Candidate");
  };

  const handleMessage = (message) => {
    const data = decode(message);
    const type = data.type;
    console.log("Incoming Message called, type:", type);

    switch (type) {
      case "ready":
        invite(data);
        break;
      case "offer":
        handleIncomingCall(data);
        break;
      case "answer":
        handleAnswer(data);
        break;
      case "newIceCandidate":
        handleNewIceCandidate(data);
        break;
      default:
        console.log("No type matched in switch", type);
        break;
    }
  };

  return (
    <div className="App">
      <div id={"videoContainer"}></div>
      <video id="ownVideoElement" autoPlay></video>
    </div>
  );
}

export default App;
