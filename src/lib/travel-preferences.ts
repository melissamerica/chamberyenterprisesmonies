export const hotelChains: Record<string, string[]> = {
  Marriott: ["Marriott", "JW Marriott", "The Ritz-Carlton", "Sheraton", "Westin", "Courtyard", "Residence Inn", "SpringHill Suites", "Autograph Collection", "AC Hotels"],
  Hilton: ["Hilton", "Waldorf Astoria", "Conrad", "DoubleTree", "Embassy Suites", "Hilton Garden Inn", "Hampton", "Homewood Suites", "Home2 Suites"],
  Hyatt: ["Park Hyatt", "Grand Hyatt", "Hyatt Regency", "Hyatt Centric", "Hyatt Place", "Hyatt House", "Thompson Hotels"],
  IHG: ["InterContinental", "Kimpton", "Crowne Plaza", "Hotel Indigo", "Holiday Inn", "Holiday Inn Express", "Staybridge Suites", "Candlewood Suites"],
  Wyndham: ["Wyndham", "La Quinta", "Ramada", "Days Inn"],
  Choice: ["Cambria", "Comfort", "Quality Inn", "Sleep Inn"],
};
export const airlineProviders = ["Delta", "American Airlines", "United Airlines", "Southwest Airlines", "Alaska Airlines", "JetBlue", "Air Canada", "British Airways", "Lufthansa", "Emirates", "Qatar Airways", "Singapore Airlines"];
export const carProviders = ["Hertz", "Avis", "Enterprise", "National", "Budget", "Alamo", "Sixt", "Dollar", "Thrifty"];
export type ProviderPreference = { id: string; provider: string; customProvider: string; priority: number; notes: string };
export type HotelPreference = ProviderPreference & { brand: string; customBrand: string; bedSize: string; roomType: string; floor: string; quietRoom: string; pillows: string; property: string; rewardsNumber: string };
export type AirlinePreference = ProviderPreference & { seatNumber: string; seatPosition: string; planeArea: string; cabin: string; departureTime: string; meals: string; baggage: string; frequentFlyerProgram: string; frequentFlyerNumber: string };
export type CarPreference = ProviderPreference & { vehicleClass: string; transmission: string; fuelType: string; pickup: string; equipment: string; rewardsProgram: string; rewardsNumber: string };
export type TravelPreferences = { hotels: HotelPreference[]; airlines: AirlinePreference[]; cars: CarPreference[] };
export const emptyTravelPreferences = (): TravelPreferences => ({ hotels: [], airlines: [], cars: [] });
const fields = {
  hotels: ["brand", "customBrand", "bedSize", "roomType", "floor", "quietRoom", "pillows", "property", "rewardsNumber"],
  airlines: ["seatNumber", "seatPosition", "planeArea", "cabin", "departureTime", "meals", "baggage", "frequentFlyerProgram", "frequentFlyerNumber"],
  cars: ["vehicleClass", "transmission", "fuelType", "pickup", "equipment", "rewardsProgram", "rewardsNumber"],
} as const;
export function newPreference<K extends keyof TravelPreferences>(kind: K, id: string, priority: number): TravelPreferences[K][number] {
  return Object.fromEntries([["id", id], ["provider", ""], ["customProvider", ""], ["priority", priority], ["notes", ""], ...fields[kind].map(key => [key, ""])]) as TravelPreferences[K][number];
}
export function normalizeTravelPreferences(value: unknown): TravelPreferences {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const result = emptyTravelPreferences();
  for (const kind of ["hotels", "airlines", "cars"] as const) {
    const rows = Array.isArray(source[kind]) ? source[kind] as Record<string, unknown>[] : [];
    result[kind] = rows.filter(row => row && typeof row === "object").slice(0, 20).map((row, index) => {
      const entry = newPreference(kind, typeof row.id === "string" ? row.id : `${kind}-${index}`, index + 1);
      for (const key of ["provider", "customProvider", "notes", ...fields[kind]]) (entry as unknown as Record<string, unknown>)[key] = typeof row[key] === "string" ? row[key] : "";
      return entry;
    }) as HotelPreference[] & AirlinePreference[] & CarPreference[];
  }
  return result;
}
export function validateTravelPreferences(value: unknown): string {
  if (!value || typeof value !== "object") return "Travel preferences must contain hotel, airline, and car lists.";
  const source = value as Record<string, unknown>;
  for (const kind of ["hotels", "airlines", "cars"] as const) {
    if (!Array.isArray(source[kind]) || source[kind].length > 20) return "Use no more than 20 preferences in each category.";
    const ids = new Set<string>();
    for (const raw of source[kind]) {
      if (!raw || typeof raw !== "object") return "Check the provider preferences.";
      const row = raw as Record<string, unknown>;
      if (typeof row.id !== "string" || !row.id || row.id.length > 160 || ids.has(row.id)) return "Each preference needs a unique identifier.";
      ids.add(row.id);
      if (!Number.isSafeInteger(row.priority) || Number(row.priority) < 1 || Number(row.priority) > 20) return "Check provider priorities.";
      for (const key of ["provider", "customProvider", "notes", ...fields[kind]]) if (typeof row[key] !== "string" || row[key].length > 4000) return "Keep each preference answer under 4,000 characters.";
      if (!(row.provider as string).trim()) return "Choose a provider for each preference, or remove the empty preference.";
      if (row.provider === "Other" && !(row.customProvider as string).trim()) return "Enter the name of each custom provider.";
      if (kind === "hotels" && row.brand === "Other" && !(row.customBrand as string).trim()) return "Enter the custom hotel brand.";
      if (kind === "hotels" && row.provider !== "Other" && row.brand && row.brand !== "Other" && !hotelChains[String(row.provider)]?.includes(String(row.brand))) return "Choose a hotel brand that belongs to the selected chain.";
    }
  }
  return "";
}
