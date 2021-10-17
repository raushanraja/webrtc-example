
const decode = (data) => JSON.stringify(data);
const encode = (data) => JSON.parse(data);
const Message = function (type, message, status = true, error = false) {
    this.type = type,
        this.message = message,
        this.status = status,
        this.error = error,
        this.decoded = () => {
            const [decoded, ...data] = this;
            return JSON.stringify(data);
        }
}

class WSSManager {
    static wss = null;
    static pc = null;
    static addEventListener() {
        if (WSSManager.wss) {
            WSSManager.wss.onopen = () => onOpen('WebSocket');
            WSSManager.wss.onclose = () => onClose('WebSocket');
            WSSManager.wss.onmessage = onWSMessage;
        }
    }
}


class DataChannelManager {
    constructor(peerConnection, dataChannelLabel = 'datachannel-1', channel = null) {
        this.dc = channel ?? peerConnection.createDataChannel(dataChannelLabel);
        this.addEventListener = this.addEventListener.bind(this);
        this.onOpen = this.onOpen.bind(this)
        this.onClosed = this.onClosed.bind(this)
        this.onMessage = this.onMessage.bind(this);
        this.onBufferedAmountLow = this.onBufferedAmountLow.bind(this);
        this.onError = this.onError.bind(this);
    }

    addEventListener() {
        this.dc.addEventListener('open', this.onOpen);
        this.dc.addEventListener('close', this.onClosed);
        this.dc.addEventListener('message', this.onMessage);
        this.dc.addEventListener('bufferedamountlow', this.onBufferedAmountLow);
        this.dc.addEventListener('error', this.onError);
    }

    onOpen() {
        console.log("DataChannel Opened")
    }

    onClosed() {
        console.log(service + "DataChannel Closed")
    }

    onMessage(event) {
        console.log('dc got a message');
    }

    onBufferedAmountLow(event) {
        console.log('dc got bufferedAmountLow');
    }

    onError(event) {
        console.log('dc got an error');
    }
}

class PeerConnectionManager {

    constructor() {
        this.peerConnection = new RTCPeerConnection({});
        this.addEventListener = this.addEventListener.bind(this);
        this.handleIceCandidate = this.handleIceCandidate.bind(this);
        this.handleNegotiationNeeded = this.handleNegotiationNeeded.bind(this);
        this.handleDataChannel = this.handleDataChannel.bind(this);
        this.handleIceconnectionstatechange = this.handleIceconnectionstatechange.bind(this);
        this.handleIcegatheringstatechange = this.handleIcegatheringstatechange.bind(this);
        this.handleSignalingstatechange = this.handleSignalingstatechange.bind(this);
    }

    addEventListener() {
        this.peerConnection.onicecandidate = this.handleIceCandidate;
        this.peerConnection.onnegotiationneeded = this.handleNegotiationNeeded;
        this.peerConnection.ondatachannel = this.handleDataChannel;
        this.peerConnection.oniceconnectionstatechange = this.handleIceconnectionstatechange
        this.peerConnection.onicegatheringstatechange = this.handleIcegatheringstatechange
        this.peerConnection.onsignalingstatechange = this.handleSignalingstatechange
    }

    async handleNegotiationNeeded() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        const localDescription = this.peerConnection.localDescription;
        const offer_message = new Message('offer', { 'offer': localDescription });
        WSSManager.wss.send(offer_message.decoded());
    }

    handleIceCandidate(event) {
        if (event.candidate) {
            const newIceCandidateMessagae = new Message('newIceCandidate', { 'newIceCandidate': event.candidate });
            WSSManager.wss.send(newIceCandidateMessagae.decoded())
        }
    }

    handleDataChannel(event) {
        const dataChannel = new DataChannelManager(null, null, event.channel);
        dataChannel.addEventListener();

    }
    handleIceconnectionstatechange(event) {
        console.log("handleIceconnectionstatechange")
    }

    handleIcegatheringstatechange(event) {
        console.log("handleIcegatheringstatechange")
    }

    handleSignalingstatechange(event) {
        console.log("handleSignalingstatechange")
    }
}




function onOpen(service) {
    console.log(service + " Connection Established")
}

function onClosed(service) {
    console.log(service + " Connection Closed")
}

function invite() {
    const pc = new PeerConnectionManager();
    pc.addEventListener();
    const dataChannel = new DataChannelManager(pc.peerConnection);
    WSSManager.pc = pc;
}

async function handleOffer(message) {
    const offer = message.message.offer;
    const pc = new PeerConnectionManager();
    pc.peerConnection.setRemoteDescription(offer);
    const answer = pc.peerConnection.createAnswer();
    await pc.peerConnection.setLocalDescription(answer);
    const answer_message = new Message('answer', { 'answer': answer });
    WSSManager.wss.send(answer_message.decoded());
}

async function handleAnswer(message) {
    const answer = message.message.answer;
    const remoteDescription = new RTCSessionDescription(answer);
    WSSManager.pc.peerConnection.setRemoteDescription(remoteDescription);
}

function onWSMessage(message) {
    const encoded_message = encode(message);
    const type = encoded_message['type'];
    console.log("Got Message");

    switch (type) {
        case 'ready':
            invite();
            break;

        case 'offer':
            handleOffer(encoded_message)
            break;

        case 'answer':
            handleAnswer(encoded_message)
            break;

        case 'newIceCandidate':

            break;

        default:
            break;
    }
}

 function start() {
    console.log("Initial Call to dataChannel");
    const url = "ws://localhost:8005";
    const wss = new WebSocket(url);
    WSSManager.wss = wss;
    WSSManager.addEventListener();
}


start();