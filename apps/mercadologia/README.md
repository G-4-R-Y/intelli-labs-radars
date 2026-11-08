# Intelli Labs — Observatório de Mercadologia

A research dashboard with 18 selected readings, 14 themes, 14 journal feeds and nine editorial research sources. Dark charcoal, cyan and magenta visual identity.

The Site uses Vinext and Cloudflare D1 for durable discoveries, short summaries and source scan history. Browser-local reading notes and saved articles retain the original export/import workflow. The root page serves the authored dashboard from public/index.html; public/app.js and public/style.css provide its interactions and visual system.

Owner-authenticated MCP tools support scheduled research updates without redeploying. See RADAR_WORKFLOW.md for the research and verification process. Source settings live in lib/catalog.ts and public/data.js. New schema changes use Drizzle migrations; do not modify applied migrations.

Run the Sites build helper for deployment. Managed browser QA uses sites-preview. Authenticated writer operations require the Site owner's dispatch-provided identity; anonymous users cannot write research data.
