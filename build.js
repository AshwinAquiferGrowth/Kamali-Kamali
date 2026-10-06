#!/usr/bin/env node
// Minimal static build: assembles the root HTML pages from src/pages + src/partials.
// No dependencies. Run `node build.js` (or `npm run build`) after editing anything in src/ or assets/.
const fs = require('fs');
const path = require('path');

const site = {
  name: 'Kamali & Kamali Holding LLC',
  // Set the production origin (no trailing slash) once the domain is known.
  // When set, every page gets a canonical URL and absolute Open Graph URLs.
  siteUrl: 'https://kamaliandkamali.ae',
  contact: {
    // TODO: replace placeholders with the client's real details (one place, every page updates).
    email: 'partnerships@[domain].com',   // TODO: mailbox to be created on the client's domain
    addressLabel: 'Headquarters',
    phoneLabel: 'Phone',
    phone: '+971 (0) 2 [XXX XXXX]',        // TODO: office landline (Mihai is confirming)
    phoneTel: '+97120000000',
    address: 'Level 3, The Mall, World Trade Center, Al Danah, Abu Dhabi, United Arab Emirates',
  },
};

const root = __dirname;
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const partials = Object.fromEntries(
  fs.readdirSync(path.join(root, 'src/partials')).map((f) => [f.replace(/\.html$/, ''), read('src/partials/' + f)])
);
const layout = read('src/layout.html');

function render(tpl, vars) {
  let out = tpl;
  for (let i = 0; i < 6; i++) {
    const before = out;
    out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      if (!(name in partials)) throw new Error('Unknown partial: ' + name);
      return partials[name];
    });
    out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
      const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vars);
      if (v === undefined) throw new Error('Unknown variable: ' + key);
      return String(v);
    });
    if (out === before) break;
  }
  return out;
}

// ---- Deploy tree -----------------------------------------------------------
// Hosting (Vercel) runs `node build.js` and serves public/. The root pages keep
// `.html` links so they open straight from disk; the exported copies use clean
// URLs to match the host's cleanUrls setting.
const PUBLIC = path.join(root, 'public');
function exportPage(file, html) {
  fs.mkdirSync(PUBLIC, { recursive: true });
  // Root-absolute links in the deploy tree, so the 404 page (served at any depth) and deep links resolve.
  const clean = html
    .replace(/href="\.\/index\.html(#[^"]*)?"/g, (m, hash) => 'href="/' + (hash || '') + '"')
    .replace(/href="\.\/([a-z0-9-]+)\.html(#[^"]*)?"/g, (m, page, hash) => 'href="/' + page + (hash || '') + '"')
    .replace(/(href|src|srcset)="\.\//g, '$1="/')
    .replace(/srcset="([^"]*)"/g, (m, v) => 'srcset="' + v.replace(/(^|,\s*)\.\//g, '$1/') + '"');
  fs.writeFileSync(path.join(PUBLIC, file), clean);
}
function copyTree(from, to, skip) {
  if (skip && skip(from)) return;
  if (fs.statSync(from).isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach((f) => copyTree(path.join(from, f), path.join(to, f), skip));
  } else fs.copyFileSync(from, to);
}

// Structured data: the organisation on every page, with its principals. Email is added once the real mailbox exists.
function organisationJsonLd(page, isHome) {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: site.siteUrl || undefined,
    logo: site.siteUrl ? site.siteUrl + '/assets/icons/icon-512.png' : undefined,
    address: { '@type': 'PostalAddress', streetAddress: 'Level 3, The Mall, World Trade Center, Al Danah', addressLocality: 'Abu Dhabi', addressCountry: 'AE' },
    founder: [
      { '@type': 'Person', name: 'Dr. Tayeb Kamali', jobTitle: 'Founder' },
      { '@type': 'Person', name: 'Mohamed Kamali', jobTitle: 'Co-founder & Managing Director' },
    ],
  };
  if (!/\[/.test(site.contact.email)) org.email = site.contact.email;
  if (!/\[/.test(site.contact.phone)) org.telephone = site.contact.phoneTel;
  return org;
}

const sectors = [
  { file: 'hospitality.html', label: 'Hospitality', line: 'Invest, develop, open and operate, starting with Kohantei.' },
  { file: 'investment-real-estate.html', label: 'Investment &amp; real estate', line: 'A local partner on the investor\'s side of the table.' },
  { file: 'ai-business-transformation.html', label: 'AI &amp; business transformation', line: 'Where AI will actually help, and where it won\'t.' },
  { file: 'education.html', label: 'Education &amp; institutions', line: 'From an ambition to an institution that works.' },
];
function sectorLinks(current) {
  return sectors.filter((s) => s.file !== current).map((s) => `        <a href="./${s.file}" class="plain-link more-link" data-reveal="0">
          <span class="serif" style="font-size: 22px; line-height: 1.2;">${s.label}<span class="sector-arrow" aria-hidden="true">→</span></span>
          <span class="serif" style="display: block; font-size: 15px; line-height: 1.55; color: #4A5A51; margin-top: 8px;">${s.line}</span>
        </a>`).join('\n');
}

const pagesDir = path.join(root, 'src/pages');
const sitemap = [];
for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html'))) {
  const source = read('src/pages/' + file);
  const m = source.match(/^<!--\s*page\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(file + ': missing <!-- page {...} --> header');
  const page = JSON.parse(m[1]);
  const content = source.slice(m[0].length);
  const isHome = file === 'index.html';
  const cleanPath = isHome ? '/' : page.path.replace(/\.html$/, '');
  const vars = {
    site,
    contact: Object.assign({}, site.contact, page.contact || {}),  // a page may override e.g. the phone
    page,
    content,
    year: new Date().getFullYear(),
    home_href: isHome ? '#top' : './index.html',
    home: isHome ? '' : './index.html',
    current_hospitality: file === 'hospitality.html' ? ' aria-current="page"' : '',
    current_investment: file === 'investment-real-estate.html' ? ' aria-current="page"' : '',
    current_ai: file === 'ai-business-transformation.html' ? ' aria-current="page"' : '',
    current_education: file === 'education.html' ? ' aria-current="page"' : '',
    sector_links: sectorLinks(file),
    robots_meta: page.noindex ? '<meta name="robots" content="noindex">' : '',
    canonical_tags: site.siteUrl && !page.noindex
      ? `<link rel="canonical" href="${site.siteUrl}${cleanPath}">\n<meta property="og:url" content="${site.siteUrl}${cleanPath}">`
      : '',
    og_image: site.siteUrl ? site.siteUrl + '/assets/icons/og-image.jpg' : './assets/icons/og-image.jpg',
    jsonld: JSON.stringify(organisationJsonLd(page, isHome)),
  };
  if (!page.noindex) sitemap.push({ loc: site.siteUrl + (isHome ? '/' : page.path.replace(/\.html$/, '')), priority: isHome ? '1.0' : '0.8' });
  const html = render(layout, vars);
  const banner = `<!-- Generated by build.js from src/pages/${file}. Edit the source and run \`node build.js\`; do not edit this file. -->\n`;
  fs.writeFileSync(path.join(root, file), html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + banner));
  console.log('built', file, '(' + page.title + ')');
  exportPage(file, html);
}

// Launch files: robots, sitemap, web manifest. Icons live in assets/icons and are copied with the assets tree.
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(PUBLIC, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` + sitemap.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n') + '\n</urlset>\n');
const manifest = JSON.stringify({ name: site.name, short_name: 'Kamali & Kamali', start_url: '/', display: 'browser', background_color: '#0E0F10', theme_color: '#0E0F10', icons: [{ src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2);
fs.writeFileSync(path.join(PUBLIC, 'site.webmanifest'), manifest);
fs.writeFileSync(path.join(root, 'site.webmanifest'), manifest);  // the root copies open from disk too
copyTree(path.join(root, 'assets'), path.join(PUBLIC, 'assets'));
// public/404.html comes from the page loop above; Vercel serves it for unknown paths.
copyTree(path.join(root, 'uploads'), path.join(PUBLIC, 'uploads'), (p) => p.endsWith(path.join('kohantei', 'source')));
console.log('exported deploy tree to public/');
