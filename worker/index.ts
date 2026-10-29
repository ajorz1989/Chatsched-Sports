// Cloudflare Workers entry for ChatSched Sport.
// Static files and the SPA fallback are served by the `assets` binding (see wrangler.jsonc).
// Only /sitemap.xml and /robots.txt run this Worker first; everything else goes straight to assets.
// The handlers are shared with functions/ so the same code also works if the site is moved to Pages.
import { onRequestGet as sitemap } from "../functions/sitemap.xml.ts";
import { onRequestGet as robots } from "../functions/robots.txt.ts";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" || request.method === "HEAD") {
      if (pathname === "/sitemap.xml") return sitemap({ request, env });
      if (pathname === "/robots.txt") return robots({ request });
    }
    return env.ASSETS.fetch(request);
  }
};
