import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
export const commands={
 help:'',orders:'',drivers:'',vehicles:'',routes:'',travel:'',attention:'',unassigned:'',failures:'',history:'',activity:'',
 'route-sheet':'route','customer-review':'','driver-load':'','weekly-review':'',compliance:'',
 'add-driver':'name licence actor','add-vehicle':'name capacity inspection actor',
 'add-order':'name address location due start end units service notes actor',
 'confirm-order':'order address start end units service actor',
 'travel-add':'origin destination minutes evidence checked actor',
 'plan-route':'name driver vehicle date depot start end actor','release-route':'route actor','cancel-route':'route actor',
 'record-outcome':'order outcome evidence actor','log-work':'driver from to kind evidence actor',
 import:'file dry-run actor',export:'file','draft-dispatch':'route file'
};
const sets=['drivers','vehicles','orders','travel','routes','stops','outcomes','work','audit'];
const need=(o,k)=>{if(o[k]===undefined||o[k]===true||String(o[k]).trim()==='')throw Error(`Required --${k}`);return String(o[k]).trim();};
const number=(v,label,min=0,max=1e8)=>{if(v===undefined||v===null||v===''||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)throw Error(`Invalid ${label}`);return Number(v);};
const integer=(v,label,min=0,max=1440)=>{const n=number(v,label,min,max);if(!Number.isInteger(n))throw Error(`Invalid ${label}`);return n;};
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Use a real ISO date YYYY-MM-DD');return v;}
export function minute(v){if(!/^\d{2}:\d{2}$/.test(v))throw Error('Use HH:MM');const [h,m]=v.split(':').map(Number);if(h>23||m>59)throw Error('Invalid clock time');return h*60+m;}
const day=()=>new Date().toISOString().slice(0,10);
const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const stamp=v=>{if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v))throw Error('Use UTC YYYY-MM-DDTHH:MM:SSZ');date(v.slice(0,10));minute(v.slice(11,16));if(!Number.isFinite(Date.parse(v))||Number(v.slice(17,19))>59)throw Error('Invalid timestamp');return v;};
export async function resolve(db,table,ref){if(!['orders','drivers','vehicles','routes'].includes(table))throw Error('Invalid record type');const rows=await db.query(`select * from delivery.${table} where lower(name)=lower($1) or left(id::text,length($1))=lower($1) order by name`,[ref]);if(rows.length!==1){const all=rows.length?rows:await db.query(`select id,name from delivery.${table} order by name`);throw Error(`${rows.length?'Ambiguous':'No matching'} ${table}: ${ref}\n${all.map(r=>`${r.id} ${r.name}`).join('\n')}`);}return rows[0];}
async function audit(db,action,actor,detail){await db.query('insert into delivery.audit(action,actor,detail) values($1,$2,$3)',[action,actor,JSON.stringify(detail)]);}
async function txn(db,fn){await db.exec('BEGIN');try{const out=await fn();await db.exec('COMMIT');return out;}catch(e){await db.exec('ROLLBACK');throw e;}}
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function routeSnapshot(db,route){const driver=(await db.query('select * from delivery.drivers where id=$1',[route.driver_id]))[0];const vehicle=(await db.query('select * from delivery.vehicles where id=$1',[route.vehicle_id]))[0];const orders=await db.query('select o.* from delivery.orders o join delivery.stops s on s.order_id=o.id where s.route_id=$1 order by s.sequence',[route.id]);const legs=await db.query('select * from delivery.travel order by origin,destination');return hash({driver,vehicle,orders,legs});}
export async function compliance(db){const findings=[];for(const x of await db.query('select * from delivery.exceptions'))findings.push({name:x.name,rule:'DISPATCH-REVIEW',finding:x.reason});
 for(const d of await db.query('select * from delivery.drivers order by name')){
  const rows=await db.query('select * from delivery.work where driver_id=$1 order by started_at',[d.id]);
  findings.push({name:d.name,rule:'COVERAGE',finding:rows.length?'Recorded intervals only; other employment and earlier history require reconciliation':'No work intervals recorded; compliance unknown'});
  let last=null,continuous=0,daily=0,period=0;
  for(const r of rows){const start=Date.parse(r.started_at),end=Date.parse(r.ended_at),gap=last===null?Infinity:(start-last)/60000;
   if(gap>=30)continuous=0;if(gap>=600)daily=0;if(gap>=1440)period=0;
   const mins=(end-start)/60000;continuous+=mins;daily+=mins;period+=mins;
   for(const [rule,total,limit] of [['NZ-WT-5.5',continuous,330],['NZ-WT-13',daily,780],['NZ-WT-70',period,4200]])if(total>limit)findings.push({name:d.name,rule,finding:`${total} recorded work minutes exceed ${limit}; interval ends ${new Date(end).toISOString()}`});last=end;
  }
 }
 return findings;
}
async function plan(db,o){
 const d=await resolve(db,'drivers',need(o,'driver')),v=await resolve(db,'vehicles',need(o,'vehicle')),dt=date(need(o,'date')),depot=need(o,'depot');
 if(dt<day())throw Error('Cannot plan a past date');if(!d.active||d.licence_until<dt||v.inspection_until<dt)throw Error('Driver or vehicle eligibility expired');
 if((await db.query("select id from delivery.routes where route_date=$1 and status<>'cancelled' and (driver_id=$2 or vehicle_id=$3)",[dt,d.id,v.id])).length)throw Error('Driver or vehicle already assigned on this date');
 const begin=minute(need(o,'start')),end=minute(need(o,'end'));if(end<=begin)throw Error('Shift end must follow start');
 const orders=await db.query("select o.* from delivery.orders o where status='pending' and planning_ready and due<=$1 and not exists(select 1 from delivery.stops s join delivery.routes r on r.id=s.route_id where s.order_id=o.id and r.status<>'cancelled') order by due,window_end,name,id",[dt]);
 const travel=await db.query('select * from delivery.travel');
 const leg=(a,b)=>a===b?0:travel.find(x=>x.origin===a&&x.destination===b&&x.verified_on>=new Date(Date.parse(dt)-30*864e5).toISOString().slice(0,10))?.minutes;
 let now=begin,work=0,continuous=0,breaks=0,load=0,at=depot;const stops=[],skipped=[];let timeline=[];
 // Earliest due and tightest window first. Supplied road-time estimates, not optimal routing.
 for(const x of orders){const to=leg(at,x.location),back=leg(x.location,depot);let reason;
  if(to===undefined||back===undefined)reason='Missing current outbound or return travel time';
  else if(load+Number(x.units)>Number(v.capacity))reason='Vehicle capacity';
  else{
   let n=now,w=work,c=continuous,b=breaks;const events=[...timeline];
   const add=(mins,kind,place)=>{if(mins>330)return false;if(c+mins>330){events.push({kind:'planned rest',place,start:clock(n),end:clock(n+30)});n+=30;b+=30;c=0;}if(mins)events.push({kind,place,start:clock(n),end:clock(n+mins)});n+=mins;w+=mins;c+=mins;return true;};
   add(to,'travel',at+' to '+x.location);const arrival=Math.max(n,x.window_start);const wait=arrival-n;
   // Waiting is counted as work. It is never silently labelled a qualifying rest break.
   if(wait+x.service_minutes>330)reason='Waiting and service exceed continuous work limit';
   else {add(wait+x.service_minutes,'waiting and service',x.location);const depart=n;
    const returnBreak=c+back>330?30:0;
    if(depart>x.window_end)reason='Delivery window';else if(n+returnBreak+back>end)reason='Shift end including return';else if(w+back>780)reason='Daily planned work limit';
    else{stops.push({order:x,arrival:depart-x.service_minutes,departure:depart});now=n;work=w;continuous=c;breaks=b;load+=Number(x.units);at=x.location;timeline=events;}
   }
  }
  if(reason)skipped.push({name:x.name,reason});
 }
 if(!stops.length)throw Error(`No feasible orders: ${JSON.stringify(skipped)}`);
 const back=leg(at,depot);if(continuous+back>330){timeline.push({kind:'planned rest',place:at,start:clock(now),end:clock(now+30)});now+=30;breaks+=30;}timeline.push({kind:'return to depot',place:at+' to '+depot,start:clock(now),end:clock(now+back)});now+=back;work+=back;
 const [r]=await db.query('insert into delivery.routes(name,driver_id,vehicle_id,route_date,depot,start_minute,finish_minute,work_minutes,break_minutes,capacity_used,fingerprint) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *',[need(o,'name'),d.id,v.id,dt,depot,begin,now,work,breaks,load,'pending']);
 for(const [i,s] of stops.entries())await db.query('insert into delivery.stops(route_id,order_id,sequence,arrival_minute,departure_minute) values($1,$2,$3,$4,$5)',[r.id,s.order.id,i+1,s.arrival,s.departure]);
 await db.query('update delivery.routes set fingerprint=$1,timeline=$3 where id=$2',[await routeSnapshot(db,r),r.id,JSON.stringify(timeline)]);
 return {route:r.name,id:r.id,stops:stops.length,finish:clock(now),work_minutes:work,break_minutes:breaks,skipped};
}
export function human(value){if(Array.isArray(value)){if(!value.length)return 'No records.';const keys=Object.keys(value[0]);const cell=v=>v===null?'':typeof v==='object'?JSON.stringify(v):String(v);const widths=keys.map(k=>Math.max(k.length,...value.map(r=>cell(r[k]).length)));const row=r=>keys.map((k,i)=>cell(r[k]).padEnd(widths[i])).join('  ');return [row(Object.fromEntries(keys.map(k=>[k,k]))),widths.map(w=>'-'.repeat(w)).join('  '),...value.map(row)].join('\n');}return JSON.stringify(value,null,2);}
function parse(args){const [cmd='help',...rest]=args;if(!(cmd in commands))throw Error(`Unknown command ${cmd}`);const o={},pos=[];const allowed=new Set([...commands[cmd].split(' '),'json']);for(const s of rest){if(!s.startsWith('--')){pos.push(s);continue;}const i=s.indexOf('='),k=s.slice(2,i<0?undefined:i);if(!allowed.has(k)||k in o)throw Error(`Unknown or duplicate option --${k}`);o[k]=i<0?true:s.slice(i+1);if(['json','dry-run'].includes(k)&&o[k]!==true)throw Error(`--${k} is a boolean flag`);}if(pos.length&&(cmd!=='import'||pos.length!==1||pos[0]!=='optimoroute'))throw Error('Unexpected positional argument');if(cmd==='import'&&pos[0]!=='optimoroute')throw Error('Use import optimoroute');return {cmd,o};}
export async function run(db,args){const {cmd,o}=parse(args);const q=(sql,p=[])=>db.query(sql,p);
 if(cmd==='help')return Object.entries(commands).map(([command,options])=>({command,options}));
 const reads={orders:'select * from delivery.order_desk order by due,name',drivers:'select id,name,active,licence_until from delivery.drivers order by name',vehicles:'select id,name,capacity,inspection_until from delivery.vehicles order by name',routes:'select * from delivery.route_board order by route_date,name',travel:'select origin,destination,minutes,evidence,verified_on from delivery.travel order by origin,destination',attention:'select name,reason from delivery.exceptions order by name',unassigned:"select name,due,units from delivery.order_desk where route is null and status='pending' order by due,name",failures:"select name,due,notes from delivery.orders where status='failed' order by due,name",history:'select o.name,x.outcome,x.evidence,x.actor,x.created_at from delivery.outcomes x join delivery.orders o on o.id=x.order_id order by x.created_at',activity:'select action,actor,detail,created_at from delivery.audit order by created_at',
 'customer-review':"select name,count(*)::int orders,sum(units) units,count(*) filter(where status='failed')::int failed,count(*) filter(where status='pending' and due<current_date)::int overdue from delivery.orders group by name order by name",
 'driver-load':"select driver,count(*)::int routes,sum(work_minutes)::int planned_minutes,sum(stops)::int stops from delivery.route_board where status<>'cancelled' group by driver order by driver"};
 if(reads[cmd])return q(reads[cmd]);
 if(cmd==='compliance')return compliance(db);
 if(cmd==='weekly-review')return {unassigned:await run(db,['unassigned']),attention:await run(db,['attention']),routes:await run(db,['routes']),controls:await compliance(db)};
 if(cmd==='route-sheet'||cmd==='draft-dispatch'){const r=await resolve(db,'routes',need(o,'route'));const rows=await q('select s.sequence,o.name,o.address,o.units,s.arrival_minute,s.departure_minute,o.status,o.notes from delivery.stops s join delivery.orders o on o.id=s.order_id where s.route_id=$1 order by s.sequence',[r.id]);const output=rows.map(x=>({...x,arrival:clock(x.arrival_minute),departure:clock(x.departure_minute)}));if(cmd==='route-sheet')return output;const file=path.resolve(need(o,'file'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`# Dispatch draft: ${r.name}\n\nStatus: ${r.status}. Planned times only. Dispatcher must review road restrictions and work history. Nothing sent.\n\n${human(output)}\n`,{flag:'wx',mode:0o600});return {file};}
 if(cmd==='export'){const data={format:'delivery-routes-v1',exported_at:new Date().toISOString()};await db.exec('BEGIN READ ONLY');try{for(const t of sets)data[t]=await q(`select * from delivery.${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}const file=path.resolve(need(o,'file'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});return {file,record_sets:sets.length};}
 const actor=need(o,'actor');
 return txn(db,async()=>{
  // Serialise writers so allocation, eligibility and outcome checks cannot race.
  await db.exec('LOCK TABLE delivery.drivers,delivery.vehicles,delivery.orders,delivery.travel,delivery.routes,delivery.stops,delivery.outcomes,delivery.work,delivery.audit IN SHARE ROW EXCLUSIVE MODE');
  let out;
  if(cmd==='add-driver')out=await q('insert into delivery.drivers(name,licence_until) values($1,$2) returning id,name',[need(o,'name'),date(need(o,'licence'))]);
  else if(cmd==='add-vehicle')out=await q('insert into delivery.vehicles(name,capacity,inspection_until) values($1,$2,$3) returning id,name',[need(o,'name'),number(need(o,'capacity'),'capacity',0.001),date(need(o,'inspection'))]);
  else if(cmd==='add-order'){const start=minute(o.start||'08:00'),end=minute(o.end||'17:00');if(end<=start)throw Error('Window end must follow start');out=await q('insert into delivery.orders(name,address,location,due,window_start,window_end,units,service_minutes,notes) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id,name',[need(o,'name'),need(o,'address'),need(o,'location'),date(need(o,'due')),start,end,number(o.units??1,'units',0.001),integer(o.service??10,'service',1,330),o.notes||'']);}
  else if(cmd==='confirm-order'){const x=await resolve(db,'orders',need(o,'order'));if(x.status!=='pending'||(await q("select s.id from delivery.stops s join delivery.routes r on r.id=s.route_id where s.order_id=$1 and r.status<>'cancelled'",[x.id])).length)throw Error('Only an unassigned pending order can be confirmed');const start=minute(need(o,'start')),end=minute(need(o,'end'));if(end<=start)throw Error('Invalid delivery window');out=await q('update delivery.orders set address=$1,window_start=$2,window_end=$3,units=$4,service_minutes=$5,planning_ready=true where id=$6 returning id,name',[need(o,'address'),start,end,number(need(o,'units'),'units',0.001),integer(need(o,'service'),'service',1,330),x.id]);}
  else if(cmd==='travel-add'){const checked=date(need(o,'checked'));if(checked>day())throw Error('Travel evidence date cannot be future');out=await q('insert into delivery.travel(origin,destination,minutes,evidence,verified_on) values($1,$2,$3,$4,$5) on conflict(origin,destination) do update set minutes=excluded.minutes,evidence=excluded.evidence,verified_on=excluded.verified_on returning origin,destination,minutes',[need(o,'origin'),need(o,'destination'),integer(need(o,'minutes'),'minutes',1,330),need(o,'evidence'),checked]);}
  else if(cmd==='plan-route')out=await plan(db,o);
  else if(cmd==='release-route'){const r=await resolve(db,'routes',need(o,'route'));if(r.status!=='draft')throw Error('Only a draft route can release');if(r.route_date<day())throw Error('Route date has passed');if(r.fingerprint!==await routeSnapshot(db,r))throw Error('Planning inputs changed; cancel and plan again');await q("update delivery.routes set status='released' where id=$1",[r.id]);out={name:r.name,status:'released',note:'Recorded dispatcher release; no driver message sent'};}
  else if(cmd==='cancel-route'){const r=await resolve(db,'routes',need(o,'route'));if(r.status!=='draft')throw Error('Only a draft route can cancel');await q("update delivery.routes set status='cancelled' where id=$1",[r.id]);out={name:r.name,status:'cancelled'};}
  else if(cmd==='record-outcome'){const x=await resolve(db,'orders',need(o,'order'));if(x.status!=='pending')throw Error('Order already has an outcome');const routes=await q("select r.* from delivery.routes r join delivery.stops s on s.route_id=r.id where s.order_id=$1 and r.status='released'",[x.id]);if(!routes.length||routes[0].route_date>day())throw Error('Requires a released route due today or earlier');const outcome=need(o,'outcome');if(!['delivered','failed'].includes(outcome))throw Error('Outcome must be delivered or failed');const evidence=need(o,'evidence');await q('insert into delivery.outcomes(order_id,outcome,evidence,actor) values($1,$2,$3,$4)',[x.id,outcome,evidence,actor]);await q('update delivery.orders set status=$1,notes=$2 where id=$3',[outcome,evidence,x.id]);out={name:x.name,outcome};}
  else if(cmd==='log-work'){const d=await resolve(db,'drivers',need(o,'driver')),from=stamp(need(o,'from')),to=stamp(need(o,'to'));if(Date.parse(to)<=Date.parse(from)||Date.parse(to)>Date.now())throw Error('Work must end after start and not in the future');if((await q('select id from delivery.work where driver_id=$1 and started_at<$3 and ended_at>$2',[d.id,from,to])).length)throw Error('Work intervals overlap');const kind=need(o,'kind');if(!['driving','loading','other'].includes(kind))throw Error('Invalid work kind');out=await q('insert into delivery.work(driver_id,started_at,ended_at,kind,evidence) values($1,$2,$3,$4,$5) returning id',[d.id,from,to,kind,need(o,'evidence')]);}
  else if(cmd==='import')out=await importOrders(db,o);
  else throw Error('Command not implemented');
  if(!(cmd==='import'&&o['dry-run']))await audit(db,cmd,actor,out);return out;
 });
}
async function importOrders(db,o){const file=need(o,'file');if(!/\.csv$/i.test(file))throw Error('Save the OptimoRoute raw-data worksheet as CSV first');const rows=parseCsv(fs.readFileSync(file,'utf8'));if(!rows.length)throw Error('Empty import');const seen=new Set(),mapped=[];
 for(const [i,r] of rows.entries()){const required=(...names)=>{const v=pick(r,...names).trim();if(!v)throw Error(`Row ${i+2}: missing ${names[0]}`);return v;};const id=required('Order ID');if(seen.has(id))throw Error(`Duplicate Order ID ${id}`);seen.add(id);
  // Raw data documents Location Name but not Address. Address is preserved when provided.
  const name=required('Customer','Location Name'),location=required('Location ID','Location Name'),due=date(required('Due date','Route date','Date').slice(0,10));
  const duration=pick(r,'Duration');if(duration&&!/^\d+$/.test(duration))throw Error(`Row ${i+2}: Duration must be whole minutes; normalise this column first`);
  mapped.push({external_id:id,name,address:pick(r,'Address')||required('Location Name'),location,due,service:integer(duration||10,'Duration',1,330),source:r});
 }
 let inserted=0,skipped=0;for(const m of mapped){const old=(await db.query('select source from delivery.orders where external_id=$1',[m.external_id]))[0];if(old){if(JSON.stringify(Object.entries(old.source||{}).sort())!==JSON.stringify(Object.entries(m.source).sort()))throw Error(`Changed source order ${m.external_id}; reconcile explicitly instead of overwriting operational history`);skipped++;continue;}inserted++;if(!o['dry-run'])await db.query('insert into delivery.orders(external_id,name,address,location,due,service_minutes,source,notes,planning_ready) values($1,$2,$3,$4,$5,$6,$7,$8,false)',[m.external_id,m.name,m.address,m.location,m.due,m.service,JSON.stringify(m.source),'Imported source history. Confirm address, units and delivery window before planning.']);}
 return {rows:rows.length,inserted,skipped,dry_run:!!o['dry-run'],review:'Source windows, capacity labels, scheduled times and outcomes are retained in source history, not treated as verified operational inputs.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const args=process.argv.slice(2);const result=await run(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
