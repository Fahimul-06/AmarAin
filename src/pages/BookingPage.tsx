import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MessageSquare, Phone, Video, User as UserIcon, Calendar, Clock,
  Check, Loader2, Wallet, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LawyerProfile, Profile } from '@/lib/supabase';

const types = [
  { key: 'chat', icon: MessageSquare },
  { key: 'audio', icon: Phone },
  { key: 'video', icon: Video },
  { key: 'phone', icon: Phone },
  { key: 'in_person', icon: UserIcon },
] as const;

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

export default function BookingPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [lawyer, setLawyer] = useState<(LawyerProfile & { profiles: Profile }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>('chat');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [topic, setTopic] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [walletBalance, setWalletBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('lawyer_profiles')
        .select('*, profiles!inner ( id, full_name, phone, avatar_url, role, preferred_language, created_at, updated_at )')
        .eq('id', id)
        .maybeSingle();
      setLawyer(data as unknown as (LawyerProfile & { profiles: Profile }) | null);

      if (session) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setWalletBalance(wallet?.balance ?? 0);
      }
      setLoading(false);
    })();
  }, [id, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!lawyer) {
    return <div className="py-20 text-center text-slate-500">{t('empty.noLawyers')}</div>;
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-600">{t('auth.loginTitle')}</p>
          <Link to="/login" className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white">
            {t('common.login')}
          </Link>
        </div>
      </div>
    );
  }

  const platformFee = Math.round(lawyer.consultation_fee * 0.05);
  const total = lawyer.consultation_fee + platformFee;
  const insufficient = paymentMethod === 'wallet' && walletBalance < total;

  const handleSubmit = async () => {
    setError(null);
    if (!date || !time) { setError(t('booking.selectDateTime')); return; }
    if (!topic.trim()) { setError(t('booking.enterTopic')); return; }
    if (insufficient) { setError(t('booking.insufficientBalance')); return; }

    setSubmitting(true);
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    const { data, error: insertError } = await supabase
      .from('consultations')
      .insert({
        client_id: profile.id,
        lawyer_id: lawyer.user_id,
        consultation_type: type,
        status: 'confirmed',
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        price: total,
        topic: topic.trim(),
      })
      .select()
      .maybeSingle();

    if (insertError || !data) {
      setError(t('booking.bookingFailed'));
      setSubmitting(false);
      return;
    }

    if (paymentMethod === 'wallet') {
      await supabase.from('transactions').insert({
        wallet_id: (await supabase.from('wallets').select('id').eq('user_id', profile.id).maybeSingle()).data?.id,
        user_id: profile.id,
        type: 'debit',
        amount: total,
        description: `Consultation with ${lawyer.profiles.full_name}`,
        reference_type: 'consultation',
        reference_id: data.id,
        status: 'completed',
        payment_method: 'wallet',
      });
      await supabase.from('wallets').update({ balance: walletBalance - total, updated_at: new Date().toISOString() }).eq('user_id', profile.id);
    }

    await supabase.from('notifications').insert({
      user_id: lawyer.user_id,
      type: 'booking',
      title_en: 'New consultation booked',
      title_bn: 'নতুন পরামর্শ বুক করা হয়েছে',
      body_en: `${profile.full_name} booked a ${type} consultation.`,
      body_bn: `${profile.full_name} একটি ${type} পরামর্শ বুক করেছেন।`,
    });

    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-900">{t('booking.bookingSuccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link to={`/lawyers/${id}`} className="inline-flex items-center gap-1.5 text-sm text-emerald-50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">{t('booking.title')}</h1>
          <p className="mt-1 text-emerald-50">{t('booking.subtitle')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Type */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{t('booking.selectType')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {types.map((ct) => {
                  const Icon = ct.icon;
                  const active = type === ct.key;
                  return (
                    <button
                      key={ct.key}
                      onClick={() => setType(ct.key)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                        active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${active ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <span className={`text-sm font-medium ${active ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {t(`booking.type${ct.key.charAt(0).toUpperCase() + ct.key.slice(1)}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{t('booking.selectDate')}</h2>
              <div className="mt-4 relative">
                <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <h3 className="mt-5 font-medium text-slate-900">{t('booking.selectTime')}</h3>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTime(slot)}
                    className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-sm transition ${
                      time === slot ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" /> {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration & Topic */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{t('booking.duration')}</h2>
              <div className="mt-3 flex gap-2">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`rounded-lg border px-4 py-2 text-sm transition ${
                      duration === d ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t(`booking.minutes${d}`)}
                  </button>
                ))}
              </div>
              <h3 className="mt-5 font-medium text-slate-900">{t('booking.topic')}</h3>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder={t('booking.topicPlaceholder')}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{t('booking.summary')}</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.lawyer')}</span>
                  <span className="font-medium text-slate-900">{lawyer.profiles.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.type')}</span>
                  <span className="font-medium text-slate-900">{t(`booking.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('booking.duration')}</span>
                  <span className="font-medium text-slate-900">{duration} {t('common.minutes')}</span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('booking.consultationFee')}</span>
                    <span className="text-slate-900">{t('common.currency')}{lawyer.consultation_fee}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-slate-500">{t('booking.platformFee')}</span>
                    <span className="text-slate-900">{t('common.currency')}{platformFee}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
                    <span className="font-semibold text-slate-900">{t('booking.total')}</span>
                    <span className="font-bold text-emerald-600">{t('common.currency')}{total}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-slate-600">{t('booking.paymentMethod')}</p>
                <div className="space-y-2">
                  {[
                    { key: 'wallet', label: t('booking.payWithWallet'), icon: Wallet, disabled: insufficient },
                    { key: 'bkash', label: t('booking.payWithBkash'), icon: Wallet, disabled: false },
                    { key: 'nagad', label: t('booking.payWithNagad'), icon: Wallet, disabled: false },
                    { key: 'ssl', label: t('booking.payWithSSL'), icon: Wallet, disabled: false },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setPaymentMethod(m.key)}
                        disabled={m.disabled}
                        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50 ${
                          paymentMethod === m.key ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="h-4 w-4" /> {m.label}
                      </button>
                    );
                  })}
                </div>
                {paymentMethod === 'wallet' && (
                  <p className="mt-2 text-xs text-slate-500">{t('common.balance')}: {t('common.currency')}{walletBalance}</p>
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || insufficient}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {submitting ? t('common.loading') : t('booking.payNow')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
