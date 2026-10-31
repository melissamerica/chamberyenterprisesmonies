import { type ExecutiveTemplates, type TemplateKind, type TemplateReservation, type TemplateTrip } from './executive-profiles';

export type ReferenceField = { key: string; label: string; text: string };
export type ReferenceBinding = { example: string; field: string; clock?: string };
export type VisualReference = {
  kind: TemplateKind | 'unknown'; scope: string; fields: ReferenceField[]; bindings: ReferenceBinding[];
  warnings: string[]; showAs?: ExecutiveTemplates['calendarShowAs']; reminder?: number | null;
  layout?: 'list' | 'table'; expenseOptions?: Partial<ExecutiveTemplates>;
};
export const clockFormats = ['compact-upper', 'spaced-upper', 'spaced-lower', '12-upper', '12-lower', '24'] as const;
export function clockStyle(example: string): string | undefined {
  if (!/[ap]m/i.test(example)) return /^\d{1,2}:\d{2}$/.test(example) ? '24' : undefined;
  const upper = /[AP]M/.test(example), spaced = /\s+[ap]m/i.test(example);
  if (spaced) return /:\d{2}/.test(example) ? `12-${upper ? 'upper' : 'lower'}` : `spaced-${upper ? 'upper' : 'lower'}`;
  return upper ? 'compact-upper' : undefined;
}
export function renderReferenceFields(fields: ReferenceField[], bindings: ReferenceBinding[]) {
  const usable = bindings.filter(b => b.example && b.field).sort((a,b)=>b.example.length-a.example.length);
  // A single pass prevents replacements inside newly inserted tokens or partial codes.
  const escape = (v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const regex = usable.length ? new RegExp(`(?<![\\w{])(${usable.map(b=>escape(b.example)).join('|')})(?![\\w}])`, 'g') : null;
  return Object.fromEntries(fields.map(f=>[f.key, regex ? f.text.replace(regex, value=>{
    const b=usable.find(b=>b.example===value)!; return `{${b.field}${b.clock && ['departure','arrival'].includes(b.field) ? ':'+b.clock : ''}}`;
  }) : f.text]));
}

export function analyzeTemplateReference(source: string): VisualReference {
  const text=source.replace(/\r/g,'').trim();
  if (!text || text.length>50000) throw Error('Use a readable reference with fewer than 50,000 characters.');
  const lines=text.split('\n').map(v=>v.trim());
  const result:VisualReference={kind:'unknown',scope:'all',fields:[],bindings:[],warnings:[]};
  const flight=/\b(?:DL|AA|UA|WN|B6|AS|F9|NK|BA|AF|LH|EK|QR|AC|Delta\s*)\s*\d{1,4}\b/i;
  const calendar=/\b(?:subject|start time|end time|show as|appointment|BEGIN:VEVENT)\b/i.test(text) || (/\b(?:title|location)\s*:/i.test(text)&&flight.test(text));
  if (calendar || (!/\b(?:travel itinerary|itinerary for|travel schedule|expense report|reimbursement)\b/i.test(text)&&flight.test(text)&&/\b[A-Z]{3}\s*[-–→]\s*[A-Z]{3}\b/.test(text))) result.kind='outlook';
  else if (/\bexpense report|reimbursement\b/i.test(text)&&/\b(?:total|amount|date|category)\b/i.test(text)) result.kind='expenses';
  else if (/\b(?:travel itinerary|itinerary for|travel schedule)\b/i.test(text)) result.kind='print';
  const label=/^(?:subject|title|location|start(?: time| date)?|end(?: time| date)?|show as|reminder|body|notes|description|appointment body)\s*[:：]?\s*$/i;
  function capture(names:string[],stop=true) {
    const pattern=new RegExp(`^(?:${names.join('|')})(?:\\s*[:：]\\s*|\\s+)(.*)$`,'i');
    for(let i=0;i<lines.length;i++) {
      const hit=lines[i].match(pattern);
      if(hit || names.some(name=>new RegExp(`^(?:${name})$`,'i').test(lines[i]))) {
        const values=hit?.[1]?[hit[1]]:[];
        if(stop&&values.length)return values[0];
        for(let j=i+1;j<lines.length;j++) { if(label.test(lines[j]) || /^(?:subject|title|location|start(?: time| date)?|end(?: time| date)?|show as|reminder|body|notes|description)\s*[:：]/i.test(lines[j]))break; if(lines[j]||!stop)values.push(lines[j]); if(stop&&values.length)break; }
        return values.join('\n');
      }
    } return '';
  }
  if(result.kind==='outlook') {
    let subject=capture(['subject','title']);
    if(!subject) subject=lines.find(v=>flight.test(v)&&!/^(?:start|end|location|body|notes|description)\b/i.test(v))?.replace(/\s*[-–]\s*Appointment\s*$/i,'')??'';
    const location=capture(['location']);
    let body=capture(['appointment body','body','notes','description'],false);
    if(!body) {
      // Classic Outlook has no label above the body. It follows the final location row.
      const locationRow=lines.findIndex(v=>/^location(?:\s*[:：]?\s+.*|\s*[:：].*)?$/i.test(v));
      if(locationRow>=0) {
        const inline=/^location(?:\s*[:：]\s*|\s+)\S/i.test(lines[locationRow]);
        let start=locationRow+(inline?1:2);
        while(start<lines.length&&!lines[start])start++;
        if(!/^(?:start|end|show as|reminder)\b/i.test(lines[start]??''))body=lines.slice(start).join('\n').trim();
      }
    }
    result.fields=[{key:'outlookTitle',label:'Subject',text:subject},{key:'calendarLocation',label:'Location',text:location},{key:'outlookNotes',label:'Body / notes',text:body}];
    result.scope=flight.test(subject+'\n'+body)?'Flight': /\b(?:check[- ]?in|check[- ]?out|hotel)\b/i.test(subject)?'Hotel': /\b(?:rental|pick[- ]?up)\b/i.test(subject)?'Car':'all';
    if(!subject) result.warnings.push('The subject was not clear. Copy or correct it from the reference before using this draft.');
    if(!body)result.warnings.push('No body was detected. If your reference has notes, add them below.');
    const show=text.match(/show as\s*[:：]?\s*(Working Elsewhere|Out of Office|Tentative|Busy|Free)/i)?.[1];
    if(show)result.showAs=(['Free','Working Elsewhere','Tentative','Busy','Out of Office'] as const).find(v=>v.toLowerCase()===show.toLowerCase());
    const reminder=text.match(/reminder\s*[:：]?\s*(none|\d+\s*(?:minutes?|mins?|hours?|days?|weeks?))/i)?.[1];
    if(reminder)result.reminder=/none/i.test(reminder)?null:Number(reminder.match(/\d+/)?.[0])*(/hour/i.test(reminder)?60:/day/i.test(reminder)?1440:/week/i.test(reminder)?10080:1);
    if(!show || !reminder)result.warnings.push('Settings that are not visible in the reference keep their current values.');
  } else if(result.kind==='print') {
    const index=lines.findIndex(v=>/travel itinerary|itinerary for|travel schedule/i.test(v));
    result.fields=[{key:'itineraryHeading',label:'Page heading',text:lines[index]??''},{key:'itineraryTitle',label:'One reservation title',text:lines.slice(index+1).find(v=>flight.test(v))??''},{key:'itineraryBody',label:'One reservation’s details',text:''}];
    result.layout=/\t|\|/.test(text)?'table':'list';
    result.warnings.push('Check one reservation’s title and details. The itinerary uses Anya’s editable list or table layout; custom artwork is not copied.');
  } else if(result.kind==='expenses') {
    result.fields=[{key:'expenseHeading',label:'Report heading',text:lines.find(v=>/expense report|reimbursement/i.test(v))??'EXPENSE REPORT'}];
    result.expenseOptions={expenseShowDate:/\bdate\b/i.test(text),expenseShowCategory:/\b(?:category|meals|parking|transportation)\b/i.test(text),expenseShowSources:/\b(?:source|receipt)\b/i.test(text),expenseShowTotal:/\btotal\b/i.test(text)};
    result.warnings.push('The heading and supported columns are detected. Custom spreadsheet formulas and arbitrary page styling are not copied.');
  } else result.warnings.push('This reference is not clear enough to identify. Choose the format and enter the visible fields, or upload a clearer reference.');
  result.bindings=suggestReferenceBindings(result.fields);
  return result;
}
export function suggestReferenceBindings(fields:ReferenceField[]):ReferenceBinding[] {
  const text=fields.map(f=>f.text).join('\n'), result:ReferenceBinding[]=[];
  const add=(example:string|undefined,field:string)=>{if(example && !example.startsWith('{')&&!result.some(v=>v.example===example))result.push({example,field,...(['departure','arrival'].includes(field)?{clock:clockStyle(example)}:{})});};
  for(const match of text.matchAll(/\b(?:DL|AA|UA|WN|B6|AS|F9|NK|BA|AF|LH|EK|QR|AC|Delta\s*)\s*\d{1,4}\b/gi))add(match[0],'flight');
  for(const match of text.matchAll(/\b([A-Z]{3})\s*[-–→]\s*([A-Z]{3})\b/g)){add(match[1],'origin');add(match[2],'destination');}
  const clocks=[...text.matchAll(/\b(?:\d{1,2}:\d{2}\s*(?:am|pm)|\d{1,2}\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d)\b/gi)].map(v=>v[0]);
  [...new Set(clocks)].slice(0,2).forEach((v,i)=>add(v,i?'arrival':'departure'));
  for(const m of text.matchAll(/\b(?:seat(?: number)?|confirmation(?: number| code)?|record locator|executive|trip)\s*[:#]\s*([^\n;]+)/gi)) {
    const field=/seat/i.test(m[0])?'seat':/executive/i.test(m[0])?'executive':/^trip/i.test(m[0])?'trip':'confirmation';add(m[1].trim(),field);
  }
  for(const m of text.matchAll(/(?:^|[;\s])([1-9]\d{0,2}[A-F])(?=\s*(?:;|$))/gm))add(m[1],'seat');
  const subject=fields.find(f=>f.key==='outlookTitle'||f.key==='itineraryTitle')?.text??'';
  const finalCode=subject.match(/;\s*([A-Z0-9]{5,8})\s*$/)?.[1];if(finalCode&&/[A-Z]/.test(finalCode)&&!/^(?:FLIGHT|TRAVEL)$/.test(finalCode))add(finalCode,'confirmation');
  for(const m of text.matchAll(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/gi))add(m[0],'date');
  const location=fields.find(v=>v.key==='calendarLocation')?.text;
  if(location && !result.some(b=>location.includes(b.example)))add(location,'location');
  return result;
}
export function referencePreview(bindings:ReferenceBinding[]) {
  const value=(key:string)=>bindings.find(b=>b.field===key)?.example??'';
  const item:TemplateReservation={kind:'Flight',title:'Reference booking',detail:'New confirmation details',date:value('date')||'Nov 4, 2026',time:'',flightCode:value('flight')||'DL1358',origin:value('origin')||'TLH',destination:value('destination')||'ATL',departureTime:value('departure')||'8:09pm',arrivalTime:value('arrival')||'10pm',seat:value('seat')||'2C',confirmation:value('confirmation')||'CJT8JH',location:value('location')||'TLH-ATL',start:'2026-11-05T01:09:00Z',end:'2026-11-05T03:00:00Z'};
  const instant=(clock:string)=>{
    const match=clock.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let hour=Number(match?.[1]??20);if(match?.[3])hour=hour%12+(match[3].toLowerCase()==='pm'?12:0);
    return `2026-11-04T${String(hour).padStart(2,'0')}:${match?.[2]??'00'}:00-05:00`;
  };
  item.start=instant(item.departureTime!);item.end=instant(item.arrivalTime!);
  if(Date.parse(item.end)<Date.parse(item.start))item.end=new Date(Date.parse(item.end)+86400000).toISOString();
  const trip:TemplateTrip={name:value('trip')||'Reference trip',traveler:value('executive')||'Example executive',dates:item.date,route:`${item.origin}-${item.destination}`};
  return {item,trip};
}
