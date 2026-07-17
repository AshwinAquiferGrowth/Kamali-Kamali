# Kamali & Kamali Holding LLC — Website

Single-page marketing site for Kamali & Kamali Holding LLC (Abu Dhabi), implemented from the `Home.dc.html` Claude Design project.

## Structure

- `index.html` — the complete site (markup, styles, and scripts, self-contained)
- `uploads/` — image assets (desert photography, Abu Dhabi towers, leadership portrait)

## Features

- WebGL "ink field" ambient backgrounds in the hero and Vision & Mission sections
- Scroll-triggered reveal, line-split, clip, and parallax animations (respects `prefers-reduced-motion`)
- Nav that adapts between dark and light as it passes over dark chapters
- Procedural dune line-art in the footer
- Responsive down to mobile widths

## Deployment

Static site — no build step. Deploy the repository root on Vercel (or any static host); `index.html` is the entry point.
