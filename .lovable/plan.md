

# Fix OG URL Leak — `api/og.js`

## Problem

The `og:url` tag outputs the rewrite URL (`/api/og?host=...&path=/`) instead of the clean public URL because the `path` query parameter is not being used to reconstruct the canonical URL.

## Change: `api/og.js`

### 1. Extract `path` from query (line 17 area)

Add after the `host` extraction:

```js
const path = req.query.path || '/';
```

### 2. Build clean URLs using `hostNormalized + path`

Replace every `url` construction to use the clean host + path:

- **Line 48** (platform branch): `const url = \`https://${globalDomain}${path}\`;`
- **Line 79** (404 branch): use `\`https://${hostNormalized}${path}\``
- **Line 87** (store branch): `const url = \`https://${hostNormalized}${path}\`;`
- **Line 95** (error branch): use `\`https://${hostNormalized}${path}\``

### 3. Add `<link rel="canonical">` to `buildHTML`

Insert after the `og:url` meta tag:

```html
<link rel="canonical" href="${u}" />
```

### Summary

- 1 new variable (`path`)
- 4 URL constructions updated to use `hostNormalized` + `path`
- 1 new `<link rel="canonical">` tag in the HTML template
- No other files changed

