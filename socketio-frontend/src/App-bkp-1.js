import "./App.css";
import { io } from "socket.io-client";
import { useEffect, useState, useRef } from "react";

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

function sendData(eventType, data, client) {
  console.log("send data called", client);
  client.emit("data", encode({ type: eventType, data: { ...data } }));
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

const decode = (data) => JSON.parse(data);
const encode = (data) => JSON.stringify(data);

class ManagePeerConnection {
  constructor(ioClient, localTracks, mediaSteam) {
    this.localTracks = localTracks;
    this.ioClient = ioClient;
    this.mediaSteam = mediaSteam;
    this.peerConfig = {};
    this.peerConnetion = new RTCPeerConnection({});
    console.log(this.peerConnetion);
    this.clientId = s4() + s4() + "-" + s4();
    this.remoteVideoElement = document.getElementById('remote-video');
    this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
    this.handleNewIceCandidate = this.handleNewIceCandidate.bind(this);
    this.closeCall = this.closeCall.bind(this);
    this.handleIceCandidate = this.handleIceCandidate.bind(this);
    this.handleTrackEvent = this.handleTrackEvent.bind(this);
    this.handleRemoveTrack = this.handleRemoveTrack.bind(this);
    this.handleIceConnectionStateChange = this.handleIceConnectionStateChange.bind(
      this
    );
    this.handleSignalSteteChange = this.handleSignalSteteChange.bind(this);
    this.handleIceGatheringStateChange = this.handleIceGatheringStateChange.bind(
      this
    );
  }

  async handleNewIceCandidate(data) {
    const candidate = new RTCIceCandidate(data.data.candidate);
    console.log("candidate", candidate);
    // await this.peerConnetion
    //   .addIceCandidate(candidate)
    //   .catch("Error in adding ICE Candidate");
  }

  closeCall() {
    this.peerConnetion.ontrack = null;
    this.peerConnetion.onremovetrack = null;
    this.peerConnetion.onremovestream = null;
    this.peerConnetion.onicecandidate = null;
    this.peerConnetion.oniceconnectionstatechange = null;
    this.peerConnetion.onsignalingstatechange = null;
    this.peerConnetion.onicegatheringstatechange = null;
    this.peerConnetion.onnegotiationneeded = null;

    if (this.remoteVideoElement.srcObject) {
      this.remoteVideoElement.srcObject
        .getTracks()
        .forEach((track) => track.stop());
    }
    this.peerConnetion.close();
    this.peerConnetion = null;
  }

  handleIceCandidate(event) {
    if (event.candidate) {
      sendData(
        "newIceCandidate",
        { candidate: event.candidate },
        this.ioClient
      );
    }
  }

  handleTrackEvent(event) {
    console.log("handleTrackEvent is called, event: ", event.streams[0]);
    this.remoteVideoElement.srcObject = event.streams[0];
    // let videoContainer = document.getElementById("video-container");
    // videoContainer.appendChild(this.remoteVideoElement);
  }

  handleRemoveTrack(event) {
    const stream = this.remoteVideoElement.srcObject;
    const tracks = stream.getTracks();
    if (!tracks.lenght) {
      this.closeCall();
    }
  }

  async handleNegotiationNeeded() {
    console.log("inside handleNegotiated Needed");
    const offer = this.peerConnetion.createOffer();
    await this.peerConnetion.setLocalDescription(offer);
    sendData(
      "offer",
      {
        id: this.clientId,
        sdp: this.peerConnetion.localDescription,
      },
      this.ioClient
    );
    console.log("exiting handleNegotiated Needed");
  }

  handleIceConnectionStateChange(event) {
    console.log(event);
    // const currentIceState = myNewPeerConnection.iceConnectionState;
    // if (currentIceState === "closed" || currentIceState === "failed") {
    //   closeCall();
    // }
  }

  handleSignalSteteChange(event) {
    console.log(event);
    // const currnetsignalState = myPeerConnection.signalingState;
    // if (currnetsignalState === "closed") {
    //   closeCall();
    // }
  }

  handleIceGatheringStateChange(event) {
    console.log(event);
  }

  createPeerConnection() {
    this.peerConnetion.onicecandidate = this.handleIceCandidate;
    this.peerConnetion.ontrack = this.handleTrackEvent;
    this.peerConnetion.onremovetrack = this.handleRemoveTrack;
    this.peerConnetion.onnegotiationneeded = this.handleNegotiationNeeded;
    this.peerConnetion.oniceconnectionstatechange = this.handleIceConnectionStateChange;
    this.peerConnetion.onicegatheringstatechange = this.handleIceGatheringStateChange;
    this.peerConnetion.onsignalingstatechange = this.handleSignalSteteChange;
  }

  invite() {
    this.localTracks.forEach((track) => {
      this.peerConnetion.addTrack(track, this.mediaSteam);
    });
  }

  async handleIncomingCall(data) {
    const remoteSessionDescription = new RTCSessionDescription(data.data.sdp);
    await this.peerConnetion.setRemoteDescription(remoteSessionDescription);
    this.localTracks.forEach((track) => {
      this.peerConnetion.addTrack(track, this.mediaSteam);
    });
    const answer = await this.peerConnetion.createAnswer();
    await this.peerConnetion.setLocalDescription(answer);
    sendData(
      "answer",
      {
        id: this.clientId,
        sdp: this.peerConnetion.localDescription,
      },
      this.ioClient
    );
  }

  async handleAnswer(data) {
    console.log("Inside handle Answer", data.data);
    const answer = data.data.sdp;
    const remoteDescription = new RTCSessionDescription(answer);
    await this.peerConnetion
      .setRemoteDescription(remoteDescription)
      .catch((error) => console.log("error in handling answer", error));
  }
}

function App() {
  const singalUrl = "wss://72854374b6be.ngrok.io";
  const peerConnections = useRef([]);
  const currentPeerIndex = useRef(0);
  const [state, setState] = useState({
    client: null,
    clientId: null,
    mediaDevices: null,
    localTracks: null,
    remoteVideoElement: null,
    videoElement: null,
  });


  const invite = ()=>{
    let newConnection = new ManagePeerConnection(
      state.client,
      state.localTracks,
      state.mediaDevices
    );
    console.log("Connection Created\n", newConnection);
    newConnection.createPeerConnection();
    peerConnections.current.push(newConnection);
  }

  const handleIncomingMessge = (message) => {
    console.log("Incoming Message called");
    const data = decode(message);
    const type = data.type;
    console.log("type:", type);
    switch (type) {
      case "ready":
        invite();
        peerConnections.current[currentPeerIndex.current].invite();
        break;
      case "offer":
        invite();
        peerConnections.current[currentPeerIndex.current].handleIncomingCall(data);
        break;
      case "answer":
        peerConnections.current[currentPeerIndex.current].handleAnswer(data);
        break;
      case "newIceCandidate":
        peerConnections.current[currentPeerIndex.current].handleNewIceCandidate(data);
        break;
      default:
        console.log("No type matched in switch", type);
        break;
    }
  };

  useEffect(() => {
    (async () => {
      console.log("Starting\n Getting Media Access");
      const mediaDevices = await getMediaAccess();
      const tracks = mediaDevices.getTracks();
      console.log("Local Tracks", tracks);
      const remoteVideoContainer = document.getElementById("video-container");
      const videoElement = document.getElementById("own-video");
      videoElement.srcObject = mediaDevices;
      const client = io(singalUrl, { autoConnect: true, forceJSONP: true });
      setState({
        client: client,
        mediaDevices: mediaDevices,
        localTracks: tracks,
        videoElement: videoElement,
        remoteVideoContainer: remoteVideoContainer,
      });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (state.client != null) {
        state.client.on("connect", () => {
          state.client.emit("data", encode({ type: "ready", data: {  } }))
        });
        state.client.on("data", handleIncomingMessge);
      }
    })();
  },[state]);

  // const [mediaStream,setMediaStream] = useState(null);

  // useEffect(() => {
  //   (async () => {
  //     const ms = await navigator.mediaDevices.getUserMedia({video: true});
  //     setMediaStream(ms);
  //   })();
  // }, []);

  // const addMoreVideo = ()=>{
  //   let newRC = new RemoteClient('hello',mediaStream);
  //   let newVE = newRC.addVideoElement();
  //   let videoContainer = document.getElementById('video-container');
  //   videoContainer.appendChild(newVE);
  // }

  return (
    <div className="App">
      <div id="video-container">
        <video id="own-video"></video>
        <video id="remote-video"></video>
      </div>
    </div>
  );
}

export default App;









// import "./App.css";
// import { io } from "socket.io-client";
// import { useEffect, useState, useRef } from "react";

// const getMediaAccess = async () => {
//   let mediaDevices;
//   try {
//     mediaDevices = await navigator.mediaDevices.getUserMedia({
//       audio: true,
//       video: true,
//     });
//     return mediaDevices;
//   } catch (e) {
//     console.log("Failed to get media devices");
//     return null;
//   }
// };

// function sendData(eventType, data, client) {
//   console.log("send data called", client);
//   client.emit("data", encode({ type: eventType, data: { ...data } }));
// }

// function s4() {
//   return Math.floor((1 + Math.random()) * 0x10000)
//     .toString(16)
//     .substring(1);
// }

// const decode = (data) => JSON.parse(data);
// const encode = (data) => JSON.stringify(data);

// class ManagePeerConnection {
//   constructor(ioClient, localTracks, mediaSteam) {
//     this.localTracks = localTracks;
//     this.ioClient = ioClient;
//     this.mediaSteam = mediaSteam;
//     this.peerConfig = {};
//     this.peerConnetion = new RTCPeerConnection({});
//     console.log(this.peerConnetion);
//     this.clientId = s4() + s4() + "-" + s4();
//     this.remoteVideoElement = document.createElement("video");
//     this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
//     this.handleNewIceCandidate = this.handleNewIceCandidate.bind(this);
//     this.closeCall = this.closeCall.bind(this);
//     this.handleIceCandidate = this.handleIceCandidate.bind(this);
//     this.handleTrackEvent = this.handleTrackEvent.bind(this);
//     this.handleRemoveTrack = this.handleRemoveTrack.bind(this);
//     this.handleIceConnectionStateChange = this.handleIceConnectionStateChange.bind(
//       this
//     );
//     this.handleSignalSteteChange = this.handleSignalSteteChange.bind(this);
//     this.handleIceGatheringStateChange = this.handleIceGatheringStateChange.bind(
//       this
//     );
//   }

//   async handleNewIceCandidate(data) {
//     const candidate = new RTCIceCandidate(data.data.candidate);
//     console.log("candidate", candidate);
//     // await this.peerConnetion
//     //   .addIceCandidate(candidate)
//     //   .catch("Error in adding ICE Candidate");
//   }

//   closeCall() {
//     this.peerConnetion.ontrack = null;
//     this.peerConnetion.onremovetrack = null;
//     this.peerConnetion.onremovestream = null;
//     this.peerConnetion.onicecandidate = null;
//     this.peerConnetion.oniceconnectionstatechange = null;
//     this.peerConnetion.onsignalingstatechange = null;
//     this.peerConnetion.onicegatheringstatechange = null;
//     this.peerConnetion.onnegotiationneeded = null;

//     if (this.remoteVideoElement.srcObject) {
//       this.remoteVideoElement.srcObject
//         .getTracks()
//         .forEach((track) => track.stop());
//     }
//     this.peerConnetion.close();
//     this.peerConnetion = null;
//   }

//   handleIceCandidate(event) {
//     if (event.candidate) {
//       sendData(
//         "newIceCandidate",
//         { candidate: event.candidate },
//         this.ioClient
//       );
//     }
//   }

//   handleTrackEvent(event) {
//     this.remoteVideoElement.srcObject = event.streams[0];
//     let videoContainer = document.getElementById("video-container");
//     videoContainer.appendChild(this.remoteVideoElement);
//   }

//   handleRemoveTrack(event) {
//     const stream = this.remoteVideoElement.srcObject;
//     const tracks = stream.getTracks();
//     if (!tracks.lenght) {
//       this.closeCall();
//     }
//   }

//   async handleNegotiationNeeded() {
//     console.log("inside handleNegotiated Needed");
//     const offer = this.peerConnetion.createOffer();
//     await this.peerConnetion.setLocalDescription(offer);
//     sendData(
//       "offer",
//       {
//         id: this.clientId,
//         sdp: this.peerConnetion.localDescription,
//       },
//       this.ioClient
//     );
//     console.log("exiting handleNegotiated Needed");
//   }

//   handleIceConnectionStateChange(event) {
//     console.log(event);
//     // const currentIceState = myNewPeerConnection.iceConnectionState;
//     // if (currentIceState === "closed" || currentIceState === "failed") {
//     //   closeCall();
//     // }
//   }

//   handleSignalSteteChange(event) {
//     console.log(event);
//     // const currnetsignalState = myPeerConnection.signalingState;
//     // if (currnetsignalState === "closed") {
//     //   closeCall();
//     // }
//   }

//   handleIceGatheringStateChange(event) {
//     console.log(event);
//   }

//   createPeerConnection() {
//     this.peerConnetion.onicecandidate = this.handleIceCandidate;
//     this.peerConnetion.ontrack = this.handleTrackEvent;
//     this.peerConnetion.onremovetrack = this.handleRemoveTrack;
//     this.peerConnetion.onnegotiationneeded = this.handleNegotiationNeeded;
//     this.peerConnetion.oniceconnectionstatechange = this.handleIceConnectionStateChange;
//     this.peerConnetion.onicegatheringstatechange = this.handleIceGatheringStateChange;
//     this.peerConnetion.onsignalingstatechange = this.handleSignalSteteChange;
//   }

//   invite() {
//     this.localTracks.forEach((track) => {
//       this.peerConnetion.addTrack(track, this.mediaSteam);
//     });
//   }

//   async handleIncomingCall(data) {
//     const remoteSessionDescription = new RTCSessionDescription(data.data.sdp);
//     await this.peerConnetion.setRemoteDescription(remoteSessionDescription);
//     this.localTracks.forEach((track) => {
//       this.peerConnetion.addTrack(track, this.mediaSteam);
//     });
//     const answer = await this.peerConnetion.createAnswer();
//     await this.peerConnetion.setLocalDescription(answer);
//     sendData(
//       "answer",
//       {
//         id: this.clientId,
//         sdp: this.peerConnetion.localDescription,
//       },
//       this.ioClient
//     );
//   }

//   async handleAnswer(data) {
//     console.log("Inside handle Answer", data.data);
//     const answer = data.data.sdp;
//     const remoteDescription = new RTCSessionDescription(answer);
//     await this.peerConnetion
//       .setRemoteDescription(remoteDescription)
//       .catch((error) => console.log("error in handling answer", error));
//   }
// }

// function App() {
//   const singalUrl = "wss://72854374b6be.ngrok.io";
//   const peerConnections = useRef([]);
//   const [state, setState] = useState({
//     client: null,
//     clientId: null,
//     mediaDevices: null,
//     localTracks: null,
//     remoteVideoElement: null,
//     videoElement: null,
//   });
//   const handleIncomingMessge = (message) => {
//     console.log("Incoming Message called");
//     const data = decode(message);
//     const type = data.type;
//     console.log("type:", type);
//     switch (type) {
//       case "offer":
//         peerConnections.current[0].handleIncomingCall(data);
//         break;
//       case "answer":
//         peerConnections.current[0].handleAnswer(data);
//         break;
//       case "newIceCandidate":
//         peerConnections.current[0].handleNewIceCandidate(data);
//         break;
//       default:
//         console.log("No type matched in switch", type);
//         break;
//     }
//   };

//   useEffect(() => {
//     (async () => {
//       console.log("Starting\n Getting Media Access");
//       const mediaDevices = await getMediaAccess();
//       const tracks = mediaDevices.getTracks();
//       console.log("Local Tracks", tracks);
//       const remoteVideoContainer = document.getElementById("video-container");
//       const videoElement = document.getElementById("own-video");
//       videoElement.srcObject = mediaDevices;
//       const client = io(singalUrl, { autoConnect: true, forceJSONP: true });
//       setState({
//         client: client,
//         mediaDevices: mediaDevices,
//         localTracks: tracks,
//         videoElement: videoElement,
//         remoteVideoContainer: remoteVideoContainer,
//       });
//     })();
//   }, []);

//   useEffect(() => {
//     (async () => {

//       if (state.client != null) {
//         state.client.on("connect", () => {
//           let newConnection = new ManagePeerConnection(
//             state.client,
//             state.localTracks,
//             state.mediaDevices
//           );
    
//           console.log("Connection Created\n", newConnection);
    
    
//           newConnection.createPeerConnection();
//           peerConnections.current.push(newConnection);
//           state.client.send("ready");
//         });
//         state.client.on("data", handleIncomingMessge);
//         state.client.on("ready", () => {
//           peerConnections.current[0].invite();
//         });
//       }



//     })();
//   });

//   // const [mediaStream,setMediaStream] = useState(null);

//   // useEffect(() => {
//   //   (async () => {
//   //     const ms = await navigator.mediaDevices.getUserMedia({video: true});
//   //     setMediaStream(ms);
//   //   })();
//   // }, []);

//   // const addMoreVideo = ()=>{
//   //   let newRC = new RemoteClient('hello',mediaStream);
//   //   let newVE = newRC.addVideoElement();
//   //   let videoContainer = document.getElementById('video-container');
//   //   videoContainer.appendChild(newVE);
//   // }

//   return (
//     <div className="App">
//       <div id="video-container">
//         <video id="own-video"></video>
//       </div>
//     </div>
//   );
// }

// export default App;
