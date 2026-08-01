import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Siren, Search, Star, BadgeCheck, Clock, Loader2, CheckCircle2, XCircle, AlertCircle,
  MessageSquare, Phone, Video, User as UserIcon, ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LawyerProfile, Profile, PracticeArea, EmergencyRequest } from '@/lib/supabase';
import i18n from '@/lib/i18n';

type OnlineLawyer = LawyerProfile & {
  profiles: Profile;
  lawyer_practice_areas: { practice_areas: PracticeArea }[];
};

const consultationTypes = [
  { key: 'chat', icon: MessageSquare },
  { key: 'audio', icon: Phone },
  { key: 'video', icon: Video },
  { key: 'phone', icon: Phone },
] as const;

export default function EmergencyPage() {
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';
  const { profile, session } = useAuth();
  const [lawyers, setLawyers] = useState<OnlineLawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLawyer, setSelectedLawyer] = useState<OnlineLawyer | null>(null);
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<string>('chat');
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<EmergencyRequest | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'accepted' | 'rejected' | 'expired'>('idle');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('lawyer_profiles')
        .select(`
          id, user_id, license_number, bar_association, bio, experience_years,
          hourly_rate, consultation_fee, city, languages, verification_status,
          is_available, rating_avg, rating_count,
          profiles!inner ( id, full_name, phone, avatar_url, role, preferred_language, created_at, updated_at ),
          lawyer_practice_areas ( practice_areas ( id, name_en, name_bn, icon ) )
        `)
        .eq('verification_status', 'verified')
        .eq('is_available', true)
        .order('rating_avg', { ascending: false });
      setLawyers((data as unknown as OnlineLawyer[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Poll active emergency request for status changes
  useEffect(() => {
    if (!activeRequest) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('id', activeRequest.id)
        .maybeSingle();
      if (!data) return;
      const req = data as EmergencyRequest;
      if (req.status === 'accepted') { setStatus('accepted'); clearInterval(interval); }
      else if (req.status === 'rejected') { setStatus('rejected'); clearInterval(interval); }
      else if (new Date(req.expires_at) < new Date()) { setStatus('expired'); clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeRequest]);

  const filtered = useMemo(() => {
    if (!search) return lawyers;
    const q = search.toLowerCase();
    return lawyers.filter((l) =>
      l.profiles.full_name.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.lawyer_practice_areas.some((lpa) =>
        lpa.practice_areas?.name_en.toLowerCase().includes(q) ||
        lpa.practice_areas?.name_bn.includes(q)
      )
    );
  }, [lawyers, search]);

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <Siren className="mx-auto h-12 w-12 text-rose-500" />
          <p className="mt-4 text-slate-600">{t('auth.loginTitle')}</p>
          <Link to="/login" className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
            {t('common.login')}
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selectedLawyer || !topic.trim() || !profile) return;
    setSubmitting(true);
    const emergencyFee = Math.round(selectedLawyer.consultation_fee * 1.5);
    const { data, error } = await supabase
      .from('emergency_requests')
      .insert({
        client_id: profile.id,
        lawyer_id: selectedLawyer.user_id,
        topic: topic.trim(),
        consultation_type: type,
        price: emergencyFee,
      })
      .select()
      .maybeSingle();
    if (error || !data) {
      setSubmitting(false);
      return;
    }
    setActiveRequest(data as EmergencyRequest);
    setStatus('waiting');

    await supabase.from('notifications').insert({
      user_id: selectedLawyer.user_id,
      type: 'emergency',
      title_en: 'Emergency consultation request',
      title_bn: 'জরুরি পরামর্শের অনুরোধ',
      body_en: `${profile.full_name} requested an emergency consultation: ${topic.trim()}`,
      body_bn: `${profile.full_name} একটি জরুরি পরামর্শের অনুরোধ করেছেন: ${topic.trim()}`,
    });

    setSubmitting(false);
  };

  const resetRequest = () => {
    setActiveRequest(null);
    setStatus('idle');
    setSelectedLawyer(null);
    setTopic('');
  };

  // Request status view
  if (status !== 'idle' && activeRequest) {
    const lawyer = lawyers.find((l) => l.user_id === activeRequest.lawyer_id);
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-br from-rose-600 to-red-700 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <Siren className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-white">{t('emergency.title')}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            {status === 'waiting' && (
              <>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-rose-500" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{t('emergency.waiting')}</h2>
                <p className="mt-2 text-sm text-slate-500">{lawyer?.profiles.full_name}</p>
                <p className="mt-1 text-sm text-slate-500">{activeRequest.topic}</p>
                <div className="mt-6 flex items-center justify-center gap-2 text-rose-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('emergency.minutesAway')}</span>
                </div>
              </>
            )}
            {status === 'accepted' && (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{t('emergency.accepted')}</h2>
                <p className="mt-2 text-sm text-slate-500">{lawyer?.profiles.full_name}</p>
                <button onClick={resetRequest} className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  {t('common.back')}
                </button>
              </>
            )}
            {status === 'rejected' && (
              <>
                <XCircle className="mx-auto h-12 w-12 text-rose-500" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{t('emergency.rejected')}</h2>
                <button onClick={resetRequest} className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  {t('common.back')}
                </button>
              </>
            )}
            {status === 'expired' && (
              <>
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{t('emergency.expired')}</h2>
                <button onClick={resetRequest} className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  {t('common.back')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Lawyer selection + request form
  if (selectedLawyer) {
    const emergencyFee = Math.round(selectedLawyer.consultation_fee * 1.5);
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-br from-rose-600 to-red-700 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <button onClick={() => setSelectedLawyer(null)} className="inline-flex items-center gap-1.5 text-sm text-rose-50 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> {t('common.back')}
            </button>
            <h1 className="mt-4 text-3xl font-bold text-white">{t('emergency.requestEmergency')}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              {selectedLawyer.profiles.avatar_url ? (
                <img src={selectedLawyer.profiles.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-xl font-bold text-emerald-700">
                  {selectedLawyer.profiles.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{selectedLawyer.profiles.full_name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600"><BadgeCheck className="h-3.5 w-3.5" /> {t('common.verified')}</span>
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {selectedLawyer.rating_avg.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('emergency.topic')}</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder={t('emergency.topicPlaceholder')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t('emergency.selectType')}</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {consultationTypes.map((ct) => {
                  const Icon = ct.icon;
                  const active = type === ct.key;
                  return (
                    <button key={ct.key} onClick={() => setType(ct.key)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${active ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <Icon className={`h-5 w-5 ${active ? 'text-rose-600' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium ${active ? 'text-rose-700' : 'text-slate-700'}`}>
                        {t(`booking.type${ct.key.charAt(0).toUpperCase() + ct.key.slice(1)}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3">
              <span className="text-sm font-medium text-rose-700">{t('emergency.emergencyFee')}</span>
              <span className="text-lg font-bold text-rose-600">{t('common.currency')}{emergencyFee}</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!topic.trim() || submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
              {t('emergency.submit')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Online lawyers list
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-rose-600 to-red-700 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Siren className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('emergency.title')}</h1>
              <p className="mt-1 text-rose-50">{t('emergency.subtitle')}</p>
            </div>
          </div>
          <div className="mt-6 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-white/20 transition focus:ring-rose-300"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900">{t('emergency.onlineLawyers')}</h2>
          <span className="text-sm text-slate-500">({filtered.length})</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Siren className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">{t('emergency.noOnlineLawyers')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLawyer(l)}
                className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-rose-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {l.profiles.avatar_url ? (
                      <img src={l.profiles.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-lg font-bold text-emerald-700">
                        {l.profiles.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                      <span className="h-2 w-2 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-900">{l.profiles.full_name}</p>
                      <BadgeCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {l.rating_avg.toFixed(1)} ({l.rating_count})
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3.5 w-3.5" /> {l.experience_years}y
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.lawyer_practice_areas.slice(0, 3).map((lpa) => (
                    <span key={lpa.practice_areas.id} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {isBn ? lpa.practice_areas.name_bn : lpa.practice_areas.name_en}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-500">{t('emergency.emergencyFee')}</p>
                    <p className="text-lg font-bold text-rose-600">{t('common.currency')}{Math.round(l.consultation_fee * 1.5)}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition group-hover:bg-rose-600 group-hover:text-white">
                    <Siren className="h-3.5 w-3.5" /> {t('emergency.minutesAway')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
