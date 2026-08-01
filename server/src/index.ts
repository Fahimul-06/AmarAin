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
import { fileURLToPath } from 'node:url';

const app = express();
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
app.post('/api/data/:table/query',requireAuth,async(req:any,res)=>{
  try{
    const {table}=req.params; if(adminTables.has(table)&&req.user.role!=='admin')return res.status(403).json({error:'Forbidden'});
    const {filters=[],order,limit,single}=req.body||{}; let query=modelFor(table).find(buildFilter(filters));
    if(order?.field)query=query.sort({[order.field]:order.ascending?1:-1}); if(limit)query=query.limit(Number(limit));
    let data:any=await query.lean();
    if(table==='lawyer_profiles' && String(req.body?.select||'').includes('profiles')){const ids=data.map((x:any)=>x.user_id);const ps=await modelFor('profiles').find({id:{$in:ids}}).lean();const map=new Map(ps.map((p:any)=>[p.id,p]));data=data.map((x:any)=>({...x,profiles:map.get(x.user_id)||null}));}
    res.json({data:single?(data[0]||null):data,error:null});
  }catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}
});
app.post('/api/data/:table/insert',requireAuth,async(req:any,res)=>{
  try{const rows=Array.isArray(req.body.rows)?req.body.rows:[req.body.rows];const clean=rows.map((r:any)=>({...r,id:r.id||uuid()}));const data=await modelFor(req.params.table).insertMany(clean);res.status(201).json({data:req.body.returning?data:null,error:null});}catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}
});
app.post('/api/data/:table/update',requireAuth,async(req:any,res)=>{
  try{const filter=buildFilter(req.body.filters);await modelFor(req.params.table).updateMany(filter,{$set:req.body.values});const data=req.body.returning?await modelFor(req.params.table).find(filter).lean():null;res.json({data,error:null});}catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}
});
app.post('/api/data/:table/delete',requireAuth,async(req:any,res)=>{try{await modelFor(req.params.table).deleteMany(buildFilter(req.body.filters));res.json({data:null,error:null});}catch(e:any){res.status(400).json({data:null,error:{message:e.message}});}});

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

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const clientDist=path.resolve(__dirname,'../../dist');
if(process.env.NODE_ENV==='production'){app.use(express.static(clientDist));app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Not found'});res.sendFile(path.join(clientDist,'index.html'));});}

async function start(){await mongoose.connect(MONGODB_URI);app.listen(PORT,()=>console.log(`Amar Ain API listening on ${PORT}`));}
start().catch(e=>{console.error(e);process.exit(1)});
