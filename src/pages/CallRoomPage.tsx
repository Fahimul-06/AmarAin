import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Users } from 'lucide-react';
import { getRealtimeSocket } from '@/lib/realtime';

const iceServers: RTCIceServer[] = [
  { urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302' },
  ...(import.meta.env.VITE_TURN_URL ? [{ urls: import.meta.env.VITE_TURN_URL, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL }] : []),
];

export default function CallRoomPage() {
  const { kind = 'document', roomId = '' } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'audio' ? 'audio' : 'video';
  const initiator = params.get('initiator') === '1';
  const navigate = useNavigate();
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Connecting…');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(mode === 'audio');
  const [error, setError] = useState('');
  const endedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const socket = getRealtimeSocket();

    const ensurePeer = () => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers });
      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit('webrtc:ice', { kind, roomId, candidate: event.candidate });
      };
      pc.ontrack = (event) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
        setStatus('Connected');
      };
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') setStatus('Connected');
        if (['failed','disconnected'].includes(state)) setStatus('Connection interrupted');
        if (state === 'closed') setStatus('Call ended');
      };
      pcRef.current = pc;
      return pc;
    };

    const makeOffer = async () => {
      const pc = ensurePeer();
      if (!localStreamRef.current) return;
      if (pc.signalingState !== 'stable') return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { kind, roomId, sdp: offer });
      setStatus('Calling…');
    };

    const setup = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera and microphone require HTTPS and a supported browser.');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;
        const pc = ensurePeer();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        socket.emit('room:join', { kind, roomId }, async (ack: any) => {
          if (!ack?.ok) { setError(ack?.error || 'Unable to join call'); return; }
          setStatus(initiator ? 'Waiting for the other person…' : 'Joining call…');
          if (initiator) await makeOffer();
        });
      } catch (e: any) {
        setError(e.message || 'Unable to access camera or microphone');
        setStatus('Unable to start call');
      }
    };

    const onPeerJoined = async () => { if (initiator) await makeOffer(); };
    const onOffer = async ({ sdp }: any) => {
      const pc = ensurePeer();
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { kind, roomId, sdp: answer });
      setStatus('Connecting…');
    };
    const onAnswer = async ({ sdp }: any) => {
      const pc = ensurePeer();
      if (pc.signalingState === 'have-local-offer') await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    };
    const onIce = async ({ candidate }: any) => {
      try { if (candidate) await ensurePeer().addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* candidate may arrive before SDP */ }
    };
    const onEnd = () => endCall(false);
    const onPeerLeft = () => setStatus('The other person left the call');

    socket.on('room:peer-joined', onPeerJoined);
    socket.on('webrtc:offer', onOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice', onIce);
    socket.on('call:end', onEnd);
    socket.on('room:peer-left', onPeerLeft);
    setup();

    return () => {
      mounted = false;
      socket.off('room:peer-joined', onPeerJoined);
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice', onIce);
      socket.off('call:end', onEnd);
      socket.off('room:peer-left', onPeerLeft);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, [kind, roomId, mode, initiator]);

  const endCall = (notify = true) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (notify) getRealtimeSocket().emit('call:end', { kind, roomId });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    navigate(-1);
  };

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
    getRealtimeSocket().emit('call:media-state', { kind, roomId, muted: next, cameraOff });
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !next; });
    setCameraOff(next);
    getRealtimeSocket().emit('call:media-state', { kind, roomId, muted, cameraOff: next });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between px-5 py-4"><div><h1 className="font-semibold">Amar Ain {mode === 'video' ? 'Video' : 'Audio'} Consultation</h1><p className="text-sm text-slate-400">{status}</p></div><div className="flex items-center gap-2 text-sm text-slate-300"><Users className="h-4 w-4"/> Secure private room</div></div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        {error ? <div className="max-w-md rounded-2xl bg-red-950/70 p-6 text-center text-red-100"><p>{error}</p><button onClick={() => navigate(-1)} className="mt-4 rounded-lg bg-white px-4 py-2 text-slate-900">Go back</button></div> : <>
          {mode === 'video' ? <video ref={remoteVideo} autoPlay playsInline className="h-full w-full rounded-2xl bg-slate-900 object-cover"/> : <div className="flex h-48 w-48 items-center justify-center rounded-full bg-emerald-700 text-6xl font-bold shadow-2xl">AA</div>}
          {status !== 'Connected' && <div className="absolute flex flex-col items-center gap-3 rounded-2xl bg-black/50 px-6 py-4 backdrop-blur"><Loader2 className="h-7 w-7 animate-spin"/><span>{status}</span></div>}
          {mode === 'video' && <video ref={localVideo} autoPlay muted playsInline className="absolute bottom-6 right-6 h-36 w-28 rounded-xl border-2 border-white/30 bg-slate-800 object-cover shadow-xl sm:h-48 sm:w-36"/>}
        </>}
      </div>
      <div className="flex items-center justify-center gap-4 px-4 py-6">
        <button onClick={toggleMute} className={`rounded-full p-4 ${muted ? 'bg-red-600' : 'bg-slate-800 hover:bg-slate-700'}`} aria-label="Toggle microphone">{muted ? <MicOff/> : <Mic/>}</button>
        {mode === 'video' && <button onClick={toggleCamera} className={`rounded-full p-4 ${cameraOff ? 'bg-red-600' : 'bg-slate-800 hover:bg-slate-700'}`} aria-label="Toggle camera">{cameraOff ? <VideoOff/> : <Video/>}</button>}
        <button onClick={() => endCall(true)} className="rounded-full bg-red-600 p-5 hover:bg-red-700" aria-label="End call"><PhoneOff/></button>
      </div>
    </div>
  );
}
