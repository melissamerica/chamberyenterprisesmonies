import { createRecordId } from "@/lib/record-id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hotelChains, airlineProviders, carProviders, emptyTravelPreferences, newPreference, type TravelPreferences, type HotelPreference, type AirlinePreference, type CarPreference } from "@/lib/travel-preferences";
import type { ExecutiveProfile } from "@/lib/executive-profiles";

type Preference = HotelPreference | AirlinePreference | CarPreference;
type Question = { key: string; label: string; options?: string[]; placeholder?: string; wide?: boolean };
const hotelQuestions: Question[] = [
  {key:"bedSize",label:"Bed size",options:["King","Queen","Two queens","Two doubles","Twin"]},
  {key:"roomType",label:"Room type",options:["Standard","Deluxe","Suite","Accessible room"]},
  {key:"floor",label:"Floor preference",placeholder:"e.g. High floor, away from elevator"},
  {key:"quietRoom",label:"Quiet-room requests",placeholder:"e.g. Away from street and connecting doors"},
  {key:"pillows",label:"Pillows",placeholder:"e.g. Firm, hypoallergenic"},
  {key:"property",label:"Specific property",placeholder:"Property name and city"},
  {key:"rewardsNumber",label:"Hotel rewards number",placeholder:"Membership number"},
];
const airlineQuestions: Question[] = [
  {key:"seatNumber",label:"Preferred seat number",placeholder:"e.g. 2C"},
  {key:"seatPosition",label:"Aisle / window",options:["Aisle","Window","Middle"]},
  {key:"planeArea",label:"Area of plane",options:["Front","Middle","Rear","Exit row","Bulkhead"]},
  {key:"cabin",label:"Cabin",options:["Economy","Premium economy","Business","First"]},
  {key:"departureTime",label:"Departure time",placeholder:"e.g. After 10 a.m.; avoid overnight flights"},
  {key:"meals",label:"Meals",placeholder:"Meal or dietary preference"},
  {key:"baggage",label:"Baggage",placeholder:"e.g. Carry-on only; one checked bag"},
  {key:"frequentFlyerProgram",label:"Frequent-flyer program"},
  {key:"frequentFlyerNumber",label:"Frequent-flyer number"},
];
const carQuestions: Question[] = [
  {key:"vehicleClass",label:"Vehicle class",options:["Economy","Compact","Midsize","Full size","Premium","Luxury","SUV","Minivan"]},
  {key:"transmission",label:"Transmission",options:["Automatic","Manual"]},
  {key:"fuelType",label:"Fuel type",options:["Gasoline","Diesel","Hybrid","Electric"]},
  {key:"pickup",label:"Pickup preferences",placeholder:"e.g. Airport location; skip the counter"},
  {key:"equipment",label:"Equipment",placeholder:"e.g. GPS, child seat, accessibility equipment"},
  {key:"rewardsProgram",label:"Rewards program"},
  {key:"rewardsNumber",label:"Rewards number"},
];

function TravelPreferenceEditor({value,onChange,prefix}:{value:TravelPreferences;onChange:(value:TravelPreferences)=>void;prefix:string}) {
  function replace(kind:keyof TravelPreferences,rows:Preference[]) { onChange({...value,[kind]:rows.map((row,index)=>({...row,priority:index+1}))}); }
  function edit(kind:keyof TravelPreferences,id:string,change:Record<string,string>) { replace(kind,value[kind].map(row=>row.id===id?{...row,...change}:row)); }
  function move(kind:keyof TravelPreferences,index:number,offset:number) { const rows:Preference[]=[...value[kind]];const target=index+offset;if(target<0||target>=rows.length)return;[rows[index],rows[target]]=[rows[target],rows[index]];replace(kind,rows); }
  function field(kind:keyof TravelPreferences,row:Preference,question:Question) {
    const id=`${prefix}-${row.id}-${question.key}`,answer=String((row as unknown as Record<string,unknown>)[question.key]??"");
    return <div key={question.key} className={`preference-field ${question.wide?"preference-wide":""}`}><Label htmlFor={id}>{question.label}</Label>{question.options?<select id={id} className="simple-select w-full" value={answer} onChange={event=>edit(kind,row.id,{[question.key]:event.target.value})}><option value="">No preference</option>{question.options.map(option=><option key={option}>{option}</option>)}{answer&&!question.options.includes(answer)&&<option>{answer}</option>}</select>:<Input id={id} maxLength={4000} value={answer} placeholder={question.placeholder} onChange={event=>edit(kind,row.id,{[question.key]:event.target.value})}/>}</div>;
  }
  return <section className="travel-preferences"><div className="preference-heading"><div><h3>Travel preferences</h3><p>Save several providers in each category, in order of preference. Every answer is optional until you add a provider.</p></div></div>
    <Tabs defaultValue="hotels" className="mt-4"><TabsList variant="line" className="w-full flex-wrap justify-start"><TabsTrigger value="hotels">Hotels · {value.hotels.length}</TabsTrigger><TabsTrigger value="airlines">Airlines · {value.airlines.length}</TabsTrigger><TabsTrigger value="cars">Car rentals · {value.cars.length}</TabsTrigger></TabsList>
    {(["hotels","airlines","cars"] as const).map(kind=>{const label=kind==="hotels"?"hotel":kind==="airlines"?"airline":"car rental",providers=kind==="hotels"?Object.keys(hotelChains):kind==="airlines"?airlineProviders:carProviders;return <TabsContent key={kind} value={kind} className="space-y-4"><div className="preference-add"><p className="preference-help">{value[kind].length?"Move providers up or down to change their priority.":`No ${label} preferences yet.`}</p><Button type="button" variant="outline" disabled={value[kind].length>=20} onClick={()=>replace(kind,[...value[kind],newPreference(kind,createRecordId(),value[kind].length+1)])}>Add {label} preference</Button></div>
      <div className="preference-cards">{value[kind].map((row,index)=><details key={row.id} className="preference-card" open><summary className="preference-card-toggle"><span><small>Priority {index+1}</small><strong>{row.provider==="Other"?row.customProvider||`Custom ${label}`:row.provider||`New ${label} preference`}{kind==="hotels"&&(row as HotelPreference).brand?` · ${(row as HotelPreference).brand==="Other"?(row as HotelPreference).customBrand:(row as HotelPreference).brand}`:""}</strong></span></summary><div className="preference-card-body"><div className="preference-grid"><div className="preference-field"><Label htmlFor={`${prefix}-${row.id}-provider`}>{kind==="hotels"?"Hotel chain":"Provider"}</Label><select id={`${prefix}-${row.id}-provider`} className="simple-select w-full" value={row.provider} onChange={event=>edit(kind,row.id,kind==="hotels"?{provider:event.target.value,brand:"",customBrand:"",customProvider:""}:{provider:event.target.value,customProvider:""})}><option value="">Select {kind==="hotels"?"chain":"provider"}…</option>{providers.map(provider=><option key={provider}>{provider}</option>)}<option>Other</option>{row.provider&&row.provider!=="Other"&&!providers.includes(row.provider)&&<option>{row.provider}</option>}</select></div>
      {row.provider==="Other"&&field(kind,row,{key:"customProvider",label:kind==="hotels"?"Custom hotel chain / provider":"Custom provider name"})}
      {kind==="hotels"&&row.provider&&<>{field(kind,row,{key:"brand",label:"Hotel brand",options:row.provider==="Other"?["Other"]:[...(hotelChains[row.provider]??[]),"Other"]})}{(row as HotelPreference).brand==="Other"&&field(kind,row,{key:"customBrand",label:"Custom hotel brand"})}</>}
      {(kind==="hotels"?hotelQuestions:kind==="airlines"?airlineQuestions:carQuestions).map(question=>field(kind,row,question))}
      <div className="preference-field preference-wide"><Label htmlFor={`${prefix}-${row.id}-notes`}>Additional preferences</Label><Textarea id={`${prefix}-${row.id}-notes`} maxLength={4000} value={row.notes} onChange={event=>edit(kind,row.id,{notes:event.target.value})}/></div></div>
      <div className="preference-card-actions"><div role="group" aria-label={`${label} priority`}><Button type="button" variant="outline" size="sm" disabled={index===0} onClick={()=>move(kind,index,-1)}>Move up</Button><Button type="button" variant="outline" size="sm" disabled={index===value[kind].length-1} onClick={()=>move(kind,index,1)}>Move down</Button></div><Button type="button" variant="ghost" size="sm" onClick={()=>replace(kind,value[kind].filter(value=>value.id!==row.id))}>Remove preference</Button></div></div></details>)}</div>
    </TabsContent>;})}</Tabs>
  </section>;
}

export function ExecutiveProfileFields({value,onChange,prefix}:{value:ExecutiveProfile;onChange:(value:ExecutiveProfile)=>void;prefix:string}) {
  return <><div className="preference-grid">{([{key:"email",label:"Email",type:"email"},{key:"phone",label:"Phone",type:"tel"},{key:"homeAirport",label:"Home airport",type:"text"}] as const).map(({key,label,type})=><div key={key} className="grid gap-2"><Label htmlFor={`${prefix}-${key}`}>{label}</Label><Input id={`${prefix}-${key}`} type={type} maxLength={320} value={value[key]} onChange={event=>onChange({...value,[key]:key==="homeAirport"?event.target.value.toUpperCase():event.target.value})}/></div>)}</div><div className="grid gap-2"><Label htmlFor={`${prefix}-notes`}>General travel notes</Label><Textarea id={`${prefix}-notes`} maxLength={12000} value={value.notes} onChange={event=>onChange({...value,notes:event.target.value})}/></div><TravelPreferenceEditor prefix={prefix} value={value.travelPreferences??emptyTravelPreferences()} onChange={travelPreferences=>onChange({...value,travelPreferences})}/></>;
}
