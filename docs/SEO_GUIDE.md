# SEO Guide _(web profile)_

Search visibility is a product feature and a regression risk (CONSTITUTION-15). Keep the SEO surface small, centralized, and tested.

## 1. Core practices

1. **One module owns SEO.** Site config, per-page metadata, canonical URLs, structured data builders, and the list of indexable paths live in a single file (default `lib/seo.ts`). Pages call it; they do not hand-write metadata.
2. **Server-render public content** so crawlers and users get meaningful HTML immediately.
3. **Every indexable page has:** a unique `<title>`, a unique meta description, a canonical URL, Open Graph and social metadata, and valid structured data where relevant.
4. **Status codes tell the truth.** Missing pages return 404 (not a 200 "not found" page); moved pages return 301/308; private pages are `noindex`.
5. **Content quality beats tricks.** Clear headings, descriptive link text, fast pages, accessible markup.

## 2. Implementation

### Page metadata

```typescript
// app/[…]/page.tsx
export const generateMetadata = () =>
  pageMetadata({
    path: "/pricing",
    title: "Pricing",
    description: "Plans and pricing for …",
  });
```

`pageMetadata` sets title template, description, canonical, alternates (hreflang if localized), Open Graph, and Twitter cards from one source.

### Structured data (JSON-LD)

Build with typed helpers (`Organization`, `WebSite`, `Article`, `BreadcrumbList`, `FAQPage`, …). Serialize safely (escape `<`) and validate with the Rich Results Test. Only mark up what is visible on the page.

### Sitemap and robots

Generate from the single `INDEXABLE_PATHS` source. `robots` references the sitemap and disallows only what must be hidden (API routes, previews). Previews and non-production hosts are `noindex`.

### Open Graph images

Generate dynamically per page where it adds value, with legible text and safe margins. Provide alt text. Cache-bust through a versioned URL when the design changes.

### 404 and error pages

A friendly 404 that returns status 404, offers navigation, and is itself `noindex`.

## 3. Checklist: adding a page

- [ ] Route created; content server-rendered
- [ ] `pageMetadata` used with unique title and description
- [ ] Added to `INDEXABLE_PATHS` (or deliberately `noindex`)
- [ ] One `<h1>`; sensible heading order; descriptive links
- [ ] Structured data added if applicable and validated
- [ ] Internal links from relevant pages
- [ ] E2E/unit test asserts title, canonical, and robots
- [ ] Lighthouse SEO budget still met

## 4. Localization

Each locale has its own URL, `lang` attribute, translated metadata, and `hreflang` alternates including `x-default`. Never auto-redirect crawlers by `Accept-Language` alone.

## 5. Monitoring

Track indexed pages and queries in the search console of your choice, watch for coverage errors after deploys, and keep Core Web Vitals within budget ([Observability](./OBSERVABILITY.md)).

## Related

[Engineering Standards §9](./ENGINEERING_STANDARDS.md) · [Review Checklist §6](./REVIEW_CHECKLIST.md) · [Architecture](./ARCHITECTURE.md)
