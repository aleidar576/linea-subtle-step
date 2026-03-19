// ============================================
// 🦁 Vercel Edge Middleware — Bot Detection
// Intercepts social-media crawlers and rewrites
// to /api/og for dynamic Open Graph rendering.
// ============================================

export const config = {
  matcher: ['/((?!api/|_next/|_vercel/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp|avif|mp4|webm)).*)'],
};

// Robust bot User-Agent regex (case-insensitive)
const BOT_UA_REGEX =
  /whatsapp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Discordbot|LinkedInBot|Slackbot|Googlebot|bingbot|Applebot|Pinterest|Embedly|Quora Link Preview|Showyoubot|outbrain|vkShare|W3C_Validator/i;

export default function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  // Only rewrite for bots on non-API routes
  if (BOT_UA_REGEX.test(userAgent)) {
    const host = request.headers.get('host') || url.host;
    const ogUrl = new URL(`/api/og?host=${encodeURIComponent(host)}&path=${encodeURIComponent(url.pathname)}`, request.url);
    return Response.redirect(ogUrl.toString(), 307);
  }

  // Human traffic — pass through
  return undefined;
}
