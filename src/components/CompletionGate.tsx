import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/supabase';
import i18n from '@/lib/i18n';

type PendingCompletion = {
  id: string;
  topic?: string | null;
  price?: number;
  lawyer_amount?: number;
  lawyer?: { full_name?: string } | null;
};

export default function CompletionGate({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const [pending, setPending] = useState<PendingCompletion[]>([]);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isBangla = i18n.language === 'bn';

  const loadPending = useCallback(async () => {
    if (!profile || profile.role !== 'client') {
      setPending([]);
      setChecking(false);
      return;
    }
    try {
      const result = await apiRequest('/consultations/pending-client-completion');
      setPending(result.data ?? []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to check consultation status.');
    } finally {
      setChecking(false);
    }
  }, [profile]);

  useEffect(() => {
    loadPending();
    if (!profile || profile.role !== 'client') return;
    const interval = window.setInterval(loadPending, 3000);
    return () => window.clearInterval(interval);
  }, [loadPending, profile]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadPending();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadPending]);

  const confirmCompletion = async () => {
    const item = pending[0];
    if (!item) return;
    setSubmitting(true);
    setError('');
    try {
      await apiRequest(`/consultations/${item.id}/client-complete`, { method: 'POST' });
      await loadPending();
    } catch (err: any) {
      setError(err.message || 'Completion confirmation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checking) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>;
  if (!profile || profile.role !== 'client' || pending.length === 0) return <>{children}</>;

  const item = pending[0];
  const amount = Number(item.lawyer_amount ?? item.price ?? 0);

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-slate-900">
          {isBangla ? 'পরামর্শ সম্পন্ন হওয়া নিশ্চিত করুন' : 'Confirm consultation completion'}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-600">
          {isBangla
            ? 'আইনজীবী পরামর্শটি সম্পন্ন হিসেবে চিহ্নিত করেছেন। আপনি সম্পন্ন হওয়া নিশ্চিত না করা পর্যন্ত অন্য কোনো পৃষ্ঠা ব্যবহার করতে পারবেন না।'
            : 'The lawyer marked this consultation as completed. You cannot use or move to another page until you confirm completion.'}
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{item.topic || (isBangla ? 'আইনি পরামর্শ' : 'Legal consultation')}</p>
          <p className="mt-1 text-sm text-slate-500">
            {isBangla ? 'আইনজীবী' : 'Lawyer'}: {item.lawyer?.full_name || (isBangla ? 'নির্ধারিত আইনজীবী' : 'Assigned lawyer')}
          </p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-slate-600"><Wallet className="h-4 w-4" />{isBangla ? 'আইনজীবীর অ্যাকাউন্টে ছাড় হবে' : 'Amount released to lawyer'}</span>
            <span className="font-bold text-emerald-700">৳{amount}</span>
          </div>
        </div>

        {pending.length > 1 && (
          <p className="mt-3 text-center text-xs text-amber-700">
            {isBangla ? `আরও ${pending.length - 1}টি পরামর্শ নিশ্চিত করা বাকি আছে।` : `${pending.length - 1} more consultation(s) also require confirmation.`}
          </p>
        )}

        {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <button
          type="button"
          onClick={confirmCompletion}
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-5 w-5" />
          {submitting
            ? (isBangla ? 'নিশ্চিত করা হচ্ছে...' : 'Confirming...')
            : (isBangla ? 'হ্যাঁ, পরামর্শ সম্পন্ন হয়েছে' : 'Yes, the consultation is completed')}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">
          {isBangla ? 'নিশ্চিত করার পর সেবার অর্থ আইনজীবীর অ্যাকাউন্টে স্থানান্তর হবে।' : 'After confirmation, the service amount will be transferred to the lawyer account.'}
        </p>
      </div>
    </div>
  );
}
