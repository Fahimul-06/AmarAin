import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, Send, Phone, Video, Loader2, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuth } from '@/context/AuthContext';
import type { Message, Profile } from '@/lib/supabase';

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  documentRequestId: string;
  otherUser: Profile | null;
  documentTitle: string;
}

export function ChatDrawer({ open, onClose, documentRequestId, otherUser, documentTitle }: ChatDrawerProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bn = i18n.language.startsWith('bn');

  const loadMessages = useCallback(async () => {
    if (!documentRequestId) return;
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('document_request_id', documentRequestId).order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [documentRequestId]);

  useEffect(() => { if (open) loadMessages(); }, [open, loadMessages]);

  useEffect(() => {
    if (!open || !documentRequestId) return;
    const socket = getRealtimeSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage = (message: Message) => {
      if (message.document_request_id !== documentRequestId) return;
      setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev.filter((m) => !m.id.startsWith('temp-')), message]);
    };
    const onInvite = (payload: { kind: string; roomId: string; mode: 'audio'|'video'; from: string }) => {
      if (payload.kind !== 'document' || payload.roomId !== documentRequestId || payload.from === profile?.id) return;
      const accepted = window.confirm(bn ? `${otherUser?.full_name || 'ব্যবহারকারী'} আপনাকে একটি ${payload.mode === 'video' ? 'ভিডিও' : 'অডিও'} কলে আমন্ত্রণ জানিয়েছেন। যোগ দেবেন?` : `${otherUser?.full_name || 'The other user'} invited you to a ${payload.mode} call. Join now?`);
      if (accepted) navigate(`/call/document/${documentRequestId}?mode=${payload.mode}`);
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onMessage);
    socket.on('call:invite', onInvite);
    socket.emit('room:join', { kind: 'document', roomId: documentRequestId }, (ack: any) => {
      if (!ack?.ok) setError(ack?.error || (bn ? 'চ্যাট রুমে যোগ দেওয়া যায়নি' : 'Could not join chat room'));
      else setConnected(true);
    });
    setConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onMessage);
      socket.off('call:invite', onInvite);
    };
  }, [open, documentRequestId, navigate, profile?.id, otherUser?.full_name, bn]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !profile || sending) return;
    setSending(true); setError('');
    const body = input.trim(); setInput('');
    const optimistic: Message = { id: `temp-${Date.now()}`, consultation_id: null, document_request_id: documentRequestId, sender_id: profile.id, body, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    getRealtimeSocket().emit('message:send', { kind: 'document', roomId: documentRequestId, body }, (ack: any) => {
      setSending(false);
      if (!ack?.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(body);
        setError(ack?.error || (bn ? 'বার্তা পাঠানো যায়নি' : 'Could not send message'));
      }
    });
  };

  const startCall = (mode: 'audio' | 'video') => {
    if (!otherUser) return;
    const socket = getRealtimeSocket();
    socket.emit('call:invite', { kind: 'document', roomId: documentRequestId, mode }, (ack: any) => {
      if (!ack?.ok) setError(ack?.error || (bn ? 'কল শুরু করা যায়নি' : 'Could not start call'));
      else navigate(`/call/document/${documentRequestId}?mode=${mode}&initiator=1`);
    });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[600px] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : (otherUser?.full_name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0"><p className="text-sm font-semibold">{otherUser?.full_name ?? t('lawyerDashboard.clientName')}</p><p className="truncate text-xs text-emerald-50">{documentTitle}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <span title={connected ? 'Connected' : 'Disconnected'}>{connected ? <Wifi className="h-4 w-4 text-emerald-100"/> : <WifiOff className="h-4 w-4 text-red-200"/>}</span>
            <button onClick={() => startCall('audio')} className="rounded-full p-2 hover:bg-white/20" aria-label="Audio call"><Phone className="h-4 w-4" /></button>
            <button onClick={() => startCall('video')} className="rounded-full p-2 hover:bg-white/20" aria-label="Video call"><Video className="h-4 w-4" /></button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-white/20" aria-label={t('lawyerDashboard.closeChat')}><X className="h-4 w-4" /></button>
          </div>
        </div>
        {error && <div className="bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {loading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : messages.length === 0 ? <div className="flex h-full items-center justify-center text-center"><p className="text-sm text-slate-400">{t('lawyerDashboard.noMessagesYet')}</p></div> : messages.map((m) => {
            const isMe = m.sender_id === profile?.id;
            return <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 shadow-sm'} ${m.id.startsWith('temp-') ? 'opacity-60' : ''}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className={`mt-1 text-[10px] ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>;
          })}
        </div>
        <div className="border-t border-slate-100 bg-white p-3"><div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} rows={1} placeholder={t('lawyerDashboard.typeMessage')} className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/><button onClick={handleSend} disabled={!input.trim() || sending || !connected} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>
      </div>
    </div>
  );
}
