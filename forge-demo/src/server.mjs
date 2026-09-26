import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { ROOT, loadStore, retrieve } from './data.mjs';
import { answer } from './anthropic.mjs';
import { createRecoveryService, FIXTURE } from './recovery.mjs';
import { createDecisionRoom, selectGroundedClaims } from './decision-room.mjs';

export function createApp({store=loadStore(),fetcher=fetch,roomPrincipal}={}){
  let apiKey=process.env.ANTHROPIC_API_KEY||'';
  let model=process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6';
  const csrf=randomBytes(24).toString('hex');
  const rates=new Map(); let inFlight=0;
  const recovery=createRecoveryService(store.db);
  const room=createDecisionRoom({db:store.db,principal:roomPrincipal,explain:input=>apiKey?selectGroundedClaims({...input,key:apiKey,model,fetcher}):null});
  const config=()=>({configured:!!apiKey,model,csrf,storage:'server-memory',provider:'Anthropic'});
  const server=createServer(async(req,res)=>{
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
    const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json',...headers});res.end(JSON.stringify(body));};
    try {
      const host=req.headers.host||'';
      if(!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host))return send(403,{error:'This local workspace accepts localhost requests only.'});
      const url=new URL(req.url,`http://${host}`);
      if(req.headers.origin&&req.headers.origin!==url.origin)return send(403,{error:'Cross-origin requests are not allowed.'});
      let body={};
      if(req.method==='POST'){
        if(req.headers['x-forge-csrf']!==csrf)return send(403,{error:'Reload the workspace and try again.'});
        if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON request required.'});
        let raw='';for await(const c of req){raw+=c;if(raw.length>32000)return send(413,{error:'Request is too large.'});}
        try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid JSON request.'});}
        if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'Invalid request.'});
      }
      if(req.method==='GET'&&url.pathname==='/api/room')return send(200,{...room.bundle(url.searchParams.get('run')),connection:config()});
      if(req.method==='POST'&&url.pathname==='/api/room/tool')return send(200,room.gateway(body));
      if(req.method==='POST'&&url.pathname==='/api/room/approval')return send(200,room.approve(body));
      if(req.method==='POST'&&url.pathname==='/api/room/turn'){
        const who='room:'+req.socket.remoteAddress;const now=Date.now();const times=(rates.get(who)||[]).filter(t=>now-t<60000);
        if(times.length>=12||inFlight>=3)return send(429,{error:'Too many requests. Please wait a moment.'});times.push(now);rates.set(who,times);inFlight++;
        try{return send(200,{turn:await room.turn(body)});}finally{inFlight--;}
      }
      if(req.method==='GET'&&url.pathname==='/api/recovery')return send(200,{fixture:FIXTURE,run:recovery.latest(),connection:config()});
      if(req.method==='POST'&&url.pathname==='/api/recovery/run')return send(200,{run:recovery.create(body.outageHours)});
      if(req.method==='POST'&&url.pathname==='/api/recovery/route')return send(200,{run:recovery.route(body.runId,body.planId)});
      if(req.method==='POST'&&url.pathname==='/api/recovery/approve')return send(200,{run:recovery.approve(body.runId,body.name,body.rationale)});
      if(req.method==='POST'&&url.pathname==='/api/recovery/acknowledge')return send(200,{run:recovery.acknowledge(body.runId,body.name)});
      if(req.method==='POST'&&url.pathname==='/api/recovery/task')return send(200,{run:recovery.completeTask(body.runId,body.taskId)});
      if(req.method==='GET'&&url.pathname==='/api/workspace')return send(200,{plants:store.plants,connection:config()});
      if(req.method==='GET'&&url.pathname==='/api/health')return send(200,{...store.health,configured:!!apiKey});
      if(req.method==='GET'&&url.pathname==='/api/config')return send(200,config());
      if(req.method==='POST'&&url.pathname==='/api/config'){
        if(typeof body.apiKey!=='string'||body.apiKey.length<20||body.apiKey.length>500||!/^[\x21-\x7e]+$/.test(body.apiKey))return send(400,{error:'Enter a valid Anthropic API key.'});
        if(typeof body.model!=='string'||!/^claude-[a-z0-9.-]{1,90}$/.test(body.model))return send(400,{error:'Enter a valid Claude model ID.'});
        const check=await fetcher('https://api.anthropic.com/v1/models/'+encodeURIComponent(body.model),{headers:{'x-api-key':body.apiKey,'anthropic-version':'2023-06-01'},signal:AbortSignal.timeout(15000)});
        if(!check.ok)return send(400,{error:check.status===401?'Anthropic rejected this key.':check.status===404?'This model is not available for the API key. Check the model ID.':'Could not verify this Anthropic connection. Try again.'});
        apiKey=body.apiKey;model=body.model;return send(200,config());
      }
      if(req.method==='GET'&&url.pathname.startsWith('/api/evidence/')){
        const id=Number(url.pathname.split('/').at(-1));if(!Number.isSafeInteger(id))return send(400,{error:'Invalid source ID.'});
        const evidence=store.getEvidence(id);return send(evidence?200:404,evidence||{error:'Source not found.'});
      }
      if(req.method==='GET'&&url.pathname==='/api/decisions'){
        const id=url.searchParams.get('order');if(!store.orders.some(o=>o.id===id))return send(404,{error:'Commitment not found.'});
        const decisions=store.table('governed/decision_run').filter(r=>r.affected_commitment_ids.split('|').includes(id)).map(r=>({...r,source:store.source('governed/decision_run',r),alternatives:JSON.parse(r.alternatives_json),approvals:store.table('governed/approval').filter(a=>a.decision_run_id===r.decision_run_id),receipts:store.table('governed/action_receipt').filter(a=>a.decision_run_id===r.decision_run_id),outcomes:store.table('governed/observed_outcome').filter(a=>a.decision_run_id===r.decision_run_id)}));
        return send(200,{decisions});
      }
      if(req.method==='POST'&&url.pathname==='/api/chat'){
        if(body.plant!=='coolit')return send(422,{error:'This company has a layout preview only. No enterprise dataset is supplied for retrieval. Select CoolIT Systems to use the assistant.'});
        if(typeof body.question!=='string'||!body.question.trim()||body.question.length>4000)return send(400,{error:'Enter a question of 1–4,000 characters.'});
        if(body.selectedOrder&&!store.orders.some(o=>o.id===body.selectedOrder))return send(400,{error:'Unknown commitment.'});
        const history=body.history??[];
        if(!Array.isArray(history)||history.length>8||history.some(h=>!h||!['user','assistant'].includes(h.role)||typeof h.content!=='string'||h.content.length>5000))return send(400,{error:'Invalid conversation history.'});
        const who=req.socket.remoteAddress;const now=Date.now();const times=(rates.get(who)||[]).filter(t=>now-t<60000);
        if(times.length>=12||inFlight>=3)return send(429,{error:'Too many requests. Please wait a moment.'});times.push(now);rates.set(who,times);
        const retrieval=retrieve(store,body.question,{selectedOrder:body.selectedOrder,history});
        if(body.recoveryRun){
          const run=recovery.latest();
          if(!run||run.id!==body.recoveryRun)return send(409,{error:'The incident changed. Refresh before asking about it.'});
          if(body.selectedRecoveryOrder&&!run.analysis.normal.some(o=>o.id===body.selectedRecoveryOrder))return send(400,{error:'Unknown recovery order.'});
          retrieval.summaryTitle='Deterministic test-outage recovery calculation';
          retrieval.summary={...run.analysis,runId:run.id,workflow:{status:run.status,selectedPlan:run.selectedPlan,manager:run.manager,supervisor:run.supervisor,tasks:run.tasks},selectedOrder:body.selectedRecoveryOrder||null,authority:'This is the current synthetic incident. Original enterprise-pack records below are background only and must not change these scenario facts.'};
          retrieval.evidence=[{id:'recovery-fixture',path:'fixtures/test-outage.json',recordId:FIXTURE.id,kind:'synthetic-scenario-assumptions',data:FIXTURE},...retrieval.evidence.slice(0,8)];
        }
        if(!apiKey)return send(200,{mode:'retrieval',message:'Source search is ready. Connect Anthropic to get a synthesized, cited answer.',sources:retrieval.evidence.slice(0,8),summary:retrieval.summary});
        inFlight++;
        try{const result=await answer({key:apiKey,model,question:body.question,history,retrieval,fetcher});return send(200,{...result,sources:retrieval.evidence});}finally{inFlight--;}
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'Method not allowed.'});
      const routes={'/decision-room':'decision-room.html','/decision-room.js':'decision-room.js','/decision-room.css':'decision-room.css','/':'index.html','/index.html':'index.html','/workspace':'workspace.html','/recovery.js':'recovery.js','/recovery.css':'recovery.css','/app.js':'app.js','/style.css':'style.css','/assets/coolit.png':'assets/coolit.png','/assets/boyd.png':'assets/boyd.png','/assets/airedale.png':'assets/airedale.png'};
      const file=routes[url.pathname];if(!file)return send(404,{error:'Not found.'});
      const data=await readFile(resolve(ROOT,'public',file));
      res.writeHead(200,{...headers,'content-type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'})[extname(file)]});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){const timeout=['TimeoutError','AbortError'].includes(error.name);send(error.status||502,{error:timeout?'The provider took too long to respond. Please try again.':(error.expose||error.message?.startsWith('Anthropic'))?error.message:'The request could not be completed. Please try again.'});}
  });
  server.requestTimeout=70000;server.headersTimeout=10000;
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const port=Number(process.env.PORT||3000);const app=createApp();app.listen(port,'127.0.0.1',()=>console.log(`FORGE is ready at http://localhost:${port}`));}
