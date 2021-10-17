
const logs = document.getElementById('logs');
const form = document.getElementById('form');
const input = document.getElementById('input');


function addToLogs(text) {
    console.log(text)
    let child = document.createElement('p')
    child.innerText = text;
    logs.prepend(child)
}

function onOpen() {
    addToLogs('Opened')
}

function onMessage(message) {
    addToLogs(message.data)
}

function startWSSClinet() {
    const url = "ws://localhost:3005"
    addToLogs("Starting")

    const wss = new WebSocket(url);

    wss.onopen = onOpen;
    wss.onmessage = onMessage;


    form.onsubmit = (e)=>{
        e.preventDefault()
        wss.send(input.value)
        input.value=''
    }
    
}

startWSSClinet();