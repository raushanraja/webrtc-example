import React, { useEffect, useState, useRef } from "react";

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

export default function App() {
  const singalUrl = "wss://b68619b3216c.ngrok.io";
  const [clientId, setClientId] = useState(() => {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + "-" + s4();
  });
  const [state, setState] = useState({
    client: null,
    mediaDevices: null,
    localTracks: null,
    myPeerConnection: null,
    remoteVideoElement: null,
    videoElement: null,
  });

  useEffect(() => {
    (async () => {
      console.log("Starting\n Getting Media Access");
      const mediaDevices = await getMediaAccess();
      const tracks = mediaDevices.getTracks();
      const client = new WebSocket(singalUrl);
      const remoteVideoElement = document.getElementById("rcvdoelement");
      const videoElement = document.getElementById("vdoelement");
      const myPeerConnection = await createPeerConnection();
      videoElement.srcObject = mediaDevices;
      setState({
        client: client,
        mediaDevices: mediaDevices,
        localTracks: tracks,
        remoteVideoElement: remoteVideoElement,
        videoElement: videoElement,
        myPeerConnection: myPeerConnection,
      });
    })();
  }, []);

  function sendData(eventType, data) {
    console.log("send data called", state.client);
    state.client.send(encode({ type: eventType, data: { ...data } }));
  }

  const decode = (data) => JSON.parse(data);
  const encode = (data) => JSON.stringify(data);

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

  function createPeerConnection() {
    return new Promise((resolve, reject) => {
      const my = new RTCPeerConnection({});
      resolve(my);
    });
  }

  function addPeerConnectionHandlers() {
    state.myPeerConnection.onicecandidate = handleIceCandidate;
    state.myPeerConnection.ontrack = handleTrackEvent;
    state.myPeerConnection.onremovetrack = handleRemoveTrack;
    state.myPeerConnection.onnegotiationneeded = handleNegotiationNeeded;
    state.myPeerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;
    state.myPeerConnection.onicegatheringstatechange = handleIceGatheringStateChange;
    state.myPeerConnection.onsignalingstatechange = handleSignalSteteChange;
  }

  const invite = async () => {
    addPeerConnectionHandlers();
    state.localTracks.forEach((track) =>
      state.myPeerConnection.addTrack(track, state.mediaDevices)
    );
  };

  const handleIncomingCall = async (data) => {
    let stream = state.mediaDevices;
    console.log("inside handleIncoming data: ", data.data);
    addPeerConnectionHandlers();
    const remoteSessionDescription = new RTCSessionDescription(data.data.sdp);
    await state.myPeerConnection.setRemoteDescription(remoteSessionDescription);
    state.localTracks.forEach((track) =>
      state.myPeerConnection.addTrack(track, stream)
    );
    const answer = await state.myPeerConnection.createAnswer();
    await state.myPeerConnection.setLocalDescription(answer);
    sendData("answer", {
      id: clientId,
      sdp: state.myPeerConnection.localDescription,
    });
  };

  const handleAnswer = async (data) => {
    console.log("Inside handle Answer", data.data);
    const answer = data.data.sdp;
    const remoteDescription = new RTCSessionDescription(answer);
    await state.myPeerConnection
      .setRemoteDescription(remoteDescription)
      .catch((error) => console.log("error in handling answer", error));
  };

  const handleNewIceCandidate = (data) => {
    const candidate = new RTCIceCandidate(data.data.candidate);
    state.myPeerConnection
      .addIceCandidate(candidate)
      .catch("Error in adding ICE Candidate");
  };

  const closeCall = () => {
    if (state.myPeerConnection) {
      state.myPeerConnection.ontrack = null;
      state.myPeerConnection.onremovetrack = null;
      state.myPeerConnection.onremovestream = null;
      state.myPeerConnection.onicecandidate = null;
      state.myPeerConnection.oniceconnectionstatechange = null;
      state.myPeerConnection.onsignalingstatechange = null;
      state.myPeerConnection.onicegatheringstatechange = null;
      state.myPeerConnection.onnegotiationneeded = null;

      if (state.remoteVideoElement.srcObject) {
        state.remoteVideoElement.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (state.videoElement.srcObject) {
        state.videoElement.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }

      state.myPeerConnection.close();
      state.myPeerConnection = null;
    }

    state.remoteVideoElement.removeAttribute("src");
    state.remoteVideoElement.removeAttribute("srcObject");
    state.videoElement.removeAttribute("src");
    state.remoteVideoElement.removeAttribute("srcObject");
  };

  const hangUp = () => {
    closeCall();
    sendData("hangUp", { id: clientId });
  };

  const handleNegotiationNeeded = async () => {
    console.log("inside handleNegotiated Needed", state.myPeerConnection);
    console.log(state.myPeerConnection);
    const offer = await state.myPeerConnection.createOffer();
    await state.myPeerConnection.setLocalDescription(offer);
    sendData("offer", {
      id: clientId,
      sdp: state.myPeerConnection.localDescription,
    });
    console.log("exiting handleNegotiated Needed");
  };

  const handleIceCandidate = (event) => {
    if (event.candidate) {
      sendData("newIceCandidate", { candidate: event.candidate });
    }
  };

  const handleTrackEvent = (event) => {
    // console.log("loggingevent",event.streams);
    state.remoteVideoElement.srcObject = event.streams[0];
  };

  const handleRemoveTrack = (event) => {
    const stream = state.remoteVideoElement.srcObject;
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

  if (state.client) {
    state.client.onmessage = handleIncomingMessge;
    state.client.onopen = () => {
      console.log("Connection Opened");
      sendData("ready", {});
    };
  }

  return (
    <div className="App">
      <h1>Video</h1>
      <video id={"vdoelement"} autoPlay></video>
      <video id={"rcvdoelement"} autoPlay></video>
    </div>
  );
}
