import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Bot, Send, Sparkles, BookOpen, AlertTriangle, Trash2,
  User as UserIcon, Scale, Plus, MessageSquare, ChevronLeft,
  RefreshCw, FileText, Clock, X, Star, BadgeCheck, MapPin, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import i18n from '@/lib/i18n';

interface Citation { title: string; source: string; }
interface SuggestedLawyer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  verification_status: string;
  rating_avg: number;
  rating_count: number;
  consultation_fee: number;
  experience_years: number;
  practice_areas: { id: string; name_en: string; name_bn: string }[];
}
interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggested_lawyers?: SuggestedLawyer[];
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  language: string;
  updated_at: string;
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_API_URL || '/api'}/ai-assistant`;

export default function AIAssistantPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking, scrollToBottom]);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when switching conversation
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  async function loadConversations() {
    setLoadingHistory(true);
    try {
      const { data, error: err } = await supabase
        .from('ai_conversations')
        .select('id, title, language, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (err) throw err;
      setConversations((data || []) as Conversation[]);
    } catch {
      // silently fail — conversations are a nice-to-have
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const { data, error: err } = await supabase
        .from('ai_messages')
        .select('id, role, content, citations, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (err) throw err;
      setMessages((data || []) as ChatMessage[]);
    } catch {
      setMessages([]);
    }
  }

  const suggested = [
    t('ai.question1'), t('ai.question2'), t('ai.question3'), t('ai.question4'),
  ];

  async function send(text: string) {
    if (!text.trim() || thinking) return;
    setError(null);

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          question: text,
          language: (typeof window !== 'undefined' && document.documentElement.lang === 'bn') ? 'bn' : 'en',
          conversation_id: activeConversationId,
          user_id: session?.user?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.answer,
        citations: data.citations || [],
        suggested_lawyers: data.suggested_lawyers || [],
      };
      setMessages((m) => [...m, assistantMsg]);

      if (data.conversation_id && data.conversation_id !== activeConversationId) {
        setActiveConversationId(data.conversation_id);
      }

      // Refresh conversation list
      loadConversations();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
      setMessages((m) => [...m, {
        role: 'assistant',
        content: t('ai.errorMessage'),
      }]);
    } finally {
      setThinking(false);
    }
  }

  async function startNewChat() {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await supabase.from('ai_messages').delete().eq('conversation_id', id);
      await supabase.from('ai_conversations').delete().eq('id', id);
      if (activeConversationId === id) {
        startNewChat();
      }
      loadConversations();
    } catch {
      // ignore
    }
  }

  function selectConversation(id: string) {
    setActiveConversationId(id);
    setSidebarOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar — Chat History */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition-transform duration-200
        lg:relative lg:translate-x-0 lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              {t('ai.chatHistory')}
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-3 py-3">
            <button
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              {t('ai.newChat')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-slate-400">
                {t('ai.noHistory')}
              </p>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`
                      group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition
                      ${activeConversationId === conv.id
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50'}
                    `}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{t('ai.title')}</h1>
                <p className="text-sm text-emerald-50">{t('ai.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat content */}
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Welcome / suggested questions */}
            {messages.length === 0 && !thinking && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-medium">{t('ai.suggestedQuestions')}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggested.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => send(q)}
                        className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    <p className="mt-2 text-sm font-medium text-slate-700">{t('ai.featureCitedTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('ai.featureCitedDesc')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <Clock className="h-5 w-5 text-emerald-600" />
                    <p className="mt-2 text-sm font-medium text-slate-700">{t('ai.featureHistoryTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('ai.featureHistoryDesc')}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <p className="mt-2 text-sm font-medium text-slate-700">{t('ai.featureBilingualTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('ai.featureBilingualDesc')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }`}>
                  {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 shadow-sm border border-slate-200'
                }`}>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</p>
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <BookOpen className="h-3.5 w-3.5" /> {t('ai.citations')}
                      </p>
                      <div className="mt-2 space-y-1">
                        {msg.citations.map((c, ci) => (
                          <div key={ci} className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                            <p className="font-medium text-slate-700">{c.title}</p>
                            <p className="text-slate-500">{c.source}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.suggested_lawyers && msg.suggested_lawyers.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Scale className="h-3.5 w-3.5" /> {t('ai.suggestedLawyers')}
                      </p>
                      <div className="mt-2 space-y-2">
                        {msg.suggested_lawyers.map((lawyer) => (
                          <Link
                            key={lawyer.id}
                            to={`/lawyers/${lawyer.id}`}
                            className="block rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative shrink-0">
                                {lawyer.avatar_url ? (
                                  <img src={lawyer.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-700">
                                    {lawyer.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {lawyer.verification_status === 'verified' && (
                                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                                    <BadgeCheck className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{lawyer.full_name}</p>
                                {lawyer.city && (
                                  <p className="mt-0.5 flex items-center gap-0.5 text-xs text-slate-500">
                                    <MapPin className="h-3 w-3" /> {lawyer.city}
                                  </p>
                                )}
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {lawyer.practice_areas.slice(0, 2).map((pa) => (
                                    <span key={pa.id} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                      {i18n.language === 'bn' ? pa.name_bn : pa.name_en}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span className="text-xs font-semibold text-slate-700">{lawyer.rating_avg.toFixed(1)}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">{t('common.currency')}{lawyer.consultation_fee}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-emerald-600">
                              {t('ai.bookConsultation')} <ArrowRight className="h-3 w-3" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-slate-200">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Clear chat */}
          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('ai.clearChat')}
            </button>
          )}

          {/* Input area */}
          <div className="mt-4">
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>{t('ai.disclaimer')}</p>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('ai.inputPlaceholder')}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{t('ai.send')}</span>
              </button>
            </form>
            <div className="mt-3 text-center">
              <Link to="/lawyers" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                <Scale className="h-3.5 w-3.5" /> {t('ai.findLawyer')} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
