
const decode = (data) => JSON.stringify(data);
const encode = (data) => JSON.parse(data);
const Message = function (type, message, status = true, error = false) {
    this.type = type,
        this.message = message,
        this.status = status,
        this.error = error,
        this.decoded = () => {
            const { decoded, ...data } = this;
            return JSON.stringify(data);
        }
}

function onOpen() {
    console.log("WS Connection Established")
}

function onClose() {
    console.log("WS Connection Closed")
}
class WSSManager {
    static wss = null;
    static pc = null;
    static dc = null;
    static addEventListener() {
        if (WSSManager.wss) {
            WSSManager.wss.onopen = onOpen;
            WSSManager.wss.onclose = onClose;
            WSSManager.wss.onmessage = onWSMessage;
        }
    }
}

class DataChannelManager {
    constructor(peerConnection, dataChannelLabel = 'datachannel-1', channel) {
        this.dc = channel ?? peerConnection.createDataChannel(dataChannelLabel);
        console.log(this.dc);
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
        console.log("DataChannel Closed")
    }

    onMessage(message) {
        console.log('dc got a message',message);
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
        console.log("handleDataChannelCalled");
        const dataChannel = new DataChannelManager(null, null, event.channel);
        dataChannel.addEventListener();
        WSSManager.dc = dataChannel;
        dataChannel.addEventListener();

    }
    handleIceconnectionstatechange(event) {
        console.log("handleIceconnectionstatechange:", event)
    }

    handleIcegatheringstatechange(event) {
        console.log("handleIcegatheringstatechange:", event)
    }

    handleSignalingstatechange(event) {
        console.log("handleSignalingstatechange:", event)
    }
}


function invite() {
    const pc = new PeerConnectionManager();
    pc.addEventListener();
    const dataChannel = new DataChannelManager(pc.peerConnection);
    console.log(dataChannel)
    dataChannel.addEventListener();
    WSSManager.pc = pc;
    WSSManager.dc = dataChannel;
}

async function handleOffer(message) {
    const offer = message.message.message;
    const pc = new PeerConnectionManager();
    pc.addEventListener();
    WSSManager.pc = pc;
    pc.peerConnection.setRemoteDescription(offer);
    const answer = await pc.peerConnection.createAnswer();
    await pc.peerConnection.setLocalDescription(answer);
    const answer_message = new Message('answer', { 'answer': answer });
    WSSManager.wss.send(answer_message.decoded());
}

async function handleAnswer(message) {
    const answer = message.message.message;
    const remoteDescription = new RTCSessionDescription(answer);
    WSSManager.pc.peerConnection.setRemoteDescription(remoteDescription);
}

function handleNewIceCandidate(message){
    const newIceCandidate = message.message.message
    console.log(newIceCandidate);
    WSSManager.pc.peerConnection.addIceCandidate(newIceCandidate);
}

function onWSMessage(message) {
    const encoded_message = encode(message.data);
    const type = encoded_message['type'];
    console.log("Got Message:", type);

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
            handleNewIceCandidate(encoded_message)
            break;

        default:
            break;
    }
}

function start() {
    console.log("Initial Call to dataChannel");
    const url = "wss://4c4b-117-214-61-247.ngrok.io";
    const wss = new WebSocket(url);
    WSSManager.wss = wss;
    WSSManager.addEventListener();
}

document.getElementById('ready').addEventListener('click', (e) => {
    e.preventDefault;
    WSSManager.wss.send(new Message('ready', 'ready').decoded())
})

document.getElementById('dcsend').addEventListener('click', (e) => {
    e.preventDefault;
    WSSManager.dc.dc.send("hello");
})

start();