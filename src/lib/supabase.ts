const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'amar_ain_access_token';
const SESSION_EVENT = 'amar-ain-auth-change';

function token() { return localStorage.getItem(TOKEN_KEY); }
export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers: Record<string,string> = { 'Content-Type':'application/json', ...(options.headers as Record<string,string> || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || 'Request failed');
  return body;
}

class QueryBuilder {
  private filters: any[] = [];
  private orderBy: any = null;
  private maxRows: number | null = null;
  private mode: 'query'|'insert'|'update'|'delete' = 'query';
  private payload: any = null;
  private returnRows = false;
  private singleRow = false;
  private selectText = '*';
  constructor(private table: string) {}
  select(columns='*') { this.selectText=columns; this.returnRows=true; return this; }
  insert(rows:any) { this.mode='insert'; this.payload=rows; return this; }
  update(values:any) { this.mode='update'; this.payload=values; return this; }
  delete() { this.mode='delete'; return this; }
  eq(field:string,value:any){this.filters.push({op:'eq',field,value});return this;}
  neq(field:string,value:any){this.filters.push({op:'neq',field,value});return this;}
  in(field:string,value:any[]){this.filters.push({op:'in',field,value});return this;}
  gte(field:string,value:any){this.filters.push({op:'gte',field,value});return this;}
  lte(field:string,value:any){this.filters.push({op:'lte',field,value});return this;}
  order(field:string,opts:{ascending?:boolean}={}){this.orderBy={field,ascending:opts.ascending!==false};return this;}
  limit(n:number){this.maxRows=n;return this;}
  maybeSingle(){this.singleRow=true;return this.execute();}
  single(){this.singleRow=true;return this.execute();}
  then(resolve:any,reject:any){return this.execute().then(resolve,reject);}
  private async execute(){
    try {
      if(this.mode==='query') return await apiRequest(`/data/${this.table}/query`,{method:'POST',body:JSON.stringify({filters:this.filters,order:this.orderBy,limit:this.maxRows,single:this.singleRow,select:this.selectText})});
      if(this.mode==='insert') return await apiRequest(`/data/${this.table}/insert`,{method:'POST',body:JSON.stringify({rows:this.payload,returning:this.returnRows})});
      if(this.mode==='update') return await apiRequest(`/data/${this.table}/update`,{method:'POST',body:JSON.stringify({filters:this.filters,values:this.payload,returning:this.returnRows})});
      return await apiRequest(`/data/${this.table}/delete`,{method:'POST',body:JSON.stringify({filters:this.filters})});
    } catch(error:any) { return {data:null,error:{message:error.message}}; }
  }
}

const authListeners = new Set<(event:string,session:any)=>void>();
async function currentSession(){
  if(!token()) return null;
  try { const data=await apiRequest('/auth/me'); return {access_token:token(),user:{...data.user,user_metadata:{full_name:data.profile?.full_name,phone:data.profile?.phone,role:data.profile?.role,preferred_language:data.profile?.preferred_language}}}; } catch { localStorage.removeItem(TOKEN_KEY); return null; }
}
function notify(event:string,session:any){authListeners.forEach(fn=>fn(event,session));window.dispatchEvent(new CustomEvent(SESSION_EVENT));}

export const supabase = {
  from(table:string){ return new QueryBuilder(table); },
  auth: {
    async getSession(){ return {data:{session:await currentSession()},error:null}; },
    onAuthStateChange(callback:(event:string,session:any)=>void){ authListeners.add(callback); return {data:{subscription:{unsubscribe:()=>authListeners.delete(callback)}}}; },
    async signInWithPassword({email,password}:{email:string,password:string}){ try{const r=await apiRequest('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem(TOKEN_KEY,r.access_token);const session={access_token:r.access_token,user:{...r.user,user_metadata:r.profile}};notify('SIGNED_IN',session);return {data:{session,user:session.user},error:null};}catch(e:any){return {data:{session:null,user:null},error:{message:e.message}};} },
    async signUp({email,password,options}:{email:string,password:string,options?:any}){ try{const m=options?.data||{};const r=await apiRequest('/auth/register',{method:'POST',body:JSON.stringify({email,password,...m})});localStorage.setItem(TOKEN_KEY,r.access_token);const session={access_token:r.access_token,user:{...r.user,user_metadata:r.profile}};notify('SIGNED_IN',session);return {data:{session,user:session.user},error:null};}catch(e:any){return {data:{session:null,user:null},error:{message:e.message}};} },
    async signOut(){localStorage.removeItem(TOKEN_KEY);notify('SIGNED_OUT',null);return {error:null};},
    async updateUser({password}:{password:string}){try{await apiRequest('/auth/change-password',{method:'POST',body:JSON.stringify({password})});return {data:{},error:null};}catch(e:any){return {data:null,error:{message:e.message}};}},
  },
  channel(_name:string){const c:any={on:()=>c,subscribe:()=>c,unsubscribe:()=>{}};return c;},
  removeChannel(channel:any){channel?.unsubscribe?.();},
  functions:{async invoke(_name:string,{body}:{body:any}){try{return {data:(await apiRequest('/ai-assistant',{method:'POST',body:JSON.stringify(body)})).data,error:null};}catch(e:any){return {data:null,error:{message:e.message}};}}}
};

export type Role = 'public' | 'client' | 'lawyer' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  preferred_language: 'en' | 'bn';
  created_at: string;
  updated_at: string;
}

export interface LawyerProfile {
  id: string;
  user_id: string;
  license_number: string | null;
  bar_association: string | null;
  bio: string | null;
  experience_years: number;
  hourly_rate: number;
  consultation_fee: number;
  city: string | null;
  languages: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface PracticeArea {
  id: string;
  name_en: string;
  name_bn: string;
  icon: string | null;
}

export interface Consultation {
  id: string;
  client_id: string;
  lawyer_id: string;
  consultation_type: 'chat' | 'audio' | 'video' | 'phone' | 'in_person';
  status: 'pending' | 'confirmed' | 'awaiting_client_completion' | 'completed' | 'cancelled' | 'disputed';
  lawyer_amount?: number;
  platform_fee?: number;
  payment_status?: 'pending' | 'held' | 'released' | 'refunded';
  lawyer_completed_at?: string | null;
  client_completed_at?: string | null;
  payment_released_at?: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  price: number;
  topic: string | null;
  description: string | null;
  meeting_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  consultation_id: string | null;
  document_request_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Review {
  id: string;
  consultation_id: string | null;
  client_id: string;
  lawyer_id: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  title_en: string;
  title_bn: string;
  summary_en: string | null;
  summary_bn: string | null;
  body_en: string;
  body_bn: string;
  category: string | null;
  cover_image_url: string | null;
  author_id: string | null;
  status: 'draft' | 'published' | 'archived';
  views: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequest {
  id: string;
  client_id: string;
  lawyer_id: string | null;
  document_type: string;
  title: string;
  description: string | null;
  status: 'pending' | 'assigned' | 'drafting' | 'completed' | 'cancelled';
  price: number;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'commission' | 'payout' | 'refund' | 'deposit';
  amount: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  payment_method: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  consultation_id: string | null;
  raised_by: string;
  against_user_id: string;
  reason: string;
  description: string | null;
  status: 'open' | 'under_review' | 'resolved' | 'rejected';
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyRequest {
  id: string;
  client_id: string;
  lawyer_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  topic: string;
  consultation_type: 'chat' | 'audio' | 'video' | 'phone';
  price: number;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentBid {
  id: string;
  document_request_id: string;
  lawyer_id: string;
  amount: number;
  comment: string | null;
  status: 'active' | 'rejected' | 'selected';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title_en: string;
  title_bn: string;
  body_en: string | null;
  body_bn: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminUser extends Profile {
  email: string;
  wallet_balance: number;
  total_spent: number;
  total_recharged: number;
}

export interface AdminLawyer extends LawyerProfile {
  profiles: Profile & { email: string };
  wallet_balance: number;
  total_income: number;
  total_payouts: number;
  total_commission: number;
}

export const adminApi = {
  async users(): Promise<AdminUser[]> {
    const result = await apiRequest('/admin/users');
    return result.data ?? [];
  },
  async updateUser(id: string, values: Partial<AdminUser>) {
    const result = await apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(values) });
    return result.data;
  },
  async lawyers(): Promise<AdminLawyer[]> {
    const result = await apiRequest('/admin/lawyers');
    return result.data ?? [];
  },
  async updateLawyer(id: string, values: Record<string, unknown>) {
    return apiRequest(`/admin/lawyers/${id}`, { method: 'PATCH', body: JSON.stringify(values) });
  },
  async setLawyerVerification(id: string, status: 'pending' | 'verified' | 'rejected', note = '') {
    return apiRequest(`/admin/lawyers/${id}/verification`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
  },
};
