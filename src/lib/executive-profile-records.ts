import { defaultTemplates, type Executive, type ExecutiveProfile } from "./executive-profiles";
import { emptyTravelPreferences, normalizeTravelPreferences, validateTravelPreferences } from "./travel-preferences";
export const emptyExecutiveProfile = (): ExecutiveProfile => ({email:"",phone:"",homeAirport:"",notes:"",travelPreferences:emptyTravelPreferences()});
export function normalizeExecutiveProfile(value?: Partial<ExecutiveProfile>): ExecutiveProfile {
  return {...emptyExecutiveProfile(),...value,travelPreferences:normalizeTravelPreferences(value?.travelPreferences)};
}
export function validateExecutiveProfile(value: unknown): string {
  if (!value || typeof value !== "object") return "Check the executive profile.";
  const profile = value as Record<string, unknown>;
  for (const key of ["email", "phone", "homeAirport", "notes"]) if (typeof profile[key] !== "string" || profile[key].length > (key === "notes" ? 12000 : 320)) return "Check the contact details and notes.";
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(profile.email))) return "Enter a valid email address, or leave it blank.";
  return validateTravelPreferences(profile.travelPreferences);
}
export function mergeExecutiveRecords(current: Executive[], remote: Array<{id:string;name:string;profile:ExecutiveProfile}>): Executive[] {
  const result = [...current];
  for (const record of remote) {
    const index = result.findIndex(value => value.id === record.id);
    if (index < 0) result.push({...record,templates:{...defaultTemplates}});
    else if (Date.parse(record.profile.updatedAt ?? "") >= (Date.parse(result[index].profile?.updatedAt ?? "") || 0)) result[index] = {...result[index],name:record.name,profile:record.profile};
  }
  return result;
}
