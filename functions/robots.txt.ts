interface SportRobotsContext { request: Request; }

export const onRequestGet = ({ request }: SportRobotsContext): Response => {
  const origin = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /workspace",
    "Disallow: /messages",
    "Disallow: /notifications",
    "Disallow: /admin",
    "Disallow: /join",
    "Disallow: /forgot-password",
    "Disallow: /reset-password",
    "Sitemap: " + origin + "/sitemap.xml",
    ""
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
};
