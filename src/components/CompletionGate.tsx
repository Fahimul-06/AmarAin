import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole, Wallet, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/supabase';
import i18n from '@/lib/i18n';

type PendingCompletion = { id:string; topic?:string|null; price?:number; lawyer_amount?:number; lawyer?:{full_name?:string}|null };
const reasons = [
  ['consultation_not_held','The consultation did not take place','পরামর্শ অনুষ্ঠিত হয়নি'],
  ['lawyer_left_early','The lawyer ended the consultation too early','আইনজীবী খুব তাড়াতাড়ি পরামর্শ শেষ করেছেন'],
  ['issue_not_addressed','My legal issue was not addressed','আমার আইনি সমস্যার সমাধান/আলোচনা করা হয়নি'],
  ['technical_failure','Audio/video or technical problem prevented the service','অডিও/ভিডিও বা প্রযুক্তিগত সমস্যার কারণে সেবা পাওয়া যায়নি'],
  ['lawyer_absent','The lawyer did not attend','আইনজীবী উপস্থিত ছিলেন না'],
  ['other','Other reason','অন্যান্য কারণ'],
] as const;

export default function CompletionGate({children}:{children:React.ReactNode}) {
  const {profile,loading:authLoading}=useAuth();
  const [pending,setPending]=useState<PendingCompletion[]>([]); const [checking,setChecking]=useState(true); const [submitting,setSubmitting]=useState(false); const [error,setError]=useState('');
  const [showReject,setShowReject]=useState(false); const [selected,setSelected]=useState<string[]>([]); const [description,setDescription]=useState('');
  const isBangla=i18n.language==='bn';
  const loadPending=useCallback(async()=>{ if(!profile||profile.role!=='client'){setPending([]);setChecking(false);return;} try{const result=await apiRequest('/consultations/pending-client-completion');setPending(result.data??[]);setError('');}catch(err:any){setError(err.message||'Unable to check consultation status.');}finally{setChecking(false);}},[profile]);
  useEffect(()=>{loadPending();if(!profile||profile.role!=='client')return;const interval=window.setInterval(loadPending,3000);return()=>window.clearInterval(interval);},[loadPending,profile]);
  useEffect(()=>{const fn=()=>{if(document.visibilityState==='visible')loadPending();};document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},[loadPending]);
  const complete=async()=>{const item=pending[0];if(!item)return;setSubmitting(true);setError('');try{await apiRequest(`/consultations/${item.id}/client-complete`,{method:'POST'});setShowReject(false);await loadPending();}catch(e:any){setError(e.message||'Completion confirmation failed.');}finally{setSubmitting(false);}};
  const notComplete=async()=>{const item=pending[0];if(!item)return;if(!selected.length){setError(isBangla?'অন্তত একটি কারণ নির্বাচন করুন।':'Select at least one reason.');return;}setSubmitting(true);setError('');try{await apiRequest(`/consultations/${item.id}/client-not-complete`,{method:'POST',body:JSON.stringify({reasons:selected,description})});setShowReject(false);setSelected([]);setDescription('');await loadPending();}catch(e:any){setError(e.message||'Report submission failed.');}finally{setSubmitting(false);}};
  if(authLoading||checking)return <div className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"/></div>;
  if(!profile||profile.role!=='client'||pending.length===0)return <>{children}</>;
  const item=pending[0];const amount=Number(item.lawyer_amount??item.price??0);
  return <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl sm:p-8">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700"><LockKeyhole className="h-8 w-8"/></div>
    <h1 className="mt-5 text-center text-2xl font-bold text-slate-900">{isBangla?'পরামর্শের অবস্থা নিশ্চিত করুন':'Confirm consultation status'}</h1>
    <p className="mt-3 text-center text-sm leading-6 text-slate-600">{isBangla?'আইনজীবী পরামর্শটি সম্পন্ন হিসেবে চিহ্নিত করেছেন। সম্পন্ন হয়েছে অথবা সম্পন্ন হয়নি—যেকোনো একটি নির্বাচন ও জমা দেওয়ার পর আপনি আবার ওয়েবসাইট ব্যবহার করতে পারবেন।':'The lawyer marked this consultation as completed. Confirm completion or report that it was not completed. After submitting either response, you can use the website normally.'}</p>
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{item.topic||(isBangla?'আইনি পরামর্শ':'Legal consultation')}</p><p className="mt-1 text-sm text-slate-500">{isBangla?'আইনজীবী':'Lawyer'}: {item.lawyer?.full_name||(isBangla?'নির্ধারিত আইনজীবী':'Assigned lawyer')}</p><div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2"><span className="flex items-center gap-2 text-sm text-slate-600"><Wallet className="h-4 w-4"/>{isBangla?'সম্পন্ন হলে আইনজীবী পাবেন':'Released to lawyer if completed'}</span><span className="font-bold text-emerald-700">৳{amount}</span></div></div>
    {showReject&&<div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/50 p-4"><p className="font-semibold text-slate-900">{isBangla?'কেন সম্পন্ন হয়নি?':'Why was it not completed?'}</p><div className="mt-3 space-y-2">{reasons.map(([value,en,bn])=><label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 text-sm text-slate-700"><input type="checkbox" className="mt-0.5" checked={selected.includes(value)} onChange={e=>setSelected(x=>e.target.checked?[...x,value]:x.filter(v=>v!==value))}/><span>{isBangla?bn:en}</span></label>)}</div><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder={isBangla?'অতিরিক্ত বিবরণ লিখুন (ঐচ্ছিক)':'Add details (optional)'}/><button disabled={submitting} onClick={notComplete} className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{submitting?(isBangla?'জমা দেওয়া হচ্ছে...':'Submitting...'):(isBangla?'কারণ জমা দিন':'Submit reasons')}</button></div>}
    {error&&<p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
    {!showReject&&<div className="mt-6 grid gap-3 sm:grid-cols-2"><button disabled={submitting} onClick={complete} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="h-5 w-5"/>{isBangla?'সম্পন্ন হয়েছে':'Completed'}</button><button disabled={submitting} onClick={()=>{setShowReject(true);setError('');}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 font-semibold text-rose-700 hover:bg-rose-100"><XCircle className="h-5 w-5"/>{isBangla?'সম্পন্ন হয়নি':'Not completed'}</button></div>}
    {showReject&&<button onClick={()=>setShowReject(false)} className="mt-3 w-full text-sm font-medium text-slate-500 hover:text-slate-700">{isBangla?'পেছনে যান':'Go back'}</button>}
  </div></div>;
}
