interface SportSitemapEnv {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}
interface SportSitemapContext { request: Request; env: SportSitemapEnv; }

const staticPaths = [
  "/", "/opportunities", "/talent", "/organisations", "/matching",
  "/about", "/how-it-works", "/for-athletes", "/for-organisations",
  "/for-partners", "/safeguarding", "/privacy", "/terms",
  "/help", "/contact", "/cookies", "/verification", "/report", "/data-request"
];

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

async function readPublicIds(
  baseUrl: string,
  apiKey: string,
  resource: string,
  query: string
): Promise<{id:string}[]> {
  const url = new URL("/rest/v1/" + resource, baseUrl);
  url.search = query;
  const response = await fetch(url.toString(), {
    headers: { apikey: apiKey, Accept: "application/json" }
  });
  if (!response.ok) return [];
  const value = await response.json() as {id:string}[];
  return Array.isArray(value) ? value : [];
}

export const onRequestGet = async ({ request, env }: SportSitemapContext): Promise<Response> => {
  const origin = new URL(request.url).origin;
  const entries = new Set<string>(staticPaths.map(path => origin + path));
  const baseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const apiKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ??
    env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;

  if (baseUrl && apiKey) {
    try {
      const [opportunities, organisations, athletes] = await Promise.all([
        readPublicIds(baseUrl, apiKey, "opportunities",
          "select=id&status=eq.published&verification_status=eq.verified&or=(closing_date.is.null,closing_date.gte." + new Date().toISOString().slice(0, 10) + ")&order=created_at.desc&limit=500"),
        readPublicIds(baseUrl, apiKey, "organisations",
          "select=id&verification_status=eq.verified&order=created_at.desc&limit=500"),
        readPublicIds(baseUrl, apiKey, "athlete_directory", "select=id&limit=500")
      ]);
      opportunities.forEach(row => entries.add(origin + "/opportunities/" + encodeURIComponent(row.id)));
      organisations.forEach(row => entries.add(origin + "/organisations/" + encodeURIComponent(row.id)));
      athletes.forEach(row => entries.add(origin + "/talent/" + encodeURIComponent(row.id)));
    } catch {
      // A valid static-route sitemap is returned even when database settings are absent.
    }
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    Array.from(entries).map(loc => '<url><loc>' + escapeXml(loc) + '</loc></url>').join("") +
    '</urlset>';

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  });
};
