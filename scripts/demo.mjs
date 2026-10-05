import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,loadEnv,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {execute,format} from './herd.mjs';
loadEnv();if(process.env.DATABASE_URL)throw Error('Demo refuses DATABASE_URL');
process.env.DATA_DIR=path.join(REPO_ROOT,'.data/demo');
const db=await getDb();try{await migrate(db);await db.exec(fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));for(const cmd of ['calving-watch','sale-readiness','attention']){console.log('\n'+cmd+'\n'+format(await execute(db,[cmd])));}}finally{await db.close();}
for(const script of ['view.mjs','docs.mjs']){const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script)],{env:process.env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
