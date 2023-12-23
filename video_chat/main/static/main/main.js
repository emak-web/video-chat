let localStream;
let remoteStream;
let peerConnection;

let uid = String(Math.floor(Math.random() * 10000000));
const roomName = JSON.parse(document.getElementById('room-name').textContent);
const username = JSON.parse(document.getElementById('username').textContent);
let socket;

let userMediaData = {
    video: {
        width:{min: 640, ideal: 1920, max: 1920},
        height:{min: 480, ideal: 1080, max: 1080},
    },
    audio: true
};

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
};

let init = async () => {
    localStream = await navigator.mediaDevices.getUserMedia(userMediaData);
    document.getElementById('local-user').srcObject = localStream;

    socket = new WebSocket(`ws://${window.location.host}/ws/room/${roomName}/`);

    socket.onopen = (event) => {
        socket.send(JSON.stringify({'type': 'login', 'uid': uid}));
    };

    socket.onmessage = (event) => {
        let data = JSON.parse(event.data);
        console.log('Data: ', data);

        if (data.type == 'createOffer' && data.uid !== uid) {
            createOffer();
        }

        if (data.type == 'offer' && data.uid !== uid) {
            createAnswer(data.offer, data.username);
        } else if (data.type == 'answer' && data.uid !== uid) {
            setAnswer(data.answer, data.username);
        } else if (data.type == 'candidate' && data.uid !== uid) {
            if (peerConnection) {
                peerConnection.addIceCandidate(data.candidate);
            }
        } else if (data.type == 'userLeft') {
            document.getElementById('remote').style.display = 'none';
            document.getElementById('local').style.width = 'calc(100% - 30px)';
        }
    };

    socket.onclose = (event) => {
        console.error('Chat socket closed unexpectedly');
    };
};

let createPeerConnection = async () => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById('remote-user').srcObject = remoteStream;
    document.getElementById('remote').style.display = 'block';
    document.getElementById('local').style.width = '30%';

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            console.log('New ICE candidate: ', event.candidate);
            socket.send(JSON.stringify({'type': 'candidate', 'uid': uid, 'candidate': event.candidate}));
        }
    };
};

let createOffer = async () => {
    await createPeerConnection();

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log('Offer: ', offer);

    socket.send(JSON.stringify({'type': 'offer', 'uid': uid, 'username': username, 'offer': offer}));
};


let createAnswer = async (offer, remoteUsername) => {
    document.getElementById('remote-user-name').innerHTML = remoteUsername;
    await createPeerConnection();

    await peerConnection.setRemoteDescription(offer);
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    console.log('Answer: ', answer);
    
    socket.send(JSON.stringify({'type': 'answer', 'uid': uid, 'username': username, 'answer': answer}));
};

let setAnswer = async (answer, remoteUsername) => {
    document.getElementById('remote-user-name').innerHTML = remoteUsername;
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer);
    }
};

init();


let leaveBtn = document.getElementById('leave-btn');
let camBtn = document.getElementById('cam');
let micBtn = document.getElementById('mic');

leaveBtn.addEventListener('click', async (event) => {
    
    await socket.send(JSON.stringify({'type': 'logout', 'uid': uid}));

    window.location.pathname = '/';
});

let cam = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video');

    if (videoTrack.enabled) {
        videoTrack.enabled = false;
    } else {
        videoTrack.enabled = true;
    }
};

let mic = async () => {
    let videoTrack = localStream.getTracks().find(track => track.kind === 'audio');
    let micImg = document.getElementById('mic-img');

    if (videoTrack.enabled) {
        videoTrack.enabled = false;
        micImg.src = '/static/main/micmute.png';
    } else {
        videoTrack.enabled = true;
        micImg.src = '/static/main/mic.png';
    }
};

camBtn.addEventListener('click', cam)
micBtn.addEventListener('click', mic)


window.addEventListener('beforeunload', async (event) => {
    await socket.send(JSON.stringify({'type': 'logout', 'uid': uid}));
});