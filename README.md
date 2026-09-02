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
