import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/axios';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function VideoCall() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [error, setError] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const { data } = await api.get(`/appointments/${appointmentId}`);
        if (cancelled) return;
        setAppointment(data.appointment);

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
          auth: { token: localStorage.getItem('token') },
        });
        socketRef.current = socket;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
          setConnected(true);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('ice-candidate', { roomId: data.appointment.videoRoomId, candidate: event.candidate });
          }
        };

        socket.on('connect', () => {
          socket.emit('join-room', { roomId: data.appointment.videoRoomId });
        });

        socket.on('room-full', () => setError('This consultation room already has two participants.'));

        // The second participant to join creates the offer
        socket.on('peer-joined', async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId: data.appointment.videoRoomId, sdp: offer });
        });

        socket.on('offer', async ({ sdp }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { roomId: data.appointment.videoRoomId, sdp: answer });
        });

        socket.on('answer', async ({ sdp }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on('ice-candidate', async ({ candidate }) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate', err);
          }
        });

        socket.on('chat-message', ({ message, at }) => {
          setChatLog((prev) => [...prev, { message, from: 'peer', at }]);
        });

        socket.on('peer-left', () => setConnected(false));
      } catch (err) {
        setError(err.message || 'Failed to initialize video call. Please check camera/microphone permissions.');
      }
    };

    setup();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      socketRef.current?.emit('leave-room', { roomId: appointment?.videoRoomId });
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line
  }, [appointmentId]);

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOff(!videoTrack.enabled);
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socketRef.current?.emit('chat-message', { roomId: appointment.videoRoomId, message: chatInput });
    setChatLog((prev) => [...prev, { message: chatInput, from: 'me', at: Date.now() }]);
    setChatInput('');
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    socketRef.current?.emit('leave-room', { roomId: appointment?.videoRoomId });
    socketRef.current?.disconnect();
    navigate('/appointments');
  };

  return (
    <div className="container">
      <h1>Video Consultation</h1>
      {error && <div className="error-banner">{error}</div>}
      {!connected && !error && (
        <p style={{ color: '#6b7280' }}>Waiting for the other participant to join...</p>
      )}

      <div className="video-grid">
        <div>
          <video ref={localVideoRef} autoPlay muted playsInline />
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>You</p>
        </div>
        <div>
          <video ref={remoteVideoRef} autoPlay playsInline />
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#6b7280' }}>Other participant</p>
        </div>
      </div>

      <div className="call-controls">
        <button className="btn btn-outline" onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
        <button className="btn btn-outline" onClick={toggleVideo}>{videoOff ? 'Turn Video On' : 'Turn Video Off'}</button>
        <button className="btn btn-danger" onClick={endCall}>End Call</button>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>In-call Chat</h3>
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
          {chatLog.map((c, i) => (
            <div key={i} style={{ marginBottom: 6, textAlign: c.from === 'me' ? 'right' : 'left' }}>
              <span style={{
                background: c.from === 'me' ? '#0f766e' : '#e5e7eb',
                color: c.from === 'me' ? 'white' : '#1f2937',
                padding: '6px 10px', borderRadius: 12, display: 'inline-block', fontSize: '0.9rem',
              }}>
                {c.message}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}
          />
          <button className="btn btn-primary" onClick={sendChat}>Send</button>
        </div>
      </div>
    </div>
  );
}