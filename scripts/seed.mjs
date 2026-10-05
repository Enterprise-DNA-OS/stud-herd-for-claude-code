import fs from 'node:fs';
import path from 'node:path';
import {getDb,loadEnv,REPO_ROOT} from './lib/db.mjs';
loadEnv();
if(process.env.DATABASE_URL||!process.argv.includes('--demo'))throw Error('Seed is fictional: use npm run demo or seed -- --demo with a separate DATA_DIR');
const db=await getDb();try{await db.exec(fs.readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));console.log('Fictional demo seed loaded');}finally{await db.close();}
