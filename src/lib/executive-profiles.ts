import { billingCodeText, effectiveBillingCode } from "./billing-codes";

export type CalendarFormat = Pick<ExecutiveTemplates, 'outlookTitle' | 'outlookNotes' | 'calendarLocation' | 'calendarShowAs' | 'calendarReminderMinutes' | 'calendarFlightFormat'>;
export type ExecutiveTemplates = {
  calendarFormats?: Partial<Record<'Flight' | 'Hotel' | 'Car' | 'Appointment', CalendarFormat>>;
  customName?: string;
  templateId?: string;
  updatedAt?: string;
  outlookTitle: string;
  outlookNotes: string;
  itineraryHeading: string;
  itineraryTitle: string;
  itineraryBody: string;
  itineraryLayout: "list" | "table";
  showSources: boolean;
  calendarFlightFormat?: "standard" | "abbreviated";
  calendarLocation?: string;
  calendarShowAs?: "Free" | "Working Elsewhere" | "Tentative" | "Busy" | "Out of Office";
  calendarReminderMinutes?: number | null;
  itineraryFlightFormat?: "standard" | "abbreviated";
  expenseHeading?: string;
  expenseShowDate?: boolean;
  expenseShowCategory?: boolean;
  expenseShowSources?: boolean;
  expenseShowTotal?: boolean;
};
export type SavedCustomTemplate = { id: string; template: ExecutiveTemplates; updatedAt: string };
export type TemplateKind = "outlook" | "print" | "expenses";
export type ExecutiveProfile = {
  email: string;
  phone: string;
  homeAirport: string;
  notes: string;
  updatedAt?: string;
  travelPreferences?: import("./travel-preferences").TravelPreferences;
};
export type Executive = { id: string; name: string; templates: ExecutiveTemplates; profile?: ExecutiveProfile };
export type TemplateReservation = {
  billingCode?: import("./billing-codes").BillingCodeSelection | null;
  id?: number; expenseDescription?: string; expenseDate?: string; expenseEvidence?: Array<{fileId:string;kind:"receipt"|"statement"}>; materialsAttached?: boolean; materialsFormat?: "digital" | "hardcopy" | "both";
  kind: string; title: string; detail: string; date: string; time: string;
  location?: string; source?: string; cost?: number;
  start?: string; end?: string; allDay?: boolean; flightCode?: string; origin?: string; destination?: string;
  seat?: string; confirmation?: string; departureTime?: string; arrivalTime?: string;
};
export type TemplateTrip = { name: string; traveler: string; dates: string; route: string; executiveId?: string; billingCode?: import("./billing-codes").BillingCodeSelection };
export const defaultTemplates: ExecutiveTemplates = {
  outlookTitle: "{reservation}",
  outlookNotes: "{details}\nTrip: {trip}\nExecutive: {executive}\nLocation: {location}\nSource: {source}",
  itineraryHeading: "TRAVEL ITINERARY FOR {executive}",
  itineraryTitle: "{reservation}",
  itineraryBody: "{date} · {time}\n{details}\n{location}",
  itineraryLayout: "list",
  showSources: false,
  calendarFlightFormat: "standard",
  calendarLocation: "{location}",
  calendarShowAs: "Busy",
  calendarReminderMinutes: 15,
  itineraryFlightFormat: "standard",
  expenseHeading: "EXPENSE REPORT",
  expenseShowDate: true,
  expenseShowCategory: true,
  expenseShowSources: true,
  expenseShowTotal: true,
};
// Normalize saved template text while retaining {traveler} as an interpolation alias.
export function executiveTemplateTerminology(templates: ExecutiveTemplates): ExecutiveTemplates {
  const updated = { ...templates };
  for (const key of ["outlookTitle", "outlookNotes", "calendarLocation", "itineraryHeading", "itineraryTitle", "itineraryBody", "expenseHeading"] as const) {
    if (typeof updated[key] === "string") updated[key] = updated[key]!.replace(/\btraveler(s)?\b/gi, word => {
      const replacement = word.toLowerCase() === "travelers" ? "executives" : "executive";
      return word === word.toUpperCase() ? replacement.toUpperCase() : word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
    });
  }
  return updated;
}
export const abbreviatedFlightTemplate = "{flight}; {origin}-{destination}; {departure}/{arrival}; {seat}; {confirmation}";
export const templateFields = ["reservation", "type", "details", "confirmation", "date", "time", "location", "executive", "trip", "dates", "route", "source", "amount", "flight", "origin", "destination", "departure", "arrival", "seat"];

const airportZones: Record<string, string> = {
  ATL: "America/New_York", BOS: "America/New_York", CLT: "America/New_York", DCA: "America/New_York", EWR: "America/New_York", FLL: "America/New_York", IAD: "America/New_York", JFK: "America/New_York", LGA: "America/New_York", MCO: "America/New_York", MIA: "America/New_York", PHL: "America/New_York", TLH: "America/New_York",
  ORD: "America/Chicago", DFW: "America/Chicago", IAH: "America/Chicago", DEN: "America/Denver", PHX: "America/Phoenix", LAS: "America/Los_Angeles", LAX: "America/Los_Angeles", SEA: "America/Los_Angeles", SFO: "America/Los_Angeles",
};

function compactClock(label: string, instant?: string, airport?: string): string {
  const isoLabel = label.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})\b/)?.[0];
  if (isoLabel) { instant = isoLabel; label = ""; }
  const clock = label.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i);
  if (clock) {
    let hour = Number(clock[1] ?? clock[4]);
    const minute = Number(clock[2] ?? 0);
    const period = (clock[3] ?? clock[5])?.toLowerCase();
    if (minute > 59 || hour > (period ? 12 : 23) || (period && hour < 1)) return "Time missing";
    const suffix = period ?? (hour >= 12 ? "pm" : "am");
    hour = hour % 12 || 12;
    return `${hour}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${suffix}`;
  }
  if (instant && Number.isFinite(Date.parse(instant))) {
    const zone = airportZones[airport ?? ""];
    if (zone) return compactClock(new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(instant)));
    const local = instant.match(/T(\d{2}:\d{2})(?::\d{2})?[+-]\d{2}:?\d{2}$/)?.[1];
    if (local) return compactClock(local);
  }
  return "Time missing";
}
export function executiveIdFor(name: string) { return `executive-${name.trim().toLowerCase().replace(/\s+/g,"-")}`; }
export function executiveForTrip(trip: TemplateTrip, executives: Executive[]) {
  return executives.find(profile => profile.id === trip.executiveId) ?? executives.find(profile => profile.name.toLowerCase() === trip.traveler.toLowerCase());
}
export function fillTemplate(template: string, item: TemplateReservation | undefined, trip: TemplateTrip) {
  const flight = item?.kind === "Flight" ? (item.flightCode ?? item.title.match(/^([^·]+)·/)?.[1]?.trim() ?? "").replace(/^Delta\s*/i, "DL").replace(/\s+/g, "").toUpperCase() : "";
  const airports = item?.kind === "Flight" ? item.title.match(/\b([A-Z]{3})\s*(?:→|-)\s*([A-Z]{3})\b/) : null;
  const origin = item?.origin ?? airports?.[1] ?? "";
  const destination = item?.destination ?? airports?.[2] ?? "";
  const clocks = /\d{4}-\d{2}-\d{2}T/.test(item?.time ?? "") ? [] : item?.time.match(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/gi) ?? [];
  const values: Record<string,string> = {
    reservation: item?.title ?? "", type: item?.kind ?? "", details: item?.detail ?? "",
    confirmation: item?.confirmation ?? item?.detail.match(/Confirmation(?:\s+(?:number|code))?\s*[:=]?\s+([A-Za-z0-9-]+)/i)?.[1] ?? "",
    date: item?.date ?? "", time: item?.time ?? "", location: item?.location ?? "",
    executive: trip.traveler, traveler: trip.traveler, trip: trip.name, dates: trip.dates, route: trip.route,
    source: item?.source ?? "", amount: typeof item?.cost === "number" ? `$${item.cost.toFixed(2)}` : "Amount missing",
    flight, origin, destination,
    departure: item?.kind === "Flight" ? compactClock(item.departureTime ?? clocks[0] ?? "", item.start, origin) : "",
    arrival: item?.kind === "Flight" ? compactClock(item.arrivalTime ?? clocks[1] ?? "", item.end, destination) : "",
    seat: item?.seat ?? item?.detail.match(/\bSeat(?:\s+(?:number|assignment))?\s*[:=]?\s+([0-9]{1,3}[A-Z])\b/i)?.[1] ?? "",
  };
  return template.replace(/\{([a-z]+)(?::([a-z0-9-]+))?\}/gi, (token, key: string, format?: string) => {
    const value=values[key.toLowerCase()];
    if(value===undefined)return token;
    if(!format)return value;
    if(!['departure','arrival'].includes(key.toLowerCase()))return token;
    const clock=value.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/i);
    if(!clock)return value;
    const hour=Number(clock[1]),minute=clock[2]??'00',period=clock[3].toLowerCase();
    if(format==='24')return `${String(hour%12+(period==='pm'?12:0)).padStart(2,'0')}:${minute}`;
    if(format==='compact-upper')return value.toUpperCase();
    if(format==='spaced-upper'||format==='spaced-lower')return value.replace(/(am|pm)$/i, p=>' '+(format.endsWith('upper')?p.toUpperCase():p.toLowerCase()));
    if(format==='12-upper'||format==='12-lower')return `${hour}:${minute} ${format.endsWith('upper')?period.toUpperCase():period}`;
    return token;
  }).trim();
}

export function calendarFormatFor(templates: ExecutiveTemplates, kind: string): ExecutiveTemplates {
  const scoped = templates.calendarFormats?.[kind as keyof NonNullable<ExecutiveTemplates['calendarFormats']>];
  return scoped ? {...templates, ...scoped} : templates;
}
export function calendarFormatChange(templates: ExecutiveTemplates, kind: string, change: Partial<CalendarFormat>): Partial<ExecutiveTemplates> {
  const key=kind as keyof NonNullable<ExecutiveTemplates['calendarFormats']>;
  return templates.calendarFormats?.[key] ? {calendarFormats:{...templates.calendarFormats,[key]:{...templates.calendarFormats[key],...change}}} : change;
}
export function reservationTemplateTitle(templates: ExecutiveTemplates, item: TemplateReservation, trip: TemplateTrip, kind: "outlook" | "print") {
  if (kind === "outlook") templates = calendarFormatFor(templates, item.kind);
  const format = kind === "outlook" ? templates.calendarFlightFormat : templates.itineraryFlightFormat;
  if (item.kind === "Flight" && format === "abbreviated") {
    const compact = ["{flight}", "{origin}-{destination}", "{departure}/{arrival}", "{seat}", "{confirmation}"].map(field => fillTemplate(field, item, trip));
    if (!compact[3]) compact[3] = "Seat missing";
    if (!compact[4]) compact[4] = "Confirmation missing";
    return compact.join("; ");
  }
  return fillTemplate(kind === "outlook" ? templates.outlookTitle : templates.itineraryTitle, item, trip);
}

export function itineraryTemplateBody(templates: ExecutiveTemplates, item: TemplateReservation, trip: TemplateTrip) {
  return item.kind === "Flight" && templates.itineraryFlightFormat === "abbreviated" ? item.date : fillTemplate(templates.itineraryBody, item, trip);
}

export function calendarTemplatePreview(templates: ExecutiveTemplates, item: TemplateReservation, trip: TemplateTrip, timeZone = "America/New_York") {
  templates = calendarFormatFor(templates, item.kind);
  const allDay = item.allDay === true;
  function dateAndTime(value?: string) {
    if (!value || !Number.isFinite(Date.parse(value))) return { date: "Date missing", time: "Time missing" };
    const instant = new Date(value);
    return {
      date: new Intl.DateTimeFormat("en-US", { timeZone: allDay ? "UTC" : timeZone, month: "short", day: "numeric", year: "numeric" }).format(instant),
      time: new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(instant),
    };
  }
  return {
    title: reservationTemplateTitle(templates, item, trip, "outlook"),
    notes: fillTemplate(templates.outlookNotes, item, trip),
    location: fillTemplate(templates.calendarLocation ?? "{location}", item, trip),
    showAs: templates.calendarShowAs ?? "Busy",
    reminderMinutes: templates.calendarReminderMinutes === undefined ? 15 : templates.calendarReminderMinutes,
    start: dateAndTime(item.start), end: dateAndTime(item.end), timeZone,
    allDay,
  };
}
export function unknownTemplateFields(templates: ExecutiveTemplates) {
  const text = [templates.outlookTitle,templates.outlookNotes,templates.calendarLocation ?? "{location}",templates.itineraryHeading,templates.itineraryTitle,templates.itineraryBody,templates.expenseHeading ?? defaultTemplates.expenseHeading, ...Object.values(templates.calendarFormats??{}).flatMap(v=>[v?.outlookTitle,v?.outlookNotes,v?.calendarLocation])].join("\n");
  return [...new Set(Array.from(text.matchAll(/\{([^{}]+)\}/g),match=>match[1]).filter(key=>!(/^(?:departure|arrival):(?:compact-upper|spaced-upper|spaced-lower|12-upper|12-lower|24)$/i.test(key)) && key.toLowerCase() !== "traveler" && !templateFields.includes(key.toLowerCase())))];
}
export function validateCustomTemplate(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Enter a custom template.";
  const template = value as ExecutiveTemplates;
  if (typeof template.customName !== "string" || !template.customName.trim()) return "Name your custom template.";
  if (template.customName.trim().length > 120) return "Keep the template name under 120 characters.";
  for (const key of ["outlookTitle", "outlookNotes", "itineraryHeading", "itineraryTitle", "itineraryBody", "expenseHeading", "calendarLocation"] as const) {
    if (template[key] !== undefined && (typeof template[key] !== "string" || template[key].length > 4000)) return "Template text must be under 4,000 characters per field.";
  }
  for (const key of ["outlookTitle", "itineraryHeading", "itineraryTitle", "expenseHeading"] as const) if (typeof template[key] !== "string" || !template[key].trim()) return "Titles and report headings cannot be empty.";
  if (typeof template.outlookNotes !== "string" || typeof template.itineraryBody !== "string") return "Enter the calendar and itinerary body formats.";
  if (!["list", "table"].includes(template.itineraryLayout)) return "Choose an itinerary layout.";
  for (const key of ["calendarFlightFormat", "itineraryFlightFormat"] as const) if (template[key] !== undefined && !["standard", "abbreviated"].includes(template[key])) return "Choose a flight output format.";
  for (const key of ["showSources", "expenseShowDate", "expenseShowCategory", "expenseShowSources", "expenseShowTotal"] as const) if (template[key] !== undefined && typeof template[key] !== "boolean") return "Choose valid report options.";
  if (template.calendarShowAs !== undefined && !["Free", "Working Elsewhere", "Tentative", "Busy", "Out of Office"].includes(template.calendarShowAs)) return "Choose a valid Show As option.";
  if (template.calendarReminderMinutes !== undefined && template.calendarReminderMinutes !== null && (!Number.isInteger(template.calendarReminderMinutes) || template.calendarReminderMinutes < 0 || template.calendarReminderMinutes > 10080)) return "Choose a valid reminder.";
  if(template.calendarFormats !== undefined) {
    if(!template.calendarFormats || typeof template.calendarFormats !== 'object' || Array.isArray(template.calendarFormats))return 'Choose valid calendar formats.';
    for(const [kind,format] of Object.entries(template.calendarFormats)) {
      if(!['Flight','Hotel','Car','Appointment'].includes(kind)||!format||typeof format!=='object'||Array.isArray(format))return 'Choose a valid calendar entry type.';
      const allowed=['outlookTitle','outlookNotes','calendarLocation','calendarShowAs','calendarReminderMinutes','calendarFlightFormat'];
      if(Object.keys(format).some(k=>!allowed.includes(k)))return 'Choose valid calendar format fields.';
      const error=validateCustomTemplate({...template,...format,calendarFormats:undefined});if(error)return error;
    }
  }
  const unknown = unknownTemplateFields(template);
  return unknown.length ? `Unknown automatic field: ${unknown.join(", ")}.` : null;
}
export function applyExecutiveTemplates(executives: Executive[], ids: string[], templates: ExecutiveTemplates) {
  const targets = new Set(ids);
  return executives.map(profile => targets.has(profile.id) ? { ...profile, templates: { ...templates } } : profile);
}

export function mergeTemplateKind(current: ExecutiveTemplates, source: ExecutiveTemplates, kind: TemplateKind): ExecutiveTemplates {
  if (kind === "expenses") return { ...current,
    expenseHeading: source.expenseHeading ?? defaultTemplates.expenseHeading,
    expenseShowDate: source.expenseShowDate ?? true,
    expenseShowCategory: source.expenseShowCategory ?? true,
    expenseShowSources: source.expenseShowSources ?? true,
    expenseShowTotal: source.expenseShowTotal ?? true,
  };
  return kind === "outlook"
    ? { ...current, calendarFormats: source.calendarFormats, outlookTitle: source.outlookTitle, outlookNotes: source.outlookNotes, calendarFlightFormat: source.calendarFlightFormat ?? "standard", calendarLocation: source.calendarLocation ?? "{location}", calendarShowAs: source.calendarShowAs ?? "Busy", calendarReminderMinutes: source.calendarReminderMinutes === undefined ? 15 : source.calendarReminderMinutes }
    : { ...current, itineraryHeading: source.itineraryHeading, itineraryTitle: source.itineraryTitle, itineraryBody: source.itineraryBody, itineraryLayout: source.itineraryLayout, showSources: source.showSources, itineraryFlightFormat: source.itineraryFlightFormat ?? "standard" };
}

export type OutputReservation = TemplateReservation & { expenseEligible?: boolean; itineraryEligible?: boolean; itineraryDate?: string; expenseCategory?: string; sourceFileId?: string };
export type OutputTrip = TemplateTrip & { items: OutputReservation[]; expenseReport?: { approval?: import("./expense-evidence").ExpenseApprovalSignature } };
export function itineraryMaterialsLabel(item: Pick<TemplateReservation,"materialsAttached"|"materialsFormat">) {
  return item.materialsAttached ? `Materials attached · ${item.materialsFormat === "both" ? "Digital and hard copy" : item.materialsFormat === "hardcopy" ? "Hard copy" : "Digital"}` : "";
}
export function itineraryDays(templates: ExecutiveTemplates, trip: OutputTrip) {
  const days = new Map<string, { label: string; rows: Array<{ time: string; title: string; body: string; source: string; background: string; item: OutputReservation; materials: string }> }>();
  const items = trip.items.filter(item => item.kind !== "Expense" && item.itineraryEligible !== false).sort((a, b) => (a.start ?? "9999").localeCompare(b.start ?? "9999"));
  for (const item of items) {
    const date = item.itineraryDate ?? item.start?.slice(0, 10);
    const key = date ?? item.date;
    const label = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00Z`)) : item.date || "Date pending";
    if (!days.has(key)) days.set(key, { label, rows: [] });
    const day = days.get(key)!;
    const standardBody = templates.itineraryBody === "{date} · {time}\n{details}\n{location}";
    day.rows.push({
      item, materials: itineraryMaterialsLabel(item),
      time: item.kind === "Hotel" ? "Hotel" : item.allDay ? "All day" : item.time || item.kind,
      title: reservationTemplateTitle(templates, item, trip, "print"),
      body: item.kind === "Flight" && templates.itineraryFlightFormat === "abbreviated" ? "" : standardBody ? fillTemplate("{details}\n{location}", item, trip) : itineraryTemplateBody(templates, item, trip),
      source: templates.showSources ? item.source ?? "" : "",
      background: day.rows.length % 2 ? "EEEEEE" : "FFFFFF",
    });
  }
  return [...days.values()];
}
export const expenseCategories = ["Hotel", "Flight", "Transportation", "Meals", "Parking", "Gas", "Misc.", "Cash reimburse"] as const;
export function expenseCategory(item: OutputReservation) {
  return item.expenseCategory && expenseCategories.includes(item.expenseCategory as typeof expenseCategories[number]) ? item.expenseCategory : item.kind === "Car" ? "Transportation" : expenseCategories.includes(item.kind as typeof expenseCategories[number]) ? item.kind : "Misc.";
}
export function expenseReportData(templates: ExecutiveTemplates, trip: OutputTrip) {
  const items = trip.items.filter(item => item.kind !== "Appointment" && item.expenseEligible !== false && (typeof item.cost === "number" || !!item.source));
  const columns: Array<{ key: string; label: string; numeric?: boolean }> = [];
  if (templates.expenseShowDate !== false) columns.push({ key: "date", label: "Date" });
  columns.push({ key: "expense", label: "Description" });
  if (trip.billingCode || items.some(item => item.billingCode)) columns.push({ key: "billingCode", label: "Billing code" });
  if (templates.expenseShowCategory !== false) columns.push(...expenseCategories.map(category => ({ key: category, label: category, numeric: true })));
  if (templates.expenseShowSources !== false) columns.push({ key: "source", label: "Source" });
  columns.push({ key: "amount", label: "Total", numeric: true });
  const knownTotal = items.reduce((sum, item) => sum + (typeof item.cost === "number" && Number.isFinite(item.cost) ? item.cost : 0), 0);
  const rows = items.map(item => columns.map(column => {
    const amount = typeof item.cost === "number" && Number.isFinite(item.cost) ? `$${item.cost.toFixed(2)}` : "Amount missing";
    if (expenseCategories.includes(column.key as typeof expenseCategories[number])) return expenseCategory(item) === column.key ? amount : "";
    if (column.key === "billingCode") return billingCodeText(effectiveBillingCode(item, trip)) || "—";
    return ({ date: item.expenseDate ?? item.date, expense: item.expenseDescription ?? item.title, source: item.source ?? "", amount } as Record<string, string>)[column.key];
  }));
  return {
    heading: fillTemplate(templates.expenseHeading ?? defaultTemplates.expenseHeading!, undefined, trip),
    columns, rows, items, knownTotal, showTotal: templates.expenseShowTotal !== false,
    hasMissingAmounts: items.some(item => typeof item.cost !== "number" || !Number.isFinite(item.cost)),
  };
}
