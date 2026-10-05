#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const entities={
 properties:{fields:['code','name','country','region'],required:['code','name','country'],key:'code'},
 animals:{fields:['tag','name','eid','sex','born','breed','mob','property','sire_tag','dam_tag','society_id','tagged','registered','status'],required:['tag','name','sex','born','property'],key:'tag'},
 weights:{fields:['external_id','animal','weighed','kg','group_code'],required:['animal','weighed','kg'],key:'external_id'},
 joinings:{fields:['external_id','dam','sire','joined','due','method','result'],required:['dam','sire','joined','due'],key:'external_id'},
 calvings:{fields:['external_id','joining','dam','calf','calved','assistance','birth_kg'],required:['dam','calf','calved'],key:'external_id'},
 treatments:{fields:['external_id','animal','treated','product','batch','product_expiry','dose','meat_clear','export_clear','instruction_ref','operator'],required:['animal','treated','product'],key:'external_id'},
 movements:{fields:['external_id','animal','from_code','to_code','country','moved_at','direction','recorded_at','receipt','document_ref'],required:['animal','from_code','to_code','country','moved_at','direction'],key:'external_id'},
 ebvs:{fields:['external_id','animal','trait','value','accuracy','run_date','analysis'],required:['animal','trait','value','run_date','analysis'],key:'external_id'},
 lots:{fields:['external_id','animal','sale','lot_no','sale_date','notes'],required:['animal','sale','lot_no','sale_date'],key:'external_id'},
};
const dateFields=new Set(['born','tagged','registered','weighed','joined','due','calved','treated','product_expiry','meat_clear','export_clear','run_date','sale_date']);
const numericFields=new Set(['kg','birth_kg','value','accuracy']);
const refs={animal:['animals','animal_id'],property:['properties','property_id'],dam:['animals','dam_id'],sire:['animals','sire_id'],calf:['animals','calf_id'],joining:['joinings','joining_id']};
export function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Expected a real YYYY-MM-DD date: '+s);return s;}
function stamp(s){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error('Timestamp needs time and timezone: '+s);date(s.slice(0,10));return new Date(s).toISOString();}
function options(args){const flags={},pos=[];for(const a of args){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i).replaceAll('-','_');if(k in flags)throw Error('Duplicate flag '+k);flags[k]=i<0?true:a.slice(i+1);}else pos.push(a);}return {flags,pos};}
function allow(flags,keys){for(const k of Object.keys(flags))if(!['json',...keys].includes(k))throw Error('Unknown flag --'+k.replaceAll('_','-'));}
export async function resolve(db,entity,term,exact=false){
 if(!term||typeof term!=='string')throw Error('Record reference required');
 const key=entities[entity]?.key||'id';
 const named=['animals','properties'].includes(entity);
 let rows=await db.query(`select * from ${entity} where lower(${key}::text)=lower($1)${named?' or lower(name)=lower($1)':''} order by id`,[term]);
 if(!rows.length&&!exact)rows=await db.query(`select * from ${entity} where starts_with(id::text,$1)${named?' or strpos(lower(name),lower($1))>0':''} order by id`,[term]);
 if(rows.length!==1)throw Error(`${rows.length} matches for "${term}":\n`+rows.map(r=>`${r.id} ${r[key]} ${r.name||''}`).join('\n'));
 return rows[0];
}
async function prepare(db,entity,input,{updating=false,exact=false}={}){
 const def=entities[entity];if(!def)throw Error('Unknown entity: '+entity);
 for(const k of Object.keys(input))if(!def.fields.includes(k))throw Error('Unknown field '+k);
 if(!updating)for(const k of def.required)if(input[k]===undefined||input[k]==='')throw Error('Required field '+k);
 const row={};
 for(const [k,v] of Object.entries(input)){
  if(v===true)throw Error('Value required for '+k);
  if(v===null){if(def.required.includes(k)||k===def.key)throw Error('Cannot clear '+k);row[refs[k]?.[1]||k]=null;continue;}
  if(refs[k]){row[refs[k][1]]=(await resolve(db,refs[k][0],v,exact)).id;continue;}
  if(dateFields.has(k))row[k]=date(v);
  else if(k.endsWith('_at'))row[k]=stamp(v);
  else if(numericFields.has(k)){if(String(v).trim()===''||!Number.isFinite(Number(v)))throw Error('Number required for '+k);row[k]=Number(v);}
  else {if(typeof v!=='string'||!v.trim())throw Error('Nonempty text required for '+k);row[k]=v.trim();}
 }
 return row;
}
async function validateRelations(db,entity,row){
 const animal=async(id)=>(await db.query('select * from animals where id=$1',[id]))[0];
 if(['joinings','calvings'].includes(entity)){
  const d=await animal(row.dam_id);if(d.sex!=='F')throw Error('Dam must be female');
  if(entity==='joinings'){const s=await animal(row.sire_id);if(s.sex!=='M')throw Error('Sire must be male');if(row.joined<d.born||row.joined<s.born)throw Error('Joining predates parent birth');}
  else {const c=await animal(row.calf_id);if(c.born!==row.calved)throw Error('Calf birth must equal calving date');if(row.calved<=d.born)throw Error('Calving predates dam birth');if(c.dam_tag&&c.dam_tag!==d.tag)throw Error('Calf dam does not match');if(row.joining_id){const j=(await db.query('select * from joinings where id=$1',[row.joining_id]))[0];if(j.dam_id!==row.dam_id||row.calved<j.joined)throw Error('Joining does not match this calving');}}
 }
 if(row.animal_id){const a=await animal(row.animal_id);const d=row.weighed||row.treated||row.run_date||(row.moved_at?new Date(row.moved_at).toISOString().slice(0,10):null);if(d&&d<a.born)throw Error('Event predates animal birth');}
}
async function save(db,entity,input,{upsert=false,exact=false}={}){
 const def=entities[entity];if(!def)throw Error('Unknown entity '+entity);
 if(def.key==='external_id'&&!input.external_id)input={...input,external_id:randomUUID()};
 const row=await prepare(db,entity,input,{exact});
 await validateRelations(db,entity,row);
 const keys=Object.keys(row);const update=keys.filter(k=>k!==def.key).map(k=>`${k}=excluded.${k}`).join(',');
 const sql=`insert into ${entity} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) ${upsert?`on conflict (${def.key}) do update set ${update}`:''} returning *`;
 const result=(await db.query(sql,Object.values(row)))[0];
 if(entity==='calvings'){
  const dam=await resolve(db,'animals',result.dam_id);await db.query('update animals set dam_tag=$1 where id=$2',[dam.tag,result.calf_id]);
  if(result.joining_id)await db.query("update joinings set result='calved' where id=$1",[result.joining_id]);
 }
 return result;
}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const r=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return r;}catch(e){await db.exec('ROLLBACK');throw e;}}
const aliases={tag:['Visual ID','VID','Animal ID'],name:['Animal Name'],eid:['Electronic ID','EID'],sex:['Sex'],born:['Date of Birth','DOB'],property:['Property','Property Code'],sire_tag:['Sire','Sire ID'],dam_tag:['Dam','Dam ID'],society_id:['Society ID','BREEDPLAN ID'],external_id:['Record ID'],animal:['Visual ID','VID','Animal ID'],weighed:['Weigh Date','Date'],kg:['Weight','Weight (kg)'],group_code:['Management Group']};
async function importFiles(db,flags){
 allow(flags,[...Object.keys(entities),'map','dry_run','date_format']);
 if(flags.date_format&&!['iso','dmy'].includes(flags.date_format))throw Error('date-format must be iso or dmy');
 const mapping=flags.map?JSON.parse(fs.readFileSync(flags.map,'utf8')):{};
 const files=Object.keys(entities).filter(k=>flags[k]);if(!files.length)throw Error('Import needs --animals=file.csv or another entity file');
 return transaction(db,async()=>{
  const counts={};
  for(const entity of files){
   const seen=new Set();const raw=parseCsv(fs.readFileSync(flags[entity],'utf8'));if(!raw.length)throw Error('Empty '+entity+' file');
   for(const [index,source] of raw.entries()){
    const row={};const def=entities[entity];const mapped=mapping[entity]||{};
    for(const k of Object.keys(mapped))if(!def.fields.includes(k))throw Error('Unknown mapped field '+k);
    for(const k of def.fields){const value=pick(source,...(mapped[k]?[mapped[k]]:[k,k.replaceAll('_',' '),...(aliases[k]||[])]));if(value!=='')row[k]=value.trim();}
    if(!row[def.key])throw Error(`${entity} row ${index+2}: stable ${def.key} required`);
    if(seen.has(row[def.key].toLowerCase()))throw Error('Duplicate import key '+row[def.key]);seen.add(row[def.key].toLowerCase());
    if(flags.date_format==='dmy')for(const k of dateFields)if(row[k]&&/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(row[k])){const [d,m,y]=row[k].split('/');row[k]=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}
    if(row.sex)row.sex=({female:'F',male:'M',steer:'S',cow:'F',bull:'M',heifer:'F'})[row.sex.toLowerCase()]||row.sex.toUpperCase();
    try{await save(db,entity,row,{upsert:true,exact:true});}catch(e){throw Error(`${entity} row ${index+2}: ${e.message}`);}
   }
   counts[entity]=raw.length;
  }
  return {dry_run:!!flags.dry_run,validated:counts};
 },!!flags.dry_run);
}
export const reads={
 herd:"select a.tag,a.name,a.sex,a.born,a.mob,p.code as property,a.status from animals a join properties p on p.id=a.property_id order by a.tag",
 properties:'select code,name,country,region from properties order by code',
 'calving-watch':'select dam,sire,due,days_until_due,result from calving_watch order by due',
 growth:"select tag,mob,weighed,kg,gain_kg_day,days_since_weight from growth where status='active' order by tag",
 'treatment-holds':'select tag,product,meat_clear,export_clear,review,missing_record from treatment_holds order by tag',
 movements:'select tag,country,direction,moved_at,reminder_at,receipt,review from movement_watch order by moved_at',
 'sale-readiness':'select sale,lot_no,tag,kg,treatment_reviews,missing_receipts,missing_eid,missing_society_id,status from sale_readiness order by sale,lot_no',
 attention:'select * from herd_attention order by tag,reason',
 'breeding-values':'select a.tag,e.trait,e.value,e.accuracy,e.run_date,e.analysis from ebvs e join animals a on a.id=e.animal_id order by a.tag,e.trait,e.run_date desc',
 pedigree:'select a.tag,a.sire_tag,a.dam_tag,s.name as sire_name,d.name as dam_name from animals a left join animals s on s.tag=a.sire_tag left join animals d on d.tag=a.dam_tag order by a.tag',
 'breeding-review':"select s.tag as sire,count(j.id)::int as joinings,count(j.id) filter(where j.result='pregnant')::int as pregnant,count(j.id) filter(where j.result='empty')::int as empty,count(j.id) filter(where j.result='pending')::int as pending,count(j.id) filter(where j.result='calved')::int as calved from animals s join joinings j on j.sire_id=s.id group by s.tag order by s.tag",
 'performance-review':"select mob,count(*)::int as animals,round(avg(kg),1) as average_latest_kg,round(avg(gain_kg_day),3) as average_gain_kg_day,count(*) filter(where days_since_weight>90 or weighed is null)::int as stale_or_unweighed from growth where status='active' group by mob order by mob",
 'record-gaps':"select a.tag,a.society_id,a.sire_tag,a.dam_tag,(select count(*)::int from weights w where w.animal_id=a.id) as weights,(select count(*)::int from ebvs e where e.animal_id=a.id) as ebv_records from animals a where a.status='active' order by a.tag",
};
export async function compliance(db){
 const out=[];const add=(tag,rule,detail,source)=>out.push({tag,rule,detail,source});
 const nait='https://www.groundrules.mpi.govt.nz/rule/3448-nait-tagging-and-registering-animals';
 const nlis='https://www.integritysystems.com.au/identification--traceability/buying-selling-moving/';
 const lpa='https://www.integritysystems.com.au/on-farm-assurance/safe-and-responsible-animal-treatments/';
 const animals=await db.query("select a.*,p.country,current_date-a.born as age,current_date-a.tagged as tag_age from animals a join properties p on p.id=a.property_id where status='active'");
 for(const a of animals){
  if(a.country==='NZ'&&a.age>=180&&(!a.tagged||!a.eid))add(a.tag,'nait-tag-review','180-day tagging reminder: tag date or electronic ID missing',nait);
  if(a.country==='NZ'&&a.tagged&&!a.registered&&a.tag_age>=7)add(a.tag,'nait-registration-review','Seven-day registration reminder: receipt date missing',nait);
 }
 for(const m of await db.query('select m.*,a.tag,a.tagged,a.registered,a.eid from movements m join animals a on a.id=m.animal_id')){
  const source=m.country==='NZ'?nait:nlis;
  if(!m.eid||!m.tagged||(m.country==='NZ'&&!m.registered))add(m.tag,'movement-identification','Check electronic identification and registration before movement',source);
  if(m.country==='NZ'&&((m.tagged&&m.tagged>new Date(m.moved_at).toISOString().slice(0,10))||(m.registered&&m.registered>new Date(m.moved_at).toISOString().slice(0,10))))add(m.tag,'late-identification','Tagging or registration was recorded after movement',nait);
 }
 for(const m of await db.query("select * from movement_watch where review<>'receipt recorded'"))add(m.tag,'movement-receipt',`${m.review}; ${m.country==='AU'?'confirm state deadline and receiving party responsibility':'48-hour operational reminder'}`,m.country==='NZ'?'https://www.mpi.govt.nz/animals/national-animal-identification-tracing-nait-programme':nlis);
 for(const t of await db.query('select t.*,a.tag from treatments t join animals a on a.id=t.animal_id')){
  if(!t.batch||!t.product_expiry||!t.dose)add(t.tag,'treatment-record','Batch, product expiry or dose missing; review local requirements',lpa);
  if(t.product_expiry&&t.product_expiry<t.treated)add(t.tag,'product-expiry','Product expiry predates treatment; review with veterinarian',lpa);
  if(!t.meat_clear||!t.export_clear||!t.instruction_ref)add(t.tag,'withholding-instructions','Record clearance dates from the applicable label or veterinarian, including destination review',lpa);
 }
 return out;
}
export async function execute(db,args){
 const {flags,pos}=options(args);const [cmd='help',...rest]=pos;
 if(cmd==='help')return {reads:Object.keys(reads),commands:['animal <tag|name|id>','compliance','add <entity> --field=value','set <entity> <reference> <field> <value|NULL>','log <animal> <note>','import herdmaster --properties=file --animals=file [--weights=file ...] [--dry-run] [--map=file] [--date-format=dmy]','export --out=exports/herd.json','draft-sale <lot id|external_id>'],entities};
 if(reads[cmd]){allow(flags,[]);return db.query(reads[cmd]);}
 if(cmd==='compliance'){allow(flags,[]);return compliance(db);}
 if(cmd==='animal'){
  allow(flags,[]);const a=await resolve(db,'animals',rest[0]);const history={animal:a};
  for(const n of ['weights','treatments','movements','ebvs','lots','notes'])history[n]=await db.query(`select * from ${n} where animal_id=$1 order by created_at,id`,[a.id]);
  history.joinings=await db.query('select * from joinings where dam_id=$1 or sire_id=$1 order by joined',[a.id]);
  history.calvings=await db.query('select * from calvings where dam_id=$1 or calf_id=$1 order by calved',[a.id]);return history;
 }
 if(cmd==='add'){
  const entity=rest[0];if(!entities[entity])throw Error('Choose entity: '+Object.keys(entities).join(', '));allow(flags,entities[entity].fields);const {json,...fields}=flags;return transaction(db,()=>save(db,entity,fields));
 }
 if(cmd==='set'){
  allow(flags,[]);const [entity,term,key,val]=rest;if(!entities[entity]||!entities[entity].fields.includes(key)||key===entities[entity].key||(entity==='calvings'&&['joining','dam','calf','calved'].includes(key)))throw Error('Field is not editable; identifiers and calving links remain stable');
  if(val===undefined)throw Error('Value required');
  return transaction(db,async()=>{const old=await resolve(db,entity,term);const row=await prepare(db,entity,{[key]:val==='NULL'?null:val},{updating:true});await validateRelations(db,entity,{...old,...row});const column=Object.keys(row)[0];return (await db.query(`update ${entity} set ${column}=$1 where id=$2 returning *`,[row[column],old.id]))[0];});
 }
 if(cmd==='log'){allow(flags,[]);const a=await resolve(db,'animals',rest[0]);if(!rest[1]?.trim())throw Error('Note required');return (await db.query('insert into notes(animal_id,body) values($1,$2) returning *',[a.id,rest[1]]))[0];}
 if(cmd==='import'){if(rest[0]!=='herdmaster')throw Error('Only import herdmaster is supported');return importFiles(db,flags);}
 if(cmd==='export'){
  allow(flags,['out']);const snapshot=await transaction(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');const out={format:1,exported_at:new Date().toISOString()};for(const n of [...Object.keys(entities),'notes'])out[n]=await db.query(`select * from ${n} order by id`);return out;});
  if(!flags.out)return snapshot;const file=path.resolve(flags.out);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n',{mode:0o600});return {file,entities:10};
 }
 if(cmd==='draft-sale'){
  allow(flags,[]);const lot=await resolve(db,'lots',rest[0]);const a=await resolve(db,'animals',lot.animal_id);const review=(await db.query('select * from sale_readiness where id=$1',[lot.id]))[0];
  const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,lot.id+'-sale.md');
  fs.writeFileSync(file,`# Draft for review: ${lot.sale}, lot ${lot.lot_no}\n\n${a.name} (${a.tag}), born ${a.born}.\n\n${lot.notes}\n\nTreatment reviews: ${review.treatment_reviews}. Missing movement receipts: ${review.missing_receipts}.\nThis draft is not a movement document or a clearance certificate. Check the complete animal history and current market requirements before use.\n`,{mode:0o600});return {file,sent:false};
 }
 throw Error('Unknown command: '+cmd);
}
export function format(result){
 if(Array.isArray(result))return table(result,Object.keys(result[0]||{}).map(key=>({key,label:key,width:70})));
 return Object.entries(result).map(([key,value])=>{
  if(value&&typeof value==='object')return key+'\n'+(Array.isArray(value)?format(value):format(Object.entries(value).map(([field,v])=>({field,value:typeof v==='object'?JSON.stringify(v):v}))));
  return `${key}: ${value??''}`;
 }).join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await execute(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
