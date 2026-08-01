import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import path from 'node:path';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'node:url';

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: { origin: process.env.CLIENT_URL?.split(',') || true, credentials: true },
});
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-development-secret-at-least-32-characters';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/amar_ain';
app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:process.env.CLIENT_URL?.split(',') || true, credentials:true}));
app.use(express.json({limit:'5mb'}));
app.use(morgan('combined'));

const GenericSchema = new mongoose.Schema({ id:{type:String,unique:true,index:true,default:uuid} },{strict:false,timestamps:{createdAt:'created_at',updatedAt:'updated_at'},versionKey:false});
const models = new Map<string,mongoose.Model<any>>();
function modelFor(table:string){
  const safe = table.replace(/[^a-zA-Z0-9_]/g,'');
  if(!models.has(safe)) models.set(safe,mongoose.model(`T_${safe}`,GenericSchema,safe));
  return models.get(safe)!;
}
const AuthSchema = new mongoose.Schema({id:{type:String,unique:true,default:uuid},email:{type:String,unique:true,sparse:true,index:true},password_hash:String},{timestamps:true,versionKey:false});
const AuthUser = mongoose.model('AuthUser',AuthSchema,'auth_users');

type TokenPayload={sub:string;role?:string};
function tokenFor(id:string,role?:string){return jwt.sign({sub:id,role} satisfies TokenPayload,JWT_SECRET,{expiresIn:'7d'});}
function auth(req:any,_res:any,next:any){
  const h=req.headers.authorization;
  if(h?.startsWith('Bearer ')){try{req.user=jwt.verify(h.slice(7),JWT_SECRET);}catch{}}
  next();
}
app.use(auth);
function requireAuth(req:any,res:any,next:any){if(!req.user?.sub)return res.status(401).json({error:'Authentication required'});next();}
function requireAdmin(req:any,res:any,next:any){if(req.user?.role!=='admin')return res.status(403).json({error:'Admin access required'});next();}

app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'amar-ain-api',time:new Date().toISOString()}));
app.post('/api/auth/register',async(req,res)=>{
  try{
    const {email,password,full_name,phone,role='client',preferred_language='en'}=req.body;
    if(!email||!password||!full_name)return res.status(400).json({error:'email, password and full_name are required'});
    if(await AuthUser.findOne({email:email.toLowerCase()}))return res.status(409).json({error:'Email already registered'});
    const id=uuid(); await AuthUser.create({id,email:email.toLowerCase(),password_hash:await bcrypt.hash(password,12)});
    const allowedRole=role==='lawyer'?'lawyer':'client';
    const profile=await modelFor('profiles').create({id,full_name,phone:phone||null,avatar_url:null,role:allowedRole,preferred_language});
    await modelFor('wallets').create({id:uuid(),user_id:id,balance:0});
    if(allowedRole==='lawyer') await modelFor('lawyer_profiles').create({id:uuid(),user_id:id,experience_years:0,hourly_rate:0,consultation_fee:0,languages:['bn','en'],verification_status:'pending',is_available:true,rating_avg:0,rating_count:0});
    res.status(201).json({user:{id,email},profile,access_token:tokenFor(id,allowedRole)});
  }catch(e:any){res.status(500).json({error:e.message});}
});
app.post('/api/auth/login',async(req,res)=>{
  const {email,password}=req.body; const user=await AuthUser.findOne({email:String(email||'').toLowerCase()});
  if(!user||!await bcrypt.compare(password||'',user.password_hash||''))return res.status(401).json({error:'Invalid email or password'});
  const profile=await modelFor('profiles').findOne({id:user.id}).lean();
  res.json({user:{id:user.id,email:user.email},profile,access_token:tokenFor(user.id,(profile as any)?.role)});
});
app.get('/api/auth/me',requireAuth,async(req:any,res)=>{const profile=await modelFor('profiles').findOne({id:req.user.sub}).lean(); const user=await AuthUser.findOne({id:req.user.sub}).lean();res.json({user:{id:req.user.sub,email:(user as any)?.email},profile});});
app.post('/api/auth/change-password',requireAuth,async(req:any,res)=>{const {password}=req.body;if(!password||password.length<6)return res.status(400).json({error:'Password must be at least 6 characters'});await AuthUser.updateOne({id:req.user.sub},{password_hash:await bcrypt.hash(password,12)});res.json({success:true});});

function buildFilter(filters:any[]=[]){const q:any={};for(const f of filters){if(f.op==='eq')q[f.field]=f.value;else if(f.op==='in')q[f.field]={$in:f.value};else if(f.op==='neq')q[f.field]={$ne:f.value};else if(f.op==='gte')q[f.field]={$gte:f.value};else if(f.op==='lte')q[f.field]={$lte:f.value};}return q;}
const adminTables=new Set(['audit_logs']);
const publicReadTables=new Set(['lawyer_profiles','practice_areas','lawyer_practice_areas','reviews','articles']);
app.post('/api/data/:table/query',async(req:any,res)=>{
  try{
    const {table}=req.params;
    if(!req.user?.sub && !publicReadTables.has(table)) return res.status(401).json({error:'Authentication required'});
    if(adminTables.has(table)&&req.user?.role!=='admin')return res.status(403).json({error:'Forbidden'});
    const {filters=[],order,limit,single}=req.body||{};
    const filter=buildFilter(filters);
    // Public visitors may only see verified lawyers and published articles.
    if(!req.user?.sub && table==='lawyer_profiles') filter.verification_status='verified';
    if(!req.user?.sub && table==='articles') filter.status='published';
    let query=modelFor(table).find(filter);
    if(order?.field)query=query.sort({[order.field]:order.ascending?1:-1}); if(limit)query=query.limit(Number(limit));
    let data:any=await query.lean();

    if(table==='lawyer_profiles'){
      const selectText=String(req.body?.select||'');
      const profileIds=data.map((x:any)=>x.user_id);
      const lawyerIds=data.map((x:any)=>x.id);
      const [profiles,links]=await Promise.all([
        selectText.includes('profiles') ? modelFor('profiles').find({id:{$in:profileIds}}).lean() : Promise.resolve([]),
        selectText.includes('lawyer_practice_areas') ? modelFor('lawyer_practice_areas').find({lawyer_profile_id:{$in:lawyerIds}}).lean() : Promise.resolve([]),
      ]);
      const profileMap=new Map((profiles as any[]).map((p:any)=>[p.id,p]));
      const areaIds=[...new Set((links as any[]).map((l:any)=>l.practice_area_id).filter(Boolean))];
      const areas=areaIds.length ? await modelFor('practice_areas').find({id:{$in:areaIds}}).lean() : [];
      const areaMap=new Map((areas as any[]).map((a:any)=>[a.id,a]));
      const linksByLawyer=new Map<string,any[]>();
      for(const link of links as any[]){
        const list=linksByLawyer.get(link.lawyer_profile_id)||[];
        list.push({practice_areas:areaMap.get(link.practice_area_id)||null});
        linksByLawyer.set(link.lawyer_profile_id,list);
      }
      data=data.map((x:any)=>({
        ...x,
        ...(selectText.includes('profiles')?{profiles:profileMap.get(x.user_id)||null}:{}),
        ...(selectText.includes('lawyer_practice_areas')?{lawyer_practice_areas:linksByLawyer.get(x.id)||[]}:{}),
      }));
    }

    if(table==='reviews' && String(req.body?.select||'').includes('profiles')){
      const clientIds=data.map((x:any)=>x.client_id).filter(Boolean);
      const profiles=await modelFor('profiles').find({id:{$in:clientIds}}).lean();
      const profileMap=new Map((profiles as any[]).map((p:any)=>[p.id,{full_name:p.full_name,avatar_url:p.avatar_url||null}]));
      data=data.map((x:any)=>({...x,profiles:profileMap.get(x.client_id)||null}));
    }

    res.json({data:single?(data[0]||null):data,error:null});
  }catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}
});
app.post('/api/data/:table/insert',requireAuth,async(req:any,res)=>{
  try{const rows=Array.isArray(req.body.rows)?req.body.rows:[req.body.rows];const clean=rows.map((r:any)=>({...r,id:r.id||uuid()}));const data=await modelFor(req.params.table).insertMany(clean);res.status(201).json({data:req.body.returning?data:null,error:null});}catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}
});
app.post('/api/data/:table/update',requireAuth,async(req:any,res)=>{
  try{
    const filter=buildFilter(req.body.filters);
    if(req.params.table==='consultations' && req.user.role!=='admin'){
      const requestedStatus=req.body.values?.status;
      if(['completed','awaiting_client_completion'].includes(requestedStatus)) return res.status(403).json({data:null,error:{message:'Use the protected completion workflow.'}});
      if(req.user.role==='lawyer'){
        filter.lawyer_id=req.user.sub;
        if(requestedStatus && !['confirmed','cancelled'].includes(requestedStatus)) return res.status(403).json({data:null,error:{message:'Lawyers may only confirm or cancel a pending consultation here.'}});
        if(requestedStatus) filter.status='pending';
      } else if(req.user.role==='client') {
        return res.status(403).json({data:null,error:{message:'Clients cannot directly change consultation status.'}});
      }
    }
    await modelFor(req.params.table).updateMany(filter,{$set:req.body.values});
    const data=req.body.returning?await modelFor(req.params.table).find(filter).lean():null;
    res.json({data,error:null});
  }catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}
});
app.post('/api/data/:table/delete',requireAuth,async(req:any,res)=>{try{await modelFor(req.params.table).deleteMany(buildFilter(req.body.filters));res.json({data:null,error:null});}catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}});



async function writeAudit(actorId:string, action:string, entityType:string, entityId:string, details:any={}) {
  await modelFor('audit_logs').create({id:uuid(),actor_id:actorId,action,entity_type:entityType,entity_id:entityId,details});
}

app.get('/api/admin/users',requireAuth,requireAdmin,async(_req:any,res)=>{
  try{
    const profiles:any[]=await modelFor('profiles').find({}).sort({created_at:-1}).lean();
    const ids=profiles.map(p=>p.id);
    const [authUsers,wallets,transactions]=await Promise.all([
      AuthUser.find({id:{$in:ids}}).lean(),
      modelFor('wallets').find({user_id:{$in:ids}}).lean(),
      modelFor('transactions').find({user_id:{$in:ids},status:{$ne:'failed'}}).lean(),
    ]);
    const emailMap=new Map((authUsers as any[]).map(u=>[u.id,u.email]));
    const walletMap=new Map((wallets as any[]).map(w=>[w.user_id,Number(w.balance||0)]));
    const finance=new Map<string,{spent:number;recharged:number}>();
    for(const tx of transactions as any[]){
      const row=finance.get(tx.user_id)||{spent:0,recharged:0};
      const amount=Number(tx.amount||0);
      if(['debit','payment','purchase'].includes(tx.type)) row.spent+=amount;
      if(['deposit','credit','recharge'].includes(tx.type)) row.recharged+=amount;
      finance.set(tx.user_id,row);
    }
    res.json({data:profiles.map(p=>({...p,email:emailMap.get(p.id)||'',wallet_balance:walletMap.get(p.id)||0,total_spent:finance.get(p.id)?.spent||0,total_recharged:finance.get(p.id)?.recharged||0}))});
  }catch(e:any){res.status(500).json({error:e.message});}
});

app.patch('/api/admin/users/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  try{
    const id=req.params.id;
    const allowed:any={};
    for(const key of ['full_name','phone','preferred_language','role','avatar_url']) if(req.body[key]!==undefined) allowed[key]=req.body[key];
    if(allowed.role && !['client','lawyer','admin'].includes(allowed.role)) return res.status(400).json({error:'Invalid role'});
    if(Object.keys(allowed).length) await modelFor('profiles').updateOne({id},{$set:allowed});
    if(req.body.email){
      const normalized=String(req.body.email).trim().toLowerCase();
      const duplicate=await AuthUser.findOne({email:normalized,id:{$ne:id}});
      if(duplicate) return res.status(409).json({error:'Email already in use'});
      await AuthUser.updateOne({id},{$set:{email:normalized}});
    }
    await writeAudit(req.user.sub,'admin_update_user','profiles',id,{fields:Object.keys(req.body)});
    const profile=await modelFor('profiles').findOne({id}).lean();
    const authUser=await AuthUser.findOne({id}).lean();
    res.json({data:{...profile,email:(authUser as any)?.email||''}});
  }catch(e:any){res.status(500).json({error:e.message});}
});

app.get('/api/admin/lawyers',requireAuth,requireAdmin,async(_req:any,res)=>{
  try{
    const lawyers:any[]=await modelFor('lawyer_profiles').find({}).sort({created_at:-1}).lean();
    const userIds=lawyers.map(l=>l.user_id);
    const [profiles,authUsers,wallets,transactions]=await Promise.all([
      modelFor('profiles').find({id:{$in:userIds}}).lean(),
      AuthUser.find({id:{$in:userIds}}).lean(),
      modelFor('wallets').find({user_id:{$in:userIds}}).lean(),
      modelFor('transactions').find({user_id:{$in:userIds},status:{$ne:'failed'}}).lean(),
    ]);
    const profileMap=new Map((profiles as any[]).map(p=>[p.id,p]));
    const emailMap=new Map((authUsers as any[]).map(u=>[u.id,u.email]));
    const walletMap=new Map((wallets as any[]).map(w=>[w.user_id,Number(w.balance||0)]));
    const finance=new Map<string,{income:number;payouts:number;commission:number}>();
    for(const tx of transactions as any[]){
      const row=finance.get(tx.user_id)||{income:0,payouts:0,commission:0};
      const amount=Number(tx.amount||0);
      if(['credit','earning','lawyer_income'].includes(tx.type)) row.income+=amount;
      if(tx.type==='payout') row.payouts+=amount;
      if(tx.type==='commission') row.commission+=amount;
      finance.set(tx.user_id,row);
    }
    res.json({data:lawyers.map(l=>({...l,profiles:{...(profileMap.get(l.user_id)||{}),email:emailMap.get(l.user_id)||''},wallet_balance:walletMap.get(l.user_id)||0,total_income:finance.get(l.user_id)?.income||0,total_payouts:finance.get(l.user_id)?.payouts||0,total_commission:finance.get(l.user_id)?.commission||0}))});
  }catch(e:any){res.status(500).json({error:e.message});}
});

app.patch('/api/admin/lawyers/:id',requireAuth,requireAdmin,async(req:any,res)=>{
  try{
    const lawyer:any=await modelFor('lawyer_profiles').findOne({id:req.params.id}).lean();
    if(!lawyer)return res.status(404).json({error:'Lawyer not found'});
    const lawyerFields=['license_number','bar_association','bio','experience_years','hourly_rate','consultation_fee','city','languages','is_available'];
    const profileFields=['full_name','phone','preferred_language','avatar_url'];
    const lawyerUpdate:any={}; const profileUpdate:any={};
    for(const key of lawyerFields) if(req.body[key]!==undefined) lawyerUpdate[key]=req.body[key];
    for(const key of profileFields) if(req.body[key]!==undefined) profileUpdate[key]=req.body[key];
    if(Object.keys(lawyerUpdate).length) await modelFor('lawyer_profiles').updateOne({id:req.params.id},{$set:lawyerUpdate});
    if(Object.keys(profileUpdate).length) await modelFor('profiles').updateOne({id:lawyer.user_id},{$set:profileUpdate});
    if(req.body.email){
      const normalized=String(req.body.email).trim().toLowerCase();
      const duplicate=await AuthUser.findOne({email:normalized,id:{$ne:lawyer.user_id}});
      if(duplicate)return res.status(409).json({error:'Email already in use'});
      await AuthUser.updateOne({id:lawyer.user_id},{$set:{email:normalized}});
    }
    await writeAudit(req.user.sub,'admin_update_lawyer','lawyer_profiles',req.params.id,{fields:Object.keys(req.body)});
    res.json({success:true});
  }catch(e:any){res.status(500).json({error:e.message});}
});

app.patch('/api/admin/lawyers/:id/verification',requireAuth,requireAdmin,async(req:any,res)=>{
  try{
    const status=String(req.body.status||'');
    if(!['pending','verified','rejected'].includes(status))return res.status(400).json({error:'Invalid verification status'});
    const result=await modelFor('lawyer_profiles').updateOne({id:req.params.id},{$set:{verification_status:status,verification_note:req.body.note||null,verified_at:status==='verified'?new Date():null,verified_by:req.user.sub}});
    if(!result.matchedCount)return res.status(404).json({error:'Lawyer not found'});
    await writeAudit(req.user.sub,`lawyer_${status}`,'lawyer_profiles',req.params.id,{note:req.body.note||null});
    res.json({success:true,status});
  }catch(e:any){res.status(500).json({error:e.message});}
});

app.post('/api/ai-assistant',requireAuth,async(req:any,res)=>{
  const {message,question,language='en',conversation_id}=req.body;
  const prompt=message||question||'';
  let conversationId=conversation_id;
  if(!conversationId){ conversationId=uuid(); await modelFor('ai_conversations').create({id:conversationId,user_id:req.user.sub,title:String(prompt).slice(0,80),language}); }
  await modelFor('ai_messages').create({id:uuid(),conversation_id:conversationId,role:'user',content:prompt,user_id:req.user.sub});
  const entries=await modelFor('ai_knowledge_entries').find({}).limit(100).lean();
  const terms=String(prompt).toLowerCase().split(/\s+/).filter((x:string)=>x.length>2);
  const ranked=entries.map((e:any)=>({e,score:terms.reduce((s:number,t:string)=>s+(JSON.stringify(e).toLowerCase().includes(t)?1:0),0)})).sort((a:any,b:any)=>b.score-a.score);
  const best:any=ranked[0]?.score>0?ranked[0].e:null;
  const answer=best?(language==='bn'?(best.answer_bn||best.content_bn||best.title_bn):(best.answer_en||best.content_en||best.title_en)):(language==='bn'?'এই প্রশ্নের জন্য যাচাইকৃত উৎস পাওয়া যায়নি। একজন আইনজীবীর সঙ্গে পরামর্শ করুন।':'No verified source was found for this question. Please consult a lawyer.');
  await modelFor('ai_messages').create({id:uuid(),conversation_id:conversationId,role:'assistant',content:answer,citations:best?.citations||[]});
  await modelFor('ai_conversations').updateOne({id:conversationId},{$set:{updated_at:new Date()}});
  res.json({answer,citations:best?.citations||[],suggested_lawyers:[],conversation_id:conversationId,confidence:best?'medium':'low',disclaimer:language==='bn'?'এটি সাধারণ আইনি তথ্য, চূড়ান্ত আইনি পরামর্শ নয়।':'This is general legal information, not definitive legal advice.'});
});




app.get('/api/consultations/pending-client-completion', requireAuth, async (req:any, res) => {
  try {
    if (req.user.role !== 'client' && req.user.role !== 'admin') return res.json({ data: [] });
    const rows:any[] = await modelFor('consultations').find({ client_id: req.user.sub, status: 'awaiting_client_completion' }).sort({ lawyer_completed_at: 1 }).lean();
    const lawyerIds = [...new Set(rows.map((row:any) => row.lawyer_id).filter(Boolean))];
    const profiles:any[] = lawyerIds.length ? await modelFor('profiles').find({ id: { $in: lawyerIds } }).lean() : [];
    const profileMap = new Map(profiles.map((profile:any) => [profile.id, profile]));
    res.json({ data: rows.map((row:any) => ({ ...row, lawyer: profileMap.get(row.lawyer_id) || null })) });
  } catch (error:any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/consultations/:id/lawyer-complete', requireAuth, async (req:any, res) => {
  try {
    if (req.user.role !== 'lawyer' && req.user.role !== 'admin') return res.status(403).json({ error: 'Only the assigned lawyer can mark this consultation as completed.' });
    const filter:any = { id: req.params.id, status: 'confirmed' };
    if (req.user.role !== 'admin') filter.lawyer_id = req.user.sub;
    const consultation:any = await modelFor('consultations').findOneAndUpdate(filter, { $set: { status: 'awaiting_client_completion', lawyer_completed_at: new Date(), updated_at: new Date() } }, { new: true }).lean();
    if (!consultation) return res.status(409).json({ error: 'The consultation is not confirmed, already completed, or does not belong to this lawyer.' });
    await modelFor('notifications').create({ id: uuid(), user_id: consultation.client_id, type: 'consultation_completion_required', title_en: 'Confirm consultation completion', title_bn: 'পরামর্শ সম্পন্ন হওয়া নিশ্চিত করুন', body_en: 'The lawyer marked the consultation as completed. Please confirm completion to release the service amount.', body_bn: 'আইনজীবী পরামর্শটি সম্পন্ন হিসেবে চিহ্নিত করেছেন। সেবার অর্থ ছাড় করতে অনুগ্রহ করে সম্পন্ন হওয়া নিশ্চিত করুন।', is_read: false });
    io.to(`consultation:${consultation.id}`).emit('consultation:lawyer-completed', { consultationId: consultation.id });
    res.json({ data: consultation });
  } catch (error:any) { res.status(500).json({ error: error.message }); }
});

app.post('/api/consultations/:id/client-complete', requireAuth, async (req:any, res) => {
  const dbSession = await mongoose.startSession();
  try {
    let completedConsultation:any = null;
    await dbSession.withTransaction(async () => {
      const consultation:any = await modelFor('consultations').findOne({ id: req.params.id, client_id: req.user.sub, status: 'awaiting_client_completion' }).session(dbSession);
      if (!consultation) throw new Error('CONSULTATION_NOT_CONFIRMABLE');
      const existingCredit = await modelFor('transactions').findOne({ reference_type: 'consultation', reference_id: consultation.id, user_id: consultation.lawyer_id, type: 'credit', status: 'completed' }).session(dbSession);
      if (existingCredit) throw new Error('PAYMENT_ALREADY_RELEASED');
      const clientDebit:any = await modelFor('transactions').findOne({ reference_type: 'consultation', reference_id: consultation.id, user_id: consultation.client_id, type: 'debit', status: 'completed' }).session(dbSession);
      if (!clientDebit) throw new Error('PAYMENT_NOT_HELD');
      const amount = Number(consultation.lawyer_amount ?? consultation.price ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_SERVICE_AMOUNT');
      const lawyerWallet:any = await modelFor('wallets').findOneAndUpdate({ user_id: consultation.lawyer_id }, { $setOnInsert: { id: uuid(), user_id: consultation.lawyer_id }, $inc: { balance: amount }, $set: { updated_at: new Date() } }, { upsert: true, new: true, session: dbSession });
      await modelFor('transactions').create([{ id: uuid(), wallet_id: lawyerWallet.id, user_id: consultation.lawyer_id, type: 'credit', amount, description: 'Consultation service amount released after client confirmation', reference_type: 'consultation', reference_id: consultation.id, status: 'completed', payment_method: 'platform_hold' }], { session: dbSession });
      consultation.status = 'completed';
      consultation.client_completed_at = new Date();
      consultation.payment_released_at = new Date();
      consultation.released_amount = amount;
      consultation.payment_status = 'released';
      consultation.updated_at = new Date();
      await consultation.save({ session: dbSession });
      completedConsultation = consultation.toObject();
      await modelFor('notifications').create([{ id: uuid(), user_id: consultation.lawyer_id, type: 'consultation_payment_released', title_en: 'Consultation payment released', title_bn: 'পরামর্শের অর্থ ছাড় হয়েছে', body_en: `The client confirmed completion. BDT ${amount} was added to your account.`, body_bn: `ক্লায়েন্ট সম্পন্ন হওয়া নিশ্চিত করেছেন। আপনার অ্যাকাউন্টে ${amount} টাকা যোগ হয়েছে।`, is_read: false }], { session: dbSession });
    });
    io.to(`consultation:${req.params.id}`).emit('consultation:completed', { consultationId: req.params.id });
    res.json({ data: completedConsultation });
  } catch (error:any) {
    if (error.message === 'CONSULTATION_NOT_CONFIRMABLE') return res.status(409).json({ error: 'This consultation is not waiting for your completion confirmation.' });
    if (error.message === 'PAYMENT_ALREADY_RELEASED') return res.status(409).json({ error: 'The consultation payment has already been released.' });
    if (error.message === 'INVALID_SERVICE_AMOUNT') return res.status(400).json({ error: 'The consultation has an invalid service amount.' });
    if (error.message === 'PAYMENT_NOT_HELD') return res.status(409).json({ error: 'The client payment is not held for this consultation.' });
    res.status(500).json({ error: error.message });
  } finally { await dbSession.endSession(); }
});

type RoomKind = 'document' | 'consultation';
async function canAccessRoom(userId:string, role:string|undefined, kind:RoomKind, roomId:string) {
  if (role === 'admin') return true;
  const table = kind === 'document' ? 'document_requests' : 'consultations';
  const record:any = await modelFor(table).findOne({ id: roomId }).lean();
  if (!record) return false;
  // Consultation communication is unlocked only after the lawyer confirms the booking.
  if (kind === 'consultation' && record.status !== 'confirmed') return false;
  return [record.client_id, record.lawyer_id, record.assigned_lawyer_id].filter(Boolean).includes(userId);
}

io.use((socket,next)=>{
  try {
    const raw = socket.handshake.auth?.token || String(socket.handshake.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if (!raw) return next(new Error('Authentication required'));
    const payload = jwt.verify(raw, JWT_SECRET) as TokenPayload;
    socket.data.user = payload;
    next();
  } catch { next(new Error('Invalid or expired token')); }
});

io.on('connection',(socket)=>{
  socket.on('room:join', async (payload:{kind:RoomKind;roomId:string}, ack?:Function)=>{
    try {
      const {kind,roomId}=payload||{};
      if(!['document','consultation'].includes(kind)||!roomId) throw new Error('Invalid room');
      const user=socket.data.user as TokenPayload;
      if(!await canAccessRoom(user.sub,user.role,kind,roomId)) throw new Error('Room access denied');
      const room=`${kind}:${roomId}`;
      await socket.join(room);
      socket.data.activeRoom=room;
      socket.to(room).emit('room:peer-joined',{userId:user.sub});
      ack?.({ok:true,room});
    } catch(e:any){ack?.({ok:false,error:e.message});}
  });

  socket.on('message:send', async (payload:{kind:RoomKind;roomId:string;body:string}, ack?:Function)=>{
    try {
      const {kind,roomId}=payload||{}; const body=String(payload?.body||'').trim();
      if(!body) throw new Error('Message cannot be empty');
      if(body.length>5000) throw new Error('Message is too long');
      const user=socket.data.user as TokenPayload;
      if(!await canAccessRoom(user.sub,user.role,kind,roomId)) throw new Error('Room access denied');
      const message:any={id:uuid(),sender_id:user.sub,body,consultation_id:kind==='consultation'?roomId:null,document_request_id:kind==='document'?roomId:null,created_at:new Date()};
      const saved:any=await modelFor('messages').create(message);
      const json=saved.toObject ? saved.toObject() : saved;
      io.to(`${kind}:${roomId}`).emit('message:new',json);
      ack?.({ok:true,data:json});
    } catch(e:any){ack?.({ok:false,error:e.message});}
  });

  for (const event of ['webrtc:offer','webrtc:answer','webrtc:ice','call:invite','call:end','call:media-state']) {
    socket.on(event, async (payload:any, ack?:Function)=>{
      try {
        const {kind,roomId}=payload||{};
        const user=socket.data.user as TokenPayload;
        if(!await canAccessRoom(user.sub,user.role,kind,roomId)) throw new Error('Room access denied');
        socket.to(`${kind}:${roomId}`).emit(event,{...payload,from:user.sub});
        ack?.({ok:true});
      } catch(e:any){ack?.({ok:false,error:e.message});}
    });
  }

  socket.on('disconnect',()=>{
    const room=socket.data.activeRoom;
    if(room) socket.to(room).emit('room:peer-left',{userId:(socket.data.user as TokenPayload)?.sub});
  });
});

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const clientDist=path.resolve(__dirname,'../../dist');
if(process.env.NODE_ENV==='production'){app.use(express.static(clientDist));app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Not found'});res.sendFile(path.join(clientDist,'index.html'));});}

async function ensureEnvironmentAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('ADMIN_EMAIL or ADMIN_PASSWORD is not set; automatic admin provisioning was skipped.');
    return;
  }
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters long.');

  let user:any = await AuthUser.findOne({ email });
  if (!user) {
    user = await AuthUser.create({ id: uuid(), email, password_hash: await bcrypt.hash(password, 12) });
  } else {
    user.password_hash = await bcrypt.hash(password, 12);
    await user.save();
  }

  await modelFor('profiles').updateOne(
    { id: user.id },
    { $set: { id: user.id, full_name: 'Platform Administrator', role: 'admin', preferred_language: 'en' } },
    { upsert: true }
  );
  const wallet = await modelFor('wallets').findOne({ user_id: user.id }).lean();
  if (!wallet) await modelFor('wallets').create({ id: uuid(), user_id: user.id, balance: 0 });
  console.log(`Administrator account ready: ${email}`);
}

async function start(){
  await mongoose.connect(MONGODB_URI);
  await ensureEnvironmentAdmin();
  httpServer.listen(PORT,()=>console.log(`Amar Ain API and realtime server listening on ${PORT}`));
}
start().catch(e=>{console.error(e);process.exit(1)});
