import { supabase } from "@/integrations/supabase/client";

let installed = false;

/** The ported workspace calls /api/* with plain fetch; attach the signed-in user's token to those calls. */
export function installFirmFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const sameOriginApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
    if (!sameOriginApi) return original(input, init);
    const { data } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
    return original(input, { ...init, headers });
  };
}
