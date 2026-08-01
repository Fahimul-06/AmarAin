import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, FileText, Wallet, Star, AlertTriangle, Plus, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Consultation, DocumentRequest, Transaction, Dispute } from '@/lib/supabase';
import { DashboardShell, StatCard, clientNav } from '@/components/DashboardShell';
import { LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import i18n from '@/lib/i18n';

export default function ClientDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [active, setActive] = useState('overview');
  const [bookings, setBookings] = useState<Consultation[]>([]);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    (async () => {
      const [bk, dr, tx, dp, w] = await Promise.all([
        supabase.from('consultations').select('*').eq('client_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('document_requests').select('*').eq('client_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('disputes').select('*').eq('raised_by', profile.id).order('created_at', { ascending: false }),
        supabase.from('wallets').select('balance').eq('user_id', profile.id).maybeSingle(),
      ]);
      setBookings((bk.data as Consultation[]) ?? []);
      setDocuments((dr.data as DocumentRequest[]) ?? []);
      setTransactions((tx.data as Transaction[]) ?? []);
      setDisputes((dp.data as Dispute[]) ?? []);
      setWalletBalance(w.data?.balance ?? 0);
      setLoading(false);
    })();
  }, [profile]);

  if (!profile) return <div className="py-20 text-center text-slate-500">{t('auth.loginTitle')}</div>;
  if (loading) return <LoadingSpinner />;

  const activeBookings = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const totalSpent = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <DashboardShell
      title={t('clientDashboard.welcome', { name: profile.full_name })}
      navItems={clientNav(t)}
      activeKey={active}
      onNavigate={setActive}
    >
      {active === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t('clientDashboard.statBookings')} value={bookings.length} icon={Calendar} color="emerald" />
            <StatCard label={t('clientDashboard.statActive')} value={activeBookings.length} icon={Calendar} color="blue" />
            <StatCard label={t('clientDashboard.statCompleted')} value={completedBookings.length} icon={Calendar} color="teal" />
            <StatCard label={t('clientDashboard.statSpent')} value={`${t('common.currency')}${totalSpent}`} icon={Wallet} color="amber" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">{t('clientDashboard.upcomingBookings')}</h2>
              <Link to="/lawyers" className="text-sm text-emerald-600 hover:text-emerald-700">{t('clientDashboard.bookALawyer')}</Link>
            </div>
            {activeBookings.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('clientDashboard.noBookings')}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {activeBookings.slice(0, 5).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{b.topic ?? t('common.consultation')}</p>
                      <p className="text-xs text-slate-500">{t(`booking.type${b.consultation_type.charAt(0).toUpperCase() + b.consultation_type.slice(1)}`)} · {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : ''}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{t(`common.${b.status}`)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('clientDashboard.recentTransactions')}</h2>
            {transactions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('clientDashboard.noTransactions')}</p>
            ) : (
              <div className="mt-4 space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                    <div>
                      <p className="text-sm text-slate-700">{tx.description ?? t(`common.${tx.type}`)}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'debit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.type === 'debit' ? '-' : '+'}{t('common.currency')}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {active === 'bookings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('clientDashboard.myBookings')}</h2>
          {bookings.length === 0 ? (
            <EmptyState message={t('clientDashboard.noBookings')} />
          ) : (
            <div className="mt-4 space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{b.topic ?? t('common.consultation')}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{t(`common.${b.status}`)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{t(`booking.type${b.consultation_type.charAt(0).toUpperCase() + b.consultation_type.slice(1)}`)} · {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : ''}</p>
                  <p className="mt-1 text-sm text-emerald-600">{t('common.currency')}{b.price}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'documents' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t('clientDashboard.myDocuments')}</h2>
            <Link to="/documents" className="text-sm text-emerald-600 hover:text-emerald-700"><Plus className="inline h-4 w-4" /> {t('documents.requestDocument')}</Link>
          </div>
          {documents.length === 0 ? (
            <EmptyState message={t('documents.noRequests')} />
          ) : (
            <div className="mt-4 space-y-3">
              {documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{d.title}</p>
                    <p className="text-xs text-slate-500">{t(`documents.type${d.document_type.charAt(0).toUpperCase() + d.document_type.slice(1)}`)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{t(`documents.status${d.status.charAt(0).toUpperCase() + d.status.slice(1)}`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'wallet' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-sm">
            <p className="text-sm text-emerald-50">{t('wallet.balance')}</p>
            <p className="mt-2 text-4xl font-bold">{t('common.currency')}{walletBalance}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{t('wallet.transactionHistory')}</h2>
            {transactions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{t('wallet.noTransactions')}</p>
            ) : (
              <div className="mt-4 space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
                    <div>
                      <p className="text-sm text-slate-700">{tx.description ?? t(`common.${tx.type}`)}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'debit' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.type === 'debit' ? '-' : '+'}{t('common.currency')}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {active === 'reviews' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('clientDashboard.myReviews')}</h2>
          <p className="mt-4 text-sm text-slate-500">{t('empty.noReviews')}</p>
        </div>
      )}

      {active === 'disputes' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('dispute.title')}</h2>
          {disputes.length === 0 ? (
            <EmptyState message={t('clientDashboard.noDisputes')} />
          ) : (
            <div className="mt-4 space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-100 p-4">
                  <p className="font-medium text-slate-900">{d.reason}</p>
                  <p className="mt-1 text-sm text-slate-500">{d.description}</p>
                  <span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{t(`dispute.status`)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {active === 'settings' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">{t('common.settings')}</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.fullName')}</label>
              <input defaultValue={profile.full_name} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.phone')}</label>
              <input defaultValue={profile.phone ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
            </div>
            <button className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">{t('common.save')}</button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
