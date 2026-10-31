const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const req=name=>{if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}return require(name);};new Function('require','module','exports',code)(req,module,module.exports);return module.exports;}
function actualFunction(file,name,context){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;function find(value){if(ts.isFunctionDeclaration(value)&&value.name?.text===name)node=value;ts.forEachChild(value,find);}find(source);assert.ok(node,name);const code=ts.transpileModule(node.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;return new Function(...Object.keys(context),code+';return '+name+';')(...Object.values(context));}
const visual=load('lib/visual-template.ts'),profiles=load('lib/executive-profiles.ts');
const input=`Appointment
Show As: Busy
Reminder: 30 minutes
Subject: DL1358; TLH-ATL; 8:09pm/10pm; 2C; CJT8JH
Start time: Nov 4, 2026 8:09 PM
End time: Nov 4, 2026 10:00 PM
Location: TLH-ATL
Body:
Confirmation: CJT8JH
Seat: 2C

Bring the briefing.`;
const r=visual.analyzeTemplateReference(input);assert.equal(r.kind,'outlook');assert.equal(r.scope,'Flight');assert.equal(r.showAs,'Busy');assert.equal(r.reminder,30);assert.match(r.fields[2].text,/2C\n\nBring/);
const mapped=visual.renderReferenceFields(r.fields,r.bindings);assert.equal(mapped.outlookTitle,'{flight}; {origin}-{destination}; {departure}/{arrival}; {seat}; {confirmation}');assert.equal(mapped.outlookNotes,'Confirmation: {confirmation}\nSeat: {seat}\n\nBring the briefing.');
const template={...profiles.defaultTemplates,customName:'Reference test',calendarFormats:{Flight:{...mapped,calendarFlightFormat:'standard',calendarShowAs:r.showAs,calendarReminderMinutes:r.reminder}}};assert.equal(profiles.validateCustomTemplate(template),null);
const example=visual.referencePreview(r.bindings);assert.equal(profiles.calendarTemplatePreview(template,example.item,example.trip).title,'DL1358; TLH-ATL; 8:09pm/10pm; 2C; CJT8JH');
const changed={...example.item,flightCode:'UA812',origin:'DEN',destination:'ORD',seat:'4A',confirmation:'NEXT42',departureTime:'6:05am',arrivalTime:'9:10am'};
const output=profiles.calendarTemplatePreview(template,changed,example.trip);assert.equal(output.title,'UA812; DEN-ORD; 6:05am/9:10am; 4A; NEXT42');assert.equal(output.location,'DEN-ORD');assert.equal(output.notes,'Confirmation: NEXT42\nSeat: 4A\n\nBring the briefing.');assert.equal(output.reminderMinutes,30);
const hotel={...changed,kind:'Hotel',title:'Westin booking'};assert.equal(profiles.calendarTemplatePreview(template,hotel,example.trip).title,'Westin booking');assert.equal(profiles.calendarTemplatePreview(template,hotel,example.trip).reminderMinutes,15);
const roundTrip=JSON.parse(JSON.stringify(template));assert.equal(profiles.calendarTemplatePreview(roundTrip,changed,example.trip).title,output.title);
const change=profiles.calendarFormatChange(template,'Flight',{outlookTitle:'Flight {flight}'});assert.equal(change.calendarFormats.Flight.outlookNotes,mapped.outlookNotes);assert.equal(profiles.reservationTemplateTitle({...template,...change},changed,example.trip,'outlook'),'Flight UA812');assert.equal(profiles.mergeTemplateKind(template,profiles.defaultTemplates,'outlook').calendarFormats,undefined);
for(const [format,expected] of [['12-upper','6:05 AM'],['12-lower','6:05 am'],['24','06:05'],['compact-upper','6:05AM'],['spaced-upper','6:05 AM']])assert.equal(profiles.fillTemplate('{departure:'+format+'}',changed,example.trip),expected);
assert.equal(profiles.fillTemplate('{arrival:12-upper}',{...changed,arrivalTime:'10pm'},example.trip),'10:00 PM');
assert.match(profiles.validateCustomTemplate({...template,calendarFormats:{Flight:{...mapped,outlookTitle:'{departure:fake}'}}}),/Unknown automatic/);
assert.match(profiles.validateCustomTemplate({...template,calendarFormats:{Flight:{...mapped,calendarReminderMinutes:-1}}}),/reminder/);
assert.match(profiles.validateCustomTemplate({...template,calendarFormats:{Unknown:mapped}}),/entry type/);
assert.equal(visual.analyzeTemplateReference('Travel itinerary for Alex Morgan\nDL1358 TLH-ATL 8pm/10pm').kind,'print');
assert.equal(visual.analyzeTemplateReference('EXPENSE REPORT\nDate | Description | Meals | Source | Total').kind,'expenses');
assert.equal(visual.analyzeTemplateReference('Random project proposal with unclear contents').kind,'unknown');
assert.equal(visual.renderReferenceFields([{key:'test',label:'test',text:'2C 12C CJT8JH XCJT8JH'}],[{example:'2C',field:'seat'},{example:'CJT8JH',field:'confirmation'}]).test,'{seat} 12C {confirmation} XCJT8JH');
const classic=visual.analyzeTemplateReference('DL1358; TLH-ATL; 8:09pm/10pm; 2C; CJT8JH - Appointment\nStart time: 11/4/2026\nEnd time: 11/4/2026\nLocation\nTLH-ATL\nConfirmation: CJT8JH\nSeat: 2C');assert.match(classic.fields[2].text,/Confirmation/);
console.log('PASS: screenshot text identifies format and scoped flight rules; new bookings replace all example flight values, preserve punctuation/blank lines, and leave hotel formats unchanged.');
console.log('PASS: clock styles, round-trip persistence, editing/reset, invalid formats, unknown references, classic Outlook body, and replacement boundaries.');
