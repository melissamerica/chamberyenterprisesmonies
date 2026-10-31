const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict'), ts=require('typescript');
const cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const req=name=>{if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}return require(name);};
 new Function('require','module','exports',code)(req,module,module.exports);return module.exports;
}
const {matchingTravelTrips}=load('lib/travel-trip-matching.ts');
const {parseLabeledConfirmation,readTravelDocument}=load('lib/travel-confirmations.ts');
const {isOpenUploadTrip}=load('lib/workspace-uploads.ts');
const profiles=load('lib/executive-profiles.ts');
const alex={id:'alex',name:'Alex Morgan'}, robin={id:'robin',name:'Robin Lee'};
const initial=[{id:1,executiveId:'alex',traveler:alex.name,name:'Denver conference',dates:'Nov 4–6, 2026',route:'TLH → DEN',items:[{id:10,kind:'Hotel',title:'Denver hotel',detail:'Confirmed',location:'Denver',date:'2026-11-04',time:'All day',start:'2026-11-04T00:00:00Z',end:'2026-11-06T00:00:00Z'}]},{id:2,executiveId:'alex',traveler:alex.name,name:'Boston',dates:'Nov 4–6, 2026',route:'TLH → BOS',items:[{id:20,kind:'Hotel',title:'Boston hotel',detail:'Confirmed',location:'Boston',date:'2026-11-04',time:'All day',start:'2026-11-04T00:00:00Z',end:'2026-11-06T00:00:00Z'}]}];
function document(date='2026-11-04',destination='DEN',name=alex.name){return `Passenger: ${name}\nFlight: DL123\nOrigin: TLH\nDestination: ${destination}\nDeparture date: ${date}\nDeparture time: 9:00 AM\nArrival date: ${date}\nArrival time: 12:00 PM\nConfirmation: BOOK42\nTotal: $300.00`;}
const parsed=parseLabeledConfirmation(document(),'flight.txt');assert.ok(parsed);
assert.deepEqual(matchingTravelTrips(parsed,initial).map(match=>match.tripId),[1]);
assert.equal(matchingTravelTrips(parsed,[{...initial[0],closed:true}]).length,0);
assert.equal(matchingTravelTrips(parseLabeledConfirmation(document('2026-12-10'),'flight.txt'),initial).length,0);
assert.equal(matchingTravelTrips(parseLabeledConfirmation(document('2026-11-07'),'flight.txt'),initial)[0].confidence,1);
const hotel=parseLabeledConfirmation('Guest: Alex Morgan\nHotel: Hyatt Regency\nCity: Denver\nCheck-in date: 2026-11-04\nCheck-out date: 2026-11-06','hotel.txt');assert.ok(hotel);assert.deepEqual(matchingTravelTrips(hotel,initial).map(match=>match.tripId),[1]);
const source=ts.createSourceFile('app/page.tsx',fs.readFileSync('app/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let functionText;
function find(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='processFileBatch')functionText=node.getText(source);ts.forEachChild(node,find);}find(source);assert.ok(functionText);
const compiled=ts.transpileModule(functionText,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
function harness(liveEnabled=true){
 let trips=structuredClone(initial), notices=[],reviews=[],publishCalls=0,onReview;
 const ref={current:trips}, resolver={current:null};
 const context={LIVE_CONNECTIONS_ENABLED:liveEnabled,tripsRef:ref,executives:[alex,robin],selectedExecutive:alex,detectKind:()=> 'Flight',setNotice:value=>notices.push(value),readTravelDocument,parseFlightConfirmation:async()=>null,parseLabeledConfirmation,executiveForTrip:profiles.executiveForTrip,isOpenUploadTrip,matchingTravelTrips,travelImportResolve:resolver,setTravelImportReview:value=>{reviews.push(value);if(onReview){const callback=onReview;onReview=null;callback(value);}},setSelectedExecutiveId:()=>{},setTrips:value=>{trips=typeof value==='function'?value(trips):value;ref.current=trips;},setActiveTripId:()=>{},setActiveTab:()=>{},setScreen:()=>{},rememberEditedPage:()=>{},calendarName:'Outlook',publishToCalendar:async()=>{publishCalls++;return false;},calendarConnections:{outlook:false},calendarProvider:'outlook',setAttentionItems:()=>{}};
 const run=new Function(...Object.keys(context),compiled+';return processFileBatch;')(...Object.values(context));
 return {run,ref,resolver,get trips(){return trips;},get reviews(){return reviews;},get publishCalls(){return publishCalls;},ready:()=>new Promise(resolve=>{onReview=resolve;}),file:(text=document(),name='flight.txt')=>new File([text],name,{type:'text/plain'})};
}
(async()=>{
 let h=harness(),ready=h.ready(),task=h.run([h.file()],2),review=await ready;
 assert.equal(review.matches[0].tripId,1,'explicit wrong trip must not bypass matching');assert.equal(h.trips[0].items.length,1);assert.equal(h.publishCalls,0);
 // An unrelated receipt saved while the person reviews must survive their confirmation.
 h.ref.current=h.trips.map(trip=>trip.id===1?{...trip,items:[...trip.items,{id:88,kind:'Expense',title:'Receipt',detail:'Meal',date:'2026-11-04',time:'',cost:20}]}:trip);
 h.resolver.current({tripId:1});await task;assert.equal(h.trips.length,2);assert.equal(h.trips[0].items.length,3);assert.ok(h.trips[0].items.some(item=>item.id===88));assert.equal(h.trips[1].items.length,1);assert.equal(h.publishCalls,1);
 h=harness();ready=h.ready();task=h.run([h.file()]);await ready;h.resolver.current(null);await task;assert.deepEqual(h.trips,initial);assert.equal(h.publishCalls,0);
 h=harness();ready=h.ready();task=h.run([h.file(document('2026-12-10'))]);review=await ready;assert.equal(review.matches.length,0);assert.equal(h.trips.length,2);h.resolver.current({name:'December Denver visit'});await task;assert.equal(h.trips.length,3);assert.equal(h.trips[2].name,'December Denver visit');
 h=harness();ready=h.ready();task=h.run([h.file(),h.file(document('2026-12-10'),'second.txt')]);await ready;const second=h.ready();h.resolver.current({tripId:1});review=await second;assert.equal(review.filename,'second.txt');assert.equal(h.trips.length,2);h.resolver.current(null);await task;assert.equal(h.trips.length,2);assert.equal(h.trips[0].items.length,2);
 h=harness();ready=h.ready();task=h.run([h.file('unreadable travel document')]);review=await ready;assert.ok(review.detailsError);assert.equal(review.matches.length,0);h.resolver.current(null);await task;assert.deepEqual(h.trips,initial);
 h=harness(false);ready=h.ready();task=h.run([h.file()]);await ready;h.resolver.current({tripId:1});await task;assert.equal(h.publishCalls,0,'test workspace must not publish real calendar events');
 console.log('PASS: flight/hotel matching, destination conflicts, closed trips, different dates, adjacent travel dates.');
 console.log('PASS: actual import workflow waits for confirmation, confirms suggested trip, preserves concurrently added receipts, creates only after approval, skips without changes, and reviews multi-file uploads sequentially.');
})().catch(error=>{console.error(error);process.exitCode=1;});
