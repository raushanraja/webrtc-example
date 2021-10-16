function dataChannerE() {
    console.log("Initial Call to dataChannel");

    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel('data-channer-1');

    const onOpen = (event) => {
        console.log('dc Openend');
    }

    const onClose = (event) => {
        console.log('dc closed');
    }

    const onMessage = (event) => {
        console.log('dc got a message');
    }

    const onBufferedAmountLow = (event) => {
        console.log('dc got bufferedAmountLow');
    }

    const onError = (event) => {
        console.log('dc got an error');
    }

    dc.addEventListener('open', onOpen);
    dc.addEventListener('close', onClose);
    dc.addEventListener('message', onMessage);
    dc.addEventListener('bufferedamountlow', onBufferedAmountLow);
    dc.addEventListener('error', onError);
}


dataChannerE();