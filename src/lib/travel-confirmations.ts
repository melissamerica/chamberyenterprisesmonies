import ocrLangAsset from "@/assets/eng.traineddata.gz.asset.json";
export type TravelKind = "Flight" | "Hotel" | "Car" | "Appointment" | "Expense";
export type TravelEntry = {
  billingCode?: import("./billing-codes").BillingCodeSelection | null;
  id: number; kind: TravelKind; title: string; detail: string; date: string; time: string;
  source?: string; cost?: number; start?: string; end?: string; location?: string;
  expenseEligible?: boolean; itineraryEligible?: boolean; itineraryDate?: string; expenseCategory?: string; sourceFileId?: string; importKey?: string; calendarUid?: string; allDay?: boolean;
  flightCode?: string; origin?: string; destination?: string; seat?: string; confirmation?: string;
  departureTime?: string; arrivalTime?: string;
  expenseDescription?: string; expenseDate?: string; expenseEvidence?: Array<{fileId:string;kind:"receipt"|"statement"}>;
  materialsAttached?: boolean; materialsFormat?: "digital" | "hardcopy" | "both";
};
export type TravelConfirmation = {
  name: string; traveler: string; dates: string; route: string; items: TravelEntry[];
};

const zones: Record<string, string> = {
  ATL: "America/New_York", BOS: "America/New_York", CLT: "America/New_York", DCA: "America/New_York",
  EWR: "America/New_York", FLL: "America/New_York", IAD: "America/New_York", JFK: "America/New_York",
  LGA: "America/New_York", MCO: "America/New_York", MIA: "America/New_York", PHL: "America/New_York", TLH: "America/New_York",
  ORD: "America/Chicago", DFW: "America/Chicago", IAH: "America/Chicago", DEN: "America/Denver", PHX: "America/Phoenix",
  LAS: "America/Los_Angeles", LAX: "America/Los_Angeles", SEA: "America/Los_Angeles", SFO: "America/Los_Angeles",
};
const months: Record<string, number> = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

function field(text: string, names: string) {
  return text.match(new RegExp(`(?:^|[\\n\\r]|\\b)(?:${names})(?:\\s*[:=]\\s*|\\t+)([^\\n\\r]+)`,"i"))?.[1]?.trim();
}
function datePart(value: string) {
  let m=value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if(m) return validDate(`${m[1]}-${m[2]}-${m[3]}`);
  m=value.match(/\b(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if(m) return validDate(`${m[3]}-${String(months[m[1].slice(0,3).toLowerCase()]).padStart(2,"0")}-${m[2].padStart(2,"0")}`);
  return null;
}
function validDate(value: string) {
  const date = new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? value : null;
}
function zonedIso(date: string, time: string, zone?: string): string | null {
  const full=`${date} ${time}`.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})\b/);
  if(full && validDate(full[0].slice(0,10)) && Number.isFinite(Date.parse(full[0]))) return full[0];
  const day=datePart(date);const c=time.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)?\b|\b(\d{1,2})\s*(AM|PM)\b/i);
  if(!day||!c||!zone) return null;
  let hour=Number(c[1]??c[4]);const minute=Number(c[2]??0);const period=c[3]??c[5];
  if(period){if(hour<1||hour>12)return null;hour=hour%12+(/PM/i.test(period)?12:0);}
  if(hour>23||minute>59)return null;
  const [year,month,d]=day.split('-').map(Number);
  let instant=Date.UTC(year,month-1,d,hour,minute);
  try {
    for(let i=0;i<3;i++){
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
      const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
      const displayed=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
      const adjustment=Date.UTC(year,month-1,d,hour,minute)-displayed;
      instant+=adjustment;if(!adjustment)break;
    }
    return new Date(instant).toISOString();
  }catch{return null;}
}
function amount(text:string) {
  const v=text.match(/(?:Grand\s+total|Total(?:\s+(?:paid|amount|cost))?|Amount\s+paid)\s*[:=]?\s*(?:USD\s*)?\$?([\d,]+\.\d{2})/i)?.[1];
  return v ? Number(v.replace(/,/g,'')) : undefined;
}

/** Parse explicitly labeled booking facts. Unknown time zones and missing facts are never guessed. */
export function parseLabeledConfirmation(raw: string, source: string, id=Date.now()): TravelConfirmation | null {
  const text=raw.replace(/\r/g,'').replace(/\u00a0/g,' ');
  const table=parseFlightTable(text,source,id);if(table)return table;
  const kind: TravelKind=/check[- ]?in|check[- ]?out/i.test(text)?'Hotel':/pick[- ]?up|drop[- ]?off|rental\s+car|car\s+rental/i.test(text)?'Car':'Flight';
  const traveler=field(text,'Passenger(?: name)?|Traveler|Executive|Guest(?: name)?|Renter')||'Executive';
  const reference=field(text,'Confirmation(?: number| code)?|Booking(?: number| reference)?|Reservation(?: number)?')?.split(/\s/)[0];
  const origin=(field(text,'Origin|Departure airport')||field(text,'From'))?.match(/\b[A-Z]{3}\b/)?.[0];
  const destination=(field(text,'Destination|Arrival airport')||field(text,'To'))?.match(/\b[A-Z]{3}\b/)?.[0];
  const timezone=field(text,'Time ?zone')?.split(/\s/)[0];
  const startLabel=kind==='Hotel'?'Check[- ]?in|Arrival':kind==='Car'?'Pick[- ]?up|Start':'Departure|Depart|Start';
  const endLabel=kind==='Hotel'?'Check[- ]?out|Departure':kind==='Car'?'Drop[- ]?off|Return|End':'Arrival|Arrive|End';
  const startDate=field(text,`(?:${startLabel}) date`);const endDate=field(text,`(?:${endLabel}) date`);
  const startRaw=field(text,startLabel)||startDate||'';const endRaw=field(text,endLabel)||endDate||'';
  const startTime=field(text,`(?:${startLabel}) time`)||startRaw;
  const endTime=field(text,`(?:${endLabel}) time`)||endRaw;
  let start=zonedIso(startDate||startRaw,startTime,timezone||zones[origin||'']);
  let end=zonedIso(endDate||endRaw,endTime,timezone||zones[destination||'']);
  let allDay=false;
  // A hotel booking with dates but no check-in/out times is an explicit all-day stay.
  if(kind==='Hotel'&&!start&&!end&&datePart(startDate||startRaw)&&datePart(endDate||endRaw)&&!startTime.match(/\d{1,2}:\d{2}/)&&!endTime.match(/\d{1,2}:\d{2}/)){
    start=datePart(startDate||startRaw)+'T00:00:00Z';end=datePart(endDate||endRaw)+'T00:00:00Z';allDay=true;
  }
  if(!start||!end||Date.parse(end)<=Date.parse(start))return null;
  const flight=field(text,'Flight(?: number)?');
  const vendor=field(text,kind==='Hotel'?'Hotel(?: name)?|Property':kind==='Car'?'Rental company|Car rental|Provider':'Airline');
  if(kind==='Flight'&&(!origin||!destination||!flight))return null;
  const title=kind==='Flight'?`${flight} · ${origin} → ${destination}`:vendor||`${kind} reservation`;
  const route=kind==='Flight'?`${origin} → ${destination}`:field(text,'City|Location|Address')||vendor||'Travel reservation';
  const price=amount(text);
  const item:TravelEntry={id,kind,title,detail:reference?`Confirmation ${reference}`:'Travel confirmation',date:datePart(startDate||startRaw)||start.slice(0,10),time:allDay?'All-day stay':`${startTime} – ${endTime}`,start,end,allDay,source,location:field(text,'Address|Location')||route,cost:price,expenseEligible:true};
  if(kind==='Flight'){
    item.flightCode=flight;item.origin=origin;item.destination=destination;item.confirmation=reference;
    item.seat=text.match(/\bSeat(?:\s+(?:assignment|number))?\s*[:=]?\s*([0-9]{1,3}[A-Z])\b/i)?.[1]?.toUpperCase();
    item.departureTime=startTime;item.arrivalTime=endTime;
    if(item.seat)item.detail+=` · Seat ${item.seat}`;
  }
  return {name:kind==='Flight'?`${destination} trip`:`${vendor||kind} trip`,traveler,dates:`${item.date} – ${datePart(endDate||endRaw)||end.slice(0,10)}`,route,items:[item]};
}

/** Keep PDF table columns separate instead of flattening outbound and return facts. */
export function pdfLayoutText(items: Array<unknown>): string {
  type Fragment={str:string;transform:number[];width:number};
  const fragments=items.filter((item):item is Fragment=>!!item&&typeof item==='object'&&'str' in item&&typeof item.str==='string'&&!!item.str.trim()&&'transform' in item&&Array.isArray(item.transform)&&'width' in item&&typeof item.width==='number');
  const rows:Array<{y:number;items:Fragment[]}>=[];
  for(const item of fragments) {
    const row=rows.find(row=>Math.abs(row.y-item.transform[5])<2);
    if(row)row.items.push(item);else rows.push({y:item.transform[5],items:[item]});
  }
  return rows.sort((a,b)=>b.y-a.y).map(row=>{
    const sorted=row.items.sort((a,b)=>a.transform[4]-b.transform[4]);
    return sorted.map((item,index)=>{
      if(!index)return item.str;
      const previous=sorted[index-1],gap=item.transform[4]-previous.transform[4]-previous.width;
      return (gap>12?'\t':gap>1?' ':'')+item.str;
    }).join('');
  }).join('\n');
}

/** Read explicitly aligned flight-table columns, without guessing missing leg data. */
export function parseFlightTable(text:string,source:string,id=Date.now()):TravelConfirmation|null {
  const rows=text.split(/\r?\n/).map(line=>line.trim().split(/\t+| {2,}/).map(cell=>cell.trim()));
  const row=(names:RegExp)=>rows.find(cells=>names.test(cells[0]))?.slice(1);
  const flights=row(/^(?:Airline\s*\/\s*flight|Flight(?: number)?)$/i);
  const dates=row(/^(?:Date|Travel date|Departure date)$/i);
  const arrivals=row(/^Arrival date$/i)??dates;
  const origins=row(/^(?:Departure airport|Origin|From)$/i),destinations=row(/^(?:Arrival airport|Destination|To)$/i);
  const departures=row(/^(?:Departure time|Depart time)$/i),arrivalTimes=row(/^(?:Arrival time|Arrive time)$/i);
  if(!flights||!dates||!arrivals||!origins||!destinations||!departures||!arrivalTimes||flights.length<1||flights.length>12)return null;
  const count=flights.length;
  if([dates,arrivals,origins,destinations,departures,arrivalTimes].some(cells=>cells.length!==count))return null;
  const seats=row(/^Seat(?:\s*\/\s*cabin)?$/i);
  if(seats&&seats.length!==count)return null;
  const passenger=row(/^(?:Passenger(?: name)?|Traveler|Executive)$/i)?.[0]??'Executive';
  const confirmation=row(/^(?:Confirmation(?: code| number)?|Booking reference|Record locator)$/i)?.[0]?.match(/^[A-Z0-9-]{4,16}\b/i)?.[0];
  const timezone=field(text,'Time ?zone')?.match(/[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?/)?.[0];
  const total=row(/^Total(?: paid| amount| cost)?(?:\s*\([^)]*\))?$/i)?.[0]?.match(/(?:USD\s*)?\$?([\d,]+\.\d{2})/i)?.[1];
  const items:TravelEntry[]=[];
  for(let index=0;index<count;index++) {
    const code=flights[index].match(/\b([A-Z0-9]{2})\s*(\d{1,4})\b/);
    const origin=origins[index].match(/\b[A-Z]{3}\b/)?.[0],destination=destinations[index].match(/\b[A-Z]{3}\b/)?.[0];
    const day=datePart(dates[index]),arrivalDay=datePart(arrivals[index]);
    if(!code||!origin||!destination||!day||!arrivalDay)return null;
    const start=zonedIso(day,departures[index],zones[origin]??timezone),end=zonedIso(arrivalDay,arrivalTimes[index],zones[destination]??timezone);
    if(!start||!end||Date.parse(end)<=Date.parse(start))return null;
    const flight=code[1]+' '+code[2],seat=seats?.[index]?.match(/\b\d{1,3}[A-Z]\b/)?.[0];
    const cabin=seats?.[index]?.split('/').slice(1).join('/').trim();
    items.push({id:id+index,kind:'Flight',title:`${flight} · ${origin} → ${destination}`,detail:[cabin,confirmation?`Confirmation ${confirmation}`:'',seat?`Seat ${seat}`:''].filter(Boolean).join(' · ')||'Flight confirmation',date:day,time:`${departures[index]} – ${arrivalTimes[index]}`,start,end,source,location:`${origins[index]} to ${destinations[index]}`,flightCode:flight,origin,destination,seat,confirmation,departureTime:departures[index],arrivalTime:arrivalTimes[index],expenseEligible:index===0,...(index===0&&total?{cost:Number(total.replace(/,/g,''))}:{})});
  }
  return {name:`${items[0].destination} trip`,traveler:passenger,dates:`${dates[0]} – ${arrivals[count-1]}`,route:[items[0].origin,...items.map(item=>item.destination)].join(' → '),items};
}

let ocrWorker: Promise<import('tesseract.js').Worker> | null=null;
async function readImage(image: File|HTMLCanvasElement) {
  const {createWorker}=await import('tesseract.js');
  if(!ocrWorker)ocrWorker=createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:ocrLangAsset.url.replace(/\/[^/]*$/,'')}).catch(error=>{ocrWorker=null;throw error;});
  const worker=await ocrWorker;const {data}=await worker.recognize(image);return data.text;
}

export async function readTravelDocument(file:File): Promise<string> {
  if(file.size>20*1024*1024)throw new Error('Please use a file smaller than 20 MB.');
  if(file.type.startsWith('image/'))return readImage(file);
  if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
    const pdf=await import('pdfjs-dist');pdf.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    const doc=await pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
    try{
      let result='';for(let n=1;n<=doc.numPages;n++){
        const page=await doc.getPage(n);const content=await page.getTextContent();
        let text=pdfLayoutText(content.items);
        if(text.trim().length<40){const viewport=page.getViewport({scale:1.5});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;const canvasContext=canvas.getContext('2d');if(!canvasContext)throw new Error('The PDF page could not be read.');await page.render({canvas,canvasContext,viewport}).promise;text=await readImage(canvas);}
        result+=text+'\n';page.cleanup();
      }return result;
    }finally{await doc.destroy();}
  }
  const raw=await file.text();return raw.replace(/=\r?\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)))
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,'').replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/tr>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&');
}
