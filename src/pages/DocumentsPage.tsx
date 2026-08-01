import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, Plus, Loader2, Download, Check, MessageSquare, BadgeCheck, Star,
  Gavel, XCircle, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { DocumentRequest, DocumentBid, Profile, LawyerProfile } from '@/lib/supabase';
import { LoadingSpinner, EmptyState } from '@/components/LawyerCard';
import { ChatDrawer } from '@/components/ChatDrawer';
import i18n from '@/lib/i18n';

const docTypes = ['contract', 'notice', 'affidavit', 'will', 'petition', 'other'] as const;

type BidWithLawyer = DocumentBid & {
  lawyer: Profile;
  lawyer_profile: LawyerProfile | null;
};

export default function DocumentsPage() {
  const { t } = useTranslation();
  const isBn = i18n.language === 'bn';
  const { profile } = useAuth();
  const [requests, setRequests] = useState<(DocumentRequest & { bids?: BidWithLawyer[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState<string>('contract');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [chatBid, setChatBid] = useState<{ requestId: string; lawyer: Profile; title: string } | null>(null);

  const loadRequests = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    const { data } = await supabase
      .from('document_requests')
      .select('*')
      .eq('client_id', profile.id)
      .order('created_at', { ascending: false });
    const reqs = (data as DocumentRequest[]) ?? [];
    const withBids = await Promise.all(
      reqs.map(async (r) => {
        const { data: bids } = await supabase
          .from('document_bids')
          .select('*')
          .eq('document_request_id', r.id)
          .order('created_at', { ascending: false });
        const bidList = (bids as DocumentBid[]) ?? [];
        const lawyerIds = Array.from(new Set(bidList.map((b) => b.lawyer_id)));
        const lawyerMap: Record<string, Profile> = {};
        const profileMap: Record<string, LawyerProfile> = {};
        if (lawyerIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', lawyerIds);
          (profiles as Profile[])?.forEach((p) => { lawyerMap[p.id] = p; });
          const { data: lps } = await supabase.from('lawyer_profiles').select('*').in('user_id', lawyerIds);
          (lps as LawyerProfile[])?.forEach((lp) => { profileMap[lp.user_id] = lp; });
        }
        return {
          ...r,
          bids: bidList.map((b) => ({
            ...b,
            lawyer: lawyerMap[b.lawyer_id],
            lawyer_profile: profileMap[b.lawyer_id] ?? null,
          })),
        };
      })
    );
    setRequests(withBids);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Realtime subscription for new bids
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('document-bids-client')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_bids' }, () => loadRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !title.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('document_requests')
      .insert({
        client_id: profile.id,
        document_type: docType,
        title: title.trim(),
        description: description.trim() || null,
        status: 'pending',
      })
      .select('*')
      .maybeSingle();
    if (data) setRequests((r) => [{ ...(data as DocumentRequest), bids: [] }, ...r]);
    setSubmitting(false);
    setShowForm(false);
    setTitle('');
    setDescription('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const selectLawyer = async (requestId: string, bid: BidWithLawyer) => {
    // Mark the chosen bid as selected
    await supabase
      .from('document_bids')
      .update({ status: 'selected', updated_at: new Date().toISOString() })
      .eq('id', bid.id);
    // Reject all other active bids on this request
    await supabase
      .from('document_bids')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('document_request_id', requestId)
      .eq('status', 'active');
    // Assign the lawyer to the document request
    await supabase
      .from('document_requests')
      .update({ lawyer_id: bid.lawyer_id, status: 'assigned', price: bid.amount, updated_at: new Date().toISOString() })
      .eq('id', requestId);
    // Notify the selected lawyer
    await supabase.from('notifications').insert({
      user_id: bid.lawyer_id,
      type: 'document',
      title_en: 'You were selected for a document request',
      title_bn: 'আপনি একটি নথি অনুরোধের জন্য নির্বাচিত হয়েছেন',
      body_en: `You were selected for "${requests.find((r) => r.id === requestId)?.title ?? ''}"`,
      body_bn: `আপনি "${requests.find((r) => r.id === requestId)?.title ?? ''}" এর জন্য নির্বাচিত হয়েছেন`,
    });
    loadRequests();
  };

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-slate-600">{t('auth.loginTitle')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('documents.title')}</h1>
          <p className="mt-2 max-w-2xl text-emerald-50">{t('documents.subtitle')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check className="h-4 w-4" /> {t('documents.requestSubmitted')}
          </div>
        )}

        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          {showForm ? <Loader2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {t('documents.requestDocument')}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('documents.documentType')}</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400"
                >
                  {docTypes.map((dt) => (
                    <option key={dt} value={dt}>{t(`documents.type${dt.charAt(0).toUpperCase() + dt.slice(1)}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('documents.documentTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('documents.documentDescription')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder={t('documents.descriptionPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('documents.submitRequest')}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : requests.length === 0 ? (
          <EmptyState message={t('documents.noRequests')} />
        ) : (
          <div className="space-y-4">
            {requests.map((r) => {
              const isOpen = r.status === 'pending';
              const isAssigned = r.status === 'assigned' || r.status === 'drafting' || r.status === 'completed';
              const selectedBid = r.bids?.find((b) => b.status === 'selected');
              const bidCount = r.bids?.length ?? 0;
              return (
                <div key={r.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-4 p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{r.title}</h3>
                      <p className="text-sm text-slate-500">{t(`documents.type${r.document_type.charAt(0).toUpperCase() + r.document_type.slice(1)}`)}</p>
                      {r.description && <p className="mt-1 text-sm text-slate-600 line-clamp-1">{r.description}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {t(`documents.status${r.status.charAt(0).toUpperCase() + r.status.slice(1)}`)}
                      </span>
                      {r.file_url && r.status === 'completed' && (
                        <a href={r.file_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700">
                          <Download className="h-3.5 w-3.5" /> {t('documents.downloadDocument')}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Bids section */}
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-slate-700">
                          {t('documents.viewBids', { count: bidCount })}
                        </span>
                      </div>
                      {bidCount > 0 && (
                        <button
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          {expanded === r.id ? t('common.close') : t('documents.bidTitle')}
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <p className="mt-2 text-xs text-slate-500">{t('documents.selectPrompt')}</p>
                    )}

                    {expanded === r.id && (
                      <div className="mt-3 space-y-3">
                        {bidCount === 0 ? (
                          <p className="text-sm text-slate-500">{t('documents.noBids')}</p>
                        ) : (
                          r.bids!.map((b) => {
                            const isSelected = b.status === 'selected';
                            const isRejected = b.status === 'rejected';
                            const canSelect = isOpen && b.status === 'active';
                            return (
                              <div key={b.id} className={`rounded-xl border p-4 ${
                                isSelected ? 'border-emerald-300 bg-emerald-50' :
                                isRejected ? 'border-slate-200 bg-slate-100 opacity-70' :
                                'border-slate-200 bg-white'
                              }`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    {b.lawyer?.avatar_url ? (
                                      <img src={b.lawyer.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                                    ) : (
                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-700">
                                        {(b.lawyer?.full_name ?? '?').charAt(0)}
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="font-medium text-slate-900">{b.lawyer?.full_name ?? '—'}</p>
                                        {b.lawyer_profile?.verification_status === 'verified' && (
                                          <BadgeCheck className="h-4 w-4 text-emerald-500" />
                                        )}
                                      </div>
                                      {b.lawyer_profile && (
                                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                          <span className="flex items-center gap-0.5">
                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                            {b.lawyer_profile.rating_avg.toFixed(1)}
                                          </span>
                                          <span>{b.lawyer_profile.experience_years}y exp</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-emerald-600">{t('common.currency')}{b.amount}</p>
                                    {isSelected && (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('documents.selected')}
                                      </span>
                                    )}
                                    {isRejected && (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                                        <XCircle className="h-3.5 w-3.5" /> {t('documents.rejected')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {b.comment && (
                                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{b.comment}</p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {canSelect && (
                                    <button
                                      onClick={() => selectLawyer(r.id, b)}
                                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                    >
                                      {t('documents.selectLawyer')}
                                    </button>
                                  )}
                                  {(isSelected || (isAssigned && b.status === 'active')) && (
                                    <button
                                      onClick={() => setChatBid({ requestId: r.id, lawyer: b.lawyer, title: r.title })}
                                      className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" /> {t('documents.chatWithLawyer')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ChatDrawer
        open={!!chatBid}
        onClose={() => setChatBid(null)}
        documentRequestId={chatBid?.requestId ?? ''}
        otherUser={chatBid?.lawyer ?? null}
        documentTitle={chatBid?.title ?? ''}
      />
    </div>
  );
}
