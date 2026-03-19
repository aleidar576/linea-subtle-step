

# Fix OG: SVG Fallback + 307 Redirect Leak

## Two Problems

1. **`api/og.js` line 8**: `DEFAULT_OG_IMAGE` points to a `.svg` file — Facebook rejects SVG for `og:image`.
2. **`middleware.js` line 23**: Uses `Response.redirect(url, 307)` — this exposes the `/api/og` route to crawlers instead of silently proxying.

## Two Fixes

### Fix 1: `api/og.js` — Change default image format

Replace line 8:
```js
const DEFAULT_OG_IMAGE = 'https://dusking.com.br/placeholder.svg';
```
With:
```js
const DEFAULT_OG_IMAGE = 'https://dusking.com.br/og-default.png';
```

We also need to create a valid PNG file at `public/og-default.png` (1200×630px). A simple branded placeholder image in PNG format.

### Fix 2: `middleware.js` — Rewrite instead of redirect

Replace the `Response.redirect` with a proper Vercel Edge `rewrite` using the `fetch` API pattern. In Vercel Edge Middleware (non-Next.js), a "rewrite" is done by fetching the target URL internally and returning the response — the browser/bot never sees the internal URL.

Replace lines 15-28 with:

```js
export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  if (BOT_UA_REGEX.test(userAgent)) {
    const host = request.headers.get('host') || url.host;
    const ogUrl = new URL(
      `/api/og?host=${encodeURIComponent(host)}&path=${encodeURIComponent(url.pathname)}`,
      request.url
    );
    // Rewrite: fetch internally, return response transparently (no redirect)
    return fetch(ogUrl.toString(), {
      headers: request.headers,
    });
  }

  return undefined;
}
```

This `fetch()` approach acts as a transparent proxy — the bot receives the OG HTML as if it came from the original URL, preserving our clean `og:url` and canonical tags. No 307 is issued.

### Summary

| File | Change | Lines |
|------|--------|-------|
| `api/og.js` | `DEFAULT_OG_IMAGE` → `.png` | 1 line |
| `middleware.js` | `Response.redirect` → `fetch()` rewrite | ~6 lines |
| `public/og-default.png` | New 1200×630 branded placeholder | New file |

