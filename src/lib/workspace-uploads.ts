import type { TravelEntry } from "./travel-confirmations";

export type UploadTrip = { updatedAt?: string; id: number; name: string; traveler: string; executiveId?: string; dates: string; route: string; items: TravelEntry[]; billingCode?: import("./billing-codes").BillingCodeSelection; closed?: boolean; closedAt?: string; status?: string; expenseReport?: { id: string; createdAt: string; approval?: import("./expense-evidence").ExpenseApprovalSignature }; expenseDocuments?: Array<{fileId:string;name:string;kind:"receipt"|"statement"}> };
export type UploadRow = { key: string; fileId: string; source: string; kind: "expense" | "meeting"; title: string; date: string; amount: string; category: string; detail: string; location: string; start?: string; end?: string; lastDate?: string; allDay?: boolean; tripId: string; match: string; selected: boolean; duplicateId?: number; duplicateChoice: string; calendarUid?: string; calendarSuggestion?: "travel" | "destination" | "optional" | "existing"; reviewStatus?: "pending" | "assigned"; reviewTripId?: string; city?: string; suggestedAction?: "exclude"; exclusionReason?: string; evidenceKind?: "receipt"|"statement" };
export type UploadExclusion = { executiveId: string; row: UploadRow; approvedAt: string };
export type DeferredUpload = { executiveId: string; row: UploadRow; updatedAt: string };
export type UnassignedUpload = { executiveId: string; executiveName: string; row: UploadRow; updatedAt: string };

export function unassignedExpenseList(pending: UnassignedUpload[], deferred: DeferredUpload[], trips: UploadTrip[], exclusions: UploadExclusion[]) {
  const resolved = new Set([...trips.flatMap(trip => trip.items.filter(item => item.kind === "Expense").map(item => item.importKey)), ...exclusions.map(value => value.row.key)]);
  const values = new Map(pending.filter(value => value.row.kind === "expense").map(value => [value.row.key, value]));
  for (const value of deferred) if (value.row.reviewStatus !== "assigned") values.set(value.row.key, { ...value, executiveName: pending.find(item => item.executiveId === value.executiveId)?.executiveName ?? "" });
  return [...values.values()].filter(value => !resolved.has(value.row.key)).sort((a, b) => (a.row.date || "9999").localeCompare(b.row.date || "9999") || a.row.key.localeCompare(b.row.key));
}
export type VendorRule = { id: string; executiveId: string; vendor: string; vendorKey: string; city: string; cityKey: string; action: "exclude" | "assign"; tripId?: string; updatedAt: string };
const purchaseCities = ["Chicago", "Denver", "Tallahassee", "Miami", "Atlanta", "New York", "Boston", "Dallas", "Los Angeles", "San Francisco", "Seattle", "Orlando"];
const normalizeVendorPart = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
export function isOpenUploadTrip(trip: UploadTrip) { return !trip.closed && !trip.closedAt && !(typeof trip.status === "string" && trip.status.toLowerCase() === "closed"); }
export function cityForUpload(row: UploadRow) {
  if (row.city?.trim()) return row.city.trim();
  const text = `${row.location} ${row.title}`;
  const known = purchaseCities.find(city => new RegExp(`\\b${city}\\b`, "i").test(row.location)) ?? purchaseCities.find(city => new RegExp(`\\b${city}\\b`, "i").test(row.title));
  if (known) return known;
  if (/\bONLINE\b/i.test(text)) return "Online";
  return row.location.match(/,\s*([A-Za-z .'-]+),?\s+[A-Z]{2}(?:\s+\d{5})?\s*$/)?.[1]?.trim() ?? "";
}
export function vendorForUpload(row: UploadRow) {
  let vendor = row.title.trim().replace(/\s+/g, " ");
  const city = cityForUpload(row);
  if (city) { const at = vendor.toLowerCase().lastIndexOf(city.toLowerCase()); if (at >= 0 && /^(?:\s*,?\s*[A-Z]{2})?\s*$/i.test(vendor.slice(at + city.length))) vendor = vendor.slice(0, at).trim().replace(/[, -]+$/, ""); }
  return vendor;
}
export function createVendorRule(executiveId: string, row: UploadRow, action: VendorRule["action"], tripId?: string): VendorRule {
  const vendor = vendorForUpload(row), vendorKey = normalizeVendorPart(vendor), city = cityForUpload(row), cityKey = normalizeVendorPart(city);
  if (!vendorKey || !cityKey || action === "assign" && !tripId) throw new Error("Enter the vendor and city before remembering this choice.");
  return { id: JSON.stringify([executiveId,vendorKey,cityKey]), executiveId, vendor, vendorKey, city, cityKey, action, tripId: action === "assign" ? tripId : undefined, updatedAt: new Date().toISOString() };
}
export function rememberedVendorRule(row: UploadRow, rules: VendorRule[]) {
  const vendorKey = normalizeVendorPart(vendorForUpload(row)), cityKey = normalizeVendorPart(cityForUpload(row));
  return cityKey ? rules.find(rule => rule.vendorKey === vendorKey && rule.cityKey === cityKey) : undefined;
}
export type UploadedFile = { id: string; name: string };
export const uploadCategories = ["Hotel", "Flight", "Transportation", "Meals", "Parking", "Gas", "Misc.", "Cash reimburse"];

export function isoDay(value: string, year?: number): string {
  const text = value.trim();
  let match = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  let y: number, m: number, d: number;
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else {
    match = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?\b/);
    if (match) { y = match[3] ? (+match[3] < 100 ? 2000 + +match[3] : +match[3]) : year ?? NaN; m = +match[1]; d = +match[2]; }
    else {
      const named = text.match(/\b(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
      if (!named) return "";
      y = named[3] ? +named[3] : year ?? NaN; m = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(named[1].slice(0,3).toLowerCase()) + 1; d = +named[2];
    }
  }
  if (!Number.isFinite(y) || y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const out = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  return new Date(out + "T12:00:00Z").toISOString().slice(0,10) === out ? out : "";
}

export function tripWindow(trip: UploadTrip) {
  const days = trip.items.filter(item => item.kind !== "Expense" && item.kind !== "Appointment").flatMap(item => [item.start?.slice(0,10), item.end?.slice(0,10), isoDay(item.date)]).filter((value): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)).sort();
  if (days.length) return { first: days[0], last: days[days.length - 1] };
  const year = trip.dates.match(/\b20\d{2}\b/)?.[0];
  const range = trip.dates.match(/\b([A-Za-z]+)\s+(\d{1,2})\s*[–-]\s*(\d{1,2}),?\s+(20\d{2})/);
  if (range) return { first: isoDay(`${range[1]} ${range[2]} ${range[4]}`), last: isoDay(`${range[1]} ${range[3]} ${range[4]}`) };
  const explicit = trip.dates.split(/\s+[–-]\s+/).map(value => isoDay(value, year ? +year : undefined)).filter(Boolean);
  return explicit.length ? { first: explicit[0], last: explicit[explicit.length - 1] } : null;
}

function categoryFor(title: string) {
  return /hotel|marriott|hilton|hyatt|lodging|hoxton|rally hotel/i.test(title) ? "Hotel" : /airlines?|delta|united|american air|flight|southwest/i.test(title) ? "Flight" : /parking|garage/i.test(title) ? "Parking" : /shell|chevron|exxon|gasoline|fuel/i.test(title) ? "Gas" : /uber|lyft|taxi|hertz|avis|rental|transport/i.test(title) ? "Transportation" : /restaurant|cafe|coffee|dinner|lunch|breakfast|meal|starbucks/i.test(title) ? "Meals" : "Misc.";
}
export function matchUploadRow(row: UploadRow, trips: UploadTrip[], preferredTripId?: string): UploadRow {
  const reference = row.detail.match(/(?:confirmation|booking|reservation)(?:\s+(?:number|code))?\s*[:#=]?\s*([A-Z0-9-]{5,})/i)?.[1];
  const referenceMatches = reference ? trips.filter(trip => trip.items.some(item => item.confirmation?.toLowerCase() === reference.toLowerCase() || item.detail.toLowerCase().includes(reference.toLowerCase()))) : [];
  const dates = trips.filter(trip => { const window = tripWindow(trip); return window && row.date && (row.lastDate ?? row.date) >= window.first && row.date <= window.last; });
  const matches = referenceMatches.length ? referenceMatches : dates;
  const trip = preferredTripId ? trips.find(trip=>String(trip.id)===preferredTripId) : matches.length === 1 ? matches[0] : undefined;
  const result = { ...row, tripId: trip ? String(trip.id) : "", match: trip ? referenceMatches.length ? "Matched booking reference" : "Matched travel dates" : matches.length > 1 ? "More than one trip fits — choose a trip" : "Which trip does this belong to?" };
  if (trip && row.kind === "expense") {
    const tokens = row.title.toLowerCase().match(/[a-z]{3,}/g) ?? [];
    const duplicate = trip.items.find(item => item.kind !== "Appointment" && item.expenseEligible !== false && Number(row.amount) === item.cost && (row.date === (item.start?.slice(0,10) ?? isoDay(item.date)) || ["Flight", "Hotel", "Car"].includes(item.kind)) && tokens.some(token => item.title.toLowerCase().includes(token)));
    if (duplicate) { result.duplicateId = duplicate.id; result.duplicateChoice = ""; result.match += " · Possible existing expense — choose how to apply"; }
  }
  return result;
}
function baseRow(file: UploadedFile, index: number, kind: UploadRow["kind"]): UploadRow {
  return { key: `${file.id}:${index}`, fileId: file.id, source: file.name, kind, title: "", date: "", amount: "", category: "Misc.", detail: "", location: "", tripId: "", match: "", selected: kind === "expense", duplicateChoice: "new" };
}
export function csvCells(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i=0;i<text.length;i++) { const c=text[i]; if(c==='"'){ if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted; } else if(c===','&&!quoted){row.push(cell);cell="";}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}else cell+=c; }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function statementPayment(value: string) { return /\b(?:autopay|payment\s*(?:-\s*)?(?:received|thank\s*you)|(?:online|mobile|internet|automatic|card)\s+(?:payment|pmt)|payment\s+to\s+(?:credit\s+card|account)|thank\s*you.*payment)\b/i.test(value); }
function money(value: string) { const raw=value.trim(); const negative=/^-|\(|\bCR\b/i.test(raw); const cleaned=raw.replace(/[$,()\s]|USD|CR/gi,"");const number=Number(cleaned);return cleaned&&Number.isFinite(number)?String(negative?-Math.abs(number):number):""; }
export function expenseRows(text: string, file: UploadedFile, table?: string[][]): UploadRow[] {
  const kind: "receipt"|"statement" = table || /\.(csv|tsv|xlsx)$/i.test(file.name) || /credit card statement|account statement|statement balance|payment due date|new balance/i.test(text) ? "statement" : "receipt";
  return parsedExpenseRows(text,file,table).map(row=>({...row,evidenceKind:kind}));
}
function parsedExpenseRows(text: string, file: UploadedFile, table?: string[][]): UploadRow[] {
  // A receipt sheet contains several independent merchant/date/total blocks.
  const receiptStarts = !table && !/\.csv$/i.test(file.name) ? [...text.matchAll(/^\s*(?:Merchant|Vendor|Restaurant)\s*[:=]/gim)].map(match => match.index!) : [];
  if (receiptStarts.length > 1) return receiptStarts.flatMap((start,index) => expenseRows(text.slice(start,receiptStarts[index+1]??text.length),file).map(row => ({...row,key:`${file.id}:${index}`})));
  const rows: UploadRow[] = [];
  const grid = table ?? (/\.csv$/i.test(file.name) ? csvCells(text) : []);
  const headerAt = grid.findIndex(row => row.some(cell => /date/i.test(cell)) && row.some(cell => /amount|debit|charge/i.test(cell)));
  if (headerAt >= 0) {
    const header=grid[headerAt]; const column=(regex:RegExp)=>header.findIndex(cell=>regex.test(cell));
    const date=column(/transaction.*date|^date$|^posted.*date|^posting.*date/i); const description=column(/description|merchant|payee|name/i); const amount=column(/^amount$|transaction.*amount|^debit$|charge/i); const credit=column(/^credit$/i); const city=column(/^city$/i),state=column(/^state$/i),address=column(/^address$|location/i);
    for(const values of grid.slice(headerAt+1)){const title=values[description]??"";const day=isoDay(values[date]??"");const price=money(values[amount]??"")||(credit>=0&&money(values[credit]??"")?String(-Math.abs(Number(money(values[credit])))):"");if(!title&&!day&&!price)continue;if(!day&&!price)continue;
      rows.push({...baseRow(file,rows.length,"expense"),title,date:day,amount:price,category:categoryFor(title),detail:"Imported statement transaction",location:[values[address],values[city],values[state]].filter(Boolean).join(", "),city:values[city]?.trim(),selected:!statementPayment(title)}); }
    return rows;
  }
  const periodLine=text.match(/\b(?:statement|period|closing|ending)[^\n]{0,120}/i)?.[0]??"";
  const statementYears=[...new Set(periodLine.match(/\b20\d{2}\b/g)??[])];
  const year=statementYears.length===1?statementYears[0]:undefined;
  for(const line of text.split(/\r?\n/)){
    const match=line.trim().match(/^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-](?:\d{4}|\d{2}))?)\s+(?:\d{1,2}[/-]\d{1,2}(?:[/-](?:\d{4}|\d{2}))?\s+)?(.+?)\s+(-?\$?[\d,]+\.\d{2}|\([\d,]+\.\d{2}\))(?:\s*(CR))?\s*$/i);
    if(match){const title=match[2].trim();if(statementPayment(title)||/previous balance|new balance/i.test(title))continue;rows.push({...baseRow(file,rows.length,"expense"),title,date:isoDay(match[1],year?+year:undefined),amount:money(match[3]+(match[4]??"")),category:categoryFor(title),detail:"Imported statement transaction"});}
  }
  if(rows.length)return rows;
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const total=text.match(/\b(?:grand\s+total|total(?:\s+(?:paid|amount|cost))?|amount\s+paid|amount\s+due)\s*[:=]?\s*(?:USD\s*)?\$?([\d,]+\.\d{2})/i)?.[1];
  const dateLine=lines.find(line=>/date|purchased|paid|transaction/i.test(line)&&isoDay(line))??lines.find(line=>isoDay(line));
  const vendor=text.match(/(?:merchant|vendor|business|restaurant|hotel|payee)\s*[:=]\s*([^\n]+)/i)?.[1]??lines.find(line=>! /receipt|statement|invoice|date|total|visa|mastercard|american express|\d{4}/i.test(line))??file.name.replace(/\.[^.]+$/,"");
  // An unrecognized statement is reviewed manually rather than importing its balance as an expense.
  const statement=/credit card statement|account statement|statement balance|payment due date|new balance/i.test(text);
  const addressLine = lines.findIndex(line=>/^Address\s*[:=]/i.test(line));
  const location = addressLine>=0 ? [lines[addressLine].replace(/^Address\s*[:=]\s*/i,""), lines[addressLine+1]&&!/^Date|Receipt/i.test(lines[addressLine+1])?lines[addressLine+1]:""].filter(Boolean).join(", ") : "";
  return [{...baseRow(file,0,"expense"),title:statement?"":vendor,date:dateLine?isoDay(dateLine):"",amount:statement?"":total?money(total):"",category:categoryFor(vendor),location,detail:statement?"Statement rows could not be read. Enter a transaction or upload a CSV/Excel export.":text.slice(0,1600)}];
}

const timezoneNames: Record<string,string>={"Eastern Standard Time":"America/New_York","Central Standard Time":"America/Chicago","Mountain Standard Time":"America/Denver","Pacific Standard Time":"America/Los_Angeles","GMT Standard Time":"Europe/London","W. Europe Standard Time":"Europe/Berlin"};
export function calendarInstant(day:string, clock:string, zone:string) {
  const [y,m,d]=day.split("-").map(Number); const [h,min,sec]=clock.split(":").map(Number); const target=Date.UTC(y,m-1,d,h,min,sec||0);let instant=target;
  const timezone=timezoneNames[zone]??zone;
  for(let i=0;i<4;i++){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(new Date(instant));const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));const adjust=target-Date.UTC(+values.year,+values.month-1,+values.day,+values.hour,+values.minute,+values.second);instant+=adjust;if(!adjust)break;}
  return new Date(instant).toISOString();
}
type CalendarStamp={day:string;clock:string;zone:string;allDay:boolean;instant:string};
function stamp(line:string, defaultZone:string): CalendarStamp | null {
  const colon=line.indexOf(":");const params=line.slice(0,colon);const value=line.slice(colon+1).trim(); const match=value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);if(!match)return null;
  const day=isoDay(`${match[1]}-${match[2]}-${match[3]}`);if(!day)return null;
  if (+ (match[4]??0)>23 || +(match[5]??0)>59 || +(match[6]??0)>59) return null;
  const clock=`${match[4]??"00"}:${match[5]??"00"}:${match[6]??"00"}`;const zone=match[7]?"UTC":params.match(/TZID="?([^;":]+(?:\/[^;":]+)?)/)?.[1]??defaultZone;
  return {day,clock,zone,allDay:!match[4],instant:match[4]?calendarInstant(day,clock,zone):`${day}T00:00:00Z`};
}
function unescapeCalendar(value:string){return value.replace(/\\[nN]/g,"\n").replace(/\\([,;\\])/g,"$1");}
function nextDay(day:string, count:number){return new Date(Date.parse(day+"T12:00:00Z")+count*86400000).toISOString().slice(0,10);}
function displayClock(instant:string,zone:string){return new Intl.DateTimeFormat("en-US",{timeZone:timezoneNames[zone]??zone,hour:"numeric",minute:"2-digit"}).format(new Date(instant));}

export function calendarRows(text:string,file:UploadedFile,trips:UploadTrip[],defaultZone="America/New_York") {
  const rows:UploadRow[]=[];const warnings:string[]=[];const windows=trips.map(tripWindow).filter((w):w is NonNullable<typeof w>=>!!w);
  if(!windows.length)return {rows,warnings:["Add travel dates or a booking to a trip before importing its calendar."]};
  const first=windows.map(w=>w.first).sort()[0],last=windows.map(w=>w.last).sort().at(-1)!;
  const unfolded=text.replace(/\r?\n[ \t]/g,"");const blocks=unfolded.match(/BEGIN:VEVENT\r?\n[\s\S]*?END:VEVENT/gi)??[];
  const events=blocks.map(block=>{const lines=block.split(/\r?\n/);const get=(key:string)=>lines.find(line=>new RegExp(`^${key}(?:;|:)`,"i").test(line));const value=(key:string)=>{const line=get(key);return line?unescapeCalendar(line.slice(line.indexOf(":")+1)):"";};return {lines,get,value};});
  const overrides=new Set(events.filter(e=>e.get("RECURRENCE-ID")).map(e=>{try{return e.value("UID")+":"+stamp(e.get("RECURRENCE-ID")!,defaultZone)?.instant;}catch{return "";}}));
  for(const event of events){if(/CANCELLED/i.test(event.value("STATUS")))continue;const title=event.value("SUMMARY")||"Untitled meeting";
    try{const startLine=event.get("DTSTART");if(!startLine)continue;const start=stamp(startLine,defaultZone);if(!start)throw new Error("unrecognized start time");const endLine=event.get("DTEND");const end=endLine?stamp(endLine,defaultZone):null;
      const durationValue=event.value("DURATION").match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
      const duration=end?Date.parse(end.instant)-Date.parse(start.instant):durationValue?(+(durationValue[1]??0)*86400+ +(durationValue[2]??0)*3600+ +(durationValue[3]??0)*60+ +(durationValue[4]??0))*1000:start.allDay?86400000:0;
      if(duration<0)throw new Error("end time is before start time");
      const rule=Object.fromEntries(event.value("RRULE").split(";").filter(Boolean).map(piece=>piece.split("=")));const recurring=!!rule.FREQ&&!event.get("RECURRENCE-ID");
      const supported=["FREQ","INTERVAL","COUNT","UNTIL","BYDAY","BYMONTHDAY","WKST"];
      if(recurring&&(rule.BYMONTHDAY && (rule.FREQ!=="MONTHLY" || /-/.test(rule.BYMONTHDAY)) || !["DAILY","WEEKLY","MONTHLY","YEARLY"].includes(rule.FREQ)||Object.keys(rule).some(key=>!supported.includes(key))||(rule.BYDAY&&(/\d/.test(rule.BYDAY)||rule.FREQ==="MONTHLY"||rule.FREQ==="YEARLY"))))throw new Error("this recurrence needs an export of individual occurrences");
      const interval=Math.max(1,Number(rule.INTERVAL)||1);const count=rule.COUNT?Number(rule.COUNT):Infinity;
      const until=rule.UNTIL?stamp("UNTIL:"+rule.UNTIL, start.zone)?.instant:undefined;
      const exclusions=new Set(event.lines.filter(line=>/^EXDATE[;:]/i.test(line)).flatMap(line=>{const prefix=line.slice(0,line.indexOf(":")+1);return line.slice(line.indexOf(":")+1).split(",").map(value=>stamp(prefix+value,defaultZone)?.instant);}));
      const weekdays=["SU","MO","TU","WE","TH","FR","SA"];const initialDate=new Date(start.day+"T12:00:00Z");let occurrence=0;
      const days:string[]=[];
      if(!recurring)days.push(start.day);
      else {const distance=Math.floor((Date.parse(last+"T12:00:00Z")-Date.parse(start.day+"T12:00:00Z"))/86400000);if(distance>40000)throw new Error("recurrence starts too far in the past");
        for(let delta=0;delta<=Math.max(0,distance);delta++){const day=nextDay(start.day,delta);const date=new Date(day+"T12:00:00Z");const monthDistance=(date.getUTCFullYear()-initialDate.getUTCFullYear())*12+date.getUTCMonth()-initialDate.getUTCMonth();
          const weekStart=weekdays.indexOf(rule.WKST||"MO");const firstWeekOffset=(initialDate.getUTCDay()-weekStart+7)%7;
          const weekdayMatch=(rule.BYDAY?rule.BYDAY.split(","): [weekdays[initialDate.getUTCDay()]]).includes(weekdays[date.getUTCDay()]);
          const matches=rule.FREQ==="DAILY"?delta%interval===0&&(!rule.BYDAY||rule.BYDAY.split(",").includes(weekdays[date.getUTCDay()])):rule.FREQ==="WEEKLY"?Math.floor((delta+firstWeekOffset)/7)%interval===0&&weekdayMatch:rule.FREQ==="MONTHLY"?monthDistance%interval===0&&(rule.BYMONTHDAY?rule.BYMONTHDAY.split(",").map(Number).includes(date.getUTCDate()):date.getUTCDate()===initialDate.getUTCDate()):(date.getUTCFullYear()-initialDate.getUTCFullYear())%interval===0&&date.getUTCMonth()===initialDate.getUTCMonth()&&date.getUTCDate()===initialDate.getUTCDate();
          if(matches){occurrence++;if(occurrence>count)break;const instant=start.allDay?day+"T00:00:00Z":calendarInstant(day,start.clock,start.zone);if(until&&Date.parse(instant)>Date.parse(until))break;if(day>=nextDay(first,-Math.ceil(duration/86400000)))days.push(day);}
        }
      }
      for(const line of event.lines.filter(line=>/^RDATE[;:]/i.test(line))){const prefix=line.slice(0,line.indexOf(":")+1);for(const value of line.slice(line.indexOf(":")+1).split(",")){const additional=stamp(prefix+value,defaultZone);if(additional){if(additional.clock!==start.clock||additional.zone!==start.zone)throw new Error("additional recurrence times need an export of individual occurrences");days.push(additional.day);}}}
      for(const day of [...new Set(days)]){const instant=start.allDay?day+"T00:00:00Z":calendarInstant(day,start.clock,start.zone);const finish=new Date(Date.parse(instant)+duration).toISOString();const localDate=new Intl.DateTimeFormat("en-CA",{timeZone:start.allDay?"UTC":defaultZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(instant));
        const lastDate=new Intl.DateTimeFormat("en-CA",{timeZone:start.allDay?"UTC":defaultZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(Date.parse(finish)-(duration?1:0)));
        if(!windows.some(w=>lastDate>=w.first&&localDate<=w.last)||exclusions.has(instant)||(recurring&&overrides.has(event.value("UID")+":"+instant)))continue;
        rows.push({...baseRow(file,rows.length,"meeting"),title,date:localDate,lastDate,start:instant,end:duration?finish:undefined,allDay:start.allDay,detail:event.value("DESCRIPTION"),location:event.value("LOCATION"),calendarUid:(event.value("UID")||title)+":"+instant,amount:"",match:"",selected:false,category:displayClock(instant,defaultZone)+(duration?" – "+displayClock(finish,defaultZone):"")});
      }
    }catch(error){warnings.push(`${title}: ${error instanceof Error?error.message:"could not read the meeting"}.`);}
  }
  if(!blocks.length)warnings.push("No calendar events were found. Upload an Outlook or Google Calendar .ics export.");
  const unique=rows.filter((row,index,all)=>all.findIndex(candidate=>candidate.calendarUid===row.calendarUid)===index);
  return {rows:unique.sort((a,b)=>(a.start??a.date).localeCompare(b.start??b.date)),warnings};
}

const itineraryAirportCities: Record<string,string>={ATL:"Atlanta",BOS:"Boston",CLT:"Charlotte",DCA:"Washington",IAD:"Washington",DEN:"Denver",DFW:"Dallas",EWR:"Newark",FLL:"Fort Lauderdale",IAH:"Houston",JFK:"New York",LGA:"New York",LAS:"Las Vegas",LAX:"Los Angeles",MCO:"Orlando",MIA:"Miami",ORD:"Chicago",PHL:"Philadelphia",PHX:"Phoenix",SEA:"Seattle",SFO:"San Francisco",TLH:"Tallahassee"};
function destinationCity(trip:UploadTrip){const codes=trip.route.match(/\b[A-Z]{3}\b/g)??[];return itineraryAirportCities[codes.at(-1)??""]??Object.values(itineraryAirportCities).find(city=>trip.name.toLowerCase().includes(city.toLowerCase()))??"";}
export function suggestedCalendarRows(rows:UploadRow[],trips:UploadTrip[]) {
  const openTrips=trips.filter(isOpenUploadTrip);
  const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
  return rows.map(row=>{
    let matched=matchUploadRow(row,openTrips);
    const remote=/\b(remote|virtual|online|teams|zoom|webex|google meet|video call|phone call|teleconference)\b|https?:\/\//i.test(row.location)||/\b(remote|virtual|video call|phone call|teleconference)\b/i.test(row.title);
    const physicalTrips=!remote?openTrips.filter(trip=>{const city=destinationCity(trip),window=tripWindow(trip);return city&&window&&row.date<=window.last&&(row.lastDate??row.date)>=window.first&&new RegExp(`\\b${city}\\b`,"i").test(row.location);}):[];
    if(!matched.tripId&&physicalTrips.length===1)matched=matchUploadRow(row,openTrips,String(physicalTrips[0].id));
    const existing=trips.some(trip=>trip.items.some(item=>item.calendarUid===row.calendarUid||item.start&&row.start&&Date.parse(item.start)===Date.parse(row.start)&&(normalized(item.title)===normalized(row.title)||item.kind==="Flight"&&normalized(item.title.match(/^[A-Z]{2}\s*\d{2,4}/i)?.[0]??"")!==""&&normalized(item.title.match(/^[A-Z]{2}\s*\d{2,4}/i)?.[0]??"")===normalized(row.title.match(/^[A-Z]{2}\s*\d{2,4}/i)?.[0]??""))));
    if(existing)return {...matched,selected:false,duplicateChoice:"skip",calendarSuggestion:"existing" as const,match:"Already included in an itinerary"};
    const trip=openTrips.find(trip=>String(trip.id)===matched.tripId),city=trip?destinationCity(trip):"";
    const travel=!remote&&(/\b(flight|uber|lyft|taxi|airport|transfer|shuttle|check[ -]?in|check[ -]?out)\b/i.test(row.title)||/^[A-Z]{2}\s*\d{2,4}\b.*\b[A-Z]{3}\b/i.test(row.title));
    const destination=!remote&&!!city&&new RegExp(`\\b${city}\\b`,"i").test(row.location);
    const selected=!!matched.tripId&&(travel||destination);
    return {...matched,selected,calendarSuggestion:travel?"travel" as const:destination?"destination" as const:"optional" as const,match:selected?travel?"Suggested for itinerary: travel entry":`Suggested for itinerary: physically in ${city}`:!matched.tripId?matched.match:remote?"Remote appointment - optional for the itinerary":"Optional appointment - check to include"};
  });
}

export function automaticCalendarPlan(rows:UploadRow[],trips:UploadTrip[]) {
  const automatic:UploadRow[]=[],review:UploadRow[]=[];let ignored=0;
  for(const row of suggestedCalendarRows(rows,trips)){
    if(row.calendarSuggestion==="existing"){ignored++;continue;}
    const complete=!!row.title.trim()&&!!isoDay(row.date)&&!!row.start&&(!!row.end||row.allDay);
    if(row.selected&&row.tripId&&complete)automatic.push(row);
    else review.push({...row,selected:false,match:row.selected&&!complete?"Calendar entry is missing a start or end time — review before including":row.match});
  }
  return {automatic,review,ignored};
}

export async function readUploadTable(file:File):Promise<string[][]|undefined>{
  if(/\.(csv|tsv)$/i.test(file.name)){const {readBillingCodeFile}=await import("./billing-code-import");return (await readBillingCodeFile(file))[0].rows;}
  if(!/\.xlsx$/i.test(file.name))return undefined;
  const {default:ExcelJS}=await import("exceljs");const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());
  const rows:string[][]=[];book.eachSheet(sheet=>sheet.eachRow(row=>{const cells:string[]=[];for(let i=1;i<=row.cellCount;i++){const cell=row.getCell(i);const value=cell.value;cells.push(value instanceof Date?value.toISOString().slice(0,10):cell.text);}rows.push(cells);}));return rows;
}

export function uploadEntry(row:UploadRow):TravelEntry {
  return {id:Math.floor(Date.now()*1000+Math.random()*1000),kind:row.kind==="meeting"?"Appointment":"Expense",title:row.title.trim(),detail:row.detail,date:row.date,time:row.kind==="meeting"?row.allDay?"All day":row.category:"",start:row.start,end:row.end,allDay:row.allDay,location:row.location,source:row.source,sourceFileId:row.fileId,importKey:row.key,calendarUid:row.calendarUid,cost:row.kind==="expense"?Number(row.amount):undefined,expenseCategory:row.kind==="expense"?row.category:undefined,expenseEligible:row.kind==="expense",expenseEvidence:row.kind==="expense"&&row.evidenceKind?[{fileId:row.fileId,kind:row.evidenceKind}]:undefined,itineraryDate:row.kind==="meeting"?row.date:undefined,itineraryEligible:row.kind==="meeting"};
}

export function assignedUploadTrips(trips: UploadTrip[], rows: UploadRow[], executiveId: string) {
  return trips.filter(trip => rows.some(row => row.tripId === String(trip.id))).map(trip => {
    let items = [...trip.items];
    for (const row of rows.filter(row => row.tripId === String(trip.id))) {
      if (items.some(item => item.importKey === row.key || row.calendarUid && item.calendarUid === row.calendarUid)) continue;
      const entry = uploadEntry(row);
      if (row.duplicateChoice === "update" && row.duplicateId) {
        items = items.map(item => item.id === row.duplicateId ? { ...item, cost: entry.cost, expenseCategory: entry.expenseCategory, source: entry.source, sourceFileId: entry.sourceFileId, importKey: entry.importKey, expenseEvidence: [...(item.expenseEvidence??[]),...(entry.expenseEvidence??[])].filter((value,index,all)=>all.findIndex(candidate=>candidate.fileId===value.fileId)===index) } : item);
      } else items.push(entry);
    }
    return { ...trip, executiveId, items, expenseReport: trip.expenseReport ?? { id: `expenses-${trip.id}`, createdAt: new Date().toISOString() } };
  });
}

function expenseFingerprint(row: UploadRow) {
  return `${row.date}|${Number(row.amount)}|${row.title.toLowerCase().replace(/\W/g, "")}`;
}

// Only ambiguous, incomplete, or possibly duplicated expenses need a decision.
export function suggestedExpenseExclusion(row: UploadRow, trips: UploadTrip[]) {
  const description = row.title.toLowerCase();
  if (/subscription|website hosting|web hosting|squarespace|wix|webflow|adobe creative|netflix|spotify|gym membership|fitness.*membership|utilities|electric bill|internet bill|residential.*bill/.test(description)) return "Website subscription, household bill, or recurring non-travel charge";
  const cities: Record<string,string> = { ORD:"Chicago", DEN:"Denver", TLH:"Tallahassee", MIA:"Miami", ATL:"Atlanta", JFK:"New York", LGA:"New York", BOS:"Boston", DFW:"Dallas", LAX:"Los Angeles", SFO:"San Francisco", SEA:"Seattle", MCO:"Orlando" };
  const location = `${row.location} ${row.title}`;
  const city = [...new Set(Object.values(cities))].find(value=>new RegExp(`\\b${value}\\b`,"i").test(location));
  const trip = trips.find(value=>String(value.id)===row.tripId);
  if (trip && city) {
    const tripDescription = [trip.name,trip.route,...trip.items.filter(item=>item.kind!=="Expense").flatMap(item=>[item.title,item.location??""])].join(" ");
    const tripCities = [...new Set([...Object.entries(cities).filter(([code,name])=>new RegExp(`\\b${code}\\b|\\b${name}\\b`,"i").test(tripDescription)).map(([,name])=>name)])];
    if (tripCities.length && !tripCities.includes(city)) return `${city} purchase location does not match this trip`;
  }
  if (!row.tripId && isoDay(row.date) && !trips.some(value=>{const window=tripWindow(value);return window&&row.date>=window.first&&row.date<=window.last;})) return "Purchase is outside all available trip dates";
  return null;
}

export function automaticExpensePlan(rows: UploadRow[], trips: UploadTrip[], pending: UploadRow[] = [], exclusions: UploadExclusion[] = [], rules: VendorRule[] = [], deferred: DeferredUpload[] = []) {
  const automatic: UploadRow[] = [], review: UploadRow[] = [];
  let ignored = 0;
  const openTrips=trips.filter(isOpenUploadTrip);
  const matched = rows.map(row => row.kind === "expense" ? matchUploadRow(row, openTrips) : row);
  const candidates = [...pending, ...matched].filter(row => row.kind === "expense" && row.selected);
  for (const row of matched) {
    if (row.kind !== "expense") { review.push(row); continue; }
    if (!row.selected || trips.some(trip => trip.items.some(item => item.importKey === row.key))) { ignored++; continue; }
    if (deferred.some(value=>value.row.key===row.key||expenseFingerprint(value.row)===expenseFingerprint(row))) { ignored++; continue; }
    if (exclusions.some(value=>value.row.key===row.key || expenseFingerprint(value.row)===expenseFingerprint(row))) { ignored++; continue; }
    const rule = rememberedVendorRule(row,rules);
    if (rule?.action === "exclude") { ignored++; continue; }
    if (rule?.action === "assign") {
      const target = openTrips.find(trip => String(trip.id) === rule.tripId);
      if (!target) { review.push({...row,tripId:"",match:"The remembered trip is closed or unavailable — choose an open trip"}); continue; }
      Object.assign(row,matchUploadRow({...row,duplicateId:undefined,duplicateChoice:"new"},[target],String(target.id)),{tripId:String(target.id),match:`Remembered vendor and city · ${target.name}`});
    }
    const exclusionReason = rule?.action === "assign" ? null : suggestedExpenseExclusion(row,openTrips);
    if (exclusionReason) { review.push({...row,suggestedAction:"exclude",exclusionReason,selected:false,match:`Suggested irrelevant: ${exclusionReason}`}); continue; }
    const complete = row.title.trim() && isoDay(row.date) && row.amount.trim() && Number.isFinite(Number(row.amount));
    const duplicateInBatch = complete && candidates.some(other => other.key !== row.key && expenseFingerprint(other) === expenseFingerprint(row));
    if (duplicateInBatch) { review.push({ ...row, match: "Possible duplicate in these files — choose non-travel to delete the repeated charge" }); continue; }
    if (row.tripId && complete && !row.duplicateId) automatic.push(row);
    else review.push({...row,match:!complete?"Description, date, or amount is missing":row.match});
  }
  return { automatic, review, ignored };
}

/** Receipts keep their proposed match, but assignment always waits for the user. */
export function expenseTripReviewPlan(rows: UploadRow[], trips: UploadTrip[], pending: UploadRow[] = [], exclusions: UploadExclusion[] = [], rules: VendorRule[] = [], deferred: DeferredUpload[] = []) {
  const plan = automaticExpensePlan(rows, trips, pending, exclusions, rules, deferred);
  const review = [...plan.automatic, ...plan.review].map(row => {
    if (row.kind !== "expense" || row.exclusionReason || /Remembered vendor/i.test(row.match)) return row;
    const city = cityForUpload(row).toLowerCase();
    const locationTrips = !city || city === "online" ? trips : trips.filter(trip => {
      const codes = trip.route.match(/\b[A-Z]{3}\b/g) ?? [];
      const away = codes.length > 1 ? codes.slice(1).filter(code => code !== codes[0]) : codes;
      const places = new Set(away.map(code => itineraryAirportCities[code]?.toLowerCase()).filter(Boolean));
      const details = `${trip.name} ${trip.items.filter(item => item.kind === "Hotel" || item.kind === "Car").map(item => item.location ?? "").join(" ")}`.toLowerCase();
      for (const value of purchaseCities) if (details.includes(value.toLowerCase())) places.add(value.toLowerCase());
      return !places.size || places.has(city);
    });
    const suggested = matchUploadRow(row, locationTrips.filter(isOpenUploadTrip));
    return {...suggested, match: /duplicate|missing/i.test(row.match) ? row.match : suggested.tripId ? `Likely match — ${suggested.match}. Confirm before adding.` : suggested.match};
  });
  return {review, ignored: plan.ignored};
}

export function mergeUploadedTrips(current:UploadTrip[], saved:UploadTrip[]) {
  const result=[...current];for(const trip of saved){const index=result.findIndex(value=>value.id===trip.id);if(index<0){result.push(trip);continue;}const present=result[index];const imported=trip.items.filter(item=>item.importKey);const ids=new Set(imported.map(item=>item.id));const keys=new Set(imported.map(item=>item.importKey));result[index]={...present,billingCode:trip.billingCode,items:[...present.items.filter(item=>!ids.has(item.id)&&(!item.importKey||!keys.has(item.importKey))).map(item=>{const stored=trip.items.find(value=>value.id===item.id);return stored?{...item,billingCode:stored.billingCode,expenseDescription:stored.expenseDescription,expenseDate:stored.expenseDate,cost:stored.cost,expenseCategory:stored.expenseCategory,expenseEvidence:stored.expenseEvidence,...(typeof stored.materialsAttached==="boolean"?{materialsAttached:stored.materialsAttached,materialsFormat:stored.materialsFormat}:{})}:item;}),...imported],expenseReport:trip.expenseReport??present.expenseReport,expenseDocuments:trip.expenseDocuments??present.expenseDocuments};}return result;
}
