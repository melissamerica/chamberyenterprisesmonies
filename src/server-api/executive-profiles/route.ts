import { validateTravelPreferences } from "@/lib/travel-preferences";
import { NextResponse } from "@/server/next-server";
import { uploadDatabase } from "@/lib/upload-storage";
import { normalizeExecutiveProfile, validateExecutiveProfile } from "@/lib/executive-profile-records";
import type { ExecutiveProfile } from "@/lib/executive-profiles";
export async function GET() {
  try {
    const result = await uploadDatabase().prepare("SELECT executive_id, name, profile_json FROM executive_profiles ORDER BY name, executive_id").all<{executive_id:string;name:string;profile_json:string}>();
    return NextResponse.json({executives:result.results.map(row=>({id:row.executive_id,name:row.name,profile:normalizeExecutiveProfile(JSON.parse(row.profile_json))}))},{headers:{"Cache-Control":"no-store"}});
  } catch (error) { console.error("Profile load failed", error); return NextResponse.json({error:"Executive profiles could not load. Your existing browser records have been kept."},{status:503}); }
}
export async function PUT(request: Request) {
  let body: {id?:string;name?:string;profile?:ExecutiveProfile};
  try { body = await request.json(); } catch { return NextResponse.json({error:"Check the executive profile."},{status:400}); }
  if (!body || typeof body.id !== "string" || !body.id.trim() || body.id.length > 160 || typeof body.name !== "string" || !body.name.trim() || body.name.length > 160) return NextResponse.json({error:"Enter an executive name."},{status:400});
  // Older profiles without structured preferences remain valid.
  if(body.profile?.travelPreferences){const issue=validateTravelPreferences(body.profile.travelPreferences);if(issue)return NextResponse.json({error:issue},{status:400});}
  const profile = normalizeExecutiveProfile(body.profile);
  const issue = validateExecutiveProfile(profile);
  if (issue) return NextResponse.json({error:issue},{status:400});
  profile.updatedAt = new Date().toISOString();
  try {
    await uploadDatabase().prepare("INSERT INTO executive_profiles (executive_id, name, profile_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(executive_id) DO UPDATE SET name = excluded.name, profile_json = excluded.profile_json, updated_at = excluded.updated_at").bind(body.id,body.name.trim(),JSON.stringify(profile),profile.updatedAt).run();
    return NextResponse.json({executive:{id:body.id,name:body.name.trim(),profile}});
  } catch (error) { console.error("Profile save failed",error); return NextResponse.json({error:"The profile could not save. Your answers are still here; try again."},{status:503}); }
}
