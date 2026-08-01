import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs'; import {v4 as uuid} from 'uuid';
const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017/amar_ain';
const schema=new mongoose.Schema({id:{type:String,unique:true,default:uuid}},{strict:false,timestamps:{createdAt:'created_at',updatedAt:'updated_at'},versionKey:false});
const M=(n:string)=>mongoose.models[n]||mongoose.model(n,schema,n);
const authSchema=new mongoose.Schema({id:String,email:{type:String,unique:true},password_hash:String},{versionKey:false});
const Auth=mongoose.model('SeedAuth',authSchema,'auth_users');
await mongoose.connect(uri);
let id=process.env.ADMIN_ID||uuid(); const email=process.env.ADMIN_EMAIL||'admin@amarain.com'; const password=process.env.ADMIN_PASSWORD||'ChangeMe123!';
let u=await Auth.findOne({email});if(!u){u=await Auth.create({id,email,password_hash:await bcrypt.hash(password,12)});}else{id=u.id as string;}
await M('profiles').updateOne({id:u.id},{$set:{id:u.id,full_name:'Platform Administrator',role:'admin',preferred_language:'en'}},{upsert:true});
const areas=[['Family Law','পারিবারিক আইন'],['Criminal Law','ফৌজদারি আইন'],['Land & Property','ভূমি ও সম্পত্তি'],['Corporate Law','কর্পোরেট আইন'],['Cyber Law','সাইবার আইন'],['Labour Law','শ্রম আইন']];
for(const [name_en,name_bn] of areas)await M('practice_areas').updateOne({name_en},{$setOnInsert:{id:uuid(),name_en,name_bn}},{upsert:true});
console.log(`Seeded admin: ${email}`); await mongoose.disconnect();
