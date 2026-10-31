const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const req=name=>{if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}return require(name);};new Function('require','module','exports',code)(req,module,module.exports);return module.exports;}
function actualFunction(file,name,context){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;function find(value){if(ts.isFunctionDeclaration(value)&&value.name?.text===name)node=value;ts.forEachChild(value,find);}find(source);assert.ok(node,name);const code=ts.transpileModule(node.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;return new Function(...Object.keys(context),code+';return '+name+';')(...Object.values(context));}
const {classifyUploadText,recognizeUpload}=load('lib/automatic-upload.ts');
const travel='Passenger: Alex Morgan\nFlight: DL123\nOrigin: TLH\nDestination: DEN\nDeparture date: 2026-11-04\nDeparture time: 9:00 AM\nArrival date: 2026-11-04\nArrival time: 12:00 PM\nConfirmation: BOOK42\nTotal: $300.00';
const receipt='Restaurant receipt\nDate: 2026-11-05\nSubtotal $40.00\nTax $5.00\nTotal $45.00';
const statement='Date,Description,City,Amount\n2026-11-05,Dinner,Denver,45.00\n2026-11-08,Website subscription,Online,20.00';
const calendar='BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Denver conference\nEND:VEVENT\nEND:VCALENDAR';
const ordinary='Sales discussion notes\nIntroduce the regional team and review the presentation with the customer.\nReference materials for the keynote speaker.';
const codes='Billing Code,Description\n00123,Marketing research\n00124,Client services';
assert.equal(classifyUploadText(travel,'random.txt'),'travel');
assert.equal(classifyUploadText('Passenger Alex Morgan Confirmation number CJT8JH Wednesday, November 4, 2026 - DL1358 8:09 PM TLH - Tallahassee to 10:00 PM ATL - Atlanta','Delta.eml'),'travel');
assert.equal(classifyUploadText(receipt),'expenses');assert.equal(classifyUploadText(statement),'expenses');
assert.equal(classifyUploadText(calendar),'calendar');assert.equal(classifyUploadText(codes),'billing');
assert.equal(classifyUploadText(ordinary,'briefing.docx'),'attachment');
assert.equal(classifyUploadText('Restaurant receipt\nTotal unreadable','scan.txt'),'review');
assert.equal(classifyUploadText('Hotel booking, details illegible.','reservation.txt'),'review');
assert.equal(classifyUploadText('','scan.pdf'),'review');
// A filename alone never changes ordinary materials into an expense or parsed booking.
assert.equal(classifyUploadText(ordinary,'receipt.docx'),'review');
(async()=>{
 for(const [text,kind] of [[travel,'travel'],[receipt,'expenses'],[ordinary,'attachment'],[calendar,'calendar']])assert.equal((await recognizeUpload(new File([text],'upload.txt',{type:'text/plain'}))).kind,kind);
 assert.equal((await recognizeUpload(new File([statement],'statement.csv'))).kind,'expenses');
 const ExcelJS=require('exceljs'),workbook=new ExcelJS.Workbook();workbook.addWorksheet('Billing').addRows([['Billing Code','Description'],['00123','Marketing research']]);
 const bytes=await workbook.xlsx.writeBuffer();assert.equal((await recognizeUpload(new File([bytes],'upload.xlsx'))).kind,'billing');
 assert.equal((await recognizeUpload(new File(['not a ZIP'],'damaged.docx'))).kind,'review','unreadable Word files must not default to attachments');
 await assert.rejects(()=>recognizeUpload(new File([],'empty.txt')),/empty/);
 // Exercise the actual routing queue: later files cannot interrupt a pending review.
 const requests=[],travels=[],notices=[],intakeExecutives=[];const aux={current:null},intake={current:null};let readyResolve;const ready=()=>new Promise(resolve=>{readyResolve=resolve;});const noop=()=>{};
 const route=actualFunction('app/page.tsx','routeFileBatch',{selectedExecutive:{id:'queued-executive'},setSelectedExecutiveId:id=>intakeExecutives.push(id),setNotice:value=>notices.push(value),recognizeUpload,processFileBatch:async(files,id,text)=>travels.push({files,id,text}),setReviewLater:noop,setCalendarReview:noop,setUploadMode:noop,setUploadIntakeText:noop,uploadIntakeResolve:intake,setUploadIntake:file=>{requests.push({kind:'expenses',file});readyResolve?.();},setUploadOpen:noop,auxiliaryUploadResolve:aux,setAuxiliaryUpload:request=>{requests.push(request);readyResolve?.();}});
 let pending=ready();const task=route([new File([ordinary],'briefing.txt'),new File([travel],'confirmation.txt'),new File([receipt],'receipt.txt')],1);await pending;
 assert.equal(requests.length,1);assert.equal(requests[0].kind,'attachment');assert.equal(travels.length,0);
 pending=ready();aux.current();await pending;assert.equal(travels.length,1);assert.equal(travels[0].text,travel);assert.equal(requests[1].kind,'expenses');intake.current();await task;assert.deepEqual(intakeExecutives,['queued-executive','queued-executive','queued-executive']);
 // Run the actual attachment-save callback: explicit executive and trip required;
 // a successful upload uses the existing attachment API with N/A entry, not expenses.
 const profiles=load('lib/executive-profiles.ts'),attachments=load('lib/itinerary-attachments.ts');const execs=[{id:'alex',name:'Alex Morgan'},{id:'rita',name:'Rita Green'}];const trips=[{id:1,executiveId:'alex',traveler:'Alex Morgan',items:[],name:'Denver'},{id:2,executiveId:'rita',traveler:'Rita Green',items:[],name:'Boston'}];
 const posts=[],errors=[];let savedTrip;const context={lock:{current:false},latestTrips:{current:trips},tripId:'2',executiveId:'rita',executives:execs,file:new File([ordinary],'briefing.txt'),executiveForTrip:profiles.executiveForTrip,attachmentContentTypes:attachments.attachmentContentTypes,setError:value=>{if(value)errors.push(value);},setBusy:noop,onSaved:trip=>savedTrip=trip,fetch:async(url,options)=>{posts.push({url,options});return Response.json(url==='/api/uploads'?{saved:true}:{trip:trips[1]});}};
 const save=actualFunction('components/attachment-upload-review.tsx','save',context);assert.equal(posts.length,0);await save();assert.deepEqual(errors,[]);assert.equal(posts[1].url,'/api/itinerary-attachments');assert.equal(posts[1].options.body.get('executiveId'),'rita');assert.equal(posts[1].options.body.get('tripId'),'2');assert.equal(posts[1].options.body.get('entryId'),'0');assert.equal(savedTrip.id,2);
 const before=posts.length;await actualFunction('components/attachment-upload-review.tsx','save',{...context,executiveId:'alex'})();assert.equal(posts.length,before,'cannot attach to a different executive’s trip');assert.ok(errors.length);
 console.log('PASS: content recognizes bookings, receipts/statements, calendar, billing spreadsheets and ordinary materials; ambiguous/unreadable files remain in review.');
 console.log('PASS: actual mixed-file queue waits for review; attachment save requires explicit matching executive/trip and persists through the itinerary API.');
})().catch(error=>{console.error(error);process.exitCode=1;});
