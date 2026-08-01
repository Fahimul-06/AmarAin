import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ShieldCheck, CreditCard, AlertTriangle, Banknote, Wallet, Bot, BarChart3, History, Lock, Settings as SettingsIcon, Calendar, FileText, Receipt, Star, BookOpen, BadgeCheck, XCircle, Loader2, Check, Pencil, X } from 'lucide-react';
import { supabase, adminApi, apiRequest } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Profile, Consultation, Transaction, Dispute, Article, AuditLog, AdminUser, AdminLawyer } from '@/lib/supabase';
import { DashboardShell, StatCard, adminNav } from '@/components/DashboardShell';
import { LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import i18n from '@/lib/i18n';

type EditorState = { kind: 'user' | 'lawyer'; data: Record<string, any> } | null;

export default function AdminDashboard() {
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';
  const { profile } = useAuth();
  const [active, setActive] = useState('overview');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lawyers, setLawyers] = useState<AdminLawyer[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ siteName: 'Amar Ain', commissionRate: 5, minPayout: 1000, aiEnabled: true, maintenance: false, signup: true });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    (async () => {
      const [u, l, c, tx, dp, ar, al] = await Promise.all([
        adminApi.users(),
        adminApi.lawyers(),
        supabase.from('consultations').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('disputes').select('*').order('created_at', { ascending: false }),
        supabase.from('articles').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(30),
      ]);
      setUsers(u);
      setLawyers(l);
      setConsultations((c.data as Consultation[]) ?? []);
      setTransactions((tx.data as Transaction[]) ?? []);
      setDisputes((dp.data as Dispute[]) ?? []);
      setArticles((ar.data as Article[]) ?? []);
      setAuditLogs((al.data as AuditLog[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (!profile || profile.role !== 'admin') {
    return <div className="py-20 text-center text-slate-500">{t('common.insufficientPermissions')}</div>;
  }
  if (loading) return <LoadingSpinner />;

  const pendingLawyers = lawyers.filter((l) => l.verification_status === 'pending');
  const verifiedLawyers = lawyers.filter((l) => l.verification_status === 'verified');
  const totalRevenue = transactions.filter((t) => t.type === 'commission').reduce((s, t) => s + Number(t.amount), 0);
  const totalPayouts = transactions.filter((t) => t.type === 'payout').reduce((s, t) => s + Number(t.amount), 0);
  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'under_review');

  const logAction = async (action: string, entity: string, entityId: string) => {
    await supabase.from('audit_logs').insert({
      actor_id: profile.id,
      action,
      entity_type: entity,
      entity_id: entityId,
    });
  };

  const verifyLawyer = async (id: string, approve: boolean) => {
    const status = approve ? 'verified' : 'rejected';
    setActionError('');
    try {
      await adminApi.setLawyerVerification(id, status);
      setLawyers((ls) => ls.map((l) => (l.id === id ? { ...l, verification_status: status } : l)));
    } catch (error: any) { setActionError(error.message); }
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSaving(true); setActionError('');
    try {
      if (editor.kind === 'user') {
        const updated = await adminApi.updateUser(editor.data.id, editor.data);
        setUsers((rows) => rows.map((row) => row.id === editor.data.id ? { ...row, ...updated, ...editor.data } : row));
      } else {
        await adminApi.updateLawyer(editor.data.id, editor.data);
        setLawyers((rows) => rows.map((row) => row.id === editor.data.id ? { ...row, ...editor.data, profiles: { ...row.profiles, full_name: editor.data.full_name, phone: editor.data.phone, email: editor.data.email } } : row));
      }
      setEditor(null);
    } catch (error: any) { setActionError(error.message); } finally { setSaving(false); }
  };

  const resolveDispute = async (id: string, resolution: 'resolved' | 'rejected') => {
    await supabase.from('disputes').update({ status: resolution, updated_at: new Date().toISOString() }).eq('id', id);
    setDisputes((ds) => ds.map((d) => (d.id === id ? { ...d, status: resolution } : d)));
    logAction(`dispute_${resolution}`, 'disputes', id);
  };

  const verifyComplaint = async (dispute: Dispute, decision: 'verified' | 'rejected') => {
    const note = window.prompt(isBn ? 'সিদ্ধান্তের নোট লিখুন (ঐচ্ছিক):' : 'Add an administrator note (optional):') || '';
    setActionError('');
    try {
      const result = await apiRequest(`/admin/disputes/${dispute.id}/verify`, { method: 'POST', body: JSON.stringify({ decision, note }) });
      setDisputes(rows => rows.map(row => row.id === dispute.id ? { ...row, ...(result.data || {}), status: decision === 'verified' ? 'resolved' : 'rejected', admin_verification: decision, admin_note: note } : row));
    } catch (error:any) { setActionError(error.message || 'Could not verify complaint.'); }
  };

  const saveSettings = () => {
    setSettingsSaved(true);
    logAction('update_settings', 'system', '');
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  return (
    <DashboardShell
      title={t('admin.title')}
      navItems={adminNav(t)}
      activeKey={active}
      onNavigate={setActive}
    >
      {actionError && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>}
      {active === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t('admin.statTotalUsers')} value={users.length} icon={Users} color="emerald" />
            <StatCard label={t('admin.statTotalLawyers')} value={verifiedLawyers.length} icon={ShieldCheck} color="blue" />
            <StatCard label={t('admin.statPendingVerifications')} value={pendingLawyers.length} icon={BadgeCheck} color="amber" />
            <StatCard label={t('admin.statTotalRevenue')} value={`${t('common.currency')}${totalRevenue}`} icon={CreditCard} color="teal" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t('admin.statActiveBookings')} value={consultations.filter((c) => c.status === 'confirmed').length} icon={Calendar} color="emerald" />
            <StatCard label={t('admin.statOpenDisputes')} value={openDisputes.length} icon={AlertTriangle} color="rose" />
            <StatCard label={t('admin.statPlatformCommission')} value={`${t('common.currency')}${totalRevenue}`} icon={Banknote} color="amber" />
            <StatCard label={t('admin.statTotalPayouts')} value={`${t('common.currency')}${totalPayouts}`} icon={Wallet} color="teal" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('admin.recentActivity')}</h2>
            {auditLogs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('empty.noData')}</p>
            ) : (
              <div className="mt-4 space-y-2">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{log.action}</p>
                      <p className="text-xs text-slate-400">{log.entity_type ?? ''}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {active === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{t('admin.users')}</h2><span className="text-sm text-slate-500">{users.length}</span></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="pb-2">{t('common.name')}</th><th className="pb-2">{t('common.email')}</th><th className="pb-2">{t('common.role')}</th>
                <th className="pb-2">{isBn ? 'ওয়ালেট' : 'Wallet'}</th><th className="pb-2">{isBn ? 'মোট খরচ' : 'Total Spent'}</th><th className="pb-2">{isBn ? 'মোট রিচার্জ' : 'Total Recharge'}</th><th className="pb-2">{isBn ? 'কাজ' : 'Action'}</th>
              </tr></thead>
              <tbody>{users.map((u) => (<tr key={u.id} className="border-b border-slate-50">
                <td className="py-3 font-medium text-slate-900">{u.full_name}</td><td className="py-3 text-slate-600">{u.email}</td>
                <td className="py-3"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t(`common.${u.role}`)}</span></td>
                <td className="py-3">{t('common.currency')}{Number(u.wallet_balance).toLocaleString()}</td><td className="py-3 text-rose-600">{t('common.currency')}{Number(u.total_spent).toLocaleString()}</td><td className="py-3 text-emerald-600">{t('common.currency')}{Number(u.total_recharged).toLocaleString()}</td>
                <td className="py-3"><button onClick={() => setEditor({kind:'user',data:{...u}})} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium hover:bg-slate-200"><Pencil className="h-3.5 w-3.5" />{isBn ? 'সম্পাদনা' : 'Edit'}</button></td>
              </tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {active === 'lawyers' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.lawyers')}</h2>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1000px] text-sm">
            <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="pb-2">{t('common.name')}</th><th className="pb-2">{t('common.licenseNumber')}</th><th className="pb-2">{isBn?'অবস্থা':'Status'}</th><th className="pb-2">{isBn?'মোট আয়':'Total Income'}</th><th className="pb-2">{isBn?'উত্তোলন':'Payouts'}</th><th className="pb-2">{isBn?'ওয়ালেট':'Wallet'}</th><th className="pb-2">{isBn?'কাজ':'Action'}</th></tr></thead>
            <tbody>{lawyers.map((l)=><tr key={l.id} className="border-b border-slate-50"><td className="py-3"><div className="font-medium text-slate-900">{l.profiles.full_name}</div><div className="text-xs text-slate-500">{l.profiles.email}</div></td><td className="py-3">{l.license_number||'-'}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-xs ${l.verification_status==='verified'?'bg-emerald-100 text-emerald-700':l.verification_status==='rejected'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}>{t(`common.${l.verification_status}`)}</span></td><td className="py-3 font-semibold text-emerald-700">{t('common.currency')}{Number(l.total_income).toLocaleString()}</td><td className="py-3">{t('common.currency')}{Number(l.total_payouts).toLocaleString()}</td><td className="py-3">{t('common.currency')}{Number(l.wallet_balance).toLocaleString()}</td><td className="py-3"><button onClick={()=>setEditor({kind:'lawyer',data:{...l,full_name:l.profiles.full_name,phone:l.profiles.phone,email:l.profiles.email}})} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium hover:bg-slate-200"><Pencil className="h-3.5 w-3.5" />{isBn?'সম্পাদনা':'Edit'}</button></td></tr>)}</tbody>
          </table></div>
        </div>
      )}

      {active === 'verification' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.verification')}</h2>
          {pendingLawyers.length === 0 ? (
            <EmptyState message={t('empty.noData')} />
          ) : (
            <div className="mt-4 space-y-3">
              {pendingLawyers.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{l.profiles.full_name}</p>
                    <p className="text-xs text-slate-500">{t('common.licenseNumber')}: {l.license_number ?? 'N/A'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => verifyLawyer(l.id, true)} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      <BadgeCheck className="h-3.5 w-3.5" /> {t('admin.verifyLawyer')}
                    </button>
                    <button onClick={() => verifyLawyer(l.id, false)} className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                      <XCircle className="h-3.5 w-3.5" /> {t('admin.rejectLawyer')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'content' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.content')}</h2>
          <div className="mt-4 space-y-3">
            {articles.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{isBn ? a.title_bn : a.title_en}</p>
                  <p className="text-xs text-slate-500">{a.category ?? ''} · {a.views} {t('articles.views')}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${a.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {t(`common.${a.status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === 'bookings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.bookings')}</h2>
          {consultations.length === 0 ? <EmptyState message={t('empty.noBookings')} /> : (
            <div className="mt-4 space-y-3">
              {consultations.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.topic ?? t('common.consultation')}</p>
                    <p className="text-xs text-slate-500">{t(`booking.type${c.consultation_type.charAt(0).toUpperCase() + c.consultation_type.slice(1)}`)} · {t('common.currency')}{c.price}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{t(`common.${c.status}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'consultations' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.consultations')}</h2>
          <p className="mt-4 text-sm text-slate-500">{t('empty.noData')}</p>
        </div>
      )}

      {active === 'payments' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.payments')}</h2>
          <div className="mt-4 space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                <div>
                  <p className="text-sm text-slate-700">{tx.description ?? t(`common.${tx.type}`)}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{t('common.currency')}{tx.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === 'refunds' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.refunds')}</h2>
          <p className="mt-4 text-sm text-slate-500">{t('empty.noData')}</p>
        </div>
      )}

      {active === 'commissions' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.commissions')}</h2>
          <p className="mt-4 text-2xl font-bold text-emerald-600">{t('common.currency')}{totalRevenue}</p>
        </div>
      )}

      {active === 'withdrawals' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.withdrawals')}</h2>
          <p className="mt-4 text-2xl font-bold text-slate-900">{t('common.currency')}{totalPayouts}</p>
        </div>
      )}

      {active === 'disputes' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.disputes')}</h2>
          {disputes.length === 0 ? <EmptyState message={t('empty.noDisputes')} /> : (
            <div className="mt-4 space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{d.reason}</p>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{t(`common.${d.status}`)}</span>
                  </div>
                  {d.description && <p className="mt-1 text-sm text-slate-500">{d.description}</p>}
                  {d.reasons && d.reasons.length > 0 && <p className="mt-2 text-xs text-slate-500">{isBn ? 'ক্লায়েন্টের কারণ' : 'Client reasons'}: {d.reasons.join(', ')}</p>}
                  {d.lawyer_complaint && (
                    <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{isBn ? 'আইনজীবীর অভিযোগ' : 'Lawyer complaint'}</p>
                      <p className="mt-1 text-sm text-slate-700">{d.lawyer_complaint}</p>
                    </div>
                  )}
                  {d.admin_verification && <p className="mt-2 text-xs font-semibold text-slate-600">{isBn ? 'যাচাইয়ের সিদ্ধান্ত' : 'Verification decision'}: {d.admin_verification}</p>}
                  {(d.status === 'open' || d.status === 'under_review') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.lawyer_complaint ? <>
                        <button onClick={() => verifyComplaint(d, 'verified')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">{isBn ? 'অভিযোগ যাচাই করুন' : 'Verify complaint'}</button>
                        <button onClick={() => verifyComplaint(d, 'rejected')} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">{isBn ? 'অভিযোগ প্রত্যাখ্যান করুন' : 'Reject complaint'}</button>
                      </> : <>
                        <button onClick={() => resolveDispute(d.id, 'resolved')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">{t('admin.resolveDispute')}</button>
                        <button onClick={() => resolveDispute(d.id, 'rejected')} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">{t('admin.rejectDispute')}</button>
                      </>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'reviews' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.reviews')}</h2>
          <p className="mt-4 text-sm text-slate-500">{t('empty.noReviews')}</p>
        </div>
      )}

      {active === 'ai' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t('admin.aiQueries')} value="1,247" icon={Bot} color="emerald" />
            <StatCard label={t('admin.aiTokens')} value="89K" icon={Bot} color="blue" />
            <StatCard label={t('admin.aiAvgResponse')} value="1.2s" icon={Bot} color="teal" />
            <StatCard label={t('admin.aiFlagged')} value="3" icon={Bot} color="rose" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('admin.aiUsage')}</h2>
            <p className="mt-4 text-sm text-slate-500">{t('common.comingSoon')}</p>
          </div>
        </div>
      )}

      {active === 'reports' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.reports')}</h2>
          <button className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <BarChart3 className="h-4 w-4" /> {t('admin.exportReport')}
          </button>
        </div>
      )}

      {active === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.auditLogs')}</h2>
          {auditLogs.length === 0 ? <EmptyState message={t('empty.noData')} /> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                    <th className="pb-2">{t('admin.auditAction')}</th>
                    <th className="pb-2">{t('admin.auditEntity')}</th>
                    <th className="pb-2">{t('admin.auditTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-50">
                      <td className="py-3 font-medium text-slate-900">{log.action}</td>
                      <td className="py-3 text-slate-600">{log.entity_type ?? '-'}</td>
                      <td className="py-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {active === 'roles' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.rolesPermissions')}</h2>
          <div className="mt-4 space-y-2">
            {['public', 'client', 'lawyer', 'admin'].map((r) => (
              <div key={r} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                <span className="font-medium text-slate-900">{t(`common.${r === 'public' ? 'publicUser' : r}`)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{users.filter((u) => u.role === r).length} {t('admin.users')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active === 'settings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('admin.systemSettings')}</h2>
          {settingsSaved && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" /> {t('admin.settingsSaved')}
            </div>
          )}
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.settingSiteName')}</label>
              <input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.settingCommissionRate')} (%)</label>
              <input type="number" value={settings.commissionRate} onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.settingMinPayout')}</label>
              <input type="number" value={settings.minPayout} onChange={(e) => setSettings({ ...settings, minPayout: Number(e.target.value) })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{t('admin.settingAiEnabled')}</span>
              <button onClick={() => setSettings({ ...settings, aiEnabled: !settings.aiEnabled })} className={`relative h-6 w-11 rounded-full transition ${settings.aiEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${settings.aiEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{t('admin.settingSignupEnabled')}</span>
              <button onClick={() => setSettings({ ...settings, signup: !settings.signup })} className={`relative h-6 w-11 rounded-full transition ${settings.signup ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${settings.signup ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{t('admin.settingMaintenance')}</span>
              <button onClick={() => setSettings({ ...settings, maintenance: !settings.maintenance })} className={`relative h-6 w-11 rounded-full transition ${settings.maintenance ? 'bg-rose-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${settings.maintenance ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <button onClick={saveSettings} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">{t('admin.saveSettings')}</button>
          </div>
        </div>
      )}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{editor.kind==='user' ? (isBn?'ব্যবহারকারী সম্পাদনা':'Edit User') : (isBn?'আইনজীবীর তথ্য সম্পাদনা':'Edit Lawyer')}</h3><button onClick={()=>setEditor(null)}><X className="h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm"><span className="mb-1 block font-medium">{t('common.name')}</span><input value={editor.data.full_name||''} onChange={e=>setEditor({...editor,data:{...editor.data,full_name:e.target.value}})} className="w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium">{t('common.email')}</span><input value={editor.data.email||''} onChange={e=>setEditor({...editor,data:{...editor.data,email:e.target.value}})} className="w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-sm"><span className="mb-1 block font-medium">{t('common.phone')}</span><input value={editor.data.phone||''} onChange={e=>setEditor({...editor,data:{...editor.data,phone:e.target.value}})} className="w-full rounded-xl border px-3 py-2" /></label>
              {editor.kind==='user' && <label className="text-sm"><span className="mb-1 block font-medium">{t('common.role')}</span><select value={editor.data.role||'client'} onChange={e=>setEditor({...editor,data:{...editor.data,role:e.target.value}})} className="w-full rounded-xl border px-3 py-2"><option value="client">Client</option><option value="lawyer">Lawyer</option><option value="admin">Admin</option></select></label>}
              {editor.kind==='lawyer' && <>
                <label className="text-sm"><span className="mb-1 block font-medium">{t('common.licenseNumber')}</span><input value={editor.data.license_number||''} onChange={e=>setEditor({...editor,data:{...editor.data,license_number:e.target.value}})} className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium">{t('common.barAssociation')}</span><input value={editor.data.bar_association||''} onChange={e=>setEditor({...editor,data:{...editor.data,bar_association:e.target.value}})} className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium">{t('common.city')}</span><input value={editor.data.city||''} onChange={e=>setEditor({...editor,data:{...editor.data,city:e.target.value}})} className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium">{t('common.yearsExperience')}</span><input type="number" value={editor.data.experience_years||0} onChange={e=>setEditor({...editor,data:{...editor.data,experience_years:Number(e.target.value)}})} className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium">{t('common.consultationFee')}</span><input type="number" value={editor.data.consultation_fee||0} onChange={e=>setEditor({...editor,data:{...editor.data,consultation_fee:Number(e.target.value)}})} className="w-full rounded-xl border px-3 py-2" /></label>
                <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">{t('common.bio')}</span><textarea value={editor.data.bio||''} onChange={e=>setEditor({...editor,data:{...editor.data,bio:e.target.value}})} className="min-h-24 w-full rounded-xl border px-3 py-2" /></label>
              </>}
            </div>
            <div className="mt-6 flex justify-end gap-3"><button onClick={()=>setEditor(null)} className="rounded-xl border px-4 py-2 text-sm">{t('common.cancel')}</button><button disabled={saving} onClick={saveEditor} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving&&<Loader2 className="h-4 w-4 animate-spin" />}{isBn?'সংরক্ষণ করুন':'Save Changes'}</button></div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
