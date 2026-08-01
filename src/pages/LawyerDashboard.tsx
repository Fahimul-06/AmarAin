import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Wallet, Star, AlertTriangle, FileText, Loader2, CheckCircle2, XCircle,
  Clock, TrendingUp, Banknote, Download, Save, Bell, Shield, User as UserIcon,
  MessageSquare, Phone, Video, Siren, Gavel,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Consultation, Review, LawyerProfile, Transaction, DocumentRequest, Dispute, PracticeArea, Profile, EmergencyRequest, DocumentBid } from '@/lib/supabase';
import { DashboardShell, StatCard, lawyerNav } from '@/components/DashboardShell';
import { LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import { ChatDrawer } from '@/components/ChatDrawer';
import i18n from '@/lib/i18n';

const isBn = () => i18n.language === 'bn';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    confirmed: 'bg-blue-50 text-blue-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-500',
    disputed: 'bg-rose-50 text-rose-700',
    open: 'bg-rose-50 text-rose-700',
    under_review: 'bg-amber-50 text-amber-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-slate-100 text-slate-500',
    assigned: 'bg-blue-50 text-blue-700',
    drafting: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {t(`common.${status}`)}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

export default function LawyerDashboard() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [active, setActive] = useState('overview');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [clients, setClients] = useState<Record<string, Profile>>({});
  const [reviews, setReviews] = useState<(Review & { client?: Profile })[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lawyerProfile, setLawyerProfile] = useState<LawyerProfile | null>(null);
  const [documents, setDocuments] = useState<(DocumentRequest & { client?: Profile })[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [practiceAreas, setPracticeAreas] = useState<PracticeArea[]>([]);
  const [allPracticeAreas, setAllPracticeAreas] = useState<PracticeArea[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [saveMsg, setSaveMsg] = useState('');
  const [chatDoc, setChatDoc] = useState<DocumentRequest & { client?: Profile } | null>(null);
  const [emergencyReqs, setEmergencyReqs] = useState<(EmergencyRequest & { client?: Profile })[]>([]);
  const [emergencyTick, setEmergencyTick] = useState(0);
  const [openRequests, setOpenRequests] = useState<(DocumentRequest & { client?: Profile })[]>([]);
  const [myBids, setMyBids] = useState<DocumentBid[]>([]);
  const [bidModal, setBidModal] = useState<{ request: DocumentRequest & { client?: Profile }; existingBid: DocumentBid | null } | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidComment, setBidComment] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    (async () => {
      const [cs, rv, tx, lp, docs, dis, pa, allPa, wallet] = await Promise.all([
        supabase.from('consultations').select('*').eq('lawyer_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').eq('lawyer_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('lawyer_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
        supabase.from('document_requests').select('*').eq('lawyer_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('disputes').select('*').eq('against_user_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('lawyer_practice_areas').select('practice_area_id').eq('lawyer_profile_id', ''),
        supabase.from('practice_areas').select('*').order('name_en'),
        supabase.from('wallets').select('*').eq('user_id', profile.id).maybeSingle(),
      ]);

      const csData = (cs.data as Consultation[]) ?? [];
      const rvData = (rv.data as Review[]) ?? [];
      const docsData = (docs.data as DocumentRequest[]) ?? [];

      // Fetch all related client profiles
      const clientIds = new Set<string>([
        ...csData.map((c) => c.client_id),
        ...rvData.map((r) => r.client_id),
        ...docsData.map((d) => d.client_id),
      ]);
      let clientsMap: Record<string, Profile> = {};
      if (clientIds.size > 0) {
        const { data: clientProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(clientIds));
        clientsMap = (clientProfiles as Profile[])?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) ?? {};
      }

      setConsultations(csData);
      setClients(clientsMap);
      setReviews(rvData.map((r) => ({ ...r, client: clientsMap[r.client_id] })));
      setTransactions((tx.data as Transaction[]) ?? []);
      setLawyerProfile(lp.data as LawyerProfile | null);
      setDocuments(docsData.map((d) => ({ ...d, client: clientsMap[d.client_id] })));
      setDisputes((dis.data as Dispute[]) ?? []);
      setAllPracticeAreas((allPa.data as PracticeArea[]) ?? []);
      setWalletBalance(wallet.data ? Number((wallet.data as { balance: number }).balance) : 0);

      if (lp.data) {
        const { data: lpa } = await supabase
          .from('lawyer_practice_areas')
          .select('practice_area_id')
          .eq('lawyer_profile_id', (lp.data as LawyerProfile).id);
        const paIds = ((lpa as { practice_area_id: string }[]) ?? []).map((x) => x.practice_area_id);
        setPracticeAreas((allPa.data as PracticeArea[])?.filter((p) => paIds.includes(p.id)) ?? []);
      }

      setLoading(false);
    })();
  }, [profile]);

  // Load incoming emergency requests
  useEffect(() => {
    if (!profile || active !== 'emergency') return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const load = async () => {
      const { data } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('lawyer_id', profile.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false });
      const reqs = (data as EmergencyRequest[]) ?? [];
      const clientIds = Array.from(new Set(reqs.map((r) => r.client_id)));
      const clientMap: Record<string, Profile> = {};
      if (clientIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', clientIds);
        (profiles as Profile[])?.forEach((p) => { clientMap[p.id] = p; });
      }
      setEmergencyReqs(reqs.map((r) => ({ ...r, client: clientMap[r.client_id] })));
    };
    load();
    channel = supabase
      .channel('emergency-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergency_requests', filter: `lawyer_id=eq.${profile.id}` }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergency_requests', filter: `lawyer_id=eq.${profile.id}` }, () => load())
      .subscribe();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [profile, active]);

  // Tick for countdown
  useEffect(() => {
    if (active !== 'emergency') return;
    const i = setInterval(() => setEmergencyTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [active]);

  // Load open document requests + my bids for bidding
  useEffect(() => {
    if (!profile || active !== 'documents') return;
    const load = async () => {
      const { data: open } = await supabase
        .from('document_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      const openReqs = (open as DocumentRequest[]) ?? [];
      const clientIds = Array.from(new Set(openReqs.map((r) => r.client_id)));
      const clientMap: Record<string, Profile> = {};
      if (clientIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', clientIds);
        (profiles as Profile[])?.forEach((p) => { clientMap[p.id] = p; });
      }
      setOpenRequests(openReqs.map((r) => ({ ...r, client: clientMap[r.client_id] })));

      const { data: bids } = await supabase
        .from('document_bids')
        .select('*')
        .eq('lawyer_id', profile.id)
        .order('created_at', { ascending: false });
      setMyBids((bids as DocumentBid[]) ?? []);
    };
    load();
    const channel = supabase
      .channel('lawyer-doc-bids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_bids', filter: `lawyer_id=eq.${profile.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, active]);

  if (!profile) return <div className="py-20 text-center text-slate-500">{t('auth.loginTitle')}</div>;
  if (loading) return <LoadingSpinner />;

  const upcoming = consultations.filter((c) => c.status === 'confirmed' || c.status === 'pending');
  const completed = consultations.filter((c) => c.status === 'completed');
  const totalEarnings = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const commission = transactions.filter((t) => t.type === 'commission').reduce((s, t) => s + Number(t.amount), 0);
  const payouts = transactions.filter((t) => t.type === 'payout');
  const now = new Date();
  const thisMonthEarnings = transactions
    .filter((t) => t.type === 'credit' && new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + Number(t.amount), 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0';

  const submitVerification = async () => {
    if (!lawyerProfile) return;
    setSubmittingVerify(true);
    await supabase.from('lawyer_profiles').update({ verification_status: 'pending', updated_at: new Date().toISOString() }).eq('id', lawyerProfile.id);
    const { data } = await supabase.from('lawyer_profiles').select('*').eq('id', lawyerProfile.id).maybeSingle();
    setLawyerProfile(data as LawyerProfile | null);
    setSubmittingVerify(false);
  };

  const updateConsultationStatus = async (id: string, status: Consultation['status']) => {
    await supabase.from('consultations').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setConsultations((c) => c.map((b) => (b.id === id ? { ...b, status } : b)));
  };

  const updateDocStatus = async (id: string, status: DocumentRequest['status']) => {
    await supabase.from('document_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setDocuments((d) => d.map((doc) => (doc.id === id ? { ...doc, status } : doc)));
  };

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lawyerProfile) return;
    const fd = new FormData(e.currentTarget);
    const langs = (fd.get('languages') as string).split(',').map((s) => s.trim()).filter(Boolean);
    await supabase.from('lawyer_profiles').update({
      bio: fd.get('bio') as string,
      city: fd.get('city') as string,
      hourly_rate: Number(fd.get('hourly_rate')),
      consultation_fee: Number(fd.get('consultation_fee')),
      experience_years: Number(fd.get('experience')),
      license_number: fd.get('license') as string,
      bar_association: fd.get('bar') as string,
      languages: langs,
      updated_at: new Date().toISOString(),
    }).eq('id', lawyerProfile.id);

    // Update practice areas
    const selectedIds = allPracticeAreas
      .filter((pa) => fd.get(`pa_${pa.id}`) === 'on')
      .map((pa) => pa.id);
    await supabase.from('lawyer_practice_areas').delete().eq('lawyer_profile_id', lawyerProfile.id);
    if (selectedIds.length > 0) {
      await supabase.from('lawyer_practice_areas').insert(
        selectedIds.map((pid) => ({ lawyer_profile_id: lawyerProfile.id, practice_area_id: pid }))
      );
    }
    setPracticeAreas(allPracticeAreas.filter((pa) => selectedIds.includes(pa.id)));
    setSaveMsg(t('lawyerDashboard.profileUpdated'));
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const toggleAvailability = async () => {
    if (!lawyerProfile) return;
    const newVal = !lawyerProfile.is_available;
    await supabase.from('lawyer_profiles').update({ is_available: newVal, updated_at: new Date().toISOString() }).eq('id', lawyerProfile.id);
    setLawyerProfile({ ...lawyerProfile, is_available: newVal });
  };

  const requestPayout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    const method = fd.get('method') as string;
    if (amount <= 0 || amount > walletBalance) return;
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', profile.id).maybeSingle();
    if (!wallet) return;
    await supabase.from('transactions').insert({
      wallet_id: (wallet as { id: string }).id,
      user_id: profile.id,
      type: 'payout',
      amount,
      description: `Withdrawal to ${method}`,
      status: 'pending',
      payment_method: method,
    });
    await supabase.from('wallets').update({ balance: walletBalance - amount, updated_at: new Date().toISOString() }).eq('user_id', profile.id);
    setWalletBalance(walletBalance - amount);
    const { data: newTx } = await supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1);
    setTransactions((t) => [...((newTx as Transaction[]) ?? []), ...t]);
  };

  const filteredConsultations = filter === 'all' ? consultations : consultations.filter((c) => c.status === filter);

  const verificationBanner = lawyerProfile && (
    <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
      lawyerProfile.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700' :
      lawyerProfile.verification_status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
    }`}>
      <CheckCircle2 className="h-5 w-5" />
      <p className="flex-1">
        {lawyerProfile.verification_status === 'verified' ? t('lawyerDashboard.verificationVerified') :
          lawyerProfile.verification_status === 'rejected' ? t('lawyerDashboard.verificationRejected') :
          t('lawyerDashboard.verificationPending')}
      </p>
      {lawyerProfile.verification_status !== 'verified' && (
        <button onClick={submitVerification} disabled={submittingVerify}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm hover:bg-emerald-50">
          {submittingVerify ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('lawyerDashboard.submitVerification')}
        </button>
      )}
    </div>
  );

  return (
    <DashboardShell
      title={t('lawyerDashboard.welcome', { name: profile.full_name })}
      navItems={lawyerNav(t)}
      activeKey={active}
      onNavigate={setActive}
    >
      {verificationBanner}

      {/* OVERVIEW */}
      {active === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t('lawyerDashboard.statConsultations')} value={consultations.length} icon={Calendar} color="emerald" />
            <StatCard label={t('lawyerDashboard.statUpcoming')} value={upcoming.length} icon={Clock} color="blue" />
            <StatCard label={t('lawyerDashboard.statCompleted')} value={completed.length} icon={CheckCircle2} color="teal" />
            <StatCard label={t('lawyerDashboard.statEarnings')} value={`${t('common.currency')}${totalEarnings}`} icon={Wallet} color="amber" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Star className="h-5 w-5 text-amber-400" />
                <p className="text-sm font-medium">{t('lawyerDashboard.reviews')}</p>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">{avgRating}</p>
              <p className="text-xs text-slate-500">{reviews.length} {t('lawyerDashboard.reviews')}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <p className="text-sm font-medium">{t('lawyerDashboard.earningsThisMonthValue')}</p>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">{t('common.currency')}{thisMonthEarnings}</p>
              <p className="text-xs text-slate-500">{t('lawyerDashboard.availableBalance')}: {t('common.currency')}{walletBalance}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.upcomingConsultations')}</h2>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('lawyerDashboard.noConsultations')}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {upcoming.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.topic ?? t('common.consultation')}</p>
                      <p className="text-xs text-slate-500">
                        {clients[c.client_id]?.full_name ?? t('lawyerDashboard.clientName')} · {t(`booking.type${c.consultation_type.charAt(0).toUpperCase() + c.consultation_type.slice(1)}`)} · {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {c.status === 'pending' && (
                        <button onClick={() => updateConsultationStatus(c.id, 'confirmed')} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">{t('lawyerDashboard.acceptBooking')}</button>
                      )}
                      <button onClick={() => updateConsultationStatus(c.id, 'completed')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">{t('lawyerDashboard.markCompleted')}</button>
                      <button onClick={() => updateConsultationStatus(c.id, 'cancelled')} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">{t('lawyerDashboard.declineBooking')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.reviews')}</h2>
            {reviews.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('lawyerDashboard.noReviewsYet')}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {reviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.body && <p className="mt-1.5 text-sm text-slate-600">{r.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">— {r.client?.full_name ?? t('lawyerDashboard.reviewBy')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONSULTATIONS */}
      {active === 'bookings' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'disputed'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
                {t(`lawyerDashboard.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {filteredConsultations.length === 0 ? (
              <EmptyState message={t('lawyerDashboard.noConsultationsMatch')} />
            ) : (
              <div className="space-y-3">
                {filteredConsultations.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{c.topic ?? t('common.consultation')}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {clients[c.client_id]?.full_name ?? t('lawyerDashboard.clientName')} · {t(`booking.type${c.consultation_type.charAt(0).toUpperCase() + c.consultation_type.slice(1)}`)}
                        </p>
                        <p className="text-xs text-slate-400">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : ''}</p>
                        {c.description && <p className="mt-2 text-sm text-slate-600">{c.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={c.status} />
                        <span className="text-sm font-semibold text-emerald-600">{t('common.currency')}{c.price}</span>
                      </div>
                    </div>
                    {(c.status === 'pending' || c.status === 'confirmed') && (
                      <div className="mt-3 flex gap-2">
                        {c.status === 'pending' && (
                          <button onClick={() => updateConsultationStatus(c.id, 'confirmed')} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">{t('lawyerDashboard.acceptBooking')}</button>
                        )}
                        <button onClick={() => updateConsultationStatus(c.id, 'completed')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">{t('lawyerDashboard.markCompleted')}</button>
                        <button onClick={() => updateConsultationStatus(c.id, 'cancelled')} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">{t('lawyerDashboard.declineBooking')}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMERGENCY SERVICE */}
      {active === 'emergency' && lawyerProfile && (
        <div className="space-y-6">
          {/* Online/offline toggle */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.toggleEmergency')}</h2>
                <p className="mt-1 text-sm text-slate-500">{t('lawyerDashboard.emergencyDesc')}</p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${lawyerProfile.is_available ? 'bg-emerald-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${lawyerProfile.is_available ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`flex h-2.5 w-2.5 rounded-full ${lawyerProfile.is_available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span className={`text-sm font-medium ${lawyerProfile.is_available ? 'text-emerald-600' : 'text-slate-500'}`}>
                {lawyerProfile.is_available ? t('lawyerDashboard.emergencyOnline') : t('lawyerDashboard.emergencyOffline')}
              </span>
            </div>
          </div>

          {/* Incoming requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.incomingEmergency')}</h2>
            {emergencyReqs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('lawyerDashboard.noEmergencyRequests')}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {emergencyReqs.map((r) => {
                  const secondsLeft = Math.max(0, Math.floor((new Date(r.expires_at).getTime() - Date.now()) / 1000));
                  const expired = r.status === 'pending' && secondsLeft <= 0;
                  return (
                    <div key={r.id} className={`rounded-xl border p-4 ${r.status === 'accepted' ? 'border-emerald-200 bg-emerald-50' : expired ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{t('lawyerDashboard.emergencyFromClient', { name: r.client?.full_name ?? '—' })}</p>
                          <p className="mt-1 text-sm text-slate-600"><strong>{t('lawyerDashboard.emergencyTopic')}:</strong> {r.topic}</p>
                          <p className="text-xs text-slate-500"><strong>{t('lawyerDashboard.emergencyType')}:</strong> {t(`booking.type${r.consultation_type.charAt(0).toUpperCase() + r.consultation_type.slice(1)}`)} · <strong>{t('lawyerDashboard.emergencyFee')}:</strong> {t('common.currency')}{r.price}</p>
                        </div>
                        <div className="text-right">
                          {r.status === 'pending' && !expired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <Clock className="h-3 w-3" /> {t('lawyerDashboard.emergencyExpiresIn', { seconds: secondsLeft })}
                            </span>
                          )}
                          {r.status === 'accepted' && <StatusBadge status="accepted" />}
                          {expired && <span className="text-xs font-medium text-amber-600">{t('lawyerDashboard.emergencyExpired')}</span>}
                        </div>
                      </div>
                      {r.status === 'pending' && !expired && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={async () => {
                              await supabase.from('emergency_requests').update({ status: 'accepted', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);
                              setEmergencyReqs((prev) => prev.map((x) => x.id === r.id ? { ...x, status: 'accepted' } : x));
                            }}
                            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >{t('lawyerDashboard.acceptEmergency')}</button>
                          <button
                            onClick={async () => {
                              await supabase.from('emergency_requests').update({ status: 'rejected', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', r.id);
                              setEmergencyReqs((prev) => prev.filter((x) => x.id !== r.id));
                            }}
                            className="rounded-lg bg-white border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >{t('lawyerDashboard.rejectEmergency')}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EARNINGS */}
      {active === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm">
              <p className="text-sm text-emerald-50">{t('lawyerDashboard.availableBalance')}</p>
              <p className="mt-2 text-3xl font-bold">{t('common.currency')}{walletBalance}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{t('lawyerDashboard.totalReceived')}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{t('common.currency')}{totalEarnings}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{t('lawyerDashboard.commissionPaid')}</p>
              <p className="mt-2 text-2xl font-bold text-rose-600">{t('common.currency')}{commission}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500">{t('lawyerDashboard.netEarnings')}</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{t('common.currency')}{totalEarnings - commission}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.requestPayout')}</h2>
            <form onSubmit={requestPayout} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('lawyerDashboard.payoutMethod')}</label>
                <select name="method" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400">
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('lawyerDashboard.payoutAmount')}</label>
                <input name="amount" type="number" max={walletBalance} placeholder={`${t('common.currency')}0`} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <Banknote className="mr-1.5 inline h-4 w-4" />{t('lawyerDashboard.requestPayout')}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('common.transactions')}</h2>
            {transactions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('wallet.noTransactions')}</p>
            ) : (
              <div className="mt-4 space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-slate-50 py-2.5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' :
                        tx.type === 'debit' || tx.type === 'commission' || tx.type === 'payout' ? 'bg-rose-50 text-rose-600' :
                        tx.type === 'refund' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {tx.type === 'payout' ? <Banknote className="h-4 w-4" /> : tx.type === 'deposit' ? <Download className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-700">{tx.description ?? t(`common.${tx.type}`)}</p>
                        <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()} · <StatusBadge status={tx.status} /></p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'debit' || tx.type === 'commission' || tx.type === 'payout' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.type === 'debit' || tx.type === 'commission' || tx.type === 'payout' ? '-' : '+'}{t('common.currency')}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {payouts.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.requestPayout')}s</h2>
              <div className="mt-4 space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                    <div>
                      <p className="text-sm text-slate-700">{p.description}</p>
                      <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="text-sm font-semibold text-rose-600">{t('common.currency')}{p.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MY PROFILE */}
      {active === 'profile' && lawyerProfile && (
        <div className="space-y-6">
          {saveMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {saveMsg}
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.editProfile')}</h2>
              <button onClick={toggleAvailability}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${lawyerProfile.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {lawyerProfile.is_available ? t('lawyerDashboard.availabilityOnline') : t('lawyerDashboard.availabilityOffline')}
              </button>
            </div>
            <form onSubmit={saveProfile} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.licenseNumber')}</label>
                  <input name="license" defaultValue={lawyerProfile.license_number ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.barAssociation')}</label>
                  <input name="bar" defaultValue={lawyerProfile.bar_association ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.city')}</label>
                  <input name="city" defaultValue={lawyerProfile.city ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.yearsExperience')}</label>
                  <input name="experience" type="number" defaultValue={lawyerProfile.experience_years} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.consultationFee')}</label>
                  <input name="consultation_fee" type="number" defaultValue={lawyerProfile.consultation_fee} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.hourlyRate')}</label>
                  <input name="hourly_rate" type="number" defaultValue={lawyerProfile.hourly_rate} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.bio')}</label>
                <textarea name="bio" rows={4} defaultValue={lawyerProfile.bio ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('lawyerDashboard.languages')}</label>
                <input name="languages" defaultValue={(lawyerProfile.languages ?? []).join(', ')} placeholder={t('lawyerDashboard.languagesHint')} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('lawyerDashboard.practiceAreas')}</label>
                <div className="flex flex-wrap gap-2">
                  {allPracticeAreas.map((pa) => {
                    const checked = practiceAreas.some((p) => p.id === pa.id);
                    return (
                      <label key={pa.id} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${checked ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <input type="checkbox" name={`pa_${pa.id}`} defaultChecked={checked} className="h-3.5 w-3.5 accent-emerald-600" />
                        {isBn() ? pa.name_bn : pa.name_en}
                      </label>
                    );
                  })}
                </div>
              </div>
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <Save className="mr-1.5 inline h-4 w-4" />{t('common.save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT REQUESTS - BIDDING */}
      {active === 'documents' && (
        <div className="space-y-6">
          {/* Open requests to bid on */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Gavel className="h-5 w-5 text-emerald-600" /> {t('lawyerDashboard.openRequests')}
            </h2>
            {openRequests.length === 0 ? (
              <EmptyState message={t('lawyerDashboard.noOpenRequests')} />
            ) : (
              <div className="mt-4 space-y-3">
                {openRequests.map((r) => {
                  const myBid = myBids.find((b) => b.document_request_id === r.id);
                  return (
                    <div key={r.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <p className="font-medium text-slate-900">{r.title}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {t('lawyerDashboard.documentClient')}: {r.client?.full_name ?? '—'} · {t('lawyerDashboard.documentType')}: <span className="capitalize">{r.document_type}</span>
                          </p>
                          {r.description && <p className="mt-2 text-sm text-slate-600">{r.description}</p>}
                          <p className="mt-1 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {myBid ? (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                              {t('lawyerDashboard.yourBid')}: {t('common.currency')}{myBid.amount}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                              {t('lawyerDashboard.bidOnRequest')}
                            </span>
                          )}
                        </div>
                      </div>

                      {myBid && (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                          {myBid.comment && <p className="text-sm text-slate-600">{myBid.comment}</p>}
                          <p className="mt-1 text-xs text-slate-400">{new Date(myBid.created_at).toLocaleDateString()}</p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => setBidModal({ request: r, existingBid: myBid ?? null })}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          <Gavel className="h-3.5 w-3.5" /> {myBid ? t('lawyerDashboard.updateBid') : t('lawyerDashboard.placeBid')}
                        </button>
                        {myBid && (
                          <button
                            onClick={() => setChatDoc(r)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> {t('lawyerDashboard.chatWithClient')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My assigned documents */}
          {documents.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">{t('lawyerDashboard.documentRequests')}</h2>
              <div className="mt-4 space-y-3">
                {documents.map((d) => (
                  <div key={d.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <p className="font-medium text-slate-900">{d.title}</p>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {t('lawyerDashboard.documentClient')}: {d.client?.full_name ?? '—'} · {t('lawyerDashboard.documentType')}: <span className="capitalize">{d.document_type}</span>
                        </p>
                        {d.description && <p className="mt-2 text-sm text-slate-600">{d.description}</p>}
                        <p className="mt-1 text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={d.status} />
                        <span className="text-sm font-semibold text-emerald-600">{t('common.currency')}{d.price}</span>
                      </div>
                    </div>
                    {d.status !== 'completed' && d.status !== 'cancelled' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.status === 'assigned' && (
                          <button onClick={() => updateDocStatus(d.id, 'drafting')} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">{t('lawyerDashboard.startDrafting')}</button>
                        )}
                        {d.status === 'drafting' && (
                          <button onClick={() => updateDocStatus(d.id, 'completed')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">{t('lawyerDashboard.markDocCompleted')}</button>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => setChatDoc(d)} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
                        <MessageSquare className="h-3.5 w-3.5" /> {t('lawyerDashboard.chatWithClient')}
                      </button>
                      <a href={`tel:${d.client?.phone ?? ''}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <Phone className="h-3.5 w-3.5" /> {t('lawyerDashboard.callClient')}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BID MODAL */}
      {bidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setBidModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">
                {bidModal.existingBid ? t('lawyerDashboard.updateBid') : t('lawyerDashboard.placeBid')}
              </h3>
            </div>
            <p className="mb-4 text-sm text-slate-500">{bidModal.request.title}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('lawyerDashboard.bidAmount')}</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  defaultValue={bidModal.existingBid?.amount ?? ''}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('lawyerDashboard.bidComment')}</label>
                <textarea
                  rows={3}
                  defaultValue={bidModal.existingBid?.comment ?? ''}
                  onChange={(e) => setBidComment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder={t('lawyerDashboard.bidCommentPlaceholder')}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!profile || !bidAmount) return;
                    setBidSubmitting(true);
                    if (bidModal.existingBid) {
                      await supabase.from('document_bids').update({
                        amount: parseFloat(bidAmount),
                        comment: bidComment || null,
                        updated_at: new Date().toISOString(),
                      }).eq('id', bidModal.existingBid.id);
                    } else {
                      await supabase.from('document_bids').insert({
                        document_request_id: bidModal.request.id,
                        lawyer_id: profile.id,
                        amount: parseFloat(bidAmount),
                        comment: bidComment || null,
                      });
                      await supabase.from('notifications').insert({
                        user_id: bidModal.request.client_id,
                        type: 'document',
                        title_en: 'New bid on your document request',
                        title_bn: 'আপনার নথি অনুরোধে নতুন বিড',
                        body_en: `A lawyer placed a bid of ${bidAmount} on "${bidModal.request.title}"`,
                        body_bn: `একজন আইনজীবী "${bidModal.request.title}" এ ${bidAmount} এর বিড করেছেন`,
                      });
                    }
                    setBidSubmitting(false);
                    setBidModal(null);
                    setBidAmount('');
                    setBidComment('');
                  }}
                  disabled={bidSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {bidSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {bidModal.existingBid ? t('lawyerDashboard.updateBid') : t('lawyerDashboard.submitBid')}
                </button>
                <button onClick={() => setBidModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChatDrawer
        open={!!chatDoc}
        onClose={() => setChatDoc(null)}
        documentRequestId={chatDoc?.id ?? ''}
        otherUser={chatDoc?.client ?? null}
        documentTitle={chatDoc?.title ?? ''}
      />

      {/* REVIEWS */}
      {active === 'reviews' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-slate-900">{avgRating}</p>
              <Stars rating={Math.round(Number(avgRating))} />
              <p className="mt-1 text-xs text-slate-500">{t('lawyerDashboard.reviews')}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-slate-900">{reviews.filter((r) => r.rating === 5).length}</p>
              <div className="mt-1 flex items-center justify-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="text-xs text-slate-500">5-star</span></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-3xl font-bold text-slate-900">{reviews.length}</p>
              <p className="mt-1 text-xs text-slate-500">Total reviews</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {reviews.length === 0 ? (
              <EmptyState message={t('lawyerDashboard.noReviewsYet')} />
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-700">
                          {(r.client?.full_name ?? '?').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{r.client?.full_name ?? t('lawyerDashboard.reviewBy')}</p>
                          <Stars rating={r.rating} />
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.body && <p className="mt-2 text-sm leading-relaxed text-slate-600">{r.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISPUTES */}
      {active === 'disputes' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('dispute.title')}</h2>
          {disputes.length === 0 ? (
            <EmptyState message={t('lawyerDashboard.noDisputes')} />
          ) : (
            <div className="mt-4 space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                        <p className="font-medium text-slate-900">{d.reason}</p>
                      </div>
                      {d.description && <p className="mt-2 text-sm text-slate-600">{d.description}</p>}
                      {d.resolution && (
                        <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
                          <p className="text-xs font-medium text-emerald-700">{t('lawyerDashboard.disputeResolution')}:</p>
                          <p className="text-sm text-emerald-600">{d.resolution}</p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-slate-400">{t('lawyerDashboard.disputeDate')}: {new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {active === 'settings' && (
        <div className="space-y-6">
          {/* Availability */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <UserIcon className="h-5 w-5 text-emerald-600" />{t('lawyerDashboard.settingsAvailability')}
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {lawyerProfile?.is_available ? t('lawyerDashboard.availabilityOnline') : t('lawyerDashboard.availabilityOffline')}
              </p>
              <button onClick={toggleAvailability}
                className={`relative h-7 w-12 rounded-full transition ${lawyerProfile?.is_available ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${lawyerProfile?.is_available ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Bell className="h-5 w-5 text-emerald-600" />{t('lawyerDashboard.settingsNotifications')}
            </h2>
            <div className="mt-4 space-y-3">
              {[
                { key: 'email', label: t('lawyerDashboard.emailNotifications') },
                { key: 'booking', label: t('lawyerDashboard.bookingNotifications') },
                { key: 'review', label: t('lawyerDashboard.reviewNotifications') },
                { key: 'payout', label: t('lawyerDashboard.payoutNotifications') },
              ].map((n) => (
                <label key={n.key} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span className="text-sm text-slate-700">{n.label}</span>
                  <input type="checkbox" defaultChecked className="h-5 w-5 accent-emerald-600" />
                </label>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Shield className="h-5 w-5 text-emerald-600" />{t('lawyerDashboard.settingsSecurity')}
            </h2>
            <form className="mt-4 space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const newPw = fd.get('new') as string;
              const confirmPw = fd.get('confirm') as string;
              if (newPw !== confirmPw || !profile) return;
              await supabase.auth.updateUser({ password: newPw });
              setSaveMsg(t('lawyerDashboard.passwordChanged'));
              setTimeout(() => setSaveMsg(''), 3000);
              e.currentTarget.reset();
            }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('lawyerDashboard.currentPassword')}</label>
                <input name="current" type="password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('lawyerDashboard.newPassword')}</label>
                <input name="new" type="password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('lawyerDashboard.confirmPassword')}</label>
                <input name="confirm" type="password" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">{t('lawyerDashboard.changePassword')}</button>
            </form>
          </div>

          {saveMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> {saveMsg}
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
