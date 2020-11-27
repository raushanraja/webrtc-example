
import React, { useEffect, useState, useRef } from "react";
// import "./styles.css";

export default function App() {
  let videoElement = useRef(null);
  let localMediaStream = useRef(null);
  let remoteVideoElement = useRef(null);
  const client = useState({});
  let myPeerConnection = useRef(null);

  const decode = (data) => JSON.parse(data);
  const encode = (data) => JSON.stringify(data);

  const generateClientId = () => {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + "-" + s4();
  };

  //  // /// // // WEBRTC CLIENT METHODS // // /// // //

  const handleIncomingMessge = (message) => {
    const data = decode(message.data);
    console.log("data: ", data);
    const type = data.type;
    switch (type) {
      case "ready":
        invite();
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

  const sendData = (eventType, data) =>
    client?.socket?.send(encode({ type: eventType, data: { ...data } }));

  const handleAnswer = async (data) => {
    console.log("Inside handle Answer", data.data);
    const answer = data.data.sdp;
    const remoteDescription = new RTCSessionDescription(answer);
    await myPeerConnection
      .setRemoteDescription(remoteDescription)
      .catch((error) => console.log("error in handling answer", error));
  };

  const handleNewIceCandidate = (data) => {
    const candidate = new RTCIceCandidate(data.data.candidate);
    myPeerConnection
      .addIceCandidate(candidate)
      .catch("Error in adding ICE Candidate");
  };

  const hangUp = () => {
    closeCall();
    sendData("hangUp", { id: client.id });
  };

  const closeCall = (myPeerConnection) => {
    if (myPeerConnection) {
      myPeerConnection.ontrack = null;
      myPeerConnection.onremovetrack = null;
      myPeerConnection.onremovestream = null;
      myPeerConnection.onicecandidate = null;
      myPeerConnection.oniceconnectionstatechange = null;
      myPeerConnection.onsignalingstatechange = null;
      myPeerConnection.onicegatheringstatechange = null;
      myPeerConnection.onnegotiationneeded = null;
      if (remoteVideoElement.srcObject) {
        remoteVideoElement.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
      if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach((track) => track.stop());
      }

      myPeerConnection.close();
      myPeerConnection = null;
    }
    remoteVideoElement.removeAttribute("src");
    remoteVideoElement.removeAttribute("srcObject");
    videoElement.removeAttribute("src");
    remoteVideoElement.removeAttribute("srcObject");
  };

  // let myPeerConnection = new RTCPeerConnection();

  //                                    //
  //                                    //
  // MYPEERCONNECTION HANDELRS START    //
  //                                    //
  //                                    //

  const handleNegotiationNeeded = async () => {
    const offer = await myPeerConnection.createOffer();
    await myPeerConnection.setLocalDescription(offer);
    sendData("offer", {
      id: client.id,
      sdp: myPeerConnection.localDescription,
    });
  };

  const handleIceCandidate = (event) => {
    if (event.candidate) {
      sendData("newIceCandidate", { candidate: event.candidate });
    }
  };

  const handleTrackEvent = (event) => {
    // console.log("loggingevent",event.streams);
    remoteVideoElement.srcObject = event.streams[0];
  };

  const handleRemoveTrack = (event) => {
    const stream = remoteVideoElement.srcObject;
    const tracks = stream.getTracks();

    if (!tracks.lenght) {
      closeCall();
    }
  };

  const handleIceConnectionStateChange = (event) => {
    console.log(event);
    // const currentIceState = myNewPeerConnection.iceConnectionState;
    // if (currentIceState === "closed" || currentIceState === "failed") {
    //   closeCall();
    // }
  };

  const handleSignalSteteChange = (event) => {
    console.log(event);
    // const currnetsignalState = myPeerConnection.signalingState;
    // if (currnetsignalState === "closed") {
    //   closeCall();
    // }
  };

  const handleIceGatheringStateChange = (event) => {
    console.log(event);
  };

  const handleIncomingCall = async (data) => {
    // console.log("inside handleIncoming data: ",data.data);
    myPeerConnection =await createPeerConnection();
    const remoteSessionDescription = new RTCSessionDescription(data.data.sdp);
    await myPeerConnection.setRemoteDescription(remoteSessionDescription);
    addStream(localMediaStream, myPeerConnection);
    const answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription(answer);
    sendData("answer", {
      id: client.id,
      sdp: myPeerConnection.localDescription,
    });
  };

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

  const addStream = (stream) => {
    videoElement.srcObject = stream;
    stream
      .getTracks()
      .forEach((track) => myPeerConnection.addTrack(track, stream));
  };

  function createPeerConnection() {
    return new Promise((resolve, reject) => {
      const my = new RTCPeerConnection({});
      my.onicecandidate = handleIceCandidate;
      my.ontrack = handleTrackEvent;
      my.onremovetrack = handleRemoveTrack;
      my.onnegotiationneeded = handleNegotiationNeeded;
      my.oniceconnectionstatechange = handleIceConnectionStateChange;
      my.onicegatheringstatechange = handleIceGatheringStateChange;
      my.onsignalingstatechange = handleSignalSteteChange;
      resolve(my);
    });
  }
  const invite = async () => {
    myPeerConnection = await createPeerConnection();
    addStream(localMediaStream, myPeerConnection);
  };

  useEffect(() => {
    (async () => {
      console.log("starting");
      videoElement = document.getElementById("vdoelement");
      remoteVideoElement = document.getElementById("rcvdoelement");
      localMediaStream = await getMediaAccess();
      const newclient = new WebSocket("wss://fbc4bba97aff.ngrok.io");
      client.socket = newclient;
      newclient.onopen = () => {
        console.log("Opened");
        client.id = generateClientId();
        sendData("ready", {});
      };
      newclient.onmessage = handleIncomingMessge;
    })();
  }, []);

  return (
    <div className="App">
      <h1>Video</h1>
      <video id={"vdoelement"} autoPlay></video>
      <video id={"rcvdoelement"}></video>
    </div>
  );
}
