import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {execute,reads,date,entities} from './herd.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stud-herd-test-'));
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
let db,checks=0;
const test=async(name,fn)=>{await fn();console.log('ok '+(++checks)+' '+name);};
const run=(...args)=>execute(db,args);
const cli=(script,args=[],code=0)=>{const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script),...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(r.status,code,r.stdout+r.stderr);return r;};
try{
 db=await getDb();await migrate(db);assert.equal((await migrate(db)).ran.length,0);
 const seed=fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8');await db.exec(seed);await db.exec(seed);
 await test('idempotent migrations and seed',async()=>assert.equal((await run('herd')).length,8));
 for(const cmd of ['help',...Object.keys(reads),'compliance'])await test('read '+cmd,async()=>assert.ok(await run(cmd)));
 await test('domain findings from fictional herd',async()=>{
  const sale=await run('sale-readiness');assert.equal(sale.length,2);assert.equal(sale[0].treatment_reviews,1);assert.equal(sale[0].missing_receipts,1);
  assert.equal(Number((await run('growth')).find(a=>a.tag==='IB-C01').gain_kg_day),0.9);
  assert.ok((await run('calving-watch')).some(a=>a.dam==='IB-D01'&&a.days_until_due===-7));
  const f=await run('compliance');for(const rule of ['nait-tag-review','movement-identification','movement-receipt','treatment-record','withholding-instructions'])assert.ok(f.some(x=>x.rule===rule),rule);
  assert.ok(!(await run('attention')).some(a=>a.tag==='IB-X01'));
 });
 await test('record match exact tag, case-insensitive name, partial UUID and ambiguity',async()=>{
  assert.equal((await run('animal','iRoNbArK aTlAs')).animal.tag,'IB-S01');assert.equal((await run('animal','00000011')).animal.tag,'IB-S01');
  await assert.rejects(()=>run('animal','Ironbark'),/6 matches/);await assert.rejects(()=>run('animal','none'),/0 matches/);
  assert.equal((await run('animal','IB-C01')).weights.length,2);
 });
 await test('reject invalid dates, missing values, malformed flags and command',async()=>{
  assert.throws(()=>date('2026-02-30'));assert.throws(()=>date('01/02/2026'));assert.equal(date('2028-02-29'),'2028-02-29');
  await assert.rejects(()=>run('herd','--unexpected'));await assert.rejects(()=>run('add','animals','--tag'));await assert.rejects(()=>run('send'));
 });
 await test('create animal, weighing, note and update timestamp',async()=>{
  const a=await run('add','animals','--tag=TEST-1','--name=Test Heifer','--sex=F','--born=2026-01-01','--property=DEMO-AU');
  const updated=await run('set','animals','TEST-1','mob','Replacement heifers');assert.equal(updated.mob,'Replacement heifers');assert.ok(new Date(updated.updated_at)>=new Date(a.updated_at));
  await run('add','weights','--animal=TEST-1','--weighed=2026-09-01','--kg=230');await run('log','TEST-1','Check paddock fence');assert.equal((await run('animal','TEST-1')).notes.length,1);
  await assert.rejects(()=>run('add','weights','--animal=TEST-1','--weighed=2026-09-02','--kg=-1'));
  await assert.rejects(()=>run('add','weights','--animal=TEST-1','--weighed=2025-12-01','--kg=20'),/predates/);
  await assert.rejects(()=>run('set','animals','TEST-1','tag','RENAMED'));
 });
 const fixture=(n)=>path.join(REPO_ROOT,'examples/herdmaster',n+'.csv');
 const importArgs=Object.keys(entities).map(n=>'--'+n+'='+fixture(n));
 await test('dry run validates all history and rolls back',async()=>{const before=(await run('herd')).length;const r=await run('import','herdmaster',...importArgs,'--dry-run');assert.equal(r.validated.animals,3);assert.equal((await run('herd')).length,before);assert.equal((await run('properties')).length,2);});
 await test('full import and idempotent reimport',async()=>{
  await run('import','herdmaster',...importArgs);await run('import','herdmaster',...importArgs);
  const a=await run('animal','IMPORT-BULL');assert.equal(a.weights.length,0);assert.equal(a.movements.length,1);assert.equal(a.treatments.length,1);assert.equal(a.ebvs.length,1);assert.equal(a.lots.length,1);
  const c=await run('animal','IMPORT-COW');assert.equal(c.joinings[0].result,'calved');assert.equal(c.calvings.length,1);assert.equal((await run('animal','IMPORT-CALF')).animal.dam_tag,'IMPORT-COW');
 });
 await test('calving consistency and sex checks',async()=>{
  await assert.rejects(()=>run('add','joinings','--dam=IMPORT-BULL','--sire=IMPORT-COW','--joined=2026-01-01','--due=2026-10-01'),/female/);
  await assert.rejects(()=>run('add','calvings','--dam=IMPORT-COW','--calf=TEST-1','--calved=2026-01-02'),/birth/);
  await assert.rejects(()=>run('set','weights','IMPORT-W1','weighed','2020-01-01'),/predates/);
 });
 await test('header mapping, BOM, quoting and explicit day-first dates',async()=>{
  const f=path.join(tmp,'mapped.csv'),m=path.join(tmp,'map.json');fs.writeFileSync(f,'\uFEFFCode,Full name,Gender,Birthday,Farm\r\nMAPPED,"Cow, \"\"Special\"\"\nName",Female,03/04/2026,IMPORT-AU\r\n');fs.writeFileSync(m,JSON.stringify({animals:{tag:'Code',name:'Full name',sex:'Gender',born:'Birthday',property:'Farm'}}));
  await run('import','herdmaster','--animals='+f,'--map='+m,'--date-format=dmy');assert.equal((await run('animal','MAPPED')).animal.born,'2026-04-03');
 });
 await test('bad import rolls back preceding rows and all files',async()=>{
  const f=path.join(tmp,'bad.csv');const n=(await run('herd')).length;
  for(const body of ['tag,name,sex,born,property\nGOOD,Good,F,2026-01-01,IMPORT-AU\nBAD,Bad,F,2026-02-30,IMPORT-AU\n','tag,name,sex,born,property\nDUP,One,F,2026-01-01,IMPORT-AU\nDUP,Two,F,2026-01-01,IMPORT-AU\n','tag,tag\nA,B\n','tag,name,sex,born,property\nA,"Unclosed,F,2026-01-01,IMPORT-AU\n']){fs.writeFileSync(f,body);await assert.rejects(()=>run('import','herdmaster','--animals='+f));assert.equal((await run('herd')).length,n);}
  fs.writeFileSync(f,'external_id,animal,weighed,kg\nBAD-W,NONEXISTENT,2026-09-01,250\n');await assert.rejects(()=>run('import','herdmaster','--weights='+f));
 });
 await test('reimport preserves fields absent from export',async()=>{
  await run('set','animals','IMPORT-COW','mob','Keep me');await run('import','herdmaster','--animals='+fixture('animals'));assert.equal((await run('animal','IMPORT-COW')).animal.mob,'Keep me');
 });
 await test('NAIT boundaries and receipt recording',async()=>{
  const a=(await run('animal','TEST-1')).animal;await db.query("update animals set property_id=(select id from properties where code='DEMO-NZ'),born=current_date-179,eid=null,tagged=null,registered=null where id=$1",[a.id]);
  assert.ok(!(await run('compliance')).some(x=>x.tag==='TEST-1'&&x.rule==='nait-tag-review'));
  await db.query('update animals set born=current_date-180 where id=$1',[a.id]);assert.ok((await run('compliance')).some(x=>x.tag==='TEST-1'&&x.rule==='nait-tag-review'));
  await db.query("update animals set eid='TEST-EID',tagged=current_date-7 where id=$1",[a.id]);assert.ok((await run('compliance')).some(x=>x.tag==='TEST-1'&&x.rule==='nait-registration-review'));
  const today=(await db.query('select current_date::text as d'))[0].d;await run('set','animals','TEST-1','registered',today);assert.ok(!(await run('compliance')).some(x=>x.tag==='TEST-1'&&x.rule==='nait-registration-review'));
  await run('set','movements','M-1','receipt','DEMO-RECEIPT');assert.ok((await run('movements')).find(x=>x.tag==='IB-C01').review==='receipt overdue');
  await run('set','movements','M-1','recorded_at',new Date().toISOString());assert.equal((await run('movements')).find(x=>x.tag==='IB-C01').review,'recorded after reminder');
 });
 await test('treatment expiry, unknown intervals and sale-date boundary',async()=>{
  const l=(await db.query("select * from lots where external_id='L-1'"))[0];
  await db.query("update treatments set meat_clear=$1,export_clear=$1 where external_id='T-1'",[l.sale_date]);assert.equal((await run('sale-readiness')).find(x=>x.tag==='IB-C01').treatment_reviews,0);
  await db.query("update treatments set product_expiry=treated-1 where external_id='T-1'");assert.ok((await run('compliance')).some(x=>x.tag==='IB-C01'&&x.rule==='product-expiry'));
  await run('set','treatments','T-1','export_clear','NULL');assert.equal((await run('sale-readiness')).find(x=>x.tag==='IB-C01').treatment_reviews,1);
 });
 await test('private draft, complete export and escaping',async()=>{
  const d=await run('draft-sale','L-1');assert.equal(d.sent,false);assert.match(fs.readFileSync(d.file,'utf8'),/not a movement document/);
  const f=path.join(tmp,'backup.json');await run('export','--out='+f);const out=JSON.parse(fs.readFileSync(f));for(const n of [...Object.keys(entities),'notes'])assert.ok(Array.isArray(out[n]),n);assert.equal(out.animals.length,(await run('herd')).length);
  await run('set','animals','IMPORT-BULL','name','<script>alert(1)</script>');
 });
 await db.close();db=null;
 await test('real CLI JSON and ambiguity status',async()=>{assert.ok(JSON.parse(cli('herd.mjs',['herd','--json']).stdout).length>8);assert.match(cli('herd.mjs',['animal','Ironbark'],1).stderr,/matches/);});
 await test('branded documents and views',async()=>{
  cli('view.mjs');cli('docs.mjs');const view=fs.readFileSync(path.join(tmp,'views/week.html'),'utf8');assert.match(view,/Ironbark &amp; Kauri/);
  for(const n of ['sale-catalogue','treatment-register','movement-checklist','calving-book'])assert.ok(fs.readdirSync(path.join(tmp,'docs-out',n)).length>0);
  const catalogue=fs.readdirSync(path.join(tmp,'docs-out/sale-catalogue')).map(n=>fs.readFileSync(path.join(tmp,'docs-out/sale-catalogue',n),'utf8')).join('');assert.match(catalogue,/&lt;script&gt;/);assert.ok(!catalogue.includes('<script>'));
 });
 console.log(`PASS: ${checks} checks; ${fs.readdirSync(path.join(REPO_ROOT,'.claude/commands')).length} command recipes; ${process.env.TEST_DATABASE_URL?'PostgreSQL':'PGlite'}`);
}finally{if(db)await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
