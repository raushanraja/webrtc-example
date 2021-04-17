class PeerConnectionManager {
  constructor(toClient, localTracks, mediaDevices, peerConnectionId) {
    this.peerConnection = new RTCPeerConnection();
    this.peerConnectionId = peerConnectionId;
    this.toClient = toClient;
    this.mediaDevices = mediaDevices;
    this.localTracks = localTracks;
  }

  // Sending ICE Candidates
  handleIceCandidate(event) {
    console.log(currentTime() + " handleIceCandidate");
    // TODO: Check for the condition if error arises
    if (event.candidate)
      sendData(
        "newIceCandidate",
        {
          candidate: event.candidate,
          clientId: this.pid,
          remoteId: this.remoteId,
        },
        this.client
      );
  }

  // Set Remote Media Track
  handleTrackEvent(event) {
    const newVideoElement = document.getElementById(this.pid + "video");
    newVideoElement.srcObject = event.streams[0];
  }

  // Remove Track when call is done
  handleRemoveTrack(event) {
    console.log(currentTime() + " handleRemoveTrack");
    const videoElement = document.getElementById(this.pid + "video");
    const stream = videoElement.srcObject;
    const tracks = stream.getTracks();
    // TODO: Implement
  }

  // Handle Negotiation
  handleNegotiationNeeded() {
    console.log(currentTime() + " handleNegotiationNeeded");
    (async () => {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      sendData(
        "offer",
        {
          sdp: this.peerConnection.localDescription,
          clientId: this.pid,
          remoteId: this.remoteId,
        },
        this.client
      );
    })();
  }

  // Hanlde Ice Connection State Change
  handleIceConnectionStateChange(event) {
    console.log(currentTime() + " handleIceConnectionStateChange");
    // console.log(event);
  }

  // Hanlde Ice Gathering State Change
  handleIceGatheringStateChange(event) {
    console.log(currentTime() + " handleIceGatheringStateChange");
    // console.log(event);
  }

  // Handle Signal State Change
  handleSignalSteteChange(event) {
    console.log(currentTime() + " handleSignalStateChange");
    // console.log(event);
  }

  addPeerConnectionHandler() {
    this.peerConnection.onicecandidate = handleIceCandidatie;
    this.peerConnection.ontrack = handleOnTrack;
    this.peerConnection.onnegotiationneeded = handleNegotiatioNeeded;
    this.peerConnection.oniceconnectionstatechange = handleIceCandidatieChange;
    this.peerConnection.onicegatheringstatechange = handleIceGatheringStateChange;
    this.peerConnection.onsignalingstatechange = handleSignalStateChange;
  }
}
