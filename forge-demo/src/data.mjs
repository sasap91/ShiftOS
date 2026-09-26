import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { referencePlants } from './reference-plants.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = resolve(ROOT, 'COOLIT_Synthetic_Enterprise_Data_v2');
export const TENANT = 'TEN-COOLIT-SYN-001';
export const SITE = 'SITE-COOLIT-SYN-01';
export const AS_OF = '2026-09-25T23:59:59-06:00';
export const zones = referencePlants[0].zones;
export const pretty = s => String(s ?? '').replaceAll('_',' ').toLowerCase().replace(/^./, c=>c.toUpperCase());

// RFC 4180 parser: escaped quotes, commas and embedded newlines remain intact.
export function parseCSV(text) {
  const matrix=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"'){field+='"';i++;} else quoted=!quoted; }
    else if(c===',' && !quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))matrix.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw new Error('Unterminated CSV quote');
  if(field||row.length){row.push(field);matrix.push(row);}
  const headers=(matrix.shift()??[]).map(x=>x.replace(/^\uFEFF/,''));
  return matrix.map((values,index)=>{if(values.length!==headers.length)throw new Error(`CSV record ${index+2}: column count mismatch`);return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));});
}
const walk = dir => readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);
const ignoredFields = new Set(['tenant_id','site_id','source_system','source_object','source_record_id','canonical_id','crosswalk_status','source_event_at','ingested_at','effective_from','effective_to','record_version','supersedes_source_record_id','is_deleted','semantic_status','uom','currency','data_quality_state','freshness_state','transformation_version','customer_scope','program_scope','product_scope','sensitivity_class','snapshot_id','scenario_id']);
export const business = row => Object.fromEntries(Object.entries(row).filter(([k,v])=>!ignoredFields.has(k)&&v!==''));
export const valid = r => (!r.tenant_id || r.tenant_id===TENANT)&&(!r.site_id||r.site_id===SITE)&&r.is_deleted!=='true'&&(!r.data_quality_state||r.data_quality_state==='VALID')&&(!r.crosswalk_status||r.crosswalk_status==='RESOLVED');
export const eligible = r => valid(r)&&r.quality_state==='RELEASED'&&(!r.expiry_date||r.expiry_date>=AS_OF.slice(0,10))?Number(r.eligible_qty)||0:0;

export function loadStore({memory=false}={}) {
  mkdirSync(resolve(ROOT,'.forge'),{recursive:true});
  const db=new DatabaseSync(memory?':memory:':resolve(ROOT,'.forge/search.sqlite'));
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT); CREATE TABLE IF NOT EXISTS documents (id INTEGER PRIMARY KEY, path TEXT, record_index INTEGER, record_id TEXT, tenant TEXT, kind TEXT, payload TEXT); CREATE INDEX IF NOT EXISTS documents_lookup ON documents(path,record_id); CREATE INDEX IF NOT EXISTS documents_identifier ON documents(record_id,tenant); CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(title,body,tokenize="unicode61");');
  const files=walk(DATA).filter(p=>/\.(csv|md|yaml|json)$/.test(p)).sort();
  files.push(resolve(ROOT,'PRD.md'));
  const hash=createHash('sha256');const tables=new Map();const rawFiles=[];
  for(const path of files){const text=readFileSync(path,'utf8');hash.update(path).update(text);rawFiles.push({path,text});if(path.endsWith('.csv'))tables.set(relative(DATA,path),parseCSV(text));}
  // Bump this when index serialization changes.
  const fingerprint=hash.update('forge-index-v5').digest('hex');
  if(db.prepare("SELECT value FROM meta WHERE key='fingerprint'").get()?.value!==fingerprint){
    db.exec('BEGIN; DELETE FROM documents; DELETE FROM search;');
    const insert=db.prepare('INSERT INTO documents (path,record_index,record_id,tenant,kind,payload) VALUES (?,?,?,?,?,?)');
    const fts=db.prepare('INSERT INTO search(rowid,title,body) VALUES (?,?,?)');
    const add=(path,index,id,tenant,kind,payload,title,body)=>{const r=insert.run(path,index,id,tenant,kind,JSON.stringify(payload));fts.run(r.lastInsertRowid,title,body);};
    for(const {path,text} of rawFiles){
      const name=relative(DATA,path);
      if(path.endsWith('.csv')){
        for(const [index,row] of tables.get(name).entries()){
          if((row.tenant_id&&row.tenant_id!==TENANT)||(row.site_id&&row.site_id!==SITE))continue;
          const id=row.source_record_id||Object.values(row)[0]||String(index+1);
          const kind=name==='data/negative_test_record.csv'?'quarantined-test':!valid(row)?'excluded-record':'source-record';
          add(name,index+1,id,TENANT,kind,row,`${name.replaceAll('_',' ')} ${id}`,Object.entries(business(row)).map(([k,v])=>`${k.replaceAll('_',' ')}: ${v}`).join('\n'));
        }
      }else{
        // Chunk every supplied document; source code and images stay out of factual retrieval.
        for(let offset=0;offset<text.length;offset+=4500){const chunk=text.slice(offset,offset+4500);add(name,Math.floor(offset/4500)+1,`${path===resolve(ROOT,'PRD.md')?'PRD':name} #${Math.floor(offset/4500)+1}`,TENANT,'reference-document',{text:chunk},name,chunk);}
      }
    }
    db.prepare("INSERT OR REPLACE INTO meta VALUES ('fingerprint',?)").run(fingerprint);db.exec('COMMIT;');
  }
  const table = name => (tables.get(name+'.csv')??[]).filter(valid);
  const source = (name,row) => db.prepare('SELECT id FROM documents WHERE path=? AND record_id=? LIMIT 1').get(name+'.csv',row.source_record_id)?.id;
  const configs=new Map(table('erp/product_configuration').map(r=>[r.configuration_revision_id,r]));
  const workOrders=table('erp/work_order');
  const woMap=new Map(workOrders.map(w=>[w.work_order_id,w]));
  const operations=table('mes/work_order_operation');
  const links=table('mes/work_order_commitment');
  const commitments=table('governed/canonical_commitment');
  const accounts=new Map(table('crm/account').map(r=>[r.account_id,r]));
  const zoneFor = op => op.operation_code==='KITTING'?1:op.operation_code==='ASSEMBLY'?({'LINE-CPL-01':2,'LINE-RM-01':3,'LINE-CDU-01':4}[op.resource_id]??2):['PRESSURE_TEST','LEAK_TEST'].includes(op.operation_code)?5:op.operation_code==='FUNCTIONAL_TEST'?6:8;
  const work=workOrders.map(w=>{
    const ops=operations.filter(o=>o.work_order_id===w.work_order_id).sort((a,b)=>Number(a.operation_sequence)-Number(b.operation_sequence));
    const op=ops.find(o=>['HOLD','RUN'].includes(o.operation_status))||ops.find(o=>o.operation_status!=='COMPLETE')||ops.at(-1);
    return {id:w.work_order_id,configuration:w.configuration_id,revision:w.configuration_revision_id,status:w.work_order_status,zone:op?zoneFor(op):null,planned:w.work_order_status==='PLANNED_UNRELEASED',complete:w.work_order_status==='COMPLETED',quantity:Number(w.order_quantity),currentOperation:op?pretty(op.operation_code):'Unknown',operations:ops.map(o=>({...business(o),source:source('mes/work_order_operation',o)})),source:source('erp/work_order',w)};
  });
  const orders=commitments.map(c=>{
    const related=links.filter(l=>l.commitment_id===c.commitment_id);
    const compatible=related.filter(l=>woMap.get(l.work_order_id)?.configuration_revision_id===c.configuration_revision_id);
    const conflicts=related.filter(l=>!compatible.includes(l)).map(l=>({workOrder:l.work_order_id,expected:c.configuration_revision_id,actual:woMap.get(l.work_order_id)?.configuration_revision_id,source:source('mes/work_order_commitment',l)}));
    const matched=compatible.map(l=>work.find(w=>w.id===l.work_order_id));
    const active=matched.find(w=>!w.complete)||matched[0];
    const finished=['DELIVERED','SHIPPED'].includes(c.commitment_status);
    const configuration=configs.get(c.configuration_revision_id);
    const held=matched.some(w=>w.status==='ON_HOLD');
    return {id:c.commitment_id,name:`${pretty(configuration?.product_family||c.configuration_id)} · ${c.configuration_id.replace('CFG-','')}`,configuration:c.configuration_revision_id,customer:accounts.get(c.account_id)?.account_name||c.customer_id,quantity:Number(c.order_quantity),status:c.commitment_status,risk:c.risk_state,tone:held?'hold':c.risk_state==='AT_RISK'?'risk':c.risk_state==='WATCH'?'watch':'track',reason:c.risk_reason,priority:c.priority_class,due:c.approved_commit_date,requested:c.requested_date,shipped:c.actual_ship_date,delivered:c.actual_delivery_date,zone:finished?null:active?.zone??null,location:finished?pretty(c.commitment_status):!active?'Location unresolved':active.planned?`Planned · ${zones[active.zone]}`:active.complete?'Production complete · shipment gates unverified':zones[active.zone],planned:active?.planned??false,complete:finished,workOrderIds:matched.map(w=>w.id),conflicts,source:source('governed/canonical_commitment',c),snapshot:c.snapshot_id};
  }).sort((a,b)=>a.due.localeCompare(b.due));
  const conflictCount=orders.reduce((s,o)=>s+o.conflicts.length,0);
  const health={asOf:AS_OF,fingerprint,businessTables:table('schema/table_catalog').length,csvFiles:tables.size,totalRows:[...tables.values()].reduce((s,r)=>s+r.length,0),indexedRecords:db.prepare('SELECT count(*) n FROM documents').get().n,conflictingLinks:conflictCount,quarantinedTests:(tables.get('data/negative_test_record.csv')??[]).length,inventoryExcluded:table('erp/inventory_state').filter(r=>eligible(r)===0&&Number(r.on_hand_qty)>0).length};
  const stats={active:orders.filter(o=>!o.complete).length,attention:orders.filter(o=>!o.complete&&o.risk!=='ON_TRACK').length,inProcess:work.filter(w=>['IN_PROCESS','ON_HOLD'].includes(w.status)).length,unresolved:orders.filter(o=>!o.complete&&o.conflicts.length).length,delivered:orders.filter(o=>o.status==='DELIVERED').length};
  const coolit={id:'coolit',name:'CoolIT Systems',type:referencePlants[0].type,subtitle:referencePlants[0].subtitle,image:'coolit.png',zones,mode:'connected',orders,work,stats,health};
  const previews=referencePlants.slice(1).map((p,i)=>({id:i===0?'boyd':'airedale',name:p.name,type:p.type,subtitle:p.subtitle,image:p.image,zones:p.zones,mode:'illustrative',orders:p.orders.map(o=>({id:o[0],name:o[1],quantity:o[2],zone:o[3],location:p.zones[o[3]],tone:o[4],risk:o[4]==='track'?'ON_TRACK':'AT_RISK',due:'2026-'+({Sep:'09',Oct:'10'}[o[5].slice(0,3)])+'-'+o[5].slice(-2),reason:o[6],status:'ILLUSTRATIVE',customer:'Illustrative order',workOrderIds:[],conflicts:[],configuration:o[1],priority:'—'})),work:[],stats:{active:6,attention:2,inProcess:2,unresolved:0},health:null}));
  const getEvidence=id=>{const r=db.prepare('SELECT * FROM documents WHERE id=? AND tenant=?').get(id,TENANT);return r?{id:r.id,path:r.path,recordIndex:r.record_index,recordId:r.record_id,kind:r.kind,data:JSON.parse(r.payload)}:null;};
  return {db,table,source,orders,work,health,stats,plants:[coolit,...previews],getEvidence};
}

const stop=new Set('a an the is are was were what which who how where when can could should please me my about for from with this that of to in and or do does need show all tell it its on at'.split(' '));
export function retrieve(store,query,{selectedOrder,history=[]}={}){
  const explicit=query.toUpperCase().match(/\b(?:COM|WO|CFG|P-COMP|INV|DR|PO-SCH|TEST|EVT|SUP|ACC|CUST)-[A-Z0-9-]+\b/g)||[];
  const contextual=/selected|this order|that order|\bit\b|\bits\b/i.test(query)||query.split(/\s+/).length<7;
  const selected=store.orders.find(o=>o.id===(explicit.find(x=>x.startsWith('COM-'))||(contextual?selectedOrder:null)));
  const retrievalQuery=query+(selected?` ${selected.id} ${selected.configuration} ${selected.workOrderIds.join(' ')}`:'')+(contextual&&history.length?` ${history.filter(h=>h.role==='user').at(-1)?.content.slice(0,300)||''}`:'');
  const tokens=[...new Set(retrievalQuery.toLowerCase().match(/[a-z0-9]+/g)||[])].filter(t=>t.length>1&&!stop.has(t)).slice(0,45);
  const expression=tokens.map(t=>`"${t}"`).join(' OR ');
  let rows=expression?store.db.prepare('SELECT documents.id,bm25(search,5,1) score FROM search JOIN documents ON documents.id=search.rowid WHERE search MATCH ? AND documents.tenant=? ORDER BY score LIMIT 80').all(expression,TENANT):[];
  const seeds=[];
  if(selected){seeds.push(selected.source,...selected.conflicts.map(c=>c.source));for(const id of selected.workOrderIds){const w=store.work.find(w=>w.id===id);seeds.push(w.source,...w.operations.slice(0,5).map(o=>o.source));}}
  if(/attention|risk|bottleneck|delay|constraint|recover|hold|supplier|leak/i.test(query)){
    for(const row of store.table('governed/injected_event_expected_outcome'))seeds.push(store.source('governed/injected_event_expected_outcome',row));
    for(const row of store.orders.filter(o=>o.risk==='AT_RISK'))seeds.push(row.source);
    if(/recover|alternative|scenario|cost/i.test(query)){const d=store.table('governed/decision_run').at(-1);seeds.push(store.source('governed/decision_run',d));}
  }
  if(/inventory|eligible|held|hold|expired|unqualified/i.test(query))for(const r of store.table('erp/inventory_state').filter(r=>r.quality_state!=='RELEASED'))seeds.push(store.source('erp/inventory_state',r));
  // Exact source identifiers outrank generic terms.
  for(const id of explicit){for(const r of store.db.prepare('SELECT id FROM documents WHERE record_id=? AND tenant=?').all(id,TENANT))seeds.unshift(r.id);}
  const ids=[...new Set([...seeds,...rows.map(r=>r.id)].filter(Boolean))];
  const counts=new Map();const evidence=[];let chars=0;
  for(const id of ids){const d=store.getEvidence(id);if(!d)continue;const n=counts.get(d.path)||0;if(n>=6&&!seeds.includes(id))continue;const text=JSON.stringify(d.data);if(chars+text.length>62000)continue;counts.set(d.path,n+1);evidence.push(d);chars+=text.length;if(evidence.length>=26)break;}
  return {evidence,selected,summary:{asOf:AS_OF,stats:store.stats,health:store.health,selected:selected??null,definitions:{active:'Commitment status is neither SHIPPED nor DELIVERED',attention:'Active commitments with AT_RISK or WATCH source risk',inProcess:'Work orders with IN_PROCESS or ON_HOLD source status',unresolved:'Active commitments with an incompatible configuration revision on their MES allocation link'},attentionOrders:store.orders.filter(o=>!o.complete&&o.risk!=='ON_TRACK').map(o=>({id:o.id,risk:o.risk,due:o.due,reason:o.reason})),notice:'Historical synthetic snapshot. Derived locations use only revision-compatible MES work-order allocations. A completed work order is not shipment readiness. Scenario alternatives are supplied fixture results, not a new solver run.'}};
}
if(process.argv.includes('--inspect')){const s=loadStore();console.log(JSON.stringify(s.health,null,2));s.db.close();}
