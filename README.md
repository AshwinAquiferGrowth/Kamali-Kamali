# Kamali & Kamali Holding LLC — website

Static, dependency-free site for Kamali & Kamali Holding LLC (Abu Dhabi): a homepage plus one page per sector.

## How the site is built

The pages that hosting serves (`index.html`, `hospitality.html`, …) are **generated**. Edit the sources, then rebuild:

```
node build.js        # or: npm run build
```

| Path | What it is |
|---|---|
| `src/pages/*.html` | One file per page: a `<!-- page {…} -->` header (title, description, path, label, footer text) followed by the page's own content. |
| `src/partials/` | Shared fragments: `head` (meta, fonts, stylesheet), `nav` (global navigation with the Sectors menu), `footer`, `contact-rows`. |
| `src/layout.html` | The document shell: `<header>`/`<main>`/`<footer>` landmarks around the partials and page content. |
| `assets/site.css` | All shared styles: base, typographic role classes, nav, footer, hospitality components, responsive rules. |
| `assets/site.js` | All shared behaviour: nav and Sectors menu, WebGL ambient fields, scroll reveals, floor-plan and dune drawings. |
| `uploads/` | Images. |
| `build.js` | The build: substitutes `{{> partial}}` and `{{variable}}` tokens. Site-wide values (name, production URL, contact details) live at the top of this file. |

Conventions:

- **Typography is in classes, layout is inline.** Recurring type roles (`.eyebrow`, `.mono-bronze`, `.mono-muted`, `.serif`, `.serif-light`, `.em`, `.wrap`, `.rule-bar`, …) are defined once in `assets/site.css`; per-element layout (grids, spacing, sizes) stays as inline styles on the element. A site-wide type change is one CSS edit.
- **Contact details, name and production URL** are set once in `build.js` and flow to every page. Set `siteUrl` when the domain is known to enable canonical and Open Graph URLs.
- **Adding a sector page:** copy `src/pages/hospitality.html`, change the page header, add the link in `src/partials/nav.html`, rebuild.
- Do not edit the root `*.html` files by hand — the build overwrites them.

## Preview locally

```
python3 -m http.server 8321
# then open http://localhost:8321/
```

## Launch files and assets

- `assets/fonts/` holds self-hosted subsets of Source Serif 4, Geist and Geist Mono
  (SIL Open Font License), declared in `assets/fonts.css`. No request leaves the
  site's own domain for fonts.
- `assets/icons/` holds the favicon set, the Apple touch icon, the manifest icons
  and `og-image.jpg`, the social preview used on every page.
- The build writes `robots.txt`, `sitemap.xml` and `site.webmanifest` into `public/`
  from the page list and the site URL in `build.js`, and exports `404.html`, which
  Vercel serves for unknown paths. Pages with `"noindex": true` in their header
  are left out of the sitemap and get a `noindex` robots tag.
- Every page carries canonical and Open Graph URLs, an Organization JSON-LD record
  with the principals, and the shared preview image.
- `vercel.json` sets security headers and long cache lifetimes for fonts, icons
  and uploads, and marks every `*.vercel.app` host `noindex` so previews and the
  staging alias stay out of search while the real domain indexes normally, and
  permanently redirects the production alias `kamali-kamali.vercel.app` to
  https://kamaliandkamali.ae (preview hosts are not redirected).

## Domain

`kamaliandkamali.ae` and `www.kamaliandkamali.ae` are attached to the Vercel
project (www redirects to the apex with a 308). The registrar is Hostinger and
mail for the domain is hosted there, so when DNS moves to Cloudflare the zone
needs these records, all set to "DNS only" (grey cloud) so Vercel issues the
certificate and there is no redirect loop:

| Type  | Name                          | Value                                      | Purpose            |
|-------|-------------------------------|--------------------------------------------|--------------------|
| A     | @                             | 216.198.79.1                               | Website (Vercel)   |
| A     | @                             | 64.29.17.1                                 | Website (Vercel)   |
| CNAME | www                           | ff5936d704429ef1.vercel-dns-017.com        | Website (Vercel)   |
| MX    | @                             | mx1.hostinger.com, priority 5              | Mail (Hostinger)   |
| MX    | @                             | mx2.hostinger.com, priority 10             | Mail (Hostinger)   |
| TXT   | @                             | v=spf1 include:_spf.mail.hostinger.com ~all | Mail (SPF)        |
| TXT   | _dmarc                        | v=DMARC1; p=none                           | Mail (DMARC)       |
| CNAME | hostingermail-a._domainkey    | hostingermail-a.dkim.mail.hostinger.com    | Mail (DKIM)        |
| CNAME | hostingermail-b._domainkey    | hostingermail-b.dkim.mail.hostinger.com    | Mail (DKIM)        |
| CNAME | hostingermail-c._domainkey    | hostingermail-c.dkim.mail.hostinger.com    | Mail (DKIM)        |
| CNAME | autoconfig                    | autoconfig.mail.hostinger.com              | Mail client setup  |
| CNAME | autodiscover                  | autodiscover.mail.hostinger.com            | Mail client setup  |

The old `ftp` A record pointed at Hostinger web hosting and is not needed.
If Cloudflare's proxy is switched on later, set SSL/TLS to "Full (strict)".
- Contact details live in `build.js`. The phone row and the footer phone are only
  rendered when a number is set; a page can override any contact field in its header.
- Vercel Web Analytics is loaded from `/_vercel/insights/script.js`; it is
  cookieless and does nothing until enabled for the project in the Vercel dashboard.

Photos under `uploads/` keep width and WebP variants beside the source file
(`name-640.webp`, `name-1000.jpg`, …) and pages reference them with `srcset`;
regenerate the variants when a source image changes. Stock photo credits are in
`content/README.md`.

## Deployment

The site is deployed on Vercel from this repository. `main` is the production
branch; every push to it goes live, and every other branch gets a preview URL.

Vercel runs `node build.js` and serves `public/` (see `vercel.json`), which the
build exports alongside the root pages: the same HTML with clean, extension-less
links (`/hospitality`), the shared assets, and the web-sized images. The originals
under `uploads/kohantei/source/` are kept in the repository but not deployed.
`public/` is generated and ignored by git.

## Making changes

`main` is production, so nothing is pushed to it directly.

1. Work on a branch named for the change, e.g. `hospitality/portraits`.
2. Push the branch. Vercel builds a preview deployment for it and reports the
   URL on the commit and on the pull request; review the change there.
3. Open a pull request against `main`. It is merged only once the change has
   been approved.
4. Merging deploys to production automatically.

Images and other files supplied by the client go into a branch the same way,
never straight onto `main`: `assets/` and `uploads/` are both copied into the
deploy tree, so an upload to `main` is live within a minute. Keep original
files under `uploads/kohantei/source/` (excluded from the deploy) and commit
only the web-sized derivative alongside them.
