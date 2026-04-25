# Web Performance Optimization - SmartProperty

## Overview

This document describes the web performance improvements applied to the SmartProperty frontend, targeting the four Core Web Vitals metrics: **LCP**, **INP**, **CLS**, and **FCP**.

---

## Core Web Vitals Targets

| Metric | Full Name | Target | What It Measures |
|--------|-----------|--------|------------------|
| **LCP** | Largest Contentful Paint | < 2.5s | Time to render the largest visible content (hero image) |
| **INP** | Interaction to Next Paint | < 200ms | Responsiveness to user interactions (clicks, key presses) |
| **CLS** | Cumulative Layout Shift | < 0.1 | Visual stability (unexpected element movement) |
| **FCP** | First Contentful Paint | < 3.8s | Time to first rendered content on screen |

---

## Changes Applied

### 1. Hero Image Preloading (LCP)

**File:** `index.html`

**Problem:** The hero background image (`/images/hero_background.jpg`, 227KB) was loaded via CSS `background-image`, which meant the browser had to: download HTML -> download CSS bundle -> parse CSS -> discover the image URL -> start downloading. This delayed LCP significantly.

**Solution:** Added a `<link rel="preload">` hint in the HTML `<head>` so the browser begins downloading the hero image immediately, in parallel with CSS parsing.

```html
<link rel="preload" as="image" href="/images/hero_background.jpg" />
```

### 2. Preconnect to External Origins (FCP)

**File:** `index.html`

**Problem:** Connections to external origins (Google Fonts) require DNS lookup + TLS handshake before any resource can be fetched, adding latency to font loading.

**Solution:** Added `preconnect` hints to establish early connections.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

### 3. Image Dimensions for Layout Stability (CLS)

**File:** `src/pages/home/HomePage.tsx`

**Problem:** All `<img>` tags on the homepage lacked `width` and `height` attributes. When images loaded, the browser didn't know their dimensions in advance, causing content to shift and push other elements down.

**Solution:** Added explicit `width` and `height` attributes to every image, matching their CSS container dimensions:

| Component | Dimensions | Matches CSS |
|-----------|-----------|-------------|
| PropertyCard | `width={400} height={220}` | `.property-card-image { height: 220px }` |
| CityCard | `width={400} height={300}` | `.city-card { height: 300px }` |
| RentalPropertyCard | `width={400} height={220}` | `.property-card-image { height: 220px }` |
| Why Us image | `width={600} height={400}` | `.why-us-image` container |

```jsx
// Before (causes layout shift)
<img src={imageUrl} alt="..." loading="lazy" />

// After (browser reserves space before image loads)
<img src={imageUrl} alt="..." loading="lazy" width={400} height={220} />
```

### 4. CSS Aspect Ratio for Why Us Image (CLS)

**File:** `src/pages/home/home3.css`

**Problem:** The `.why-us-image img` used `height: auto`, which caused layout shift because the height was unknown until the image loaded.

**Solution:** Added `aspect-ratio` and `object-fit` CSS properties to maintain a stable layout.

```css
/* Before */
.why-us-image img {
  width: 100%;
  height: auto;
  display: block;
}

/* After */
.why-us-image img {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
}
```

### 5. Client-Side Navigation (INP)

**File:** `src/pages/home/HomePage.tsx`

**Problem:** The search form used `window.location.href` which triggers a full page reload, destroying the React app state and requiring a complete re-initialization. This caused a very slow response to the user's search action.

**Solution:** Replaced with React Router's `useNavigate()` for instant client-side navigation.

```tsx
// Before (full page reload, slow INP)
window.location.href = `/properties?${params.toString()}`;

// After (client-side navigation, fast INP)
const navigate = useNavigate();
navigate(`/properties?${params.toString()}`);
```

### 6. Debounced Search Input (INP)

**File:** `src/pages/home/HomePage.tsx`

**Problem:** Every keystroke in the search input called `setSearchQuery()`, triggering a React re-render on each character typed. This congested the main thread and increased input delay.

**Solution:** Added a 300ms debounce so the state only updates after the user stops typing, reducing unnecessary re-renders.

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

const handleSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setSearchInput(value);          // Update input display immediately
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    setSearchQuery(value);         // Update query state after 300ms idle
  }, 300);
}, []);
```

### 7. Gzip Compression (FCP, LCP)

**File:** `nginx.conf`

**Problem:** The nginx server was serving all files uncompressed. JavaScript bundles, CSS files, and JSON responses were transferred at full size, increasing download times.

**Solution:** Enabled gzip compression at level 6 for text-based resources, reducing transfer sizes by 60-70%.

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types
    text/plain
    text/css
    text/javascript
    application/javascript
    application/json
    application/xml
    image/svg+xml
    font/woff2;
```

### 8. Build Optimization (FCP)

**File:** `vite.config.ts`

**Problem:** Build minification settings were implicit (relying on Vite defaults) and not targeting modern browsers, resulting in potentially larger bundle output.

**Solution:** Added explicit minification and modern browser target configuration.

```ts
build: {
  minify: true,
  cssMinify: true,
  target: "es2020",
  // ... existing rollupOptions
}
```

### 9. Legacy File Cleanup (FCP)

**File:** `public/index.html` (deleted)

**Problem:** A legacy TeleportHQ export file (818 lines) containing **155 duplicate Google Fonts `<link>` tags** was sitting in the `public/` directory. Vite copies everything from `public/` into the production `dist/` folder, meaning this bloated file was deployed to production.

**Solution:** Deleted the file. The actual Vite entry point is `frontend/index.html` at the project root.

---

## Existing Good Practices

The codebase already had several performance features in place:

- **Lazy-loaded routes:** 14+ pages use `React.lazy()` with `Suspense` fallback
- **Image lazy loading:** All below-fold images use `loading="lazy"`
- **Code splitting:** Vite `manualChunks` splits vendor code into 5 separate bundles (react, maps/3d, UI, state, other)
- **Static asset caching:** nginx serves JS/CSS/images with `Cache-Control: public, immutable` and 1-year expiry
- **React 19 automatic batching:** Reduces unnecessary re-renders

---

## Measurement Tools

Use these tools to verify improvements:

| Tool | Purpose |
|------|---------|
| **Chrome DevTools Lighthouse** | Full audit of LCP, INP, CLS, FCP scores |
| **Chrome DevTools Performance tab** | Detailed timeline of loading and rendering |
| **Chrome DevTools Network tab** | Verify gzip compression and preload behavior |
| **Web Vitals Chrome Extension** | Real-time Core Web Vitals overlay |
| **PageSpeed Insights** | Lab + field data analysis |
| **DebugBear** | Historical performance tracking |

### How to Run a Lighthouse Audit

1. Open the app in Chrome (`http://localhost:5173`)
2. Open DevTools (F12) -> Lighthouse tab
3. Select "Performance" category
4. Choose "Mobile" device (stricter thresholds)
5. Click "Analyze page load"
6. Review LCP, INP, CLS, and FCP scores

---

## Build Output

After optimizations, the production build output:

```
dist/index.html                          1.46 kB (gzip: 0.61 kB)
dist/assets/index-*.css                131.41 kB (gzip: 25.05 kB)
dist/assets/index-*.js                 242.50 kB (gzip: 58.30 kB)
dist/assets/react-vendor-*.js          291.93 kB (gzip: 95.08 kB)
dist/assets/maps-3d-vendor-*.js        155.19 kB (gzip: 48.80 kB)
dist/assets/vendor-*.js                164.32 kB (gzip: 51.31 kB)
```

Total build time: ~1.3s
