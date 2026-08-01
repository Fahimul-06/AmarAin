import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Phone, Send, Video, Wifi, WifiOff, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuth } from '@/context/AuthContext';
import type { Message, Profile } from '@/lib/supabase';

interface ConsultationChatDrawerProps {
  open: boolean;
  onClose: () => void;
  consultationId: string;
  otherUser: Profile | null;
  consultationTitle: string;
}

export function ConsultationChatDrawer({ open, onClose, consultationId, otherUser, consultationTitle }: ConsultationChatDrawerProps) {
  const { i18n } = useTranslation();
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
    if (!consultationId) return;
    setLoading(true);
    const { data, error: queryError } = await supabase.from('messages').select('*').eq('consultation_id', consultationId).order('created_at', { ascending: true });
    if (queryError) setError(queryError.message);
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [consultationId]);

  useEffect(() => { if (open) void loadMessages(); }, [open, loadMessages]);

  useEffect(() => {
    if (!open || !consultationId) return;
    const socket = getRealtimeSocket();
    const onConnect = () => {
      setConnected(true);
      socket.emit('room:join', { kind: 'consultation', roomId: consultationId }, (ack: any) => {
        if (!ack?.ok) setError(ack?.error || (bn ? 'পরামর্শ কক্ষে যোগ দেওয়া যায়নি' : 'Could not join consultation room'));
      });
    };
    const onDisconnect = () => setConnected(false);
    const onMessage = (message: Message) => {
      if (message.consultation_id !== consultationId) return;
      setMessages((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev.filter((m) => !m.id.startsWith('temp-')), message]);
    };
    const onInvite = (payload: { kind: string; roomId: string; mode: 'audio'|'video'; from: string }) => {
      if (payload.kind !== 'consultation' || payload.roomId !== consultationId || payload.from === profile?.id) return;
      const label = payload.mode === 'video' ? (bn ? 'ভিডিও' : 'video') : (bn ? 'অডিও' : 'audio');
      const accepted = window.confirm(bn
        ? `${otherUser?.full_name || 'অন্য পক্ষ'} আপনাকে একটি ${label} কলে আমন্ত্রণ জানিয়েছেন। যোগ দেবেন?`
        : `${otherUser?.full_name || 'The other participant'} invited you to a ${label} call. Join now?`);
      if (accepted) navigate(`/call/consultation/${consultationId}?mode=${payload.mode}`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onMessage);
    socket.on('call:invite', onInvite);
    socket.emit('room:join', { kind: 'consultation', roomId: consultationId }, (ack: any) => {
      if (!ack?.ok) setError(ack?.error || (bn ? 'পরামর্শ কক্ষে যোগ দেওয়া যায়নি' : 'Could not join consultation room'));
      else setConnected(true);
    });
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onMessage);
      socket.off('call:invite', onInvite);
    };
  }, [open, consultationId, navigate, profile?.id, otherUser?.full_name, bn]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const sendMessage = () => {
    const body = input.trim();
    if (!body || !profile || sending || !connected) return;
    setSending(true); setError(''); setInput('');
    const optimistic: Message = { id: `temp-${Date.now()}`, consultation_id: consultationId, document_request_id: null, sender_id: profile.id, body, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    getRealtimeSocket().emit('message:send', { kind: 'consultation', roomId: consultationId, body }, (ack: any) => {
      setSending(false);
      if (!ack?.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setInput(body);
        setError(ack?.error || (bn ? 'বার্তা পাঠানো যায়নি' : 'Could not send message'));
      }
    });
  };

  const startCall = (mode: 'audio' | 'video') => {
    const socket = getRealtimeSocket();
    socket.emit('call:invite', { kind: 'consultation', roomId: consultationId, mode }, (ack: any) => {
      if (!ack?.ok) setError(ack?.error || (bn ? 'কল শুরু করা যায়নি' : 'Could not start call'));
      else navigate(`/call/consultation/${consultationId}?mode=${mode}&initiator=1`);
    });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[620px] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : (otherUser?.full_name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0"><p className="text-sm font-semibold">{otherUser?.full_name ?? (bn ? 'অন্য পক্ষ' : 'Other participant')}</p><p className="truncate text-xs text-emerald-50">{consultationTitle}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <span title={connected ? 'Connected' : 'Disconnected'}>{connected ? <Wifi className="h-4 w-4 text-emerald-100"/> : <WifiOff className="h-4 w-4 text-red-200"/>}</span>
            <button onClick={() => startCall('audio')} className="rounded-full p-2 hover:bg-white/20" aria-label={bn ? 'অডিও কল' : 'Audio call'}><Phone className="h-4 w-4" /></button>
            <button onClick={() => startCall('video')} className="rounded-full p-2 hover:bg-white/20" aria-label={bn ? 'ভিডিও কল' : 'Video call'}><Video className="h-4 w-4" /></button>
            <button onClick={onClose} className="rounded-full p-2 hover:bg-white/20" aria-label={bn ? 'বন্ধ করুন' : 'Close'}><X className="h-4 w-4" /></button>
          </div>
        </div>
        {error && <div className="bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {loading ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : messages.length === 0 ? <div className="flex h-full items-center justify-center text-center"><p className="text-sm text-slate-400">{bn ? 'এখনও কোনো বার্তা নেই।' : 'No messages yet.'}</p></div> : messages.map((m) => {
            const isMe = m.sender_id === profile?.id;
            return <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 shadow-sm'} ${m.id.startsWith('temp-') ? 'opacity-60' : ''}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><p className={`mt-1 text-[10px] ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div></div>;
          })}
        </div>
        <div className="border-t border-slate-100 bg-white p-3"><div className="flex items-end gap-2"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} placeholder={bn ? 'বার্তা লিখুন...' : 'Type a message...'} className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/><button onClick={sendMessage} disabled={!input.trim() || sending || !connected} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>
      </div>
    </div>
  );
}
