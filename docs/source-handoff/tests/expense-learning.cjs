const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(file=>file.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join('drizzle',file),'utf8'));
const db={prepare(sql){const statement=sqlite.prepare(sql);let args=[];return{bind(...values){args=values;return this;},async first(){return statement.get(...args)??null;},async all(){return{results:statement.all(...args)};},async run(){return statement.run(...args);}};},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const req=name=>{if(name==='cloudflare:workers')return{env:{DB:db}};if(name==='next/server')return{NextResponse:{json:(value,init)=>Response.json(value,init)}};if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}return require(name);};new Function('require','module','exports',code)(req,module,module.exports);return module.exports;}
const model=load('lib/expense-learning.ts'),helpers=load('lib/workspace-uploads.ts'),storage=load('lib/expense-learning-storage.ts'),decisionApi=load('app/api/uploads/decisions/route.ts'),memoryApi=load('app/api/expense-learning/route.ts'),uploadStorage=load('lib/upload-storage.ts');
const at='2028-01-01T00:00:00.000Z';
function row(n,extra={}){return{key:`learn-file:${n}`,fileId:'learn-file',source:'learning-fixture.csv',kind:'expense',title:`Verve Mobility ${1000+n}`,date:`2026-11-${String(n+1).padStart(2,'0')}`,amount:String(30+n),category:'Misc.',detail:'Imported receipt',location:'Denver',tripId:'1',match:'Matched travel dates',selected:true,duplicateChoice:'new',...extra};}
function request(url,method,value){return new Request('https://example.test'+url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});}
async function decide(value,category='Transportation',feedback,action='1',executiveId='alex'){
 await uploadStorage.saveUnassignedUploads(executiveId,'Alex', [value]);
 const final={...value,category};
 const trip={id:1,executiveId,traveler:'Alex',name:'Denver visit',dates:'Nov 1–30, 2026',route:'TLH → DEN',items:[]};
 const next=action==='1'?helpers.assignedUploadTrips([trip],[final],executiveId)[0]:undefined;
 const response=await decisionApi.PUT(request('/api/uploads/decisions','PUT',{executiveId,row:final,choice:action,remember:false,trip:next,learning:feedback}));
 return{response,json:await response.json()};
}
(async()=>{
 sqlite.prepare('INSERT INTO executive_upload_files (id,executive_id,filename,object_key,content_type,created_at) VALUES (?,?,?,?,?,?)').run('learn-file','alex','learning-fixture.csv','fixture','text/csv','2026-10-29');
 assert.equal(model.suggestExpense(row(9),'alex',model.emptyLearningKnowledge(),at),null);
 for(let n=1;n<=2;n++){const result=await decide(row(n));assert.equal(result.response.status,200);assert.equal(result.json.learningWarning,undefined);}
 let knowledge=await storage.loadExpenseLearning('alex');assert.equal(knowledge.decisions.length,2);assert.equal(model.suggestExpense(row(9),'alex',knowledge,at),null);
 await decide(row(3));knowledge=await storage.loadExpenseLearning('alex');
 let proposal=model.suggestExpense(row(9),'alex',knowledge,at);assert.equal(proposal.category,'Transportation');assert.equal(proposal.status,'inferred');assert.equal(proposal.support,3);assert.ok(proposal.sourceIds.every(id=>knowledge.decisions.some(value=>value.id===id)));assert.equal(row(9).tripId,'1');
 const rejection=model.buildExpenseDecision('alex',row(9),row(9),'assign','Denver',{},knowledge,at).decision;assert.equal(rejection.outcome,'rejected');assert.equal(rejection.suggestion.category,'Transportation');
 assert.notEqual(model.learningVendorKey('Studio 101'),model.learningVendorKey('Studio 202'));
 assert.equal(knowledge.preferences.length,0);assert.equal(model.suggestExpense(row(9),'other',knowledge,at),null);assert.equal(model.suggestExpense(row(9,{location:'Boston'}),'alex',knowledge,at),null);
 await decide(row(3));assert.equal((await storage.loadExpenseLearning('alex')).decisions.length,3);
 const duplicate={...knowledge.decisions[0],id:'copy',rowKey:'second-source',fileId:'another-source'};assert.equal(model.suggestExpense(row(9),'alex',{...knowledge,decisions:[...knowledge.decisions,duplicate]},at).support,3);
 assert.equal(model.suggestExpense(row(1),'alex',knowledge,at),null);
 const future={...knowledge,decisions:knowledge.decisions.map(value=>({...value,recordedAt:'2029-01-01T00:00:00.000Z'}))};assert.equal(model.suggestExpense(row(9),'alex',future,at),null);
 const scoped={...knowledge,decisions:knowledge.decisions.map(value=>({...value,scope:'trip',tripId:'2'}))};assert.equal(model.suggestExpense(row(9),'alex',scoped,at),null);
 const conflict={...knowledge,decisions:knowledge.decisions.map((value,i)=>({...value,category:i===0?'Meals':value.category}))};assert.equal(model.suggestExpense(row(9),'alex',conflict,at).status,'conflict');
 let saved=await decide(row(4),'Meals',{rememberCategory:true,scope:'vendor_city',reason:'Client treats these rides as a hosted meal package'});assert.equal(saved.response.status,200);
 knowledge=await storage.loadExpenseLearning('alex');proposal=model.suggestExpense(row(9),'alex',knowledge,at);assert.equal(proposal.status,'confirmed');assert.equal(proposal.category,'Meals');assert.ok(knowledge.preferences[0].reason.includes('Client'));
 await storage.setExpenseLearningEnabled('alex',false);knowledge=await storage.loadExpenseLearning('alex');assert.equal(knowledge.enabled,false);assert.equal(model.suggestExpense(row(9),'alex',knowledge,at).status,'confirmed');
 const before=knowledge.decisions.length;await decide(row(5));assert.equal((await storage.loadExpenseLearning('alex')).decisions.length,before);
 const pref=knowledge.preferences[0];await memoryApi.PATCH(request('/api/expense-learning','PATCH',{executiveId:'other',kind:'preference',id:pref.id,active:false}));assert.equal((await storage.loadExpenseLearning('alex')).preferences[0].active,true);
 await memoryApi.PATCH(request('/api/expense-learning','PATCH',{executiveId:'alex',kind:'preference',id:pref.id,active:false}));knowledge=await storage.loadExpenseLearning('alex');assert.equal(knowledge.preferences[0].active,false);assert.equal(model.suggestExpense(row(9),'alex',knowledge,at),null);
 await storage.setExpenseLearningEnabled('alex',true);await storage.setExpenseMemoryActive('alex','preference',pref.id,true);assert.equal(model.suggestExpense(row(9),'alex',await storage.loadExpenseLearning('alex'),at).category,'Meals');
 const eventCount=(await storage.loadExpenseLearning('alex')).decisions.length;await decide(row(6),'Transportation',undefined,'later');assert.equal((await storage.loadExpenseLearning('alex')).decisions.length,eventCount);
 const bad=await decide(row(7),'Transportation',{rememberCategory:true,scope:'evidence'});assert.equal(bad.response.status,400);
 const cross=await decide(row(8),'Transportation',undefined,'1','other');assert.equal(cross.response.status,400);assert.equal((await storage.loadExpenseLearning('other')).decisions.length,0);
 assert.equal((await memoryApi.GET(new Request('https://example.test/api/expense-learning'))).status,400);
 // A transaction failure rolls its learning statements back too.
 const prepared=await storage.expenseLearningStatements('alex',{...row(12),category:'Transportation'},'assign','Denver visit');
 sqlite.exec('CREATE TABLE learning_failure_guard (id INTEGER PRIMARY KEY); INSERT INTO learning_failure_guard VALUES (1)');
 const oldBatch=db.batch;db.batch=async statements=>oldBatch([...statements,db.prepare('INSERT INTO learning_failure_guard (id) VALUES (?)').bind(1)]);
 const trip={id:1,executiveId:'alex',traveler:'Alex',name:'Denver visit',dates:'Nov 1–30, 2026',route:'TLH → DEN',items:[]};
 await assert.rejects(()=>uploadStorage.saveUploadDecision('alex',row(12),trip,undefined,false,prepared));db.batch=oldBatch;
 assert.ok(!(await storage.loadExpenseLearning('alex')).decisions.some(value=>value.rowKey===row(12).key));
 const oldPrepare=db.prepare;db.prepare=sql=>{if(sql.includes('FROM expense_learning_'))throw Error('Learning unavailable');return oldPrepare(sql);};
 const fallback=await decide(row(13));db.prepare=oldPrepare;assert.equal(fallback.response.status,200);assert.ok(fallback.json.learningWarning);assert.ok((await uploadStorage.savedUploadTrips())[0].items.some(item=>item.importKey===row(13).key));
 console.log('PASS: real saved corrections create an inferred category after three distinct examples, with grounded sources, while existing trip matching is untouched.');
 console.log('PASS: confirmed scope beats inferred history; executive/city/trip boundaries, conflict abstention, duplicate/self/future exclusion, idempotence, pause/forget/restore, deferred receipts, authorization and atomic expense/memory rollback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
